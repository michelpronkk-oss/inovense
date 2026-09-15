import { task } from "@trigger.dev/sdk/v3";
import { randomUUID } from "node:crypto";
import { getStoredSlackCredential as getSlackCredential } from "@/lib/connectors/slack";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { ingestSignalBatch } from "@/lib/signals/store";
import { claimProviderEvent, completeProviderEvent, failProviderEvent, getProviderEvent } from "@/lib/provider-events/store";
import { hashProviderAccountId } from "@/lib/provider-events/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { SlackExecutionError, slackRequest } from "@/lib/operators/executors/slack";

type JsonObject = Record<string, unknown>;

const SUPPORTED_EVENT_TYPES = new Set(["slack.app_mentioned", "slack.message.received"]);

function record(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function stringValue(value: unknown, max = 500): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function safeErrorCode(error: unknown): string {
  if (error instanceof SlackExecutionError && /^[a-z0-9_.-]{3,80}$/.test(error.details.code ?? "")) return error.details.code as string;
  if (error instanceof Error && /^[a-z0-9_.-]{3,80}$/.test(error.message)) return error.message;
  return "slack_event_processing_failed";
}

function retryable(error: unknown): boolean {
  if (error instanceof SlackExecutionError) return error.details.status === 429 || (error.details.status ?? 0) >= 500 || error.details.code === "slack_request_failed";
  return true;
}

async function updateSlackState(input: {
  workspaceId: string;
  eventId: string;
  status: "active" | "failed" | "ignored";
  errorCode?: string | null;
  supabase: ReturnType<typeof createSupabaseAdmin>;
}) {
  const current = await input.supabase.from("os_signal_sync_state").select("cursor").eq("workspace_id", input.workspaceId).eq("connector_key", "slack").maybeSingle();
  const previous = record(current.data?.cursor);
  const now = new Date().toISOString();
  const next = {
    ...previous,
    eventsStatus: input.status,
    lastEventAt: previous.lastEventAt ?? now,
    lastProcessedAt: input.status === "active" || input.status === "ignored" ? now : previous.lastProcessedAt ?? null,
    lastSlackEventId: input.eventId.slice(0, 180),
    lastFailureCode: input.errorCode ?? null,
  };
  const result = await input.supabase.from("os_signal_sync_state").upsert({
    workspace_id: input.workspaceId,
    connector_key: "slack",
    cursor: next,
    last_success_at: input.status === "active" || input.status === "ignored" ? now : null,
    last_failure_code: input.errorCode ?? null,
    updated_at: now,
  }, { onConflict: "workspace_id,connector_key" });
  if (result.error) throw new Error("slack_monitoring_state_failed");
}

function metadataForEvent(event: Awaited<ReturnType<typeof getProviderEvent>>): JsonObject | null {
  if (!event || event.provider !== "slack" || event.connector_key !== "slack" || event.source_mode !== "webhook" || !SUPPORTED_EVENT_TYPES.has(event.event_type)) return null;
  const metadata = record(event.metadata);
  const teamId = stringValue(metadata.teamId, 80);
  const channelId = stringValue(metadata.channelId, 120);
  const eventTs = stringValue(metadata.eventTs, 80);
  const signalText = stringValue(metadata.signalText, 500);
  if (!teamId || !channelId || !eventTs || !signalText) return null;
  return { ...metadata, teamId, channelId, eventTs, signalText };
}

export const slackEventProcess = task({
  id: "slack-event-process",
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 60_000, randomize: true },
  queue: { name: "slack-events", concurrencyLimit: 10 },
  maxDuration: 300,
  run: async (payload: { providerEventId: string }) => {
    if (!payload || !/^pev_[a-f0-9]{48}$/.test(payload.providerEventId)) throw new Error("provider_event_id_invalid");
    const supabase = createSupabaseAdmin();
    const event = await getProviderEvent(payload.providerEventId, supabase);
    if (!event) throw new Error("provider_event_missing");
    if (["processed", "failed", "ignored"].includes(event.status)) return { status: event.status };
    const leaseToken = randomUUID();
    if (!await claimProviderEvent({ eventId: event.id, leaseToken, leaseSeconds: 300, supabase })) return { status: "not_claimed" };

    try {
      const metadata = metadataForEvent(event);
      if (!metadata) {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "slack_event_invalid", permanent: true, supabase });
        return { status: "failed", errorCode: "slack_event_invalid" };
      }

      const credential = await getSlackCredential(event.workspace_id, supabase);
      const eventTeamId = stringValue(metadata.teamId, 80);
      if (!credential || !eventTeamId || credential.status === "needs_attention" || credential.provider_account_id !== eventTeamId || event.provider_account_id !== hashProviderAccountId("slack", eventTeamId)) {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "slack_credential_account_mismatch", permanent: true, supabase });
        await updateSlackState({ workspaceId: event.workspace_id, eventId: event.external_event_id, status: "failed", errorCode: "slack_credential_account_mismatch", supabase });
        return { status: "failed", errorCode: "slack_credential_account_mismatch" };
      }

      const botUserId = stringValue(record(credential.metadata).botUserId, 80);
      if ((metadata.userId && botUserId && metadata.userId === botUserId) || Boolean(metadata.botId)) {
        await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
        await updateSlackState({ workspaceId: event.workspace_id, eventId: event.external_event_id, status: "ignored", supabase });
        return { status: "ignored", reason: "slack_self_write" };
      }

      const settings = await loadWorkspacePolicySettings({ supabase, workspaceId: event.workspace_id });
      const isMention = event.event_type === "slack.app_mentioned";
      if (!isMention && !settings.slack.slackMonitoredChannelIds.includes(String(metadata.channelId))) {
        await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
        await updateSlackState({ workspaceId: event.workspace_id, eventId: event.external_event_id, status: "ignored", supabase });
        return { status: "ignored", reason: "slack_channel_not_monitored" };
      }

      // A mention may not have a saved display name because it is actionable
      // without being an allowlisted monitoring channel. A minimal channel
      // lookup is bounded and contains no message content.
      let channelName: string | null = settings.slack.slackMonitoredChannelNames[settings.slack.slackMonitoredChannelIds.indexOf(String(metadata.channelId))] ?? null;
      if (!channelName && isMention) {
        try {
          const context = await slackRequest<{ channel?: { name?: string } }>(event.workspace_id, "GET", `/conversations.info?channel=${encodeURIComponent(String(metadata.channelId))}`);
          channelName = stringValue(context.channel?.name, 120);
        } catch (error) {
          if (error instanceof SlackExecutionError && error.details.status === 429) throw error;
          channelName = null;
        }
      }

      const signal = {
        id: undefined,
        workspaceId: event.workspace_id,
        connectorKey: "slack",
        provider: "slack",
        source: "slack",
        sourceType: "slack_message",
        eventType: event.event_type,
        sourceId: String(metadata.eventTs),
        sourceParentId: stringValue(metadata.threadTs, 80),
        threadId: stringValue(metadata.threadTs, 80) ?? String(metadata.eventTs),
        from: null,
        subject: `Slack ${channelName ? `#${channelName}` : "message"}`,
        snippet: String(metadata.signalText),
        receivedAt: event.received_at,
        occurredAt: event.occurred_at,
        observedAt: new Date().toISOString(),
        actor: stringValue(metadata.userId, 80),
        entityType: "slack_channel_message",
        entityId: String(metadata.channelId),
        trustLevel: "untrusted_provider_content" as const,
        metadata: {
          slackInbound: true,
          slackEventId: event.external_event_id,
          channelId: String(metadata.channelId),
          channelName,
          threadTs: stringValue(metadata.threadTs, 80),
          messageTs: String(metadata.eventTs),
          teamId: String(metadata.teamId),
          sourceProviderEventId: event.id,
        },
      };
      const result = await ingestSignalBatch({ workspaceId: event.workspace_id, events: [signal], supabase });
      if (!await completeProviderEvent({ eventId: event.id, leaseToken, supabase })) throw new Error("provider_event_completion_conflict");
      await updateSlackState({ workspaceId: event.workspace_id, eventId: event.external_event_id, status: "active", supabase });
      return { status: "processed", eventType: event.event_type, candidates: result.candidatesProduced, workflows: result.workflowCandidates };
    } catch (error) {
      const errorCode = safeErrorCode(error);
      const permanent = !retryable(error) || ["slack_event_invalid", "slack_credential_account_mismatch", "slack_channel_not_monitored"].includes(errorCode);
      const retryAfter = error instanceof SlackExecutionError && typeof error.details.retryAfterSeconds === "number"
        ? error.details.retryAfterSeconds
        : Math.min(3600, 10 * 2 ** Math.min(event.attempt_count, 8));
      await failProviderEvent({ eventId: event.id, leaseToken, errorCode, permanent, retryAfterSeconds: retryAfter, supabase }).catch(() => undefined);
      await updateSlackState({ workspaceId: event.workspace_id, eventId: event.external_event_id, status: "failed", errorCode, supabase }).catch(() => undefined);
      if (permanent) return { status: "failed", errorCode };
      throw new Error(errorCode);
    }
  },
});

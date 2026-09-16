import { task } from "@trigger.dev/sdk/v3";
import { randomUUID } from "node:crypto";
import {
  getMicrosoftCredential,
  getMicrosoftMessage,
  MicrosoftGraphError,
  resolveMicrosoftAccessToken,
} from "@/lib/connectors/microsoft";
import { getTeamsChannelMessage, MicrosoftTeamsGraphError, resolveMicrosoftTeamsConnection } from "@/lib/connectors/microsoft-teams";
import { ingestSignalBatch } from "@/lib/signals/store";
import { claimProviderEvent, completeProviderEvent, failProviderEvent, getProviderEvent } from "@/lib/provider-events/store";
import { hashProviderAccountId } from "@/lib/provider-events/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type JsonObject = Record<string, unknown>;

function text(value: unknown, max = 255): string | null {
  return typeof value === "string" && value.trim() ? value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max) : null;
}

function metadata(event: Awaited<ReturnType<typeof getProviderEvent>>): JsonObject {
  return event?.metadata && typeof event.metadata === "object" ? event.metadata : {};
}

function safeErrorCode(error: unknown): string {
  if (error instanceof MicrosoftTeamsGraphError) return error.details.code;
  if (error instanceof MicrosoftGraphError) return `graph_${error.details.status}`;
  if (error instanceof Error && /^[a-z0-9_.-]{3,80}$/.test(error.message)) return error.message;
  return "microsoft_event_processing_failed";
}

function retryable(error: unknown): boolean {
  if (error instanceof MicrosoftTeamsGraphError) return error.details.status === 429 || (error.details.status ?? 0) >= 500;
  if (error instanceof MicrosoftGraphError) return error.details.status === 429 || (error.details.status ?? 0) >= 500;
  return true;
}

export const microsoftEventProcess = task({
  id: "microsoft-event-process",
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 60_000, randomize: true },
  queue: { name: "microsoft-events", concurrencyLimit: 20 },
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
      const isOutlook = event.connector_key === "microsoft" && event.event_type === "microsoft.outlook.message.created";
      const isTeams = event.connector_key === "microsoft_teams" && event.event_type === "microsoft.teams.message.created";
      if (event.provider !== "microsoft" || (!isOutlook && !isTeams) || !["webhook", "reconciliation"].includes(event.source_mode)) {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "microsoft_provider_event_unsupported", permanent: true, supabase });
        return { status: "failed", errorCode: "microsoft_provider_event_unsupported" };
      }
      const credential = await getMicrosoftCredential(event.workspace_id, supabase);
      if (!credential?.provider_account_id || hashProviderAccountId("microsoft", credential.provider_account_id) !== event.provider_account_id || credential.status === "needs_attention") {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "microsoft_credential_changed", permanent: true, supabase });
        return { status: "failed", errorCode: "microsoft_credential_changed" };
      }
      const sourceId = event.entity_id?.trim();
      if (!sourceId) {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "microsoft_entity_id_missing", permanent: true, supabase });
        return { status: "failed", errorCode: "microsoft_entity_id_missing" };
      }
      const eventMetadata = metadata(event);
      const refresh = async () => {
        const latest = await getMicrosoftCredential(event.workspace_id, supabase);
        if (!latest) throw new Error("microsoft_reauth_required");
        return resolveMicrosoftAccessToken({ workspaceId: event.workspace_id, credential: latest, supabase, forceRefresh: true });
      };

      if (isOutlook) {
        const accessToken = await resolveMicrosoftAccessToken({ workspaceId: event.workspace_id, credential, supabase });
        const message = await getMicrosoftMessage(accessToken, sourceId, { refresh });
        const sender = message.from?.toLowerCase() ?? "";
        if (message.isDraft || message.isDeliveryReceipt || (credential.provider_email && sender === credential.provider_email.toLowerCase())) {
          await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
          return { status: "ignored", reason: message.isDraft ? "outlook_draft" : message.isDeliveryReceipt ? "outlook_delivery_report" : "outlook_self_message" };
        }
        const snippet = (message.bodyText || message.bodyPreview || "").slice(0, 1200);
        if (!snippet.trim()) {
          await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
          return { status: "ignored", reason: "outlook_empty_message" };
        }
        const result = await ingestSignalBatch({
          workspaceId: event.workspace_id,
          supabase,
          events: [{
            workspaceId: event.workspace_id,
            connectorKey: "microsoft",
            provider: "microsoft",
            source: "microsoft",
            sourceType: "email",
            eventType: "microsoft.outlook.message.received",
            sourceId: message.id,
            sourceParentId: message.conversationId,
            threadId: message.conversationId,
            from: message.from,
            subject: message.subject,
            snippet,
            receivedAt: event.received_at,
            occurredAt: message.receivedAt ?? event.occurred_at,
            observedAt: new Date().toISOString(),
            actor: message.from,
            entityType: "outlook_message",
            entityId: message.id,
            trustLevel: "untrusted_provider_content",
            metadata: {
              sourceProviderEventId: event.id,
              internetMessageId: message.internetMessageId,
              conversationId: message.conversationId,
              hasAttachments: message.hasAttachments,
              attachmentContentFetched: false,
              sourceWebUrl: message.webUrl,
              untrustedProviderContent: true,
            },
          }],
        });
        await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
        return { status: "processed", candidates: result.candidatesProduced, workflows: result.workflowCandidates };
      }

      const teamId = text(eventMetadata.teamId, 120);
      const channelId = text(eventMetadata.channelId, 120);
      if (!teamId || !channelId) throw new Error("teams_subscription_target_missing");
      const connection = await resolveMicrosoftTeamsConnection({ workspaceId: event.workspace_id, supabase });
      const message = await getTeamsChannelMessage({ connection, teamId, channelId, messageId: sourceId });
      if (!message) {
        await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
        return { status: "ignored", reason: "teams_message_missing" };
      }
      if (message.senderId && message.senderId === credential.provider_account_id) {
        await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
        return { status: "ignored", reason: "teams_self_message" };
      }
      const snippet = (message.textPreview ?? "").slice(0, 600);
      if (!snippet.trim()) {
        await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
        return { status: "ignored", reason: "teams_empty_message" };
      }
      const result = await ingestSignalBatch({
        workspaceId: event.workspace_id,
        supabase,
        events: [{
          workspaceId: event.workspace_id,
          connectorKey: "microsoft_teams",
          provider: "microsoft",
          source: "microsoft_teams",
          sourceType: "team_chat",
          eventType: "teams.message.received",
          sourceId: message.messageId,
          sourceParentId: message.replyToId,
          threadId: message.replyToId ?? message.messageId,
          from: message.senderName,
          subject: "Microsoft Teams channel message",
          snippet,
          receivedAt: event.received_at,
          occurredAt: message.occurredAt ?? event.occurred_at,
          observedAt: new Date().toISOString(),
          actor: message.senderId ?? message.senderName,
          entityType: "teams_channel_message",
          entityId: message.messageId,
          trustLevel: "untrusted_provider_content",
          metadata: {
            sourceProviderEventId: event.id,
            teamId,
            channelId,
            sourceWebUrl: message.webUrl,
            untrustedProviderContent: true,
          },
        }],
      });
      await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
      return { status: "processed", candidates: result.candidatesProduced, workflows: result.workflowCandidates };
    } catch (error) {
      const errorCode = safeErrorCode(error);
      const permanent = !retryable(error) || ["microsoft_provider_event_unsupported", "microsoft_credential_changed", "microsoft_entity_id_missing", "teams_subscription_target_missing"].includes(errorCode);
      await failProviderEvent({ eventId: event.id, leaseToken, errorCode, permanent, retryAfterSeconds: Math.min(3600, 10 * 2 ** Math.min(event.attempt_count, 8)), supabase }).catch(() => undefined);
      if (permanent) return { status: "failed", errorCode };
      throw new Error(errorCode);
    }
  },
});

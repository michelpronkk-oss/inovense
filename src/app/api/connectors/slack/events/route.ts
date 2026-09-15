import { idempotencyKeys } from "@trigger.dev/sdk/v3";
import { NextRequest, NextResponse } from "next/server";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { ingestProviderEvent } from "@/lib/provider-events/store";
import { hashProviderAccountId } from "@/lib/provider-events/types";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { hashSlackIdentifier, isSlackRequestTimestampFresh, parseSlackEventPayload, SLACK_EVENTS_MAX_BODY_BYTES, verifySlackRequestSignature } from "@/lib/connectors/slack-events";
import { slackEventProcess } from "@/trigger/slack-event-process";

export const runtime = "nodejs";

const SIGNATURE_HEADER = "x-slack-signature";
const TIMESTAMP_HEADER = "x-slack-request-timestamp";
const RETRY_NUM_HEADER = "x-slack-retry-num";
const RETRY_REASON_HEADER = "x-slack-retry-reason";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

async function readRawBody(request: NextRequest): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > SLACK_EVENTS_MAX_BODY_BYTES) return null;
  try {
    const body = await request.text();
    return new TextEncoder().encode(body).byteLength <= SLACK_EVENTS_MAX_BODY_BYTES ? body : null;
  } catch {
    return null;
  }
}

async function resolveSlackWorkspace(teamId: string, enterpriseId: string | null, supabase: ReturnType<typeof createSupabaseAdmin>): Promise<{ workspaceId: string | null; ambiguous: boolean }> {
  const result = await supabase.from("os_connector_credentials")
    .select("workspace_id,provider_account_id,status,metadata")
    .eq("connector_key", "slack")
    .eq("provider_account_id", teamId);
  if (result.error) throw new Error("slack_workspace_mapping_failed");

  const matching = (result.data ?? []).filter((row) => {
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
    const configuredEnterprise = typeof metadata.enterpriseId === "string" ? metadata.enterpriseId : null;
    return !configuredEnterprise || !enterpriseId || configuredEnterprise === enterpriseId;
  });
  const workspaceIds = Array.from(new Set(matching.map((row) => String(row.workspace_id)).filter(Boolean)));
  if (workspaceIds.length !== 1) return { workspaceId: null, ambiguous: workspaceIds.length > 1 };
  return { workspaceId: workspaceIds[0], ambiguous: false };
}

function retryNumber(value: string | null): number | null {
  if (!value || !/^\d{1,3}$/.test(value)) return null;
  return Number(value);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!/^application\/json(?:\s*;|\s*$)/.test(contentType)) return json({ error: "slack_event_content_type_invalid" }, 415);
  const rawBody = await readRawBody(request);
  if (rawBody === null) return json({ error: "slack_event_body_too_large" }, 413);

  const timestamp = request.headers.get(TIMESTAMP_HEADER);
  if (!isSlackRequestTimestampFresh(timestamp)) return json({ error: "slack_event_timestamp_invalid" }, 401);
  if (!verifySlackRequestSignature({ rawBody, timestamp, signature: request.headers.get(SIGNATURE_HEADER) })) {
    return json({ error: "slack_event_signature_invalid" }, 401);
  }

  let parsed;
  try {
    parsed = parseSlackEventPayload(rawBody);
  } catch (error) {
    // Unsupported but authentic operational/event-subtype callbacks are
    // acknowledged so Slack does not retry them forever. Malformed supported
    // payloads remain a 400 and contain no provider content in the response.
    if (error instanceof Error && error.message === "slack_event_type_unsupported") return json({ received: 0, ignored: 1 });
    return json({ error: error instanceof Error ? error.message : "slack_event_payload_invalid" }, 400);
  }

  if (parsed.kind === "url_verification") return json({ challenge: parsed.payload.challenge });
  if (!hasSupabaseAdminConfig()) return json({ error: "slack_event_storage_unavailable" }, 503);

  const supabase = createSupabaseAdmin();
  const enterpriseId = parsed.payload.enterprise_id ?? null;
  const mapping = await resolveSlackWorkspace(parsed.payload.team_id, enterpriseId, supabase);
  if (!mapping.workspaceId) {
    console.info(JSON.stringify({
      event: "slack_event_workspace_rejected",
      teamHash: hashSlackIdentifier(parsed.payload.team_id),
      enterpriseHash: enterpriseId ? hashSlackIdentifier(enterpriseId) : null,
      ambiguous: mapping.ambiguous,
    }));
    return json({ received: 0, rejected: mapping.ambiguous ? "ambiguous_workspace" : "unmapped_workspace" }, 202);
  }

  const settings = await loadWorkspacePolicySettings({ supabase, workspaceId: mapping.workspaceId });
  const isMention = parsed.eventType === "slack.app_mentioned";
  const monitoredIds = settings.slack.slackMonitoredChannelIds;
  if (!isMention && !monitoredIds.includes(parsed.channelId)) {
    return json({ received: 1, ignored: 1, reason: "channel_not_monitored" });
  }

  const retryNum = retryNumber(request.headers.get(RETRY_NUM_HEADER));
  const retryReason = request.headers.get(RETRY_REASON_HEADER)?.trim().slice(0, 80) || null;
  const { event: providerEvent, created } = await ingestProviderEvent({
    workspaceId: mapping.workspaceId,
    connectorKey: "slack",
    provider: "slack",
    providerAccountId: hashProviderAccountId("slack", parsed.payload.team_id),
    externalEventId: parsed.payload.event_id,
    eventType: parsed.eventType,
    entityType: "slack_message",
    entityId: parsed.messageTs,
    occurredAt: parsed.payload.event_time ? new Date(parsed.payload.event_time * 1000).toISOString() : null,
    sourceMode: "webhook",
    metadata: {
      teamId: parsed.payload.team_id,
      enterpriseId,
      appId: parsed.payload.api_app_id ?? null,
      channelId: parsed.channelId,
      channelType: isMention ? "mention" : "public_channel",
      eventTs: parsed.messageTs,
      threadTs: parsed.threadTs,
      userId: parsed.userId,
      botId: parsed.botId,
      signalText: parsed.text,
      monitored: !isMention,
      retryNum,
      retryReason,
    },
  }, supabase);

  if (created) {
    try {
      const idempotencyKey = await idempotencyKeys.create(`provider-event:${providerEvent.id}:attempt:${providerEvent.attempt_count}`, { scope: "global" });
      await slackEventProcess.trigger({ providerEventId: providerEvent.id }, {
        idempotencyKey,
        idempotencyKeyTTL: "30d",
        concurrencyKey: providerEvent.connector_id,
      });
    } catch {
      // The durable received row is the recovery boundary. The scheduled
      // provider-event-recovery task will dispatch it if Trigger is briefly
      // unavailable, while Slack still receives a fast successful ack.
      console.warn(JSON.stringify({ event: "slack_event_trigger_deferred", providerEventId: providerEvent.id }));
    }
  }

  return json({ received: 1, queued: created ? 1 : 0, duplicate: !created });
}


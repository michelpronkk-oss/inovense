import { task } from "@trigger.dev/sdk/v3";
import { randomUUID } from "node:crypto";
import { getStoredHubSpotCredential, hubSpotApiRequest, HubSpotConnectorError, HubSpotReconnectionRequiredError } from "@/lib/connectors/hubspot";
import { isHubSpotSelfWriteEcho, normalizeHubSpotSnapshot, type HubSpotWebhookDescriptor } from "@/lib/connectors/hubspot-webhook";
import { claimProviderEvent, completeProviderEvent, failProviderEvent, getProviderEvent } from "@/lib/provider-events/store";
import { hashProviderAccountId } from "@/lib/provider-events/types";
import { ingestSignalBatch } from "@/lib/signals/store";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type JsonObject = Record<string, unknown>;

const SUPPORTED_EVENT_TYPES = new Set([
  "hubspot.contact.created",
  "hubspot.contact.updated",
  "hubspot.deal.created",
  "hubspot.deal.stage_changed",
  "hubspot.deal.updated",
]);

function record(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function safeErrorCode(error: unknown): string {
  if (error instanceof HubSpotReconnectionRequiredError) return error.code;
  if (error instanceof HubSpotConnectorError && /^[a-z0-9_.-]{3,80}$/.test(error.code)) return error.code;
  if (error instanceof Error && /^[a-z0-9_.-]{3,80}$/.test(error.message)) return error.message;
  return "hubspot_webhook_processing_failed";
}

function retryable(error: unknown): boolean {
  if (error instanceof HubSpotReconnectionRequiredError) return false;
  if (error instanceof HubSpotConnectorError) return error.status >= 500 || error.status === 408 || error.status === 429;
  return true;
}

async function updateWebhookState(input: {
  workspaceId: string;
  status: "active" | "failed" | "ignored";
  eventId: string;
  errorCode?: string | null;
  supabase: ReturnType<typeof createSupabaseAdmin>;
}) {
  const current = await input.supabase.from("os_signal_sync_state").select("cursor").eq("workspace_id", input.workspaceId).eq("connector_key", "hubspot").maybeSingle();
  const cursor = record(current.data?.cursor);
  const now = new Date().toISOString();
  const nextCursor = {
    ...cursor,
    lastEventAt: cursor.lastEventAt ?? now,
    lastProcessedAt: input.status === "active" || input.status === "ignored" ? now : cursor.lastProcessedAt ?? null,
    lastWebhookEventId: input.eventId.slice(0, 180),
    lastFailureCode: input.errorCode ?? null,
    webhookStatus: input.status,
  };
  await input.supabase.from("os_signal_sync_state").upsert({
    workspace_id: input.workspaceId,
    connector_key: "hubspot",
    cursor: nextCursor,
    last_success_at: input.status === "active" || input.status === "ignored" ? now : null,
    last_failure_code: input.errorCode ?? null,
    updated_at: now,
  }, { onConflict: "workspace_id,connector_key" });
}

function descriptorFromProviderEvent(event: Awaited<ReturnType<typeof getProviderEvent>>): HubSpotWebhookDescriptor | null {
  if (!event || !SUPPORTED_EVENT_TYPES.has(event.event_type) || !event.entity_id || !event.entity_type) return null;
  const metadata = record(event.metadata);
  const portalId = typeof metadata.portalId === "string" ? metadata.portalId : null;
  const subscriptionType = typeof metadata.subscriptionType === "string" ? metadata.subscriptionType : null;
  if (!portalId || !subscriptionType) return null;
  return {
    eventId: event.external_event_id.split(":").at(-1) || event.external_event_id,
    portalId,
    subscriptionType,
    objectId: event.entity_id,
    occurredAt: event.occurred_at,
    propertyName: typeof metadata.propertyName === "string" ? metadata.propertyName : null,
    propertyValue: typeof metadata.propertyValue === "string" ? metadata.propertyValue : null,
    changeSource: typeof metadata.changeSource === "string" ? metadata.changeSource : null,
    changeFlag: typeof metadata.changeFlag === "string" ? metadata.changeFlag : null,
    appId: typeof metadata.appId === "string" ? metadata.appId : null,
    eventType: event.event_type as HubSpotWebhookDescriptor["eventType"],
    entityType: event.entity_type as HubSpotWebhookDescriptor["entityType"],
  };
}

async function fetchSnapshot(input: {
  workspaceId: string;
  credential: NonNullable<Awaited<ReturnType<typeof getStoredHubSpotCredential>>>;
  entityType: "contact" | "deal";
  entityId: string;
  supabase: ReturnType<typeof createSupabaseAdmin>;
}): Promise<JsonObject> {
  const properties = input.entityType === "contact"
    ? "email,firstname,lastname,company,lifecyclestage,hs_lead_status"
    : "dealname,dealstage,amount,deal_currency_code,closedate,hubspot_owner_id,hs_is_closed,hs_is_closed_won";
  return hubSpotApiRequest<JsonObject>({
    workspaceId: input.workspaceId,
    credential: input.credential,
    method: "GET",
    path: `/crm/v3/objects/${input.entityType === "contact" ? "contacts" : "deals"}/${encodeURIComponent(input.entityId)}?properties=${properties}`,
    supabase: input.supabase,
  });
}

export const hubspotWebhookProcess = task({
  id: "hubspot-webhook-process",
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 60_000, randomize: true },
  queue: { name: "hubspot-webhook", concurrencyLimit: 10 },
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
      if (event.provider !== "hubspot" || event.connector_key !== "hubspot" || event.source_mode !== "webhook") {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "provider_event_type_unsupported", permanent: true, supabase });
        return { status: "failed", errorCode: "provider_event_type_unsupported" };
      }
      const descriptor = descriptorFromProviderEvent(event);
      if (!descriptor) {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "hubspot_webhook_event_invalid", permanent: true, supabase });
        return { status: "failed", errorCode: "hubspot_webhook_event_invalid" };
      }
      const credential = await getStoredHubSpotCredential(event.workspace_id, supabase);
      if (!credential || credential.status === "needs_attention" || credential.provider_account_id !== descriptor.portalId
        || hashProviderAccountId("hubspot", descriptor.portalId) !== event.provider_account_id) {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "hubspot_credential_account_mismatch", permanent: true, supabase });
        await updateWebhookState({ workspaceId: event.workspace_id, status: "failed", eventId: event.external_event_id, errorCode: "hubspot_credential_account_mismatch", supabase });
        return { status: "failed", errorCode: "hubspot_credential_account_mismatch" };
      }
      if (isHubSpotSelfWriteEcho(descriptor)) {
        await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
        await updateWebhookState({ workspaceId: event.workspace_id, status: "ignored", eventId: event.external_event_id, supabase });
        return { status: "ignored", reason: "hubspot_self_write_echo" };
      }
      const snapshot = await fetchSnapshot({ workspaceId: event.workspace_id, credential, entityType: descriptor.entityType, entityId: descriptor.objectId, supabase });
      const signal = normalizeHubSpotSnapshot({ workspaceId: event.workspace_id, providerEventId: event.id, event: descriptor, snapshot });
      await ingestSignalBatch({ workspaceId: event.workspace_id, events: [signal], supabase, materializeWorkflows: false });
      if (!await completeProviderEvent({ eventId: event.id, leaseToken, supabase })) throw new Error("provider_event_completion_conflict");
      await updateWebhookState({ workspaceId: event.workspace_id, status: "active", eventId: event.external_event_id, supabase });
      return { status: "processed", eventType: event.event_type };
    } catch (error) {
      const errorCode = safeErrorCode(error);
      const permanent = !retryable(error) || ["provider_event_type_unsupported", "hubspot_webhook_event_invalid"].includes(errorCode);
      await failProviderEvent({ eventId: event.id, leaseToken, errorCode, permanent, retryAfterSeconds: Math.min(3600, 10 * 2 ** Math.min(event.attempt_count, 8)), supabase }).catch(() => undefined);
      await updateWebhookState({ workspaceId: event.workspace_id, status: "failed", eventId: event.external_event_id, errorCode, supabase }).catch(() => undefined);
      if (permanent) return { status: "failed", errorCode };
      throw new Error(errorCode);
    }
  },
});

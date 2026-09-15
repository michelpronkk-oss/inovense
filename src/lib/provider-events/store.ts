import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizeProviderEvent, type CanonicalProviderEventInput, type ProviderEventStatus } from "@/lib/provider-events/types";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type StoredProviderEvent = {
  id: string;
  workspace_id: string;
  connector_id: string;
  connector_key: string;
  provider: string;
  provider_account_id: string;
  external_event_id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  occurred_at: string | null;
  received_at: string;
  source_mode: string;
  payload_reference: string | null;
  metadata: Record<string, unknown>;
  status: ProviderEventStatus;
  attempt_count: number;
  available_at: string;
  lease_until: string | null;
};

const EVENT_COLUMNS = "id,workspace_id,connector_id,connector_key,provider,provider_account_id,external_event_id,event_type,entity_type,entity_id,occurred_at,received_at,source_mode,payload_reference,metadata,status,attempt_count,available_at,lease_until";

export async function ingestProviderEvent(input: CanonicalProviderEventInput, supabase: SupabaseAdmin = createSupabaseAdmin()): Promise<{ event: StoredProviderEvent; created: boolean }> {
  const event = normalizeProviderEvent(input);
  const result = await supabase.from("os_provider_events").upsert({
    id: event.id,
    workspace_id: event.workspaceId,
    connector_id: event.connectorId,
    connector_key: event.connectorKey,
    provider: event.provider,
    provider_account_id: event.providerAccountId,
    external_event_id: event.externalEventId,
    event_type: event.eventType,
    entity_type: event.entityType,
    entity_id: event.entityId,
    occurred_at: event.occurredAt,
    source_mode: event.sourceMode,
    payload_reference: event.payloadReference,
    metadata: event.metadata,
    status: "received",
    available_at: event.receivedAt,
  }, { onConflict: "provider,connector_id,external_event_id", ignoreDuplicates: true }).select(EVENT_COLUMNS).maybeSingle();
  if (result.error) throw new Error(`provider_event_ingest_failed:${result.error.code ?? "db"}`);
  if (result.data) return { event: result.data as StoredProviderEvent, created: true };

  const existing = await supabase.from("os_provider_events").select(EVENT_COLUMNS)
    .eq("provider", event.provider).eq("connector_id", event.connectorId).eq("external_event_id", event.externalEventId).maybeSingle();
  if (existing.error || !existing.data) throw new Error("provider_event_dedupe_lookup_failed");
  return { event: existing.data as StoredProviderEvent, created: false };
}

export async function getProviderEvent(eventId: string, supabase: SupabaseAdmin = createSupabaseAdmin()): Promise<StoredProviderEvent | null> {
  const result = await supabase.from("os_provider_events").select(EVENT_COLUMNS).eq("id", eventId).maybeSingle();
  if (result.error) throw new Error("provider_event_lookup_failed");
  return result.data as StoredProviderEvent | null;
}

export async function queueProviderEvent(eventId: string, supabase: SupabaseAdmin = createSupabaseAdmin()): Promise<boolean> {
  const result = await supabase.from("os_provider_events").update({ status: "queued", available_at: new Date().toISOString() })
    .eq("id", eventId).in("status", ["received", "retryable"]).select("id").maybeSingle();
  if (result.error) throw new Error("provider_event_queue_state_failed");
  return Boolean(result.data);
}

export async function claimProviderEvent(input: { eventId: string; leaseToken: string; leaseSeconds?: number; supabase?: SupabaseAdmin }): Promise<boolean> {
  const result = await (input.supabase ?? createSupabaseAdmin()).rpc("claim_os_provider_event", {
    p_event_id: input.eventId,
    p_lease_token: input.leaseToken,
    p_lease_seconds: input.leaseSeconds ?? 900,
  });
  if (result.error) throw new Error("provider_event_claim_failed");
  return result.data === true;
}

export async function completeProviderEvent(input: { eventId: string; leaseToken: string; supabase?: SupabaseAdmin }): Promise<boolean> {
  const result = await (input.supabase ?? createSupabaseAdmin()).rpc("complete_os_provider_event", {
    p_event_id: input.eventId,
    p_lease_token: input.leaseToken,
  });
  if (result.error) throw new Error("provider_event_complete_failed");
  return result.data === true;
}

export async function failProviderEvent(input: { eventId: string; leaseToken: string; errorCode: string; permanent: boolean; retryAfterSeconds?: number; supabase?: SupabaseAdmin }): Promise<boolean> {
  const result = await (input.supabase ?? createSupabaseAdmin()).rpc("fail_os_provider_event", {
    p_event_id: input.eventId,
    p_lease_token: input.leaseToken,
    p_error_code: input.errorCode,
    p_permanent: input.permanent,
    p_retry_after_seconds: input.retryAfterSeconds ?? 30,
  });
  if (result.error) throw new Error("provider_event_failure_state_failed");
  return result.data === true;
}

export async function listRecoverableProviderEvents(input: { limit?: number; supabase?: SupabaseAdmin }): Promise<StoredProviderEvent[]> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const limit = Math.max(1, Math.min(input.limit ?? 100, 250));
  const now = new Date().toISOString();
  const [received, queued, retryable, expired] = await Promise.all([
    supabase.from("os_provider_events").select(EVENT_COLUMNS).eq("status", "received").lte("available_at", now).order("received_at", { ascending: true }).limit(limit),
    supabase.from("os_provider_events").select(EVENT_COLUMNS).eq("status", "queued").lte("available_at", now).order("received_at", { ascending: true }).limit(limit),
    supabase.from("os_provider_events").select(EVENT_COLUMNS).eq("status", "retryable").lte("available_at", now).order("received_at", { ascending: true }).limit(limit),
    supabase.from("os_provider_events").select(EVENT_COLUMNS).eq("status", "processing").lte("lease_until", now).order("received_at", { ascending: true }).limit(limit),
  ]);
  if (received.error || queued.error || retryable.error || expired.error) throw new Error("provider_event_recovery_query_failed");
  const unique = new Map<string, StoredProviderEvent>();
  for (const row of [...(received.data ?? []), ...(queued.data ?? []), ...(retryable.data ?? []), ...(expired.data ?? [])] as StoredProviderEvent[]) unique.set(row.id, row);
  return [...unique.values()].slice(0, limit);
}

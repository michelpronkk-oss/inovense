import "server-only";

import { websiteSyncRun } from "@/trigger/website-sync-run";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

// "dispatching" is deliberately excluded: it means a claim is already
// in flight (another caller is between the claim UPDATE and the provider
// call), and re-matching it here would let a second concurrent caller
// re-claim the same row and issue a second provider dispatch.
const CLAIMABLE_DISPATCH_STATES = ["requested", "dispatch_failed", "recoverable"] as const;
const TERMINAL_DISPATCH_STATES = ["completed", "failed", "cancelled", "superseded"] as const;

function safeDispatchCode(error: unknown): string {
  const raw = error instanceof Error ? error.name || error.message : "dispatch_failed";
  return raw.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").slice(0, 80) || "dispatch_failed";
}

export type WebsiteDispatchResult = {
  runId: string;
  accepted: boolean;
  reused: boolean;
  dispatchStatus: string;
  providerRunId: string | null;
  errorCode?: string;
};

/**
 * Persist the provider boundary explicitly. A database row is only a request;
 * this function changes it to dispatched after Trigger.dev accepts it and
 * records the provider run identity. Reusing the same idempotency key makes a
 * retry safe when the provider accepted the request but the response was lost.
 */
export async function dispatchWebsiteCrawlRun(input: { runId: string; force?: boolean; supabase?: SupabaseAdmin }): Promise<WebsiteDispatchResult> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const current = await supabase.from("os_website_crawl_runs")
    .select("id,workspace_id,idempotency_key,dispatch_status,provider_run_id,dispatch_attempts,next_retry_at")
    .eq("id", input.runId)
    .maybeSingle();
  if (current.error || !current.data) {
    return { runId: input.runId, accepted: false, reused: false, dispatchStatus: "failed", providerRunId: null, errorCode: "run_not_found" };
  }
  const row = current.data as { id: string; workspace_id: string; idempotency_key: string; dispatch_status: string; provider_run_id?: string | null; dispatch_attempts?: number | null; next_retry_at?: string | null };
  if (TERMINAL_DISPATCH_STATES.includes(row.dispatch_status as (typeof TERMINAL_DISPATCH_STATES)[number])) {
    return { runId: row.id, accepted: row.dispatch_status === "completed", reused: true, dispatchStatus: row.dispatch_status, providerRunId: row.provider_run_id ?? null };
  }
  if (row.dispatch_status === "dispatched" || row.dispatch_status === "running") {
    return { runId: row.id, accepted: true, reused: true, dispatchStatus: row.dispatch_status, providerRunId: row.provider_run_id ?? null };
  }
  if (!input.force && row.next_retry_at && Date.parse(row.next_retry_at) > Date.now()) {
    return { runId: row.id, accepted: false, reused: true, dispatchStatus: row.dispatch_status, providerRunId: row.provider_run_id ?? null, errorCode: "retry_backoff" };
  }

  const now = new Date().toISOString();
  const attempt = (row.dispatch_attempts ?? 0) + 1;
  const claiming = await supabase.from("os_website_crawl_runs")
    .update({ dispatch_status: "dispatching", dispatch_started_at: now, dispatch_attempts: attempt, dispatch_error: null })
    .eq("id", row.id)
    .in("dispatch_status", [...CLAIMABLE_DISPATCH_STATES])
    .select("id")
    .maybeSingle();
  if (claiming.error || !claiming.data) {
    const latest = await supabase.from("os_website_crawl_runs").select("dispatch_status,provider_run_id").eq("id", row.id).maybeSingle();
    const latestRow = latest.data as { dispatch_status?: string; provider_run_id?: string | null } | null;
    return { runId: row.id, accepted: latestRow?.dispatch_status === "dispatched" || latestRow?.dispatch_status === "running", reused: true, dispatchStatus: latestRow?.dispatch_status ?? "recoverable", providerRunId: latestRow?.provider_run_id ?? null };
  }

  // The first attempt reuses the row's stable idempotency key so a crash
  // between provider acceptance and persisting dispatched_at is safe to
  // retry without risking a second provider dispatch. A retry (attempt > 1)
  // rotates the provider-facing key: tasks.trigger() gives no signal (no
  // isCached field on a non-batch RunHandle) that a reused key returned a
  // cached reference to an already-terminal provider run, which would
  // otherwise strand the row in "dispatched" forever. The database claim
  // above plus claim_os_website_crawl_run's atomic lease already make a
  // duplicate physical dispatch across attempts harmless (only one worker
  // invocation can ever claim the row), so it is safe to force a fresh
  // provider run identity on every retry.
  const providerIdempotencyKey = attempt > 1 ? `${row.idempotency_key}:attempt-${attempt}` : row.idempotency_key;

  try {
    const handle = await websiteSyncRun.trigger({ runId: row.id }, {
      idempotencyKey: providerIdempotencyKey,
      idempotencyKeyTTL: "30d",
      concurrencyKey: row.workspace_id,
    }) as unknown as { id?: unknown };
    const providerRunId = typeof handle.id === "string" && handle.id ? handle.id : null;
    if (!providerRunId) throw new Error("provider_reference_missing");
    await supabase.from("os_website_crawl_runs").update({ dispatch_status: "dispatched", provider_run_id: providerRunId, dispatched_at: new Date().toISOString(), next_retry_at: null, dispatch_error: null }).eq("id", row.id);
    return { runId: row.id, accepted: true, reused: false, dispatchStatus: "dispatched", providerRunId };
  } catch (error) {
    const errorCode = safeDispatchCode(error);
    await supabase.from("os_website_crawl_runs").update({ dispatch_status: "dispatch_failed", dispatch_error: errorCode, next_retry_at: new Date(Date.now() + 60_000).toISOString() }).eq("id", row.id);
    console.warn("[website-sync] Trigger dispatch failed", { runId: row.id, workspaceId: row.workspace_id, errorCode });
    return { runId: row.id, accepted: false, reused: false, dispatchStatus: "dispatch_failed", providerRunId: null, errorCode };
  }
}

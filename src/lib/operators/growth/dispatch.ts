import "server-only";

import { growthOperatorScan } from "@/trigger/growth-operator-scan";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

function safeDispatchCode(error: unknown): string {
  const raw = error instanceof Error ? error.name || error.message : "dispatch_failed";
  return raw.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").slice(0, 80) || "dispatch_failed";
}

export type GrowthDispatchResult = {
  runId: string;
  accepted: boolean;
  reused: boolean;
  dispatchStatus: string;
  providerRunId: string | null;
  errorCode?: string;
};

export async function dispatchGrowthRun(input: { runId: string; force?: boolean; supabase?: SupabaseAdmin }): Promise<GrowthDispatchResult> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const current = await supabase.from("os_operator_runs")
    .select("id,workspace_id,input,idempotency_key,dispatch_status,provider_run_id,dispatch_attempts,next_retry_at")
    .eq("id", input.runId)
    .eq("operator_key", "growth")
    .maybeSingle();
  if (current.error || !current.data) return { runId: input.runId, accepted: false, reused: false, dispatchStatus: "failed", providerRunId: null, errorCode: "run_not_found" };
  const row = current.data as { id: string; workspace_id: string; input: unknown; idempotency_key: string; dispatch_status: string; provider_run_id?: string | null; dispatch_attempts?: number | null; next_retry_at?: string | null };
  if (["completed", "failed", "cancelled", "superseded"].includes(row.dispatch_status)) return { runId: row.id, accepted: row.dispatch_status === "completed", reused: true, dispatchStatus: row.dispatch_status, providerRunId: row.provider_run_id ?? null };
  if (["dispatched", "running"].includes(row.dispatch_status)) return { runId: row.id, accepted: true, reused: true, dispatchStatus: row.dispatch_status, providerRunId: row.provider_run_id ?? null };
  if (!input.force && row.next_retry_at && Date.parse(row.next_retry_at) > Date.now()) return { runId: row.id, accepted: false, reused: true, dispatchStatus: row.dispatch_status, providerRunId: row.provider_run_id ?? null, errorCode: "retry_backoff" };

  const attempt = (row.dispatch_attempts ?? 0) + 1;
  const claiming = await supabase.from("os_operator_runs")
    .update({ dispatch_status: "dispatching", dispatch_started_at: new Date().toISOString(), dispatch_attempts: attempt, dispatch_error: null })
    .eq("id", row.id)
    .in("dispatch_status", ["requested", "dispatch_failed", "recoverable"])
    .select("id")
    .maybeSingle();
  if (claiming.error || !claiming.data) {
    const latest = await supabase.from("os_operator_runs").select("dispatch_status,provider_run_id").eq("id", row.id).maybeSingle();
    const latestRow = latest.data as { dispatch_status?: string; provider_run_id?: string | null } | null;
    return { runId: row.id, accepted: latestRow?.dispatch_status === "dispatched" || latestRow?.dispatch_status === "running", reused: true, dispatchStatus: latestRow?.dispatch_status ?? "recoverable", providerRunId: latestRow?.provider_run_id ?? null };
  }

  // See website-dispatch.ts: rotate the provider idempotency key on retry
  // (attempt > 1) so a reused key cannot silently return a cached handle to
  // an already-terminal provider run and strand the row in "dispatched".
  const providerIdempotencyKey = attempt > 1 ? `${row.idempotency_key}:attempt-${attempt}` : row.idempotency_key;

  try {
    const handle = await growthOperatorScan.trigger({ workspaceId: row.workspace_id, runId: row.id }, { idempotencyKey: providerIdempotencyKey, idempotencyKeyTTL: "30d", concurrencyKey: row.workspace_id }) as unknown as { id?: unknown };
    const providerRunId = typeof handle.id === "string" && handle.id ? handle.id : null;
    if (!providerRunId) throw new Error("provider_reference_missing");
    await supabase.from("os_operator_runs").update({ dispatch_status: "dispatched", provider_run_id: providerRunId, dispatched_at: new Date().toISOString(), next_retry_at: null, dispatch_error: null }).eq("id", row.id);
    return { runId: row.id, accepted: true, reused: false, dispatchStatus: "dispatched", providerRunId };
  } catch (error) {
    const errorCode = safeDispatchCode(error);
    await supabase.from("os_operator_runs").update({ dispatch_status: "dispatch_failed", dispatch_error: errorCode, next_retry_at: new Date(Date.now() + 60_000).toISOString() }).eq("id", row.id);
    console.warn("[growth] Trigger dispatch failed", { runId: row.id, workspaceId: row.workspace_id, errorCode });
    return { runId: row.id, accepted: false, reused: false, dispatchStatus: "dispatch_failed", providerRunId: null, errorCode };
  }
}

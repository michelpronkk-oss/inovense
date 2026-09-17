// Operator activation - the real, user-set gate for a workspace's
// unattended scheduled operator scan (the Trigger.dev hourly cron).
//
// Uses the existing os_operator_triggers table (see
// supabase/migrations/20260618_os_operator_runtime.sql) with a dedicated
// trigger_type ("operator_activation"), kept intentionally separate from the
// "scheduled_monitoring" row each scan.ts writes AFTER a scan runs (pure
// post-hoc telemetry - see e.g. upsertRevenueMonitoringConfig in
// revenue/scan.ts). Never write to the "operator_activation" row from a
// scan.ts - only from the activate/deactivate routes below - otherwise a
// completed scan could silently re-enable an operator a user just turned
// off.
//
// Default state: an operator that has never had an explicit activation row
// written for a workspace reads as NOT activated. There is no implicit "on"
// state and this module never creates one.
//
// Manual/on-demand scans (POST /api/operators/{operator}/scan) are NOT
// gated by this - they remain available regardless of activation state, for
// pre-purchase exploration. Only the unattended scheduled cron
// (src/trigger/*-operator-scan.ts scheduled tasks) should consult
// getOperatorActivationState() before including a workspace in its fanout.

import { getOperatorDefinition, type OperatorKey } from "@/lib/operators/registry";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

const ACTIVATION_TRIGGER_TYPE = "operator_activation";

function activationTriggerId(workspaceId: string, operatorKey: OperatorKey): string {
  return `optrig-${workspaceId}-${operatorKey}-activation`;
}

export type OperatorActivationState = {
  operatorKey: OperatorKey;
  activated: boolean;
  attentionRequired: boolean;
  activatedAt: string | null;
  deactivatedAt: string | null;
  activatedBy: string | null;
  updatedAt: string | null;
  lastScanAt: string | null;
  nextEligibleScanAt: string | null;
  lastSuccessfulCompletion: string | null;
  lastError: string | null;
};

function nextEligibleRunAt(run: { status?: string | null; updated_at?: string | null; next_retry_at?: string | null } | null | undefined): string | null {
  if (!run) return null;
  if (run.next_retry_at) return run.next_retry_at;
  if (!run.updated_at || !["pending", "running"].includes(String(run.status))) return null;
  const updated = Date.parse(run.updated_at);
  return Number.isFinite(updated) ? new Date(updated + 15 * 60 * 1_000).toISOString() : null;
}

function stateFromRow(operatorKey: OperatorKey, row: { enabled: boolean; config: unknown; updated_at?: string | null } | null, run?: { status?: string | null; dispatch_status?: string | null; error?: string | null; dispatch_error?: string | null; created_at?: string | null; completed_at?: string | null; next_retry_at?: string | null; updated_at?: string | null } | null): OperatorActivationState {
  if (!row) {
    return { operatorKey, activated: false, attentionRequired: false, activatedAt: null, deactivatedAt: null, activatedBy: null, updatedAt: null, lastScanAt: run?.created_at ?? null, nextEligibleScanAt: nextEligibleRunAt(run), lastSuccessfulCompletion: run?.status === "completed" ? run.completed_at ?? null : null, lastError: run?.error ?? run?.dispatch_error ?? null };
  }
  const config = (row.config ?? {}) as Record<string, unknown>;
  const attentionRequired = ["failed", "dispatch_failed", "recoverable", "blocked"].includes(String(run?.dispatch_status ?? run?.status ?? ""));
  return {
    operatorKey,
    activated: row.enabled === true,
    attentionRequired,
    activatedAt: typeof config.activatedAt === "string" ? config.activatedAt : null,
    deactivatedAt: typeof config.deactivatedAt === "string" ? config.deactivatedAt : null,
    activatedBy: typeof config.activatedBy === "string" ? config.activatedBy : null,
    updatedAt: row.updated_at ?? null,
    lastScanAt: run?.created_at ?? null,
    nextEligibleScanAt: nextEligibleRunAt(run),
    lastSuccessfulCompletion: run?.status === "completed" ? run.completed_at ?? null : null,
    lastError: run?.error ?? run?.dispatch_error ?? null,
  };
}

/**
 * Reads whether a workspace has explicitly turned on a given operator's
 * unattended scheduled cron. Returns null only when operatorKey is not a
 * recognized operator. Fails closed on a read error (treated as not
 * activated, never as activated).
 */
export async function getOperatorActivationState(input: {
  workspaceId: string;
  operatorKey: string;
  supabase?: SupabaseAdmin;
}): Promise<OperatorActivationState | null> {
  const operator = getOperatorDefinition(input.operatorKey);
  if (!operator) return null;
  const supabase = input.supabase ?? createSupabaseAdmin();

  const [row, latestRun] = await Promise.all([supabase
    .from("os_operator_triggers")
    .select("enabled,config,updated_at")
    .eq("workspace_id", input.workspaceId)
    .eq("operator_key", operator.key)
    .eq("trigger_type", ACTIVATION_TRIGGER_TYPE)
    .maybeSingle(), supabase.from("os_operator_runs")
    .select("status,dispatch_status,error,dispatch_error,created_at,completed_at,next_retry_at,updated_at")
    .eq("workspace_id", input.workspaceId)
    .eq("operator_key", operator.key)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()]);

  if (row.error || !row.data) {
    return stateFromRow(operator.key, null, latestRun.data as { status?: string | null; dispatch_status?: string | null; error?: string | null; dispatch_error?: string | null; created_at?: string | null; completed_at?: string | null; next_retry_at?: string | null; updated_at?: string | null } | null);
  }

  return stateFromRow(operator.key, row.data as { enabled: boolean; config: unknown; updated_at?: string | null }, latestRun.data as { status?: string | null; dispatch_status?: string | null; error?: string | null; dispatch_error?: string | null; created_at?: string | null; completed_at?: string | null; next_retry_at?: string | null; updated_at?: string | null } | null);
}

/**
 * Workspace-scoped, explicit activate/deactivate write for a single
 * operator's unattended scheduled cron. Callers (the
 * /api/operators/[operatorKey]/activate and .../deactivate routes) must
 * already have verified workspace membership before calling this - this
 * function performs the write only and does not itself check membership.
 */
export async function setOperatorActivationState(input: {
  workspaceId: string;
  operatorKey: string;
  activated: boolean;
  actorEmail?: string | null;
  supabase?: SupabaseAdmin;
}): Promise<{ ok: true; state: OperatorActivationState } | { ok: false; error: string }> {
  const operator = getOperatorDefinition(input.operatorKey);
  if (!operator) return { ok: false, error: "Unknown operator." };
  const supabase = input.supabase ?? createSupabaseAdmin();
  const now = new Date().toISOString();

  const existing = await supabase
    .from("os_operator_triggers")
    .select("config")
    .eq("workspace_id", input.workspaceId)
    .eq("operator_key", operator.key)
    .eq("trigger_type", ACTIVATION_TRIGGER_TYPE)
    .maybeSingle();

  const existingConfig = (existing.data?.config ?? {}) as Record<string, unknown>;
  const previousActivatedAt = typeof existingConfig.activatedAt === "string" ? existingConfig.activatedAt : null;
  const previousActivatedBy = typeof existingConfig.activatedBy === "string" ? existingConfig.activatedBy : null;

  const config = {
    activatedBy: input.activated ? (input.actorEmail ?? previousActivatedBy) : previousActivatedBy,
    activatedAt: input.activated ? now : previousActivatedAt,
    deactivatedAt: input.activated ? null : now,
  };

  const upsert = await supabase.from("os_operator_triggers").upsert({
    id: activationTriggerId(input.workspaceId, operator.key),
    workspace_id: input.workspaceId,
    operator_key: operator.key,
    trigger_type: ACTIVATION_TRIGGER_TYPE,
    enabled: input.activated,
    config,
  });

  if (upsert.error) return { ok: false, error: upsert.error.message };

  return {
    ok: true,
    state: {
      operatorKey: operator.key,
      activated: input.activated,
      attentionRequired: false,
      activatedAt: config.activatedAt,
      deactivatedAt: config.deactivatedAt,
      activatedBy: config.activatedBy,
      updatedAt: now,
      lastScanAt: null,
      nextEligibleScanAt: null,
      lastSuccessfulCompletion: null,
      lastError: null,
    },
  };
}

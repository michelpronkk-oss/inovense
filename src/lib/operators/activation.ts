// Operator activation - the real, user-set gate for a workspace's
// unattended scheduled operator scan (the Trigger.dev daily cron).
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
// (src/trigger/*-operator-scan.ts daily tasks) should consult
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
  activatedAt: string | null;
  deactivatedAt: string | null;
  activatedBy: string | null;
  updatedAt: string | null;
};

function stateFromRow(operatorKey: OperatorKey, row: { enabled: boolean; config: unknown; updated_at?: string | null } | null): OperatorActivationState {
  if (!row) {
    return { operatorKey, activated: false, activatedAt: null, deactivatedAt: null, activatedBy: null, updatedAt: null };
  }
  const config = (row.config ?? {}) as Record<string, unknown>;
  return {
    operatorKey,
    activated: row.enabled === true,
    activatedAt: typeof config.activatedAt === "string" ? config.activatedAt : null,
    deactivatedAt: typeof config.deactivatedAt === "string" ? config.deactivatedAt : null,
    activatedBy: typeof config.activatedBy === "string" ? config.activatedBy : null,
    updatedAt: row.updated_at ?? null,
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

  const row = await supabase
    .from("os_operator_triggers")
    .select("enabled,config,updated_at")
    .eq("workspace_id", input.workspaceId)
    .eq("operator_key", operator.key)
    .eq("trigger_type", ACTIVATION_TRIGGER_TYPE)
    .maybeSingle();

  if (row.error || !row.data) {
    return stateFromRow(operator.key, null);
  }

  return stateFromRow(operator.key, row.data as { enabled: boolean; config: unknown; updated_at?: string | null });
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
      activatedAt: config.activatedAt,
      deactivatedAt: config.deactivatedAt,
      activatedBy: config.activatedBy,
      updatedAt: now,
    },
  };
}

import "server-only";

import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/**
 * What recovery is allowed to do with one stale step.
 *
 * SAFE_TO_RETRY is deliberately the narrowest case: it only applies when the
 * approval that gates the step is still `pending`, which proves the execution
 * claim in the approve route never fired and therefore no provider request was
 * ever sent. Everything else is held for a human.
 */
export type RecoveryDisposition =
  | "safe_to_retry"
  | "blocked"
  | "reconnect_required"
  | "execution_unknown"
  | "permanent_failure";

export type StuckStepDecision = {
  disposition: RecoveryDisposition;
  /** Persisted status for the step. Recovery never sets `completed`. */
  nextStatus: "awaiting_approval" | "blocked" | "failed";
  blockReason: string;
};

export type StuckStepFacts = {
  stuckMinutes: number;
  /** Status of the canonical approval gating this step, if it has one. */
  approvalStatus: string | null;
  /** Status of the durable execution intent linked to this step, if it has one. */
  intentStatus: string | null;
  connectorReconnectRequired: boolean;
  connectorHealthy: boolean;
  executionEligible: boolean;
  emergencyStopEnabled: boolean;
  permanentAfterMinutes?: number;
};

/** Intent states that mean a provider request may already have left this system. */
const UNCERTAIN_INTENT_STATUSES = ["authorized", "executing"];
/** Intent states that mean the outcome is already known, one way or the other. */
const RESOLVED_INTENT_STATUSES = ["succeeded", "failed", "denied"];
const RESOLVED_APPROVAL_STATUSES = ["approved", "rejected", "failed", "partially_completed"];

const DEFAULT_PERMANENT_AFTER_MINUTES = 24 * 60;

/**
 * Classify one stale executing step. Pure, so the ordering below is directly
 * testable.
 *
 * The order is a safety order, not a convenience order. Uncertain execution is
 * evaluated first and can never be overridden by age, health, or policy: if a
 * customer-facing write may already have happened, the only correct answer is
 * to stop and ask a human. A blocked workflow is preferable to a duplicated
 * external action.
 */
export function classifyStuckWorkflowStep(facts: StuckStepFacts): StuckStepDecision {
  const approval = facts.approvalStatus;
  const intent = facts.intentStatus;

  // 1. Execution may already have happened. Never retried, never guessed.
  const claimed = approval === "executing";
  const intentUncertain = intent !== null && UNCERTAIN_INTENT_STATUSES.includes(intent);
  const noEvidenceAtAll = approval === null && intent === null;
  if (claimed || intentUncertain || noEvidenceAtAll) {
    return { disposition: "execution_unknown", nextStatus: "blocked", blockReason: "execution_unknown" };
  }

  // 2. The outcome is known but the workflow was never reconciled. A human
  //    reconciles from the approval record; recovery does not invent an
  //    outcome and does not re-run anything.
  if ((approval !== null && RESOLVED_APPROVAL_STATUSES.includes(approval)) || (intent !== null && RESOLVED_INTENT_STATUSES.includes(intent))) {
    return { disposition: "blocked", nextStatus: "blocked", blockReason: "execution_result_unreconciled" };
  }

  // 3. Recovery is bounded. A step that has been stale for a day stops being
  //    reprocessed rather than churning forever.
  if (facts.stuckMinutes >= (facts.permanentAfterMinutes ?? DEFAULT_PERMANENT_AFTER_MINUTES)) {
    return { disposition: "permanent_failure", nextStatus: "failed", blockReason: "recovery_exhausted" };
  }

  // 4. Controls that must survive recovery exactly as they survive execution.
  if (facts.emergencyStopEnabled) {
    return { disposition: "blocked", nextStatus: "blocked", blockReason: "emergency_stop_active" };
  }
  if (!facts.executionEligible) {
    return { disposition: "blocked", nextStatus: "blocked", blockReason: "workspace_execution_ineligible" };
  }
  if (facts.connectorReconnectRequired) {
    return { disposition: "reconnect_required", nextStatus: "blocked", blockReason: "reconnect_required" };
  }
  if (!facts.connectorHealthy) {
    return { disposition: "blocked", nextStatus: "blocked", blockReason: "connector_not_ready" };
  }

  // 5. The one provably safe case: the approval was never claimed, so nothing
  //    was ever sent. The step returns to its approval gate; it does not
  //    execute, and a human still decides.
  if (approval === "pending") {
    return { disposition: "safe_to_retry", nextStatus: "awaiting_approval", blockReason: "" };
  }

  return { disposition: "blocked", nextStatus: "blocked", blockReason: "execution_recovery_required" };
}

export type WorkflowRecoverySummary = {
  workspaceId: string;
  scanned: number;
  reviewed: number;
  safeToRetry: number;
  blocked: number;
  reconnectRequired: number;
  executionUnknown: number;
  permanentFailure: number;
  oldestStuckAgeMinutes: number | null;
};

type StepRow = {
  id: string;
  workflow_id: string;
  connector_key: string | null;
  execution_intent_id: string | null;
  approval_id: string | null;
  updated_at: string | null;
};

function ageMinutes(value: string | null, nowMs: number): number {
  if (!value) return 0;
  const at = new Date(value).getTime();
  return Number.isFinite(at) ? Math.max(0, Math.round((nowMs - at) / 60_000)) : 0;
}

function connectorState(truth: SafeConnectorTruth[], connectorKey: string | null): { healthy: boolean; reconnectRequired: boolean } {
  if (!connectorKey) return { healthy: false, reconnectRequired: false };
  const row = truth.find((item) => item.connectorKey === connectorKey);
  if (!row) return { healthy: false, reconnectRequired: false };
  return {
    healthy: ["connected", "healthy"].includes(row.status) && row.executable !== false && !row.reconnectRequired,
    reconnectRequired: row.reconnectRequired === true || row.status === "reconnect_required",
  };
}

/**
 * Move stale executing steps into a truthful, human-reviewable state.
 *
 * This function never contacts a provider and never retries a provider write
 * after an ambiguous result. The linked execution intent and approval record
 * are the evidence an operator reconciles before deciding what to do next.
 *
 * It is workspace isolated, batch bounded, and idempotent: every write is
 * conditional on the step still being `executing`, so a recovery pass racing a
 * live execution loses the race harmlessly instead of overwriting it.
 */
export async function recoverStuckWorkflowSteps(input: {
  workspaceId: string;
  olderThanMinutes?: number;
  limit?: number;
  permanentAfterMinutes?: number;
  supabase?: SupabaseAdmin;
  now?: Date;
}): Promise<WorkflowRecoverySummary> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const age = Math.max(5, Math.min(input.olderThanMinutes ?? 30, 24 * 60));
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));
  const threshold = new Date(nowMs - age * 60_000).toISOString();

  const result = await supabase
    .from("os_workflow_steps")
    .select("id,workflow_id,connector_key,execution_intent_id,approval_id,updated_at")
    .eq("workspace_id", input.workspaceId)
    .eq("status", "executing")
    .lt("updated_at", threshold)
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (result.error) throw new Error(`Stuck workflow steps could not be loaded: ${result.error.message}`);
  const steps = (result.data ?? []) as StepRow[];

  const summary: WorkflowRecoverySummary = {
    workspaceId: input.workspaceId, scanned: steps.length, reviewed: 0, safeToRetry: 0,
    blocked: 0, reconnectRequired: 0, executionUnknown: 0, permanentFailure: 0, oldestStuckAgeMinutes: null,
  };
  if (steps.length === 0) return summary;
  summary.oldestStuckAgeMinutes = Math.max(...steps.map((step) => ageMinutes(step.updated_at, nowMs)));

  // Workspace-level controls are read once per pass, not per step, so a large
  // batch cannot turn into a burst of policy and billing reads.
  const approvalIds = steps.flatMap((step) => step.approval_id ? [step.approval_id] : []);
  const intentIds = steps.flatMap((step) => step.execution_intent_id ? [step.execution_intent_id] : []);
  const [truth, eligibility, policy, approvals, intents] = await Promise.all([
    getConnectorTruth({ workspaceId: input.workspaceId, supabase }).catch(() => [] as SafeConnectorTruth[]),
    getWorkspaceExecutionEligibility(input.workspaceId, supabase).catch(() => ({ eligible: false } as { eligible: boolean })),
    loadPolicyWorkspaceSettings({ workspaceId: input.workspaceId, supabase }).catch(() => ({ emergencyStopEnabled: true })),
    approvalIds.length
      ? supabase.from("os_approvals").select("id,status").eq("workspace_id", input.workspaceId).in("id", approvalIds)
      : Promise.resolve({ data: [], error: null }),
    intentIds.length
      ? supabase.from("os_execution_intents").select("id,status").eq("workspace_id", input.workspaceId).in("id", intentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const statusMap = (value: unknown): Map<string, string> => new Map(
    (Array.isArray(value) ? value : [])
      .map((row) => row as { id?: unknown; status?: unknown })
      .filter((row) => typeof row.id === "string")
      .map((row): [string, string] => [String(row.id), String(row.status ?? "")]),
  );
  const approvalStatus = statusMap(approvals.data);
  const intentStatus = statusMap(intents.data);

  for (const step of steps) {
    const connector = connectorState(truth, step.connector_key);
    const decision = classifyStuckWorkflowStep({
      stuckMinutes: ageMinutes(step.updated_at, nowMs),
      approvalStatus: step.approval_id ? approvalStatus.get(step.approval_id) ?? null : null,
      intentStatus: step.execution_intent_id ? intentStatus.get(step.execution_intent_id) ?? null : null,
      connectorReconnectRequired: connector.reconnectRequired,
      connectorHealthy: connector.healthy,
      executionEligible: eligibility.eligible === true,
      emergencyStopEnabled: policy.emergencyStopEnabled === true,
      permanentAfterMinutes: input.permanentAfterMinutes,
    });

    // The `status = executing` guard is what makes a recovery pass safe to run
    // beside a live execution: if the real worker has already moved on, this
    // update matches zero rows and changes nothing.
    const update = await supabase
      .from("os_workflow_steps")
      .update({ status: decision.nextStatus, block_reason: decision.blockReason || null })
      .eq("id", step.id)
      .eq("workspace_id", input.workspaceId)
      .eq("status", "executing")
      .select("id")
      .maybeSingle();
    if (update.error) throw new Error(`Stuck workflow step could not be reviewed: ${update.error.message}`);
    if (!update.data) continue;

    summary.reviewed += 1;
    if (decision.disposition === "safe_to_retry") summary.safeToRetry += 1;
    else if (decision.disposition === "reconnect_required") summary.reconnectRequired += 1;
    else if (decision.disposition === "execution_unknown") summary.executionUnknown += 1;
    else if (decision.disposition === "permanent_failure") summary.permanentFailure += 1;
    else summary.blocked += 1;

    // A workflow whose step is now held for review is not "executing" any
    // more. Completed workflows are never reopened.
    if (decision.nextStatus !== "awaiting_approval") {
      await supabase
        .from("os_workflow_runs")
        .update({ status: "blocked" })
        .eq("id", step.workflow_id)
        .eq("workspace_id", input.workspaceId)
        .not("status", "eq", "completed")
        .not("status", "eq", "cancelled");
    }
  }
  return summary;
}

/**
 * Workspaces that currently have at least one stale executing step. This is a
 * single bounded index-backed query, so the scheduler never has to walk every
 * workspace in the product to find the few that need attention.
 */
export async function listWorkspacesWithStuckWorkflowSteps(input: {
  olderThanMinutes?: number;
  limit?: number;
  supabase?: SupabaseAdmin;
  now?: Date;
}): Promise<string[]> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const now = input.now ?? new Date();
  const age = Math.max(5, Math.min(input.olderThanMinutes ?? 30, 24 * 60));
  const threshold = new Date(now.getTime() - age * 60_000).toISOString();
  const result = await supabase
    .from("os_workflow_steps")
    .select("workspace_id")
    .eq("status", "executing")
    .lt("updated_at", threshold)
    .order("updated_at", { ascending: true })
    .limit(Math.max(1, Math.min(input.limit ?? 500, 2_000)));
  if (result.error) throw new Error(`Stuck workflow workspaces could not be listed: ${result.error.message}`);
  const ids = (Array.isArray(result.data) ? result.data : []).map((row) => String((row as { workspace_id?: unknown }).workspace_id ?? "")).filter(Boolean);
  return Array.from(new Set(ids));
}

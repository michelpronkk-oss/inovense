import "server-only";

// "Why didn't Auterim act?"
//
// This is the support-facing explanation layer. It answers with reason codes
// and plain human copy derived from state Auterim already persists: connector
// truth, billing eligibility, workspace policy, operator activation, workflow
// step block reasons, approval state, and the shared provider-failure record.
//
// It deliberately exposes NO business content. It never returns a message
// subject, a ticket body, a recipient, a provider payload, or a stack trace -
// only counts, codes, and copy a customer can act on.

import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";
import { getOperatorActivationState } from "@/lib/operators/activation";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import { getProviderFailureSnapshot } from "@/lib/runtime/provider-health";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type InactionReasonCode =
  | "emergency_stop_active"
  | "billing_ineligible"
  | "operator_inactive"
  | "connector_reconnect_required"
  | "connector_permission_required"
  | "connector_degraded"
  | "connector_unhealthy"
  | "connector_target_not_configured"
  | "provider_write_failed"
  | "execution_unknown"
  | "policy_denied"
  | "approval_pending"
  | "approval_rejected"
  | "action_materialization_incomplete"
  | "workflow_blocked"
  | "workflow_deduped"
  | "signal_suppressed"
  | "signal_waiting"
  | "outcome_pending"
  | "nothing_qualified";

export type InactionReason = {
  code: InactionReasonCode;
  /** Short human sentence. Safe to show a customer verbatim. */
  message: string;
  action?: { label: string; href: string };
};

const COPY: Record<InactionReasonCode, { message: string; action?: { label: string; href: string } }> = {
  emergency_stop_active: { message: "Emergency stop is on for this workspace, so Auterim prepared work but did not send anything.", action: { label: "Review controls", href: "/app/settings/controls" } },
  billing_ineligible: { message: "This workspace is not currently eligible to run real actions, so execution was held.", action: { label: "Plans and billing", href: "/app/settings/billing" } },
  operator_inactive: { message: "The operator that would handle this is not activated yet, so it did not pick the work up.", action: { label: "Operators", href: "/app/operators" } },
  connector_reconnect_required: { message: "A connected system needs to be reconnected before Auterim can read or act there.", action: { label: "Connections", href: "/app/connections" } },
  connector_permission_required: { message: "A connected system is missing a permission Auterim needs, so that step stayed unavailable.", action: { label: "Connections", href: "/app/connections" } },
  connector_degraded: { message: "A connected system is experiencing repeated transient failures, so Auterim is holding work until it recovers.", action: { label: "Connections", href: "/app/connections" } },
  connector_unhealthy: { message: "A connected system is not healthy right now, so Auterim held the work rather than acting on stale access.", action: { label: "Connections", href: "/app/connections" } },
  connector_target_not_configured: { message: "The destination for this action has not been chosen yet, for example a project, board, or channel.", action: { label: "Connections", href: "/app/connections" } },
  provider_write_failed: { message: "The connected system rejected or could not complete the action. Auterim recorded it and did not retry it blindly.", action: { label: "Activity", href: "/app/activity" } },
  execution_unknown: { message: "A request may have reached the connected system before the connection dropped. Auterim stopped and flagged it for review instead of risking a duplicate.", action: { label: "Activity", href: "/app/activity" } },
  policy_denied: { message: "Current workspace policy does not allow this action, so it was not performed.", action: { label: "Review controls", href: "/app/settings/controls" } },
  approval_pending: { message: "The work is ready and waiting for a human decision.", action: { label: "Approvals", href: "/app/approvals" } },
  approval_rejected: { message: "This action was reviewed and rejected, so nothing was sent.", action: { label: "Approvals", href: "/app/approvals" } },
  action_materialization_incomplete: { message: "Auterim did not yet have everything it needs to prepare an exact, reviewable action.", action: { label: "Connections", href: "/app/connections" } },
  workflow_blocked: { message: "A step in the response plan is blocked, so the later steps did not run.", action: { label: "Activity", href: "/app/activity" } },
  workflow_deduped: { message: "Auterim already had an open plan for this, so it did not create a second one.", action: { label: "Activity", href: "/app/activity" } },
  signal_suppressed: { message: "Signals were detected but held, because the operator, plan, or connector was not ready at the time.", action: { label: "Operators", href: "/app/operators" } },
  signal_waiting: { message: "Signals are still waiting to be processed.", action: { label: "Activity", href: "/app/activity" } },
  outcome_pending: { message: "The action ran and Auterim is still waiting for the connected system to show a result before claiming an outcome.", action: { label: "Activity", href: "/app/activity" } },
  nothing_qualified: { message: "Nothing in the connected systems met the bar for action, so Auterim deliberately did nothing.", action: { label: "Activity", href: "/app/activity" } },
};

export type InactionFacts = {
  emergencyStopEnabled: boolean;
  executionEligible: boolean;
  activatedOperatorKeys: string[];
  reconnectRequiredConnectors: string[];
  permissionRequiredConnectors: string[];
  degradedConnectors?: string[];
  unhealthyConnectors: string[];
  pendingApprovals: number;
  rejectedApprovals: number;
  /** Tally of os_workflow_steps.block_reason. Codes only, never content. */
  blockReasons: Record<string, number>;
  suppressedCandidates: number;
  waitingCandidates: number;
  completedStepsWithoutOutcome: number;
  providerFailingConnectors: string[];
};

/**
 * Turn verified workspace facts into ordered reason codes. Pure, so the
 * ordering is directly testable.
 *
 * The order is "what a human should fix first": controls and billing, then
 * activation, then connections, then execution outcomes, then the ordinary
 * waiting states. Only the safest true explanations are returned - this never
 * guesses.
 */
export function describeInactionReasons(facts: InactionFacts): InactionReason[] {
  const reasons: InactionReasonCode[] = [];
  const has = (reason: string) => (facts.blockReasons[reason] ?? 0) > 0;

  if (facts.emergencyStopEnabled) reasons.push("emergency_stop_active");
  if (!facts.executionEligible) reasons.push("billing_ineligible");
  if (facts.activatedOperatorKeys.length === 0) reasons.push("operator_inactive");
  if (facts.reconnectRequiredConnectors.length > 0) reasons.push("connector_reconnect_required");
  if (facts.permissionRequiredConnectors.length > 0) reasons.push("connector_permission_required");
  if ((facts.degradedConnectors?.length ?? 0) > 0) reasons.push("connector_degraded");
  if (facts.unhealthyConnectors.length > 0) reasons.push("connector_unhealthy");

  // Execution truth beats everything below it: an uncertain external write is
  // the single most important thing a human needs to see.
  if (has("execution_unknown")) reasons.push("execution_unknown");
  if (facts.providerFailingConnectors.length > 0 || has("approval_execution_failed")) reasons.push("provider_write_failed");
  if (has("policy_blocked")) reasons.push("policy_denied");

  if (["connector_not_ready", "jira_issue_type_not_configured", "jira_destination_not_configured", "jira_issue_type_invalid", "asana_project_not_selected", "trello_destination_not_selected", "slack_destination_not_selected", "teams_destination_not_selected"].some(has)) {
    reasons.push("connector_target_not_configured");
  }
  if (["verified_draft_not_available", "verified_recipient_not_available", "source_reference_missing", "unsupported_workflow_step", "policy_input_missing"].some(has)) {
    reasons.push("action_materialization_incomplete");
  }
  if (has("approval_already_exists")) reasons.push("workflow_deduped");
  if (["dependency_unavailable", "execution_recovery_required", "execution_result_unreconciled", "recovery_exhausted"].some(has)) reasons.push("workflow_blocked");

  if (facts.rejectedApprovals > 0) reasons.push("approval_rejected");
  if (facts.pendingApprovals > 0) reasons.push("approval_pending");
  if (facts.suppressedCandidates > 0) reasons.push("signal_suppressed");
  if (facts.waitingCandidates > 0) reasons.push("signal_waiting");
  if (facts.completedStepsWithoutOutcome > 0) reasons.push("outcome_pending");

  if (reasons.length === 0) reasons.push("nothing_qualified");
  return Array.from(new Set(reasons)).map((code) => ({ code, ...COPY[code] }));
}

function connectorBuckets(truth: SafeConnectorTruth[]) {
  const connected = truth.filter((row) => !["missing", "not_connected", "not_configured"].includes(row.status));
  return {
    reconnectRequired: connected.filter((row) => row.reconnectRequired === true || row.status === "reconnect_required").map((row) => row.connectorKey),
    permissionRequired: connected.filter((row) => row.status === "permission_required" || (row.missingScopes?.length ?? 0) > 0).map((row) => row.connectorKey),
    degraded: connected.filter((row) => row.operationalDegraded === true).map((row) => row.connectorKey),
    unhealthy: connected.filter((row) => row.status === "error" || (row.executable === false && row.status !== "permission_required")).map((row) => row.connectorKey),
  };
}

function tallyBlockReasons(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of Array.isArray(value) ? value : []) {
    const reason = (row as { block_reason?: unknown }).block_reason;
    if (typeof reason !== "string" || !reason) continue;
    out[reason] = (out[reason] ?? 0) + 1;
  }
  return out;
}

async function safeCount(query: PromiseLike<{ count?: number | null; error: unknown }>): Promise<number> {
  try {
    const result = await query;
    return !result.error && typeof result.count === "number" ? result.count : 0;
  } catch {
    return 0;
  }
}

async function safeRows(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<unknown> {
  try {
    const result = await query;
    return result.error ? [] : result.data;
  } catch {
    return [];
  }
}

const OPERATOR_KEYS = ["revenue", "client_flow", "operations"] as const;

/**
 * Gather verified workspace facts and explain current inaction. Every read is
 * bounded and workspace scoped, and a failing source degrades that one fact
 * instead of failing the whole answer.
 */
export async function diagnoseWorkspaceInaction(input: { workspaceId: string; supabase?: SupabaseAdmin }): Promise<{ reasons: InactionReason[]; facts: InactionFacts }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workspaceId = input.workspaceId;

  const [truth, eligibility, policy, activations, blockedSteps, pending, rejected, suppressed, waiting, completedSteps, providerFailures] = await Promise.all([
    getConnectorTruth({ workspaceId, supabase }).catch(() => [] as SafeConnectorTruth[]),
    getWorkspaceExecutionEligibility(workspaceId, supabase).catch(() => ({ eligible: false })),
    loadPolicyWorkspaceSettings({ workspaceId, supabase }).catch(() => ({ emergencyStopEnabled: false })),
    Promise.all(OPERATOR_KEYS.map(async (operatorKey) => ({
      operatorKey,
      activated: (await getOperatorActivationState({ workspaceId, operatorKey, supabase }).catch(() => null))?.activated === true,
    }))),
    safeRows(supabase.from("os_workflow_steps").select("block_reason").eq("workspace_id", workspaceId).eq("status", "blocked").limit(200)),
    safeCount(supabase.from("os_approvals").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "pending")),
    safeCount(supabase.from("os_approvals").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "rejected")),
    safeCount(supabase.from("os_signal_candidates").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "suppressed")),
    safeCount(supabase.from("os_signal_candidates").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["new", "routed", "processing"])),
    safeCount(supabase.from("os_workflow_steps").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "completed")),
    getProviderFailureSnapshot({ workspaceId, supabase }),
  ]);

  const buckets = connectorBuckets(truth);
  const facts: InactionFacts = {
    emergencyStopEnabled: policy.emergencyStopEnabled === true,
    executionEligible: eligibility.eligible === true,
    activatedOperatorKeys: activations.filter((item) => item.activated).map((item) => item.operatorKey),
    reconnectRequiredConnectors: buckets.reconnectRequired,
    permissionRequiredConnectors: buckets.permissionRequired,
    degradedConnectors: buckets.degraded,
    unhealthyConnectors: buckets.unhealthy,
    pendingApprovals: pending,
    rejectedApprovals: rejected,
    blockReasons: tallyBlockReasons(blockedSteps),
    suppressedCandidates: suppressed,
    waitingCandidates: waiting,
    completedStepsWithoutOutcome: completedSteps,
    providerFailingConnectors: Array.from(new Set([...providerFailures.degradedConnectors, ...providerFailures.reconnectRequiredConnectors])).sort(),
  };
  return { reasons: describeInactionReasons(facts), facts };
}

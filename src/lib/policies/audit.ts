import { logOperatorEvent } from "@/lib/operators/logging";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { PolicyDecision, PolicyInput } from "@/lib/policies/types";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

function eventTypeForDecision(decision: PolicyDecision["decision"], live: boolean): string {
  if (live && decision === "blocked") return "policy_execution_blocked_live_policy";
  if (live && decision === "draft_only") return "policy_execution_draft_only_live_policy";
  if (decision === "allow_auto") return "policy_decision_allow_auto";
  if (decision === "approval_required") return "policy_decision_approval_required";
  if (decision === "draft_only") return "policy_decision_draft_only";
  return "policy_decision_blocked";
}

/**
 * Record a policy decision into os_operator_run_logs (no new table). Best-effort:
 * never throws, so a logging failure cannot block execution. Never logs tokens.
 */
export async function logPolicyDecision(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  runId?: string | null;
  approvalId?: string | null;
  decision: PolicyDecision;
  policyInput: PolicyInput;
  live?: boolean;
}): Promise<void> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const runId = input.runId || "policy";
  try {
    const res = await logOperatorEvent({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      level: input.decision.decision === "blocked" ? "warn" : "info",
      eventType: eventTypeForDecision(input.decision.decision, Boolean(input.live)),
      message: `Policy ${input.decision.decision} for ${input.policyInput.actionType} via ${input.policyInput.connectorKey}: ${input.decision.reason}`,
      metadata: {
        approvalId: input.approvalId ?? null,
        operatorKey: input.policyInput.operatorKey,
        actionType: input.policyInput.actionType,
        connectorKey: input.policyInput.connectorKey,
        destinationType: input.policyInput.destinationType,
        riskLevel: input.decision.riskLevel,
        confidence: input.policyInput.confidence ?? null,
        decision: input.decision.decision,
        matchedRuleId: input.decision.matchedRuleId,
        userFacingLabel: input.decision.userFacingLabel,
        auditLabel: input.decision.auditLabel,
        live: Boolean(input.live),
      },
    });
    if (res.error) throw new Error(res.error.message);
  } catch (error) {
    console.warn("[policy-audit] logPolicyDecision skipped", {
      workspaceId: input.workspaceId,
      error: error instanceof Error ? error.message : "Unknown policy audit error",
    });
  }
}

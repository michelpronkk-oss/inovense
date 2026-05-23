import type { OSState, Policy, PolicyActionType, PolicyEffect } from "@/lib/os/types";

export interface PolicyEvaluationAction {
  id: string;
  agentId: string;
  toolId: string;
  connectorId?: string;
  actionType: PolicyActionType;
  target?: string;
  payload: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high";
  customerFacing?: boolean;
  externalRecipient?: boolean;
  financialAction?: boolean;
  destructiveAction?: boolean;
  containsPricing?: boolean;
  amount?: number;
  metadata?: Record<string, unknown>;
}

export interface PolicyEvaluationResult {
  decision: PolicyEffect;
  matchedPolicies: Policy[];
  reason: string;
  requiredReviewerRole?: string;
  safeToExecute: boolean;
}

function matchesPolicy(action: PolicyEvaluationAction, policy: Policy): boolean {
  if (!policy.enabled || !policy.active) return false;
  if (policy.actionType !== action.actionType) return false;
  if (policy.appliesToAgents.length > 0 && !policy.appliesToAgents.includes("all") && !policy.appliesToAgents.includes(action.agentId)) return false;
  if (policy.appliesToConnectors.length > 0 && action.connectorId && !policy.appliesToConnectors.includes("all") && !policy.appliesToConnectors.includes(action.connectorId)) return false;

  const cond = policy.conditions;
  if (cond.externalRecipient !== undefined && cond.externalRecipient !== Boolean(action.externalRecipient)) return false;
  if (cond.containsPricing !== undefined && cond.containsPricing !== Boolean(action.containsPricing)) return false;
  if (cond.customerFacing !== undefined && cond.customerFacing !== Boolean(action.customerFacing)) return false;
  if (cond.financialAction !== undefined && cond.financialAction !== Boolean(action.financialAction)) return false;
  if (cond.destructiveAction !== undefined && cond.destructiveAction !== Boolean(action.destructiveAction)) return false;
  if (cond.amountOver !== undefined && (action.amount ?? 0) <= cond.amountOver) return false;
  if (cond.domainNotAllowlisted && typeof action.target === "string" && policy.allowlist?.length) {
    const isAllowed = policy.allowlist.some((domain) => action.target?.toLowerCase().endsWith(domain.toLowerCase()));
    if (isAllowed) return false;
  }
  return true;
}

function decisionPriority(decision: PolicyEffect): number {
  if (decision === "block") return 3;
  if (decision === "require_approval") return 2;
  return 1;
}

export function evaluatePolicy(action: PolicyEvaluationAction, state: OSState): PolicyEvaluationResult {
  const matched = state.policies.filter((policy) => matchesPolicy(action, policy));
  if (matched.length === 0) {
    return {
      decision: "allow",
      matchedPolicies: [],
      reason: "No matching policy. Action allowed by default guardrail.",
      safeToExecute: true,
    };
  }

  const strongest = matched.sort((a, b) => decisionPriority(b.decision) - decisionPriority(a.decision))[0];
  if (strongest.decision === "block") {
    return {
      decision: "block",
      matchedPolicies: matched,
      reason: strongest.blockedReason || `Blocked by policy "${strongest.name}".`,
      requiredReviewerRole: strongest.reviewerRole,
      safeToExecute: false,
    };
  }
  if (strongest.decision === "require_approval") {
    return {
      decision: "require_approval",
      matchedPolicies: matched,
      reason: `Approval required by policy "${strongest.name}".`,
      requiredReviewerRole: strongest.reviewerRole,
      safeToExecute: false,
    };
  }
  return {
    decision: "allow",
    matchedPolicies: matched,
    reason: `Allowed by policy "${strongest.name}".`,
    requiredReviewerRole: strongest.reviewerRole,
    safeToExecute: true,
  };
}

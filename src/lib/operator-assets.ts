import type { OperatorKey } from "@/lib/operators/registry";

/** Canonical public avatar paths for the operator registry. */
export const OPERATOR_ASSETS: Record<OperatorKey, { avatar: string }> = {
  revenue: { avatar: "/operators/revenue-operator.png" },
  client_flow: { avatar: "/operators/client-flow-operator.png" },
  operations: { avatar: "/operators/operations-operator.png" },
  marketing: { avatar: "/operators/marketing-operator.png" },
  seo_implementation: { avatar: "/operators/seo-implementation-operator.png" },
  proposal_quote: { avatar: "/operators/proposal-and-quote-operator.png" },
  review_proof: { avatar: "/operators/review-and-proof-operator.png" },
  knowledge_memory: { avatar: "/operators/knowledge-and-memory-operator.png" },
  approval_risk: { avatar: "/operators/approval-and-risk-operator.png" },
  finance_billing: { avatar: "/operators/finance-and-billing-operator.png" },
  support: { avatar: "/operators/support-operator.png" },
  hiring_team: { avatar: "/operators/hiring-and-team-operator.png" },
  social_community: { avatar: "/operators/social-and-community-operator.png" },
  website_conversion: { avatar: "/operators/website-conversion-operator.png" },
  automation_architect: { avatar: "/operators/automation-architect-operator.png" },
};

export function operatorAvatarPath(key: OperatorKey) {
  return OPERATOR_ASSETS[key].avatar;
}

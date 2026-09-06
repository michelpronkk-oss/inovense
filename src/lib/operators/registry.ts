import type { PlanTier } from "@/lib/os/entitlements";

export type OperatorKey =
  | "revenue"
  | "client_flow"
  | "operations"
  | "marketing"
  | "seo_implementation"
  | "proposal_quote"
  | "review_proof"
  | "knowledge_memory"
  | "approval_risk"
  | "finance_billing"
  | "support"
  | "hiring_team"
  | "social_community"
  | "website_conversion"
  | "automation_architect";

export type OperatorCategory =
  | "revenue"
  | "delivery"
  | "operations"
  | "marketing"
  | "governance"
  | "finance"
  | "people"
  | "support"
  | "automation";

export type OperatorReleaseStatus = "ready" | "preview" | "coming_next" | "requires_connector";
export type OperatorMode = "draft" | "approval_gated" | "read_only" | "real_action";
export type ConnectorKey = "gmail" | "microsoft" | "hubspot" | "google_drive" | "notion" | "slack" | "stripe" | "linear" | "calendar" | "trello";

export type OperatorDefinition = {
  key: OperatorKey;
  name: string;
  category: OperatorCategory;
  businessOutcome: string;
  description: string;
  requiredConnectors: ConnectorKey[];
  optionalConnectors: ConnectorKey[];
  capabilities: string[];
  allowedActions: string[];
  approvalRequiredActions: string[];
  blockedActions: string[];
  supportedModes: OperatorMode[];
  planAvailability: PlanTier[];
  currentReleaseStatus: OperatorReleaseStatus;
};

export const OPERATOR_REGISTRY: OperatorDefinition[] = [
  {
    key: "revenue",
    name: "Revenue Operator",
    category: "revenue",
    businessOutcome: "Qualify inbound demand, prepare follow-ups, and keep CRM next steps current.",
    description: "Prepares lead follow-up work from workspace context and routes outbound sends through approval.",
    // Non-load-bearing for Revenue's real gating: readiness.ts's revenue
    // branch is capability-based (any connector with email.send_after_approval
    // - Gmail or Microsoft 365 - satisfies readiness) and scan.ts follows the
    // same connector the readiness result reports. This field is only read
    // for its .length in readinessPercent()'s scoring math, so it is kept as
    // a single entry rather than widened to ["gmail","microsoft"], which
    // would double that denominator and skew the percentage for no reason.
    requiredConnectors: ["gmail"],
    optionalConnectors: ["hubspot", "slack"],
    capabilities: ["Lead triage", "Follow-up drafting", "CRM contact/deal updates", "Approval-gated email send"],
    allowedActions: ["gmail.createDraft", "approval.create", "hubspot.createOrUpdateContact", "hubspot.createOrUpdateDeal", "memory.read", "log.write"],
    approvalRequiredActions: ["gmail.sendExternal", "hubspot.updateContact", "hubspot.updateDeal"],
    blockedActions: ["hubspot.deleteRecord", "pricing.change", "payment.refund"],
    supportedModes: ["draft", "approval_gated", "real_action"],
    planAvailability: ["starter", "growth", "operator", "enterprise"],
    currentReleaseStatus: "requires_connector",
  },
  {
    key: "client_flow",
    name: "Client Flow Operator",
    category: "delivery",
    businessOutcome: "Prepare client updates and onboarding messages without losing approval control.",
    description: "Drafts onboarding and client-facing communication with future document context support.",
    requiredConnectors: ["gmail"],
    optionalConnectors: ["google_drive", "notion", "calendar"],
    capabilities: ["Client update drafting", "Onboarding checklist preparation", "Handoff summaries"],
    allowedActions: ["gmail.createDraft", "approval.create", "memory.read", "log.write"],
    approvalRequiredActions: ["gmail.sendExternal", "calendar.createExternalInvite"],
    blockedActions: ["pricing.change", "contract.changeTerms", "file.shareExternalWithoutApproval"],
    supportedModes: ["draft", "approval_gated"],
    planAvailability: ["starter", "growth", "operator", "enterprise"],
    currentReleaseStatus: "requires_connector",
  },
  {
    key: "operations",
    name: "Operations Operator",
    category: "operations",
    businessOutcome: "Turn approvals, logs, and workspace activity into operational follow-through.",
    description: "Monitors project boards, finds stalled work, and prepares approved internal updates.",
    requiredConnectors: ["trello"],
    optionalConnectors: ["slack", "notion", "linear"],
    capabilities: ["Trello board and card monitoring", "Stalled, overdue, and blocked work detection", "Internal Slack update drafting", "Trello action preparation (move, comment, create)"],
    allowedActions: ["memory.read", "log.write", "trello.scanBoards", "trello.prepareAction", "slack.prepareMessage"],
    approvalRequiredActions: ["trello.moveCard", "trello.addComment", "trello.createCard", "slack.postMessage"],
    blockedActions: ["payment.refund", "pricing.change", "destructive.delete"],
    supportedModes: ["draft", "read_only", "approval_gated"],
    planAvailability: ["starter", "growth", "operator", "enterprise"],
    currentReleaseStatus: "requires_connector",
  },
  {
    key: "marketing",
    name: "Marketing Operator",
    category: "marketing",
    businessOutcome: "Prepare campaign briefs and content drafts from approved context.",
    description: "Preview operator for marketing briefs, content drafts, and campaign preparation.",
    requiredConnectors: [],
    optionalConnectors: ["google_drive", "notion", "slack"],
    capabilities: ["Campaign brief drafting", "Content outline preparation", "Brand memory lookup"],
    allowedActions: ["memory.read", "log.write"],
    approvalRequiredActions: ["publish.external", "gmail.sendExternal"],
    blockedActions: ["adSpend.changeBudget", "pricing.change"],
    supportedModes: ["draft", "read_only"],
    planAvailability: ["growth", "operator", "enterprise"],
    currentReleaseStatus: "preview",
  },
  {
    key: "seo_implementation",
    name: "SEO Implementation Operator",
    category: "marketing",
    businessOutcome: "Prepare technical and content SEO implementation steps.",
    description: "Planned operator for SEO issue preparation, content updates, and implementation queues.",
    requiredConnectors: [],
    optionalConnectors: ["google_drive", "notion"],
    capabilities: ["SEO task preparation", "Metadata draft planning", "Content gap summaries"],
    allowedActions: ["memory.read", "log.write"],
    approvalRequiredActions: ["website.publishChange"],
    blockedActions: ["dns.change", "production.deployWithoutApproval"],
    supportedModes: ["draft"],
    planAvailability: ["growth", "operator", "enterprise"],
    currentReleaseStatus: "coming_next",
  },
  {
    key: "proposal_quote",
    name: "Proposal & Quote Operator",
    category: "revenue",
    businessOutcome: "Prepare proposal and quote drafts with approval gates before client delivery.",
    description: "Preview operator for proposal preparation, quote assembly, and client-ready drafts.",
    requiredConnectors: [],
    optionalConnectors: ["gmail", "hubspot", "google_drive"],
    capabilities: ["Proposal outline drafting", "Quote summary preparation", "Scope checklist preparation"],
    allowedActions: ["memory.read", "gmail.createDraft", "log.write"],
    approvalRequiredActions: ["gmail.sendExternal", "quote.send", "contract.changeTerms"],
    blockedActions: ["pricing.change", "discount.applyWithoutApproval"],
    supportedModes: ["draft", "approval_gated"],
    planAvailability: ["growth", "operator", "enterprise"],
    currentReleaseStatus: "preview",
  },
  {
    key: "review_proof",
    name: "Review & Proof Operator",
    category: "governance",
    businessOutcome: "Catch quality, policy, and client-facing mistakes before work leaves the workspace.",
    description: "Planned operator for proofreading, consistency checks, and release review preparation.",
    requiredConnectors: [],
    optionalConnectors: ["google_drive", "notion"],
    capabilities: ["Proofing checklist", "Brand consistency review", "Risk flagging"],
    allowedActions: ["memory.read", "log.write"],
    approvalRequiredActions: ["clientFacing.approve"],
    blockedActions: ["publish.externalWithoutApproval"],
    supportedModes: ["read_only", "draft"],
    planAvailability: ["growth", "operator", "enterprise"],
    currentReleaseStatus: "coming_next",
  },
  {
    key: "knowledge_memory",
    name: "Knowledge & Memory Operator",
    category: "operations",
    businessOutcome: "Keep reusable business context structured and safer to apply.",
    description: "Preview operator for memory cleanup, knowledge summaries, and context preparation.",
    requiredConnectors: [],
    optionalConnectors: ["google_drive", "notion"],
    capabilities: ["Memory summary drafting", "Knowledge deduplication", "Context tagging"],
    allowedActions: ["memory.read", "memory.stageWrite", "log.write"],
    approvalRequiredActions: ["memory.write", "file.shareExternal"],
    blockedActions: ["memory.deleteWithoutApproval"],
    supportedModes: ["draft", "read_only"],
    planAvailability: ["growth", "operator", "enterprise"],
    currentReleaseStatus: "preview",
  },
  {
    key: "approval_risk",
    name: "Approval & Risk Operator",
    category: "governance",
    businessOutcome: "Reduce risky execution by routing sensitive work to the right approval path.",
    description: "Preview operator for policy review, risk classification, and approval queue preparation.",
    requiredConnectors: [],
    optionalConnectors: ["gmail", "slack"],
    capabilities: ["Risk classification", "Approval routing preparation", "Policy gap summaries"],
    allowedActions: ["memory.read", "approval.prepare", "log.write"],
    approvalRequiredActions: ["policy.change", "approval.autoApproveRule"],
    blockedActions: ["approval.bypass", "auditLog.delete"],
    supportedModes: ["read_only", "draft"],
    planAvailability: ["growth", "operator", "enterprise"],
    currentReleaseStatus: "preview",
  },
  {
    key: "finance_billing",
    name: "Finance & Billing Operator",
    category: "finance",
    businessOutcome: "Prepare billing follow-ups and finance summaries without taking unsafe money actions.",
    description: "Planned operator for billing summaries, customer follow-ups, and finance task preparation.",
    requiredConnectors: [],
    optionalConnectors: ["stripe", "gmail", "hubspot"],
    capabilities: ["Billing summary drafting", "Payment follow-up preparation", "Revenue event review"],
    allowedActions: ["memory.read", "gmail.createDraft", "log.write"],
    approvalRequiredActions: ["gmail.sendExternal", "invoice.send"],
    blockedActions: ["payment.refund", "price.change", "subscription.cancel"],
    supportedModes: ["draft", "read_only"],
    planAvailability: ["operator", "enterprise"],
    currentReleaseStatus: "coming_next",
  },
  {
    key: "support",
    name: "Support Operator",
    category: "support",
    businessOutcome: "Prepare accurate support replies and escalation notes.",
    description: "Planned operator for support drafting and safe customer reply preparation.",
    requiredConnectors: [],
    optionalConnectors: ["gmail", "notion"],
    capabilities: ["Support reply drafting", "Escalation summary preparation", "Customer context lookup"],
    allowedActions: ["memory.read", "gmail.createDraft", "log.write"],
    approvalRequiredActions: ["gmail.sendExternal", "refund.request"],
    blockedActions: ["payment.refund", "account.delete"],
    supportedModes: ["draft", "approval_gated"],
    planAvailability: ["growth", "operator", "enterprise"],
    currentReleaseStatus: "coming_next",
  },
  {
    key: "hiring_team",
    name: "Hiring & Team Operator",
    category: "people",
    businessOutcome: "Prepare hiring pipeline updates and team onboarding drafts.",
    description: "Planned operator for candidate summaries, interview prep, and onboarding checklists.",
    requiredConnectors: [],
    optionalConnectors: ["gmail", "notion", "calendar"],
    capabilities: ["Candidate summary preparation", "Interview checklist drafting", "Onboarding plan drafting"],
    allowedActions: ["memory.read", "gmail.createDraft", "log.write"],
    approvalRequiredActions: ["gmail.sendExternal", "calendar.createExternalInvite"],
    blockedActions: ["offer.changeCompensation", "candidate.rejectWithoutApproval"],
    supportedModes: ["draft"],
    planAvailability: ["operator", "enterprise"],
    currentReleaseStatus: "coming_next",
  },
  {
    key: "social_community",
    name: "Social & Community Operator",
    category: "marketing",
    businessOutcome: "Prepare social content and community responses for review.",
    description: "Planned operator for social drafting, response prep, and community signal summaries.",
    requiredConnectors: [],
    optionalConnectors: ["gmail", "notion"],
    capabilities: ["Post draft preparation", "Community response drafting", "Social signal summaries"],
    allowedActions: ["memory.read", "log.write"],
    approvalRequiredActions: ["social.publish", "gmail.sendExternal"],
    blockedActions: ["adSpend.changeBudget", "delete.publicPost"],
    supportedModes: ["draft"],
    planAvailability: ["growth", "operator", "enterprise"],
    currentReleaseStatus: "coming_next",
  },
  {
    key: "website_conversion",
    name: "Website Conversion Operator",
    category: "marketing",
    businessOutcome: "Prepare conversion improvements and website experiment plans.",
    description: "Planned operator for website improvement drafts, test ideas, and conversion summaries.",
    requiredConnectors: [],
    optionalConnectors: ["google_drive", "notion"],
    capabilities: ["Landing page review", "Experiment plan drafting", "Conversion issue summaries"],
    allowedActions: ["memory.read", "log.write"],
    approvalRequiredActions: ["website.publishChange", "analytics.changeGoal"],
    blockedActions: ["production.deployWithoutApproval", "tracking.delete"],
    supportedModes: ["draft", "read_only"],
    planAvailability: ["growth", "operator", "enterprise"],
    currentReleaseStatus: "coming_next",
  },
  {
    key: "automation_architect",
    name: "Automation Architect Operator",
    category: "automation",
    businessOutcome: "Design safe automations with triggers, approvals, and logging before implementation.",
    description: "Planned operator for automation design, connector mapping, and workflow preparation.",
    requiredConnectors: [],
    optionalConnectors: ["hubspot", "gmail", "slack", "linear"],
    capabilities: ["Workflow design", "Connector gap analysis", "Policy mapping"],
    allowedActions: ["memory.read", "log.write"],
    approvalRequiredActions: ["workflow.enable", "webhook.sendExternal"],
    blockedActions: ["secret.expose", "destructive.bulkDelete"],
    supportedModes: ["draft", "read_only"],
    planAvailability: ["operator", "enterprise"],
    currentReleaseStatus: "coming_next",
  },
];

export function getOperatorDefinition(operatorKey: string): OperatorDefinition | undefined {
  return OPERATOR_REGISTRY.find((operator) => operator.key === operatorKey);
}

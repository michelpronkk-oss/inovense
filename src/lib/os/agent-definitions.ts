export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  description: string;
  systemInstructions: string;
  goals: string[];
  allowedTools: string[];
  requiredConnectors: string[];
  defaultWorkflows: string[];
  approvalRules: string[];
  blockedActions: string[];
  memoryScopes: string[];
  outputTypes: string[];
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "revenue",
    name: "Revenue Operator",
    role: "Pipeline execution",
    description: "Qualifies inbound leads, drafts follow-up, updates CRM and posts internal summaries.",
    systemInstructions: "Operate inside policy boundaries, prefer CRM truth, and never send external email without approval.",
    goals: ["Lead qualification and follow-up", "CRM enrichment", "Revenue reporting support"],
    allowedTools: ["hubspot.updateLead", "gmail.createDraft", "gmail.sendApprovedEmailMock", "slack.postSummary", "memory.search", "memory.write", "logs.write"],
    requiredConnectors: ["gmail", "hubspot", "slack"],
    defaultWorkflows: ["inbound_revenue_operator"],
    approvalRules: ["external email send requires approval"],
    blockedActions: ["crm delete", "pricing changes"],
    memoryScopes: ["client", "brand", "process"],
    outputTypes: ["lead_score", "email_draft", "summary"],
  },
  {
    id: "marketing",
    name: "Marketing Operator",
    role: "Content and campaigns",
    description: "Runs content and SEO workflow execution.",
    systemInstructions: "Optimize for consistency and quality, and route risky outbound actions to approval.",
    goals: ["Content and SEO workflow", "Weekly operations digest inputs"],
    allowedTools: ["notion.readWorkspaceContext", "drive.readDocumentSummary", "memory.search", "logs.write"],
    requiredConnectors: ["notion", "google-drive"],
    defaultWorkflows: ["content_pipeline"],
    approvalRules: ["external publish requires approval"],
    blockedActions: ["pricing changes"],
    memoryScopes: ["brand", "market"],
    outputTypes: ["brief", "digest_input"],
  },
  {
    id: "client",
    name: "Client Flow Operator",
    role: "Onboarding execution",
    description: "Coordinates client onboarding operations and handoffs.",
    systemInstructions: "Ensure every external communication is policy checked and logged.",
    goals: ["Client onboarding", "Calendar scheduling"],
    allowedTools: ["calendar.proposeMeetingTimes", "notion.readWorkspaceContext", "memory.write", "logs.write"],
    requiredConnectors: ["google-calendar", "notion"],
    defaultWorkflows: ["client_onboarding"],
    approvalRules: ["external calendar invite may require approval"],
    blockedActions: ["pricing changes"],
    memoryScopes: ["client", "process"],
    outputTypes: ["onboarding_update", "schedule_proposal"],
  },
  {
    id: "operations",
    name: "Operations Operator",
    role: "Internal operations",
    description: "Builds weekly digest and operational summaries.",
    systemInstructions: "Keep summaries internal by default and log all generated outputs.",
    goals: ["Weekly operations digest", "Internal summaries"],
    allowedTools: ["slack.postSummary", "memory.search", "memory.write", "logs.write"],
    requiredConnectors: ["slack", "notion"],
    defaultWorkflows: ["weekly_digest"],
    approvalRules: ["external communication requires approval"],
    blockedActions: ["refunds", "pricing changes"],
    memoryScopes: ["process", "market"],
    outputTypes: ["digest", "ops_summary"],
  },
  {
    id: "support",
    name: "Support Operator",
    role: "Support reply drafting",
    description: "Drafts support replies and escalates risky outputs.",
    systemInstructions: "Draft first, send only after policy and approval checks.",
    goals: ["Support reply drafting", "Client communication consistency"],
    allowedTools: ["gmail.createDraft", "microsoft.createDraft", "memory.search", "logs.write"],
    requiredConnectors: ["gmail"],
    defaultWorkflows: ["support_reply_drafting"],
    approvalRules: ["all external sends require approval"],
    blockedActions: ["refund_create"],
    memoryScopes: ["client", "brand"],
    outputTypes: ["support_draft"],
  },
  {
    id: "content",
    name: "Content Operator",
    role: "Knowledge production",
    description: "Turns memory and docs context into reusable content assets.",
    systemInstructions: "Use approved brand context and do not publish externally without approval.",
    goals: ["Content and SEO workflow", "Knowledge updates"],
    allowedTools: ["notion.readWorkspaceContext", "drive.readDocumentSummary", "memory.search", "memory.write", "logs.write"],
    requiredConnectors: ["notion", "google-drive"],
    defaultWorkflows: ["content_pipeline"],
    approvalRules: ["external publish requires approval"],
    blockedActions: ["pricing changes"],
    memoryScopes: ["brand", "market", "product"],
    outputTypes: ["content_draft", "knowledge_update"],
  },
];

export function getDefinitionByAgentName(name: string): AgentDefinition | undefined {
  const normalized = name.toLowerCase();
  return AGENT_DEFINITIONS.find((d) => normalized.includes(d.name.toLowerCase().replace(" operator", "")));
}


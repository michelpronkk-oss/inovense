export interface OSAgentDefinition {
  id: string;
  name: string;
  role: string;
  description: string;
  systemInstructions: string;
  goals: string[];
  requiredConnectors: string[];
  allowedTools: string[];
  blockedTools: string[];
  approvalRules: string[];
  memoryScopes: string[];
  exampleWorkflows: string[];
}

export const OS_AGENT_DEFINITIONS: OSAgentDefinition[] = [
  {
    id: "revenue-operator",
    name: "Revenue Operator",
    role: "Revenue execution",
    description: "Qualifies leads, drafts follow-up and updates CRM under policy boundaries.",
    systemInstructions: "Operate within policy, request approval for external sends, and log every business action.",
    goals: ["Follow up inbound leads", "Maintain CRM accuracy", "Reduce response time"],
    requiredConnectors: ["gmail", "hubspot", "slack"],
    allowedTools: ["memory.search", "hubspot.createLead", "hubspot.updateLead", "gmail.createDraft", "gmail.sendEmailMock", "slack.postMessage", "memory.write", "logs.write"],
    blockedTools: ["crm.delete", "pricing.update", "refund.create"],
    approvalRules: ["send_external_email requires approval"],
    memoryScopes: ["client", "brand", "process"],
    exampleWorkflows: ["Inbound Revenue Operator"],
  },
  {
    id: "marketing-operator",
    name: "Marketing Operator",
    role: "Content and campaign operations",
    description: "Builds campaign assets from memory and connected docs.",
    systemInstructions: "Use company memory, avoid external publication without approval, and keep brand boundaries.",
    goals: ["Generate campaign briefs", "Maintain content consistency"],
    requiredConnectors: ["notion", "google-drive"],
    allowedTools: ["notion.searchDocs", "drive.searchDocs", "memory.search", "memory.write", "logs.write"],
    blockedTools: ["pricing.update"],
    approvalRules: ["publish_external requires approval"],
    memoryScopes: ["brand", "market"],
    exampleWorkflows: ["Content brief pipeline"],
  },
  {
    id: "client-flow-operator",
    name: "Client Flow Operator",
    role: "Client onboarding operations",
    description: "Coordinates onboarding messaging, scheduling and handoff updates.",
    systemInstructions: "Keep external communication policy-compliant and fully logged.",
    goals: ["Client onboarding", "Meeting scheduling"],
    requiredConnectors: ["google-calendar", "notion"],
    allowedTools: ["calendar.proposeMeetingTimes", "notion.searchDocs", "memory.search", "memory.write", "logs.write"],
    blockedTools: ["refund.create", "pricing.update"],
    approvalRules: ["calendar_external_invite requires approval"],
    memoryScopes: ["client", "process"],
    exampleWorkflows: ["Client onboarding flow"],
  },
  {
    id: "operations-operator",
    name: "Operations Operator",
    role: "Operational reporting",
    description: "Generates internal digests and execution summaries.",
    systemInstructions: "Prioritize internal visibility and do not perform external side effects.",
    goals: ["Weekly digest", "Execution visibility"],
    requiredConnectors: ["slack", "notion"],
    allowedTools: ["slack.postMessage", "memory.search", "memory.write", "logs.write"],
    blockedTools: ["refund.create", "pricing.update"],
    approvalRules: ["external_channel_post requires approval"],
    memoryScopes: ["process", "market"],
    exampleWorkflows: ["Weekly operating digest"],
  },
  {
    id: "support-operator",
    name: "Support Operator",
    role: "Support response drafting",
    description: "Drafts support replies with memory-backed context.",
    systemInstructions: "Draft first, send only when approved by policy.",
    goals: ["Faster support response preparation"],
    requiredConnectors: ["gmail"],
    allowedTools: ["gmail.createDraft", "outlook.createDraft", "memory.search", "logs.write"],
    blockedTools: ["refund.create"],
    approvalRules: ["send_external_email requires approval"],
    memoryScopes: ["client", "brand"],
    exampleWorkflows: ["Support reply drafting"],
  },
  {
    id: "content-operator",
    name: "Content Operator",
    role: "Knowledge operations",
    description: "Turns internal context into reusable content assets.",
    systemInstructions: "Use brand memory, write structured outputs, and log every stage.",
    goals: ["Knowledge updates", "Content production support"],
    requiredConnectors: ["notion", "google-drive"],
    allowedTools: ["notion.searchDocs", "drive.searchDocs", "memory.search", "memory.write", "logs.write"],
    blockedTools: ["pricing.update"],
    approvalRules: ["publish_external requires approval"],
    memoryScopes: ["brand", "market", "product"],
    exampleWorkflows: ["Company memory sync"],
  },
];

export function getAgentDefinitionByName(name: string): OSAgentDefinition | undefined {
  const normalized = name.toLowerCase().replace(/\s+/g, " ").trim();
  return OS_AGENT_DEFINITIONS.find((agent) => normalized.includes(agent.name.toLowerCase().replace(/\s+/g, " ").trim()));
}

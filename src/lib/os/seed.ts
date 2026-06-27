import {
  CONNECTOR_CATEGORY_LABELS,
  listConnectors,
  type ConnectorDefinition,
} from "@/lib/connectors/registry";
import { getOperatorDefinition } from "@/lib/operators/registry";
import type { OSState, Agent, Workflow, Approval, MemoryEntry, Connector, ExecutionLog, Policy } from "@/lib/os/types";

// Deterministic IDs so seed is stable across reloads
export const SEED_AGENT_IDS = {
  rv: "agent-rv-001",
  mk: "agent-mk-002",
  cf: "agent-cf-003",
  op: "agent-op-004",
};

function ts(minutesAgo: number): string {
  const d = new Date(Date.now() - minutesAgo * 60 * 1000);
  return d.toISOString();
}

function timeStr(minutesAgo: number): string {
  const d = new Date(Date.now() - minutesAgo * 60 * 1000);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const SEED_AGENTS: Agent[] = [
  {
    id: SEED_AGENT_IDS.rv,
    name: "Revenue Operator",
    mark: "RV",
    color: "#4DE8E1",
    templateId: "revenue",
    status: "running",
    workspaceId: "ws-atlas",
    currentTask: "Drafting follow-ups for 14 leads in stage 2",
    deployedAt: ts(14 * 24 * 60),
    config: { tools: ["Gmail", "HubSpot", "Clearbit"], approvalPolicy: "require_approval", memoryScope: ["client", "brand"] },
    stats: { actionsThisWeek: 0, outputsThisWeek: 0, totalRuns: 0, metricLabel: "actions/wk", metricValue: "0" },
  },
  {
    id: SEED_AGENT_IDS.mk,
    name: "Marketing Operator",
    mark: "MK",
    color: "#A78BFA",
    templateId: "marketing",
    status: "running",
    workspaceId: "ws-atlas",
    currentTask: "Generating Q3 campaign brief from research notes",
    deployedAt: ts(21 * 24 * 60),
    config: { tools: ["Notion", "Search"], approvalPolicy: "require_approval", memoryScope: ["brand", "market"] },
    stats: { actionsThisWeek: 0, outputsThisWeek: 0, totalRuns: 0, metricLabel: "outputs/wk", metricValue: "0" },
  },
  {
    id: SEED_AGENT_IDS.cf,
    name: "Client Flow Operator",
    mark: "CF",
    color: "#5B8DEF",
    templateId: "client",
    status: "awaiting",
    workspaceId: "ws-atlas",
    currentTask: "Awaiting approval - new client kit (Northwind Co.)",
    deployedAt: ts(8 * 24 * 60),
    config: { tools: ["Notion", "Gmail", "Stripe"], approvalPolicy: "require_approval", memoryScope: ["client", "process"] },
    stats: { actionsThisWeek: 0, outputsThisWeek: 0, totalRuns: 0, metricLabel: "intakes/wk", metricValue: "0" },
  },
  {
    id: SEED_AGENT_IDS.op,
    name: "Operations Operator",
    mark: "OP",
    color: "#51D88A",
    templateId: "operations",
    status: "running",
    workspaceId: "ws-atlas",
    currentTask: "Compiling weekly summary across 6 channels",
    deployedAt: ts(30 * 24 * 60),
    config: { tools: ["Notion", "Slack", "Linear"], approvalPolicy: "allow", memoryScope: ["process", "market"] },
    stats: { actionsThisWeek: 0, outputsThisWeek: 0, totalRuns: 0, metricLabel: "saved/wk", metricValue: "0" },
  },
];

export const SEED_WORKFLOWS: Workflow[] = [
  { id: "wf-001", name: "Inbound revenue workflow", trigger: "Form submission", agentId: SEED_AGENT_IDS.rv, agentColor: "#4DE8E1", agentLabel: "Revenue", status: "active", totalRuns: 0, successRate: 0, avgDuration: "—", lastRun: "never", createdAt: ts(14 * 24 * 60) },
  { id: "wf-002", name: "Lead qualification", trigger: "CRM stage change", agentId: SEED_AGENT_IDS.rv, agentColor: "#4DE8E1", agentLabel: "Revenue", status: "active", totalRuns: 0, successRate: 0, avgDuration: "—", lastRun: "never", createdAt: ts(20 * 24 * 60) },
  { id: "wf-003", name: "Client onboarding kit", trigger: "New deal closed", agentId: SEED_AGENT_IDS.cf, agentColor: "#5B8DEF", agentLabel: "Client Flow", status: "active", totalRuns: 0, successRate: 0, avgDuration: "—", lastRun: "never", createdAt: ts(8 * 24 * 60) },
  { id: "wf-004", name: "Weekly operating digest", trigger: "Schedule · Mon 9AM", agentId: SEED_AGENT_IDS.op, agentColor: "#51D88A", agentLabel: "Operations", status: "active", totalRuns: 0, successRate: 0, avgDuration: "—", lastRun: "never", createdAt: ts(30 * 24 * 60) },
  { id: "wf-005", name: "Q3 SEO content pipeline", trigger: "Keyword batch upload", agentId: SEED_AGENT_IDS.mk, agentColor: "#A78BFA", agentLabel: "Marketing", status: "active", totalRuns: 0, successRate: 0, avgDuration: "—", lastRun: "never", createdAt: ts(21 * 24 * 60) },
  { id: "wf-006", name: "Outbound campaign launch", trigger: "Manual trigger", agentId: SEED_AGENT_IDS.mk, agentColor: "#A78BFA", agentLabel: "Marketing", status: "paused", totalRuns: 0, successRate: 0, avgDuration: "—", lastRun: "never", createdAt: ts(25 * 24 * 60) },
];

export const SEED_APPROVALS: Approval[] = [
  {
    id: "appr-001",
    type: "proposal",
    title: "Proposal - Northwind onboarding kit",
    body: "Draft includes pricing, SOW, kickoff checklist. Memory: Acme Industries (similar scope).",
    agentId: SEED_AGENT_IDS.cf,
    agentMark: "CF",
    agentColor: "#5B8DEF",
    runId: "run-seed-001",
    status: "pending",
    createdAt: ts(4),
  },
  {
    id: "appr-002",
    type: "follow-up",
    title: "Reply to Aiko Tanaka - intro thread",
    body: "Proposes Tue 2pm slot. Stage: intro to discovery. Includes 2 case studies.",
    agentId: SEED_AGENT_IDS.rv,
    agentMark: "RV",
    agentColor: "#4DE8E1",
    runId: "run-seed-002",
    status: "pending",
    createdAt: ts(11),
  },
  {
    id: "appr-003",
    type: "campaign",
    title: "Outbound launch - Q3 industry list",
    body: "320 contacts, 3 segments. Will pause if reply rate below 4% within 48h.",
    agentId: SEED_AGENT_IDS.mk,
    agentMark: "MK",
    agentColor: "#A78BFA",
    runId: "run-seed-003",
    status: "pending",
    createdAt: ts(28),
  },
];

export const SEED_MEMORY: MemoryEntry[] = [
  { id: "mem-001", type: "client", label: "Acme Industries", summary: "Enterprise Â· $184k deal", content: "B2B SaaS company, 280 employees. Key contact: Sarah Mills (COO). Preferred communication: email, formal tone. Signed 2 previous proposals. Response time typically 24h.", tags: ["crm", "proposal"], agentScope: [SEED_AGENT_IDS.rv, SEED_AGENT_IDS.cf], fieldCount: 14, updatedAt: ts(120) },
  { id: "mem-002", type: "client", label: "Northwind Co.", summary: "SMB Â· $28k deal active", content: "E-commerce brand, 45 employees. Key contact: James Northfield (CEO). Fast decision maker. Budget-conscious. Needs clear ROI framing. Currently in onboarding phase.", tags: ["crm", "onboarding"], agentScope: [SEED_AGENT_IDS.rv, SEED_AGENT_IDS.cf], fieldCount: 6, updatedAt: ts(4) },
  { id: "mem-003", type: "brand", label: "Brand voice guide", summary: "Tone, style, messaging rules", content: "Tone: premium, calm, confident. No hype, no agency swagger. Clear before clever. Use short, punchy sentences. Avoid em dashes. Active voice preferred. Never use leverage or synergy.", tags: ["content", "voice"], agentScope: [SEED_AGENT_IDS.rv, SEED_AGENT_IDS.mk, SEED_AGENT_IDS.cf], fieldCount: 22, updatedAt: ts(3 * 24 * 60) },
  { id: "mem-004", type: "process", label: "Proposal process", summary: "Discovery to close", content: "1. Discovery call. 2. Research audit (24h). 3. Proposal draft by Proposal Operator. 4. Internal review. 5. Client delivery. 6. Follow-up after 48h if no response.", tags: ["sales", "process"], agentScope: [SEED_AGENT_IDS.rv, SEED_AGENT_IDS.cf], fieldCount: 8, updatedAt: ts(7 * 24 * 60) },
  { id: "mem-005", type: "market", label: "Competitor landscape", summary: "Direct + indirect analysis", content: "Direct: Agency X, Studio Y, Firm Z. Key differentiators: we build, not manage. Premium tier, fixed scope, no retainers. Indirect: freelancers, no-code tools, internal hires.", tags: ["research", "market"], agentScope: [SEED_AGENT_IDS.mk], fieldCount: 11, updatedAt: ts(5 * 24 * 60) },
  { id: "mem-006", type: "product", label: "Service catalogue", summary: "Pricing + scope definitions", content: "Build: from $4,200. Systems: from $3,800. Growth: from $2,200/mo. All scoped, no open-ended retainers. Deposit: 50% upfront. Delivery: 4-8 weeks.", tags: ["product", "pricing"], agentScope: [SEED_AGENT_IDS.rv, SEED_AGENT_IDS.cf], fieldCount: 18, updatedAt: ts(2 * 24 * 60) },
];

function syncModeForDefinition(def: ConnectorDefinition): Connector["syncMode"] {
  if (def.eventTypes.length > 0) return "realtime";
  if (def.authType === "manual" || def.authType === "api_key" || def.authType === "webhook") return "manual";
  return "scheduled";
}

function syncFreqForDefinition(def: ConnectorDefinition): string {
  if (def.status !== "available") return "Not available";
  if (def.authType === "direct_oauth") return "Approval-gated";
  if (def.authType === "nango") return "Managed";
  return "Manual";
}

export function connectorDefinitionToSeedConnector(def: ConnectorDefinition): Connector {
  const available = def.status === "available";
  return {
    id: def.connectorKey,
    name: def.displayName,
    letter: def.letter,
    color: def.color,
    category: CONNECTOR_CATEGORY_LABELS[def.category],
    description: def.description,
    status: available ? "available" : "disabled",
    health: "disabled",
    lastSync: "-",
    syncMode: syncModeForDefinition(def),
    syncFreq: syncFreqForDefinition(def),
    permissions: [...def.readActions, ...def.writeActions],
    readScopes: def.readActions,
    writeScopes: def.writeActions,
    approvalRequiredFor: def.approvalRequiredActions,
    blockedActions: def.riskLevel === "high" ? ["External write without approval"] : [],
    operatorsAllowed: def.usedByOperators.map((key) => getOperatorDefinition(key)?.name ?? key),
    records: available ? "Not connected" : def.setupNotes,
    lastSynced: "",
    eventsSynced: 0,
    authErrors: 0,
    recentSyncEvents: [],
    isConnected: false,
    source: "seed",
  };
}

export const SEED_CONNECTORS: Connector[] = listConnectors().map(connectorDefinitionToSeedConnector);

export function reconcileConnectorsWithRegistry(connectors: Connector[]): Connector[] {
  return listConnectors().map((def) => {
    const base = connectorDefinitionToSeedConnector(def);
    const existing = connectors.find((connector) => connector.id.replace(/-/g, "_") === def.connectorKey);
    const keepRealTruth = Boolean(
      existing?.isConnected
      && (existing.source === "native" || existing.source === "nango")
      && def.status === "available"
    );

    return keepRealTruth ? { ...base, ...existing, id: def.connectorKey } : base;
  });
}

export const SEED_LOGS: ExecutionLog[] = [];

export const SEED_POLICIES: Policy[] = [
  {
    id: "pol-001",
    name: "Outbound communication gate",
    description: "External email sends require approval before execution.",
    enabled: true,
    category: "communication",
    actionType: "email.send",
    appliesToAgents: ["all"],
    appliesToConnectors: ["gmail", "outlook"],
    conditions: { externalRecipient: true },
    decision: "require_approval",
    reviewerRole: "admin",
    blockedReason: "",
    allowlist: [],
    createdAt: ts(60 * 24 * 30),
    updatedAt: ts(30),
    active: true,
  },
  {
    id: "pol-002",
    name: "CRM auto-write",
    description: "Revenue and client flow operators may update CRM records.",
    enabled: true,
    category: "crm",
    actionType: "crm.updateRecord",
    appliesToAgents: [SEED_AGENT_IDS.rv, SEED_AGENT_IDS.cf],
    appliesToConnectors: ["hubspot", "salesforce"],
    conditions: {},
    decision: "allow",
    reviewerRole: "admin",
    createdAt: ts(60 * 24 * 30),
    updatedAt: ts(25),
    active: true,
  },
  {
    id: "pol-003",
    name: "Delete CRM record blocked",
    description: "Destructive CRM deletes are blocked by execution guardrails.",
    enabled: true,
    category: "crm",
    actionType: "crm.deleteRecord",
    appliesToAgents: ["all"],
    appliesToConnectors: ["hubspot", "salesforce", "pipedrive"],
    conditions: { destructiveAction: true },
    decision: "block",
    blockedReason: "CRM delete is blocked in this workspace.",
    createdAt: ts(60 * 24 * 30),
    updatedAt: ts(24),
    active: true,
  },
  {
    id: "pol-004",
    name: "Pricing changes blocked",
    description: "Pricing updates are blocked from operator actions.",
    enabled: true,
    category: "pricing",
    actionType: "pricing.change",
    appliesToAgents: ["all"],
    appliesToConnectors: ["all"],
    conditions: { containsPricing: true },
    decision: "block",
    blockedReason: "Pricing changes require manual admin operations outside operators.",
    createdAt: ts(60 * 24 * 30),
    updatedAt: ts(23),
    active: true,
  },
  {
    id: "pol-005",
    name: "Payment refunds blocked",
    description: "Payment refunds are blocked from operator execution.",
    enabled: true,
    category: "payments",
    actionType: "payment.refund",
    appliesToAgents: ["all"],
    appliesToConnectors: ["stripe", "shopify"],
    conditions: { financialAction: true },
    decision: "block",
    blockedReason: "Refund actions are blocked by policy.",
    createdAt: ts(60 * 24 * 30),
    updatedAt: ts(22),
    active: true,
  },
  {
    id: "pol-006",
    name: "Memory write allowed",
    description: "Operators may write approved memory updates.",
    enabled: true,
    category: "memory",
    actionType: "memory.write",
    appliesToAgents: ["all"],
    appliesToConnectors: ["all"],
    conditions: {},
    decision: "allow",
    createdAt: ts(60 * 24 * 30),
    updatedAt: ts(21),
    active: true,
  },
  {
    id: "pol-007",
    name: "Memory delete requires admin approval",
    description: "Memory deletions require admin approval review.",
    enabled: true,
    category: "memory",
    actionType: "memory.delete",
    appliesToAgents: ["all"],
    appliesToConnectors: ["all"],
    conditions: { adminOnly: true, destructiveAction: true },
    decision: "require_approval",
    reviewerRole: "admin",
    createdAt: ts(60 * 24 * 30),
    updatedAt: ts(20),
    active: true,
  },
  {
    id: "pol-008",
    name: "External calendar invite gate",
    description: "External meeting invites require approval.",
    enabled: true,
    category: "calendar",
    actionType: "calendar.createExternalInvite",
    appliesToAgents: ["all"],
    appliesToConnectors: ["google-calendar", "outlook-calendar", "calendly"],
    conditions: { externalRecipient: true },
    decision: "require_approval",
    reviewerRole: "admin",
    createdAt: ts(60 * 24 * 30),
    updatedAt: ts(19),
    active: true,
  },
  {
    id: "pol-009",
    name: "External file sharing blocked",
    description: "External file sharing is blocked for customer-facing actions.",
    enabled: true,
    category: "files",
    actionType: "file.shareExternal",
    appliesToAgents: ["all"],
    appliesToConnectors: ["google-drive", "notion"],
    conditions: { customerFacing: true },
    decision: "block",
    blockedReason: "External file sharing is blocked by workspace guardrails.",
    createdAt: ts(60 * 24 * 30),
    updatedAt: ts(18),
    active: true,
  },
];

export const SEED_WORKSPACE = {
  id: "ws-atlas",
  name: "Workspace",
  environment: "setup",
  region: "eu-west-1",
  plan: "preview",
  planTier: "preview" as const,
  billingStatus: "preview" as const,
};

export const SEED_CURRENT_USER = {
  id: "usr-001",
  name: "Workspace Admin",
  email: "admin@workspace.com",
  roleLabel: "Admin",
  initials: "WA",
  notifications: {
    approvals: true,
    digest: true,
    alerts: true,
  },
};

export const SEED_TEAM_MEMBERS = [
  { id: "tm-001", name: "Workspace Admin", email: "admin@workspace.com", role: "Admin", initials: "WA", color: "#4DE8E1", access: ["All operators", "Approvals", "Settings"], status: "online" as const, active: true },
  { id: "tm-002", name: "Revenue Reviewer", email: "reviewer@inovense.com", role: "Operator - Reviewer", initials: "RR", color: "#A78BFA", access: ["Approvals", "Outputs"], status: "online" as const, active: true },
  { id: "tm-003", name: "Workflow Viewer", email: "viewer@inovense.com", role: "Operator - Viewer", initials: "WV", color: "#5B8DEF", access: ["Insights", "Outputs"], status: "offline" as const, active: true },
];

export const SEED_SETTINGS = {
  workspace: {
    name: "Atlas & Co.",
    environment: "production",
    region: "eu-west-1",
    plan: "preview",
  },
  approvalPolicy: {
    outboundComms: "Always require approval",
    proposals: "Always require approval",
    internalReports: "Auto-approve within policy",
    crmWrites: "Auto-approve",
  },
  notifications: {
    approvalInbox: "Slack - #revops + email",
    weeklyDigest: "Email - Monday 9AM",
    errorAlerts: "Slack - #ops-alerts",
    newAgentDeployed: "Email - all admins",
  },
};

export const SEED_DASHBOARD = {
  timeRange: "7d" as const,
  viewMode: "operator" as const,
};

export function buildSeedState(): OSState {
  return {
    onboarding: {
      isComplete: false,
      mainGoals: [],
      initialConnectors: [],
    },
    workspace: SEED_WORKSPACE,
    currentUser: SEED_CURRENT_USER,
    teamMembers: SEED_TEAM_MEMBERS,
    settings: SEED_SETTINGS,
    dashboard: SEED_DASHBOARD,
    agents: SEED_AGENTS,
    agentRuns: [],
    workflows: SEED_WORKFLOWS,
    approvals: SEED_APPROVALS,
    memory: SEED_MEMORY,
    connectors: SEED_CONNECTORS,
    logs: SEED_LOGS,
    policies: SEED_POLICIES,
  };
}

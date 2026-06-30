// Inovense OS — Core data types
// All entities that flow through the dashboard. Supabase-ready row shapes.

export type AgentStatus = "running" | "paused" | "awaiting" | "idle" | "error";
export type RunStatus = "running" | "awaiting_approval" | "completed" | "skipped" | "failed";
export type ApprovalStatus = "pending" | "approved" | "skipped" | "expired";
export type PolicyEffect = "allow" | "require_approval" | "block";
export type PolicyCategory = "communication" | "crm" | "pricing" | "payments" | "memory" | "calendar" | "files" | "internal" | "security";
export type PolicyActionType =
  | "email.createDraft"
  | "email.send"
  | "crm.createRecord"
  | "crm.updateRecord"
  | "crm.deleteRecord"
  | "pricing.change"
  | "payment.refund"
  | "slack.postMessage"
  | "calendar.createExternalInvite"
  | "memory.read"
  | "memory.write"
  | "memory.delete"
  | "file.read"
  | "file.shareExternal"
  | "internal.logWrite"
  | "internal.approvalCreate";
export type LogEventStatus = "ok" | "warn" | "error" | "waiting";
export type ConnectorHealth = "healthy" | "degraded" | "error" | "disabled";
export type ConnectorStateStatus = "connected" | "available" | "error" | "disabled";
export type WorkflowStatus = "active" | "paused" | "draft";
export type StepState = "done" | "active" | "pending" | "failed" | "skipped" | "approval_required";

// ── Agent ──────────────────────────────────────────────────
export interface Agent {
  id: string;
  name: string;
  mark: string;
  color: string;
  templateId: string;
  status: AgentStatus;
  workspaceId: string;
  currentTask: string;
  deployedAt: string;
  config: AgentConfig;
  stats: AgentStats;
}

export interface AgentConfig {
  tools: string[];
  primaryWorkflow?: string;
  approvalPolicy: string;
  memoryScope: string[];
}

export interface AgentStats {
  actionsThisWeek: number;
  outputsThisWeek: number;
  totalRuns: number;
  metricLabel: string;
  metricValue: string;
}

// ── Agent template (static config, not stored in DB) ───────
export interface AgentTemplate {
  id: string;
  name: string;
  mark: string;
  color: string;
  role: string;
  description: string;
  tag: string;
  allowedTools: string[];
  allowedActions: string[];
  requiresApprovalFor: string[];
  blockedActions: string[];
  defaultPolicies: PolicyRule[];
  runSimulation: RunSimulation;
  sampleOutput?: RunOutput;
}

export interface RunSimulation {
  steps: SimStep[];
  approvalType?: ApprovalType;
  approvalTitle?: string;
  approvalBody?: string;
}

export interface SimStep {
  name: string;
  sub: string;
  logEvent: string;
  logMessage: string;
  duration: string;
  logStatus: LogEventStatus;
  requiresApproval?: boolean;
}

// ── Agent run ──────────────────────────────────────────────
export interface AgentRun {
  id: string;
  agentId: string;
  agentMark: string;
  agentColor: string;
  agentName: string;
  workflowId?: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  steps: RunStep[];
  approvalId?: string;
  output?: RunOutput;
  triggeredBy: string;
}

export interface RunStep {
  id?: string;
  name: string;
  sub: string;
  tool?: string;
  riskLevel?: "low" | "medium" | "high";
  output?: string;
  blockedReason?: string;
  state: StepState;
}

export interface RunOutput {
  type: string;
  title: string;
  summary: string;
  wordCount?: number;
}

// ── Workflow ───────────────────────────────────────────────
export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  agentId: string;
  agentColor: string;
  agentLabel: string;
  status: WorkflowStatus;
  totalRuns: number;
  successRate: number;
  avgDuration: string;
  lastRun: string;
  createdAt: string;
}

// ── Approval ───────────────────────────────────────────────
export type ApprovalType = "proposal" | "follow-up" | "campaign" | "report" | "email" | "action";

export interface Approval {
  id: string;
  type: ApprovalType;
  title: string;
  body: string;
  agentId: string;
  agentMark: string;
  agentColor: string;
  runId?: string;
  status: ApprovalStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  proposedAction?: string;
  draftOutput?: string;
  policyChecks?: string[];
  reviewerRole?: string;
  continuationType?: "inbound_revenue_follow_up" | "send_slack_message";
  continuationPayload?: Record<string, unknown>;
}

// ── Memory entry ───────────────────────────────────────────
export type MemoryType = "client" | "brand" | "process" | "market" | "product" | "agent";

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  label: string;
  summary: string;
  content: string;
  tags: string[];
  agentScope: string[];
  fieldCount: number;
  updatedAt: string;
}

// ── Connector ──────────────────────────────────────────────
export interface Connector {
  id: string;
  name: string;
  letter: string;
  color: string;
  category: string;
  description: string;
  status: ConnectorStateStatus;
  health: ConnectorHealth;
  lastSync: string;
  syncMode: "realtime" | "scheduled" | "manual";
  syncFreq: string;
  permissions: string[];
  readScopes: string[];
  writeScopes: string[];
  approvalRequiredFor: string[];
  blockedActions: string[];
  operatorsAllowed: string[];
  records: string;
  lastSynced: string;
  eventsSynced: number;
  authErrors: number;
  recentSyncEvents: string[];
  isConnected: boolean;
  source?: "seed" | "preview" | "native" | "nango";
}

// ── Execution log ──────────────────────────────────────────
export interface ExecutionLog {
  id: string;
  ts: string;
  runId: string;
  agentId: string;
  agentMark: string;
  agentColor: string;
  event: string;
  message: string;
  duration: string;
  status: LogEventStatus;
}

// ── Policy ─────────────────────────────────────────────────
export interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: PolicyCategory;
  actionType: PolicyActionType;
  appliesToAgents: string[];
  appliesToConnectors: string[];
  conditions: {
    externalRecipient?: boolean;
    containsPricing?: boolean;
    containsContractTerms?: boolean;
    customerFacing?: boolean;
    financialAction?: boolean;
    destructiveAction?: boolean;
    adminOnly?: boolean;
    amountOver?: number;
    domainNotAllowlisted?: boolean;
  };
  decision: PolicyEffect;
  reviewerRole?: string;
  limitValue?: string;
  allowlist?: string[];
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  // Legacy aliases kept for compatibility with older modules.
  action?: string;
  effect?: PolicyEffect;
  scope?: string[];
  appliesTo?: string;
  limit?: string;
}

export interface PolicyRule {
  action: string;
  effect: PolicyEffect;
}

// ── Search ─────────────────────────────────────────────────
export type SearchResultType = "agent" | "workflow" | "memory" | "approval" | "page";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  label: string;
  sub: string;
  href: string;
  icon: string;
}

// ── OS-level state shape ───────────────────────────────────
export interface OSState {
  onboarding: OnboardingState;
  workspace: Workspace;
  currentUser: CurrentUser;
  teamMembers: TeamMember[];
  settings: OSSettings;
  dashboard: DashboardState;
  agents: Agent[];
  agentRuns: AgentRun[];
  workflows: Workflow[];
  approvals: Approval[];
  memory: MemoryEntry[];
  connectors: Connector[];
  logs: ExecutionLog[];
  policies: Policy[];
}

export interface OnboardingState {
  isComplete: boolean;
  completedAt?: string;
  companyName?: string;
  websiteUrl?: string;
  companySize?: string;
  industry?: string;
  mainGoals: string[];
  preferredOperator?: string;
  preferredDemoPath?: "operations" | "client_flow" | "revenue";
  approvalOwner?: string;
  initialConnectors: string[];
}

export interface Workspace {
  id: string;
  name: string;
  environment: string;
  region: string;
  plan: string;
  planTier?: "preview" | "starter" | "growth" | "operator" | "enterprise";
  billingStatus?: "preview" | "trialing" | "active" | "past_due" | "canceled";
  trialEndsAt?: string;
  dodoCustomerId?: string;
  dodoSubscriptionId?: string;
  dodoProductId?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  initials: string;
  notifications: {
    approvals: boolean;
    digest: boolean;
    alerts: boolean;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  color: string;
  access: string[];
  status: "online" | "offline" | "pending";
  active: boolean;
}

export interface OSSettings {
  workspace: {
    name: string;
    environment: string;
    region: string;
    plan: string;
  };
  approvalPolicy: {
    outboundComms: string;
    proposals: string;
    internalReports: string;
    crmWrites: string;
    customerEmailMode?: "approval_required" | "draft_only" | "auto_send_low_risk";
    autonomyMode?: "safe" | "assisted" | "managed";
  };
  notifications: {
    approvalInbox: string;
    weeklyDigest: string;
    errorAlerts: string;
    newAgentDeployed: string;
  };
  activation?: {
    preferredDemoPath: "operations" | "client_flow" | "revenue";
    completedAt?: string;
    firstRunAt?: string;
    firstApprovalCreatedAt?: string;
  };
}

export interface DashboardState {
  timeRange: "24h" | "7d" | "30d" | "quarter";
  viewMode: "operator" | "workflow";
}

// ── Deploy config (from modal form) ───────────────────────
export interface DeployConfig {
  templateId: string;
  name: string;
  tools: string;
  workflow: string;
  approvalPolicy: string;
}

/**
 * Stable product-facing models.
 *
 * These types deliberately contain no Supabase row names. Database and
 * provider adapters should map into them at the server boundary so a schema
 * migration cannot silently become a UI contract change.
 */

export type DashboardMetric = {
  key: string;
  name: string;
  value: number | string;
  source: string;
  window: string | null;
  freshness: "live" | "recent" | "stale" | "unknown";
  emptyState: string;
  drilldownRoute: string | null;
};

export type OperatorState = {
  key: string;
  displayName: string;
  state: "setup" | "active" | "active_limited" | "enhanced" | "paused" | "attention" | "unknown";
  enabled: boolean;
  currentTask: string | null;
  lastActivityAt: string | null;
};

export type WorkflowSummary = {
  id: string;
  objective: string;
  operatorKey: string;
  status: string;
  workforceState: string;
  updatedAt: string;
  nextAttention: string | null;
  outcomeCount: number;
};

export type WorkflowDetail = WorkflowSummary & {
  createdAt: string;
  supportingOperators: string[];
  priority: "low" | "normal" | "high";
  confidence: "low" | "medium" | "high";
  steps: Array<{ id: string; order: number; label: string; destination: string; status: string; approvalRequired: boolean; approvalId: string | null; blocker: string | null }>;
  outcomes: Array<{ id: string; label: string; attribution: string; observedAt: string; workflowId?: string | null }>;
};

export type ApprovalSummary = {
  id: string;
  title: string;
  status: string;
  operatorKey: string | null;
  connectorKey: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
  relatedRoute: string;
};

export type ConnectorState = {
  key: string;
  displayName: string;
  status: "connected" | "available" | "error" | "disabled" | "unknown";
  health: "healthy" | "degraded" | "error" | "disabled" | "unknown";
  executable: boolean;
  capabilities: string[];
  lastCheckedAt: string | null;
  setupRoute: string | null;
};

export type CapabilityDefinition = {
  key: string;
  label: string;
  category: string;
  approvalRequired: boolean;
  providerIndependent: boolean;
  connectorKeys: string[];
};

export type MemoryContextEntry = {
  id: string;
  canonicalKey: string;
  label: string;
  summary: string;
  category: string;
  reliability: string;
  freshness: string;
  sourceLabel: string;
  updatedAt: string;
  policyRelevant: boolean;
};

export type ActivityEvent = {
  id: string;
  eventType: string;
  title: string;
  description: string;
  category: string;
  severity: "info" | "success" | "attention" | "failure";
  occurredAt: string;
  targetRoute: string | null;
  evidence: Array<{ key: string; value: string }>;
};

export type ExecutionLogEntry = {
  id: string;
  eventType: string;
  title: string;
  occurredAt: string;
  status: "ok" | "warn" | "error" | "waiting";
  operatorKey: string | null;
  runId: string | null;
};

export type OutcomeSummary = {
  id: string;
  label: string;
  attribution: "observed" | "influenced" | "direct";
  observedAt: string;
  workflowId: string | null;
};

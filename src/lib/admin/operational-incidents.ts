/**
 * Pure, provider-agnostic operational status derivation for the admin System
 * Map. This module only accepts bounded, already-sanitized facts. It never
 * receives provider payloads, credentials, customer content, or error bodies.
 */

export const OPERATIONAL_STATUSES = [
  "healthy", "degraded", "needs_attention", "configuration_required",
  "permission_required", "reconnect_required", "blocked", "inactive",
  "stale", "failing", "unknown", "planned",
] as const;
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];
export type OperationalSeverity = "info" | "warning" | "critical" | null;

export type OperationalNodeState = {
  nodeId: string;
  status: OperationalStatus;
  severity: OperationalSeverity;
  summary: string;
  reasonCode: string | null;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  blockingIssue: string | null;
  recommendedAction: string | null;
  affectedNodeIds: string[];
  source: string;
};

export type OperationalIncident = {
  id: string;
  nodeKey: string;
  status: OperationalStatus;
  severity: Exclude<OperationalSeverity, null>;
  title: string;
  summary: string;
  reasonCode: string;
  startedAt: string | null;
  lastSeenAt: string | null;
  lastHealthyAt: string | null;
  affectedNodeKeys: string[];
  recommendedAction: string;
  source: string;
};

export type OperationalSnapshot = {
  generatedAt: string;
  sourceAvailable: boolean;
  nodes: OperationalNodeState[];
  incidents: OperationalIncident[];
  summary: { healthy: number; warning: number; critical: number; unknown: number };
};

export type SafeOperationalFacts = {
  connectors: Array<{ connectorKey: string; status: string; updatedAt: string | null }>;
  credentials: Array<{ connectorKey: string; status: string; updatedAt: string | null }>;
  providerOperations: Array<{ connectorKey: string; operation: string; lastSuccessAt: string | null; lastFailureAt: string | null; failureKind: string | null; consecutiveFailures: number; last429At: string | null; updatedAt: string | null }>;
  operatorRuns: Array<{ operatorKey: string; status: string; createdAt: string | null; updatedAt: string | null }>;
  operatorTriggers: Array<{ operatorKey: string; enabled: boolean; updatedAt: string | null }>;
  signals: Array<{ status: string; createdAt: string | null; updatedAt: string | null }>;
  signalSync: Array<{ lastSuccessAt: string | null; lastFailureCode: string | null; leaseUntil: string | null; updatedAt: string | null }>;
  workflowSteps: Array<{ status: string; blockReason: string | null; createdAt: string | null; updatedAt: string | null }>;
  approvals: Array<{ status: string; createdAt: string | null; updatedAt: string | null }>;
  executionIntents: Array<{ status: string; reasonCode: string | null; createdAt: string | null; updatedAt: string | null }>;
  taskHeartbeats: Array<{ taskId: string; lastStartedAt: string | null; lastSucceededAt: string | null; lastFailedAt: string | null; lastSafeErrorCode: string | null; expectedCadenceMinutes: number }>;
  emailDeliveries: Array<{ status: string; createdAt: string | null; updatedAt: string | null }>;
  billingSubscriptions: Array<{ status: string; updatedAt: string | null }>;
  billingEvents: Array<{ processingStatus: string; createdAt: string | null; updatedAt: string | null }>;
  availableSources: Set<string>;
};

const CONNECTOR_IMPACT: Record<string, string[]> = {
  gmail: ["operator-revenue", "operator-client_flow"],
  microsoft: ["operator-revenue", "operator-client_flow"],
  microsoft_teams: ["operator-client_flow", "operator-operations"],
  google_drive: ["operator-client_flow", "operator-operations"],
  hubspot: ["operator-revenue"], salesforce: ["operator-revenue"],
  trello: ["operator-client_flow", "operator-operations"],
  asana: ["operator-operations"], jira: ["operator-operations"],
  slack: ["operator-operations"], zendesk: ["operator-client_flow"], intercom: ["operator-client_flow"],
};

export const TASK_CADENCE_MINUTES: Record<string, number> = {
  "workflow-recovery-scan": 15,
  "trial-lifecycle": 60,
  "revenue-operator-daily-scan": 60,
  "client-flow-operator-daily-scan": 24 * 60,
  "operations-operator-daily-scan": 24 * 60,
  "jira-personal-data-reporting": 24 * 60,
  "workspace-daily-brief": 24 * 60,
};

const time = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};
const newest = (...values: Array<string | null>): string | null => values.filter((value): value is string => time(value) !== null).sort((a, b) => (time(b) ?? 0) - (time(a) ?? 0))[0] ?? null;
const oldest = (...values: Array<string | null>): string | null => values.filter((value): value is string => time(value) !== null).sort((a, b) => (time(a) ?? 0) - (time(b) ?? 0))[0] ?? null;
const ageMinutes = (value: string | null, nowMs: number) => value && time(value) !== null ? Math.max(0, (nowMs - (time(value) as number)) / 60_000) : null;

function incidentFrom(node: OperationalNodeState, title: string, startedAt: string | null): OperationalIncident | null {
  if (!node.severity || !node.reasonCode || !node.recommendedAction) return null;
  return { id: `${node.nodeId}:${node.reasonCode}`, nodeKey: node.nodeId, status: node.status, severity: node.severity, title, summary: node.summary, reasonCode: node.reasonCode, startedAt, lastSeenAt: node.lastCheckedAt, lastHealthyAt: node.lastSuccessAt, affectedNodeKeys: node.affectedNodeIds, recommendedAction: node.recommendedAction, source: node.source };
}

function unknown(nodeId: string, source: string, generatedAt: string): OperationalNodeState {
  return { nodeId, status: "unknown", severity: null, summary: "No live health source is available.", reasonCode: null, lastCheckedAt: generatedAt, lastSuccessAt: null, lastFailureAt: null, blockingIssue: null, recommendedAction: null, affectedNodeIds: [], source };
}

export function isTaskHeartbeatStale(row: SafeOperationalFacts["taskHeartbeats"][number], now: Date): boolean {
  const reference = newest(row.lastSucceededAt, row.lastStartedAt);
  const age = ageMinutes(reference, now.getTime());
  // Three missed windows, plus a five-minute floor, avoids false alarms for
  // delayed cron dispatch. Daily jobs therefore get a full 72-hour window.
  return age !== null && age > Math.max(5, row.expectedCadenceMinutes * 3);
}

export function deriveOperationalSnapshot(facts: SafeOperationalFacts, now = new Date()): OperationalSnapshot {
  const generatedAt = now.toISOString();
  const nowMs = now.getTime();
  const nodes: OperationalNodeState[] = [];
  const incidents: OperationalIncident[] = [];
  const add = (node: OperationalNodeState, title?: string, startedAt: string | null = null) => {
    nodes.push(node);
    const incident = title ? incidentFrom(node, title, startedAt) : null;
    if (incident) incidents.push(incident);
  };

  const connectorKeys = new Set([...facts.connectors.map((row) => row.connectorKey), ...facts.credentials.map((row) => row.connectorKey), ...facts.providerOperations.map((row) => row.connectorKey)]);
  for (const key of [...connectorKeys].sort()) {
    const base = [...facts.connectors, ...facts.credentials].filter((row) => row.connectorKey === key);
    const operations = facts.providerOperations.filter((row) => row.connectorKey === key);
    const failing = operations.filter((row) => row.consecutiveFailures > 0);
    const lastSuccessAt = newest(...operations.map((row) => row.lastSuccessAt));
    const lastFailureAt = newest(...failing.map((row) => row.lastFailureAt));
    const lastCheckedAt = newest(...base.map((row) => row.updatedAt), ...operations.map((row) => row.updatedAt)) ?? generatedAt;
    const impact = CONNECTOR_IMPACT[key] ?? [];
    const states = base.map((row) => row.status.toLowerCase());
    const reauth = failing.some((row) => row.failureKind === "reauth") || states.some((state) => ["reconnect_required", "revoked", "invalid"].includes(state));
    const permission = failing.some((row) => row.failureKind === "permission") || states.some((state) => ["permission_required", "missing_scope"].includes(state));
    const rateLimited = operations.some((row) => row.last429At && (ageMinutes(row.last429At, nowMs) ?? Infinity) <= 60);
    const repeated = failing.some((row) => row.consecutiveFailures >= 3);
    const connected = states.some((state) => ["connected", "healthy", "active"].includes(state));
    let node: OperationalNodeState;
    let title: string | undefined;
    if (reauth) {
      node = { nodeId: `connector-${key}`, status: "reconnect_required", severity: impact.length > 1 ? "critical" : "warning", summary: "OAuth access must be reconnected before dependent work can use this provider.", reasonCode: failing.some((row) => row.operation === "oauth_refresh") ? "oauth_refresh_failed" : "credential_revoked", lastCheckedAt, lastSuccessAt, lastFailureAt, blockingIssue: "Provider authentication is no longer usable.", recommendedAction: "Open connector settings and reconnect the provider.", affectedNodeIds: impact, source: "connector and provider operation state" };
      title = "Reconnect required";
    } else if (permission) {
      node = { nodeId: `connector-${key}`, status: "permission_required", severity: "warning", summary: "The connected account does not grant a required permission.", reasonCode: "permission_missing", lastCheckedAt, lastSuccessAt, lastFailureAt, blockingIssue: "One or more dependent capabilities are unavailable.", recommendedAction: "Review connector permissions and reconnect if required.", affectedNodeIds: impact, source: "connector and provider operation state" };
      title = "Permission required";
    } else if (repeated || rateLimited) {
      node = { nodeId: `connector-${key}`, status: "degraded", severity: "warning", summary: rateLimited ? "Provider requests are being rate limited." : "Provider operations have failed repeatedly.", reasonCode: rateLimited ? "provider_rate_limited" : "provider_repeated_failure", lastCheckedAt, lastSuccessAt, lastFailureAt, blockingIssue: "Dependent context or actions may be delayed.", recommendedAction: "Review connector health and the latest safe failure code.", affectedNodeIds: impact, source: "provider operation counters" };
      title = rateLimited ? "Provider rate limited" : "Repeated provider failures";
    } else if (!connected) {
      node = { nodeId: `connector-${key}`, status: "configuration_required", severity: "warning", summary: "Connector setup is incomplete for one or more workspaces.", reasonCode: "configuration_missing", lastCheckedAt, lastSuccessAt, lastFailureAt, blockingIssue: "Dependent capability is unavailable until setup is complete.", recommendedAction: "Open connector settings and finish setup.", affectedNodeIds: impact, source: "connector configuration state" };
      title = "Configuration required";
    } else {
      node = { nodeId: `connector-${key}`, status: "healthy", severity: null, summary: "Connected provider operations are currently healthy.", reasonCode: null, lastCheckedAt, lastSuccessAt, lastFailureAt, blockingIssue: null, recommendedAction: null, affectedNodeIds: [], source: "connector and provider operation state" };
    }
    add(node, title, lastFailureAt ?? oldest(...base.map((row) => row.updatedAt)));
  }

  const operatorKeys = new Set([...facts.operatorRuns.map((row) => row.operatorKey), ...facts.operatorTriggers.map((row) => row.operatorKey)]);
  for (const key of [...operatorKeys].sort()) {
    const triggerRows = facts.operatorTriggers.filter((row) => row.operatorKey === key);
    const active = triggerRows.some((row) => row.enabled);
    const latestRun = facts.operatorRuns.filter((row) => row.operatorKey === key).sort((a, b) => (time(b.createdAt) ?? 0) - (time(a.createdAt) ?? 0))[0];
    const status = latestRun?.status.toLowerCase() ?? "";
    const lastCheckedAt = newest(latestRun?.updatedAt ?? null, latestRun?.createdAt ?? null, ...triggerRows.map((row) => row.updatedAt)) ?? generatedAt;
    if (!active) {
      add({ nodeId: `operator-${key}`, status: "inactive", severity: null, summary: "Operator is ready but unattended monitoring is inactive.", reasonCode: "operator_inactive", lastCheckedAt, lastSuccessAt: status === "completed" ? latestRun?.updatedAt ?? latestRun?.createdAt ?? null : null, lastFailureAt: null, blockingIssue: null, recommendedAction: null, affectedNodeIds: [], source: "operator activation state" });
    } else if (["failed", "blocked"].includes(status)) {
      add({ nodeId: `operator-${key}`, status: status === "blocked" ? "blocked" : "failing", severity: "warning", summary: `The latest active operator run ${status === "blocked" ? "was blocked" : "failed"}.`, reasonCode: status === "blocked" ? "operator_blocked" : "operator_scan_failed", lastCheckedAt, lastSuccessAt: null, lastFailureAt: latestRun?.updatedAt ?? latestRun?.createdAt ?? null, blockingIssue: "The latest scan did not complete normally.", recommendedAction: "Open Operators and review the latest run.", affectedNodeIds: [], source: "operator activation and run state" }, status === "blocked" ? "Operator blocked" : "Operator scan failed", latestRun?.updatedAt ?? latestRun?.createdAt ?? null);
    } else {
      add({ nodeId: `operator-${key}`, status: "healthy", severity: null, summary: status === "running" ? "Operator scan is running." : "Operator monitoring is active and the latest run is clear.", reasonCode: null, lastCheckedAt, lastSuccessAt: status === "completed" ? latestRun?.updatedAt ?? latestRun?.createdAt ?? null : null, lastFailureAt: null, blockingIssue: null, recommendedAction: null, affectedNodeIds: [], source: "operator activation and run state" });
    }
  }

  if (facts.availableSources.has("signals")) {
    const pending = facts.signals.filter((row) => ["new", "routed", "processing"].includes(row.status));
    const oldestPending = oldest(...pending.map((row) => row.createdAt));
    const lag = ageMinutes(oldestPending, nowMs) ?? 0;
    const failedSync = facts.signalSync.filter((row) => row.lastFailureCode && (time(row.lastSuccessAt) ?? 0) < (time(row.updatedAt) ?? 0));
    const staleLease = facts.signalSync.some((row) => row.leaseUntil && (ageMinutes(row.leaseUntil, nowMs) ?? -1) > 5);
    const unhealthy = lag > 15 || failedSync.length > 0 || staleLease;
    const critical = lag > 60 || staleLease;
    add({ nodeId: "gov-signal-engine", status: unhealthy ? (critical ? "stale" : "degraded") : "healthy", severity: unhealthy ? (critical ? "critical" : "warning") : null, summary: unhealthy ? `${pending.length} signal candidate${pending.length === 1 ? "" : "s"} pending; oldest is ${Math.round(lag)}m old.` : pending.length ? `${pending.length} recent signal candidate${pending.length === 1 ? "" : "s"} within the normal processing window.` : "No delayed signal candidates detected.", reasonCode: unhealthy ? (staleLease ? "signal_processing_stale" : "signal_backlog") : null, lastCheckedAt: generatedAt, lastSuccessAt: newest(...facts.signalSync.map((row) => row.lastSuccessAt)), lastFailureAt: newest(...failedSync.map((row) => row.updatedAt)), blockingIssue: unhealthy ? "Signal-driven work may be delayed." : null, recommendedAction: unhealthy ? "Review signal processing and connector ingestion." : null, affectedNodeIds: ["operator-revenue", "operator-client_flow", "operator-operations"], source: "signal candidates and sync state" }, unhealthy ? (staleLease ? "Signal processing stale" : "Signal backlog") : undefined, oldestPending);
  }

  if (facts.availableSources.has("workflows")) {
    const unknownSteps = facts.workflowSteps.filter((row) => row.blockReason === "execution_unknown");
    const stuck = facts.workflowSteps.filter((row) => row.status === "executing" && (ageMinutes(row.updatedAt, nowMs) ?? 0) > 30);
    const failed = facts.workflowSteps.filter((row) => row.status === "failed");
    const blocked = facts.workflowSteps.filter((row) => row.status === "blocked" && row.blockReason !== "execution_unknown");
    const count = unknownSteps.length + stuck.length + failed.length + blocked.length;
    const critical = unknownSteps.length >= 3 || stuck.length >= 3;
    const reason = unknownSteps.length ? "execution_unknown" : stuck.length ? "workflow_stuck" : failed.length ? "workflow_failed" : "workflow_blocked";
    const startedAt = oldest(...[...unknownSteps, ...stuck, ...failed, ...blocked].map((row) => row.updatedAt ?? row.createdAt));
    add({ nodeId: "gov-workflow-runtime", status: count ? (stuck.length ? "stale" : "blocked") : "healthy", severity: count ? (critical ? "critical" : "warning") : null, summary: count ? `${count} workflow step${count === 1 ? "" : "s"} require review${unknownSteps.length ? `; ${unknownSteps.length} have an unknown execution result` : ""}.` : "No blocked, failed, or stuck workflow steps detected.", reasonCode: count ? reason : null, lastCheckedAt: generatedAt, lastSuccessAt: null, lastFailureAt: startedAt, blockingIssue: count ? "Affected workflow progress is held safely." : null, recommendedAction: count ? "Review workflow and execution logs before retrying." : null, affectedNodeIds: ["gov-execution-layer", "gov-approvals"], source: "workflow step state" }, count ? (unknownSteps.length ? "Execution result unknown" : stuck.length ? "Workflow steps stuck" : "Workflow steps need review") : undefined, startedAt);
  }

  if (facts.availableSources.has("execution")) {
    const unresolved = facts.executionIntents.filter((row) => row.status === "executing" && (ageMinutes(row.updatedAt, nowMs) ?? 0) > 30);
    const failed = facts.executionIntents.filter((row) => row.status === "failed" && (ageMinutes(row.updatedAt, nowMs) ?? Infinity) <= 24 * 60);
    const count = unresolved.length + failed.length;
    const startedAt = oldest(...[...unresolved, ...failed].map((row) => row.updatedAt ?? row.createdAt));
    add({ nodeId: "gov-execution-layer", status: unresolved.length ? "needs_attention" : failed.length ? "degraded" : "healthy", severity: count ? "warning" : null, summary: unresolved.length ? `${unresolved.length} execution${unresolved.length === 1 ? "" : "s"} require manual confirmation before any retry.` : failed.length ? `${failed.length} provider write${failed.length === 1 ? "" : "s"} failed in the last 24 hours.` : "No recent unresolved or failed executions detected.", reasonCode: unresolved.length ? "execution_unknown" : failed.length ? "provider_write_failed" : null, lastCheckedAt: generatedAt, lastSuccessAt: newest(...facts.executionIntents.filter((row) => row.status === "succeeded").map((row) => row.updatedAt)), lastFailureAt: startedAt, blockingIssue: count ? "Blind retry is disabled while the result is uncertain." : null, recommendedAction: count ? "Review execution logs and reconcile the provider result." : null, affectedNodeIds: ["product-logs"], source: "execution intent ledger" }, count ? (unresolved.length ? "Execution confirmation required" : "Recent provider write failures") : undefined, startedAt);
  }

  if (facts.availableSources.has("approvals")) {
    const pending = facts.approvals.filter((row) => row.status === "pending");
    const oldestPending = oldest(...pending.map((row) => row.createdAt));
    const lag = ageMinutes(oldestPending, nowMs) ?? 0;
    const abnormal = lag > 48 * 60 || pending.length >= 100;
    add({ nodeId: "gov-approvals", status: abnormal ? "needs_attention" : "healthy", severity: abnormal ? "warning" : null, summary: abnormal ? `${pending.length} approvals are pending; the oldest has waited ${Math.round(lag / 60)}h.` : pending.length ? `${pending.length} approval${pending.length === 1 ? " is" : "s are"} waiting within the expected human-review window.` : "No pending approval backlog detected.", reasonCode: abnormal ? "approval_backlog" : null, lastCheckedAt: generatedAt, lastSuccessAt: null, lastFailureAt: abnormal ? oldestPending : null, blockingIssue: abnormal ? "Approved work may be delayed." : null, recommendedAction: abnormal ? "Open Approvals and review the oldest items." : null, affectedNodeIds: [], source: "approval state" }, abnormal ? "Approval backlog" : undefined, oldestPending);
  }

  if (facts.availableSources.has("task_heartbeats")) {
    const scheduled = facts.taskHeartbeats.filter((row) => row.expectedCadenceMinutes > 0);
    if (scheduled.length === 0) {
      add(unknown("infra-trigger", "task heartbeat ledger", generatedAt));
    } else {
    const stale = scheduled.filter((row) => isTaskHeartbeatStale(row, now));
    const failed = scheduled.filter((row) => row.lastFailedAt && (time(row.lastFailedAt) ?? 0) > (time(row.lastSucceededAt) ?? 0));
    const problem = Array.from(new Map([...stale, ...failed].map((row) => [row.taskId, row])).values());
    const critical = problem.some((row) => ["workflow-recovery-scan", "trial-lifecycle"].includes(row.taskId)) && problem.length > 1;
    const startedAt = oldest(...problem.map((row) => newest(row.lastFailedAt, row.lastStartedAt)));
    add({ nodeId: "infra-trigger", status: stale.length ? "stale" : failed.length ? "failing" : "healthy", severity: problem.length ? (critical ? "critical" : "warning") : null, summary: problem.length ? `${problem.length} scheduled task${problem.length === 1 ? "" : "s"} are stale or last failed.` : `${scheduled.length} scheduled task heartbeat${scheduled.length === 1 ? " is" : "s are"} within cadence.`, reasonCode: problem.length ? (stale.length ? "trigger_task_stale" : "trigger_task_failed") : null, lastCheckedAt: generatedAt, lastSuccessAt: newest(...scheduled.map((row) => row.lastSucceededAt)), lastFailureAt: newest(...problem.map((row) => row.lastFailedAt)), blockingIssue: problem.length ? "Background processing may be delayed." : null, recommendedAction: problem.length ? "Review Trigger.dev runs for the affected task." : null, affectedNodeIds: ["gov-signal-engine", "gov-workflow-runtime", "operator-revenue", "operator-client_flow", "operator-operations"], source: "task heartbeat ledger" }, problem.length ? "Scheduled processing needs attention" : undefined, startedAt);
    }
  } else add(unknown("infra-trigger", "task heartbeat ledger", generatedAt));

  if (facts.availableSources.has("email")) {
    const failed = facts.emailDeliveries.filter((row) => row.status === "failed" && (ageMinutes(row.updatedAt ?? row.createdAt, nowMs) ?? Infinity) <= 24 * 60);
    const startedAt = oldest(...failed.map((row) => row.updatedAt ?? row.createdAt));
    add({ nodeId: "infra-resend", status: failed.length ? "degraded" : "healthy", severity: failed.length ? "warning" : null, summary: failed.length ? `${failed.length} transactional email${failed.length === 1 ? "" : "s"} failed in the last 24 hours.` : "No recent transactional email failures are recorded.", reasonCode: failed.length ? "email_delivery_failed" : null, lastCheckedAt: generatedAt, lastSuccessAt: newest(...facts.emailDeliveries.filter((row) => row.status === "sent").map((row) => row.updatedAt)), lastFailureAt: startedAt, blockingIssue: failed.length ? "Platform notifications may not have arrived." : null, recommendedAction: failed.length ? "Review email delivery records and Resend activity." : null, affectedNodeIds: ["biz-support", "biz-feedback"], source: "email outbox" }, failed.length ? "Transactional email failures" : undefined, startedAt);
  } else add(unknown("infra-resend", "email outbox", generatedAt));

  if (facts.availableSources.has("billing")) {
    const unhealthy = facts.billingSubscriptions.filter((row) => ["failed", "on_hold"].includes(row.status));
    const failedEvents = facts.billingEvents.filter((row) => ["failed", "error"].some((part) => row.processingStatus.includes(part)) && (ageMinutes(row.updatedAt ?? row.createdAt, nowMs) ?? Infinity) <= 24 * 60);
    const count = unhealthy.length + failedEvents.length;
    const startedAt = oldest(...unhealthy.map((row) => row.updatedAt), ...failedEvents.map((row) => row.updatedAt ?? row.createdAt));
    add({ nodeId: "biz-billing", status: count ? "needs_attention" : "healthy", severity: count ? "warning" : null, summary: count ? `${count} billing state${count === 1 ? "" : "s"} require review.` : "Normalized subscription and recent billing event state is clear.", reasonCode: count ? "billing_processing_failed" : null, lastCheckedAt: generatedAt, lastSuccessAt: null, lastFailureAt: startedAt, blockingIssue: count ? "Execution eligibility may be affected for impacted workspaces." : null, recommendedAction: count ? "Open Revenue and review billing normalization." : null, affectedNodeIds: ["gov-execution-eligibility"], source: "billing subscription and event state" }, count ? "Billing state needs review" : undefined, startedAt);
  }

  // A successful snapshot proves the database path responded. The remaining
  // services have no reliable persisted health source and stay unknown.
  add({ nodeId: "infra-supabase", status: "healthy", severity: null, summary: "Operational snapshot queries completed successfully.", reasonCode: null, lastCheckedAt: generatedAt, lastSuccessAt: generatedAt, lastFailureAt: null, blockingIssue: null, recommendedAction: null, affectedNodeIds: [], source: "snapshot database queries" });
  for (const [nodeId, source] of [["infra-vercel", "app runtime telemetry"], ["infra-anthropic", "model provider telemetry"], ["gov-auth-rls", "auth telemetry"], ["gov-outcomes", "outcome observer schedule"]] as const) add(unknown(nodeId, source, generatedAt));

  const severityRank = { critical: 0, warning: 1, info: 2 } as const;
  incidents.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.affectedNodeKeys.length - a.affectedNodeKeys.length || (time(b.startedAt) ?? 0) - (time(a.startedAt) ?? 0) || a.nodeKey.localeCompare(b.nodeKey));
  return {
    generatedAt,
    sourceAvailable: facts.availableSources.size > 0,
    nodes,
    incidents,
    summary: {
      healthy: nodes.filter((node) => node.status === "healthy").length,
      warning: incidents.filter((incident) => incident.severity === "warning" || incident.severity === "info").length,
      critical: incidents.filter((incident) => incident.severity === "critical").length,
      unknown: nodes.filter((node) => node.status === "unknown").length,
    },
  };
}

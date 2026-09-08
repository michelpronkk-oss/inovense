import "server-only";

import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getProviderFailureSnapshot } from "@/lib/runtime/provider-health";
import { TASK_CADENCE_MINUTES, deriveOperationalSnapshot, type OperationalNodeState, type OperationalSnapshot, type OperationalStatus, type SafeOperationalFacts } from "@/lib/admin/operational-incidents";
import { systemMapNodes } from "@/lib/admin/system-map";

export type SystemMapRuntimeStatus = OperationalStatus;
export type SystemMapLiveContext = OperationalNodeState;
export type SystemMapLiveData = OperationalSnapshot;

type Row = Record<string, unknown>;
type ReadResult = { available: boolean; rows: Row[] };
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((row): row is Row => Boolean(row) && typeof row === "object") : [];
const string = (value: unknown): string | null => typeof value === "string" && value.length ? value : null;
const finiteNumber = (value: unknown): number => typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;

async function safeRead(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<ReadResult> {
  try {
    const result = await query;
    return result.error ? { available: false, rows: [] } : { available: true, rows: rows(result.data) };
  } catch {
    return { available: false, rows: [] };
  }
}

function completeCoverage(snapshot: SystemMapLiveData): SystemMapLiveData {
  const planned = new Set(systemMapNodes.filter((node) => node.status === "planned").map((node) => node.id));
  const measuredNodes = snapshot.nodes.filter((node) => !planned.has(node.nodeId));
  const incidents = snapshot.incidents.filter((incident) => !planned.has(incident.nodeKey));
  const measured = new Set(measuredNodes.map((node) => node.nodeId));
  const unknownNodes: OperationalNodeState[] = systemMapNodes
    .filter((node) => node.status !== "planned" && !measured.has(node.id))
    .map((node) => ({ nodeId: node.id, status: "unknown", severity: null, summary: "No reliable live health source is attached to this node.", reasonCode: null, lastCheckedAt: snapshot.generatedAt, lastSuccessAt: null, lastFailureAt: null, blockingIssue: null, recommendedAction: null, affectedNodeIds: [], source: "no live health source" }));
  const nodes = [...measuredNodes, ...unknownNodes];
  return { ...snapshot, nodes, incidents, summary: { healthy: nodes.filter((node) => node.status === "healthy").length, warning: incidents.filter((incident) => incident.severity !== "critical").length, critical: incidents.filter((incident) => incident.severity === "critical").length, unknown: nodes.filter((node) => node.status === "unknown").length } };
}

function unavailable(generatedAt: string): SystemMapLiveData {
  return completeCoverage({ generatedAt, sourceAvailable: false, nodes: [], incidents: [], summary: { healthy: 0, warning: 0, critical: 0, unknown: 0 } });
}

/**
 * One bounded, admin-only operational snapshot. Every query selects status,
 * timestamps, counters, and canonical safe reason codes only. It never reads
 * provider payloads, customer text, credentials, tokens, or email bodies.
 */
export async function getSystemMapLiveData(): Promise<SystemMapLiveData> {
  const now = new Date();
  if (!hasSupabaseAdminConfig()) return unavailable(now.toISOString());
  const db = createSupabaseAdmin();
  const [connectors, credentials, operators, triggers, signals, signalSync, workflowSteps, approvals, execution, heartbeats, emails, subscriptions, billingEvents, provider] = await Promise.all([
    safeRead(db.from("os_connectors").select("connector_key,status,updated_at").order("updated_at", { ascending: false }).limit(500)),
    safeRead(db.from("os_connector_credentials").select("connector_key,status,updated_at").order("updated_at", { ascending: false }).limit(500)),
    safeRead(db.from("os_operator_runs").select("operator_key,status,created_at,updated_at").order("created_at", { ascending: false }).limit(500)),
    safeRead(db.from("os_operator_triggers").select("operator_key,enabled,updated_at").eq("trigger_type", "operator_activation").order("updated_at", { ascending: false }).limit(500)),
    safeRead(db.from("os_signal_candidates").select("status,created_at,updated_at").in("status", ["new", "routed", "processing"]).order("created_at", { ascending: true }).limit(500)),
    safeRead(db.from("os_signal_sync_state").select("last_success_at,last_failure_code,lease_until,updated_at").order("updated_at", { ascending: false }).limit(500)),
    safeRead(db.from("os_workflow_steps").select("status,block_reason,created_at,updated_at").in("status", ["executing", "blocked", "failed", "approved", "awaiting_approval"]).order("updated_at", { ascending: true }).limit(500)),
    safeRead(db.from("os_approvals").select("status,created_at,resolved_at").eq("status", "pending").order("created_at", { ascending: true }).limit(500)),
    safeRead(db.from("os_execution_intents").select("status,reason_code,created_at,updated_at").in("status", ["executing", "failed", "succeeded"]).order("updated_at", { ascending: false }).limit(500)),
    safeRead(db.from("os_task_heartbeats").select("task_id,last_started_at,last_succeeded_at,last_failed_at,last_safe_error_code,expected_cadence_minutes").limit(100)),
    safeRead(db.from("os_email_outbox").select("status,created_at,updated_at").order("created_at", { ascending: false }).limit(200)),
    safeRead(db.from("os_billing_subscriptions").select("status,updated_at").order("updated_at", { ascending: false }).limit(500)),
    safeRead(db.from("os_billing_events").select("processing_status,created_at,updated_at").order("created_at", { ascending: false }).limit(200)),
    getProviderFailureSnapshot({ supabase: db, limit: 500 }),
  ]);
  const availableSources = new Set<string>();
  if (connectors.available || credentials.available || provider.available) availableSources.add("connectors");
  if (operators.available || triggers.available) availableSources.add("operators");
  if (signals.available || signalSync.available) availableSources.add("signals");
  if (workflowSteps.available) availableSources.add("workflows");
  if (approvals.available) availableSources.add("approvals");
  if (execution.available) availableSources.add("execution");
  if (heartbeats.available) availableSources.add("task_heartbeats");
  if (emails.available) availableSources.add("email");
  if (subscriptions.available || billingEvents.available) availableSources.add("billing");
  const anyDatabaseSource = [connectors, credentials, operators, triggers, signals, signalSync, workflowSteps, approvals, execution, heartbeats, emails, subscriptions, billingEvents].some((result) => result.available);
  if (!anyDatabaseSource && !provider.available) return unavailable(now.toISOString());

  const facts: SafeOperationalFacts = {
    connectors: connectors.rows.map((row) => ({ connectorKey: string(row.connector_key) ?? "", status: string(row.status) ?? "unknown", updatedAt: string(row.updated_at) })).filter((row) => row.connectorKey),
    credentials: credentials.rows.map((row) => ({ connectorKey: string(row.connector_key) ?? "", status: string(row.status) ?? "unknown", updatedAt: string(row.updated_at) })).filter((row) => row.connectorKey),
    providerOperations: provider.rows.map((row) => ({ connectorKey: row.connector_key, operation: row.operation, lastSuccessAt: row.last_success_at, lastFailureAt: row.last_failure_at, failureKind: row.last_failure_kind, consecutiveFailures: row.consecutive_failures, last429At: row.last_429_at, updatedAt: row.updated_at })),
    operatorRuns: operators.rows.map((row) => ({ operatorKey: string(row.operator_key) ?? "", status: string(row.status) ?? "unknown", createdAt: string(row.created_at), updatedAt: string(row.updated_at) })).filter((row) => row.operatorKey),
    operatorTriggers: triggers.rows.map((row) => ({ operatorKey: string(row.operator_key) ?? "", enabled: row.enabled === true, updatedAt: string(row.updated_at) })).filter((row) => row.operatorKey),
    signals: signals.rows.map((row) => ({ status: string(row.status) ?? "unknown", createdAt: string(row.created_at), updatedAt: string(row.updated_at) })),
    signalSync: signalSync.rows.map((row) => ({ lastSuccessAt: string(row.last_success_at), lastFailureCode: string(row.last_failure_code), leaseUntil: string(row.lease_until), updatedAt: string(row.updated_at) })),
    workflowSteps: workflowSteps.rows.map((row) => ({ status: string(row.status) ?? "unknown", blockReason: string(row.block_reason), createdAt: string(row.created_at), updatedAt: string(row.updated_at) })),
    approvals: approvals.rows.map((row) => ({ status: string(row.status) ?? "unknown", createdAt: string(row.created_at), updatedAt: string(row.resolved_at) })),
    executionIntents: execution.rows.map((row) => ({ status: string(row.status) ?? "unknown", reasonCode: string(row.reason_code), createdAt: string(row.created_at), updatedAt: string(row.updated_at) })),
    taskHeartbeats: heartbeats.rows.map((row) => { const taskId = string(row.task_id) ?? ""; return { taskId, lastStartedAt: string(row.last_started_at), lastSucceededAt: string(row.last_succeeded_at), lastFailedAt: string(row.last_failed_at), lastSafeErrorCode: string(row.last_safe_error_code), expectedCadenceMinutes: finiteNumber(row.expected_cadence_minutes) || TASK_CADENCE_MINUTES[taskId] || 0 }; }).filter((row) => row.taskId && row.expectedCadenceMinutes > 0),
    emailDeliveries: emails.rows.map((row) => ({ status: string(row.status) ?? "unknown", createdAt: string(row.created_at), updatedAt: string(row.updated_at) })),
    billingSubscriptions: subscriptions.rows.map((row) => ({ status: string(row.status) ?? "unknown", updatedAt: string(row.updated_at) })),
    billingEvents: billingEvents.rows.map((row) => ({ processingStatus: string(row.processing_status) ?? "unknown", createdAt: string(row.created_at), updatedAt: string(row.updated_at) })),
    availableSources,
  };
  return completeCoverage(deriveOperationalSnapshot(facts, now));
}

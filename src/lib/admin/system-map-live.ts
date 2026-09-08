import "server-only";

import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getProviderFailureSnapshot } from "@/lib/runtime/provider-health";

export type SystemMapRuntimeStatus = "healthy" | "degraded" | "disconnected" | "configuration_required" | "inactive" | "failing" | "not_measured";
export type SystemMapLiveContext = { nodeId: string; status: SystemMapRuntimeStatus; summary: string; lastUpdated: string | null; blockingIssue: string | null };
export type SystemMapLiveData = { checkedAt: string; workspaceId: string | null; contexts: SystemMapLiveContext[]; sourceAvailable: boolean };

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((row): row is Row => Boolean(row) && typeof row === "object") : [];
const latest = (value: unknown) => typeof value === "string" ? value : null;

export async function getSystemMapLiveData(): Promise<SystemMapLiveData> {
  const checkedAt = new Date().toISOString();
  if (!hasSupabaseAdminConfig()) return { checkedAt, workspaceId: null, contexts: [], sourceAvailable: false };
  const db = createSupabaseAdmin();
  const [workspaceResult, connectorResult, credentialResult, operatorResult, failures] = await Promise.all([
    db.from("os_workspaces").select("id").order("created_at", { ascending: true }).limit(1),
    db.from("os_connectors").select("connector_key,status,updated_at").order("updated_at", { ascending: false }).limit(500),
    db.from("os_connector_credentials").select("connector_key,status,updated_at").order("updated_at", { ascending: false }).limit(500),
    db.from("os_operator_runs").select("operator_key,status,updated_at,created_at").order("created_at", { ascending: false }).limit(500),
    getProviderFailureSnapshot({ supabase: db }),
  ]);
  const workspaceId = typeof workspaceResult.data?.[0]?.id === "string" ? workspaceResult.data[0].id : null;
  if (connectorResult.error || credentialResult.error || operatorResult.error) return { checkedAt, workspaceId, contexts: [], sourceAvailable: false };
  const contexts: SystemMapLiveContext[] = [];
  const attention = new Set([...failures.degradedConnectors, ...failures.reconnectRequiredConnectors, ...failures.permissionRequiredConnectors]);
  const connectorByKey = new Map<string, Row>();
  for (const row of [...rows(connectorResult.data), ...rows(credentialResult.data)]) {
    const key = typeof row.connector_key === "string" ? row.connector_key : "";
    if (key && !connectorByKey.has(key)) connectorByKey.set(key, row);
  }
  for (const [key, row] of connectorByKey) {
    const state = String(row.status ?? "unknown").toLowerCase();
    const failing = attention.has(key) || ["error", "needs_attention", "reconnect_required", "permission_required"].includes(state);
    contexts.push({ nodeId: `connector-${key}`, status: failing ? "degraded" : state === "connected" ? "healthy" : "configuration_required", summary: failing ? "Connection needs attention." : state === "connected" ? "Connected and available." : "Connection configuration is incomplete.", lastUpdated: latest(row.updated_at), blockingIssue: failing ? "Review the connection health before dependent work can continue." : null });
  }
  const runByOperator = new Map<string, Row>();
  for (const row of rows(operatorResult.data)) {
    const key = typeof row.operator_key === "string" ? row.operator_key : "";
    if (key && !runByOperator.has(key)) runByOperator.set(key, row);
  }
  for (const [key, row] of runByOperator) {
    const state = String(row.status ?? "unknown").toLowerCase();
    const failing = ["failed", "error", "cancelled", "canceled"].includes(state);
    const active = ["running", "queued", "pending"].includes(state);
    contexts.push({ nodeId: `operator-${key}`, status: failing ? "failing" : active ? "healthy" : "inactive", summary: failing ? "The latest operator run did not complete." : active ? "Operator work is currently in motion." : "No active operator run is in progress.", lastUpdated: latest(row.updated_at) ?? latest(row.created_at), blockingIssue: failing ? "Open Operators to review the latest failed run." : null });
  }
  return { checkedAt, workspaceId, contexts, sourceAvailable: true };
}

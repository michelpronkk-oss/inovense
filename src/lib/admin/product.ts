import "server-only";

import { requireInternalAdmin } from "@/lib/admin/auth";
import {
  MICROSOFT_TEAMS_CONNECTOR_KEY,
  getMicrosoftTeamsScopeState,
  readMicrosoftTeamsSettings,
} from "@/lib/connectors/microsoft-teams";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type Row = Record<string, unknown>;
type Availability = "connected" | "partial" | "unavailable";
type RunState = "completed" | "running" | "failed" | "other";

export type ProductData = {
  sourceStatus: Availability;
  runs: { total: number | null; completed: number | null; running: number | null; failed: number | null };
  approvals: { pending: number | null; approved: number | null; rejected: number | null };
  connectors: { connected: number | null; needsAttention: number | null; workspaces: number | null };
  operators: Array<{ key: string; total: number; completed: number; running: number; failed: number }>;
  approvalStates: Array<{ state: string; count: number }>;
  connectorStates: Array<{ key: string; status: string; count: number }>;
  unavailable?: string;
};

const asRows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object") : [];

async function safely(query: () => PromiseLike<{ data: unknown; error: unknown }>) {
  try {
    const result = await query();
    return { rows: asRows(result.data), available: !result.error };
  } catch {
    return { rows: [], available: false };
  }
}

function runState(value: unknown): RunState {
  const status = String(value ?? "").toLowerCase();
  if (["completed", "success", "succeeded"].includes(status)) return "completed";
  if (["running", "queued", "pending"].includes(status)) return "running";
  if (["failed", "error", "canceled", "cancelled"].includes(status)) return "failed";
  return "other";
}

function tally(rows: Row[], field: string) {
  const values = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[field] ?? "unknown").trim() || "unknown";
    values.set(value, (values.get(value) ?? 0) + 1);
  }
  return [...values.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Project direct-OAuth credential rows into the connector-state shape, and
 * derive a truthful per-workspace Microsoft Teams row from the shared
 * Microsoft credential. No credential values are read here - only the
 * connector key, coarse status, workspace id, granted scope names, and the
 * Teams enabled flag.
 */
function nativeConnectorRows(rows: Row[]): Row[] {
  const output: Row[] = [];
  for (const row of rows) {
    const key = String(row.connector_key ?? "connector");
    const status = String(row.status ?? "unknown");
    output.push({ connector_key: key, status, workspace_id: row.workspace_id });
    if (key !== "microsoft") continue;

    const teams = readMicrosoftTeamsSettings((row.metadata ?? null) as Record<string, unknown> | null);
    if (!teams.enabled) continue;
    const scopeState = getMicrosoftTeamsScopeState(
      Array.isArray(row.scopes) ? row.scopes.filter((item): item is string => typeof item === "string") : [],
    );
    output.push({
      connector_key: MICROSOFT_TEAMS_CONNECTOR_KEY,
      status: !scopeState.readGranted ? "permission_required" : status === "needs_attention" ? "needs_attention" : "connected",
      workspace_id: row.workspace_id,
    });
  }
  return output;
}

function unavailable(message: string): ProductData {
  return {
    sourceStatus: "unavailable", runs: { total: null, completed: null, running: null, failed: null },
    approvals: { pending: null, approved: null, rejected: null }, connectors: { connected: null, needsAttention: null, workspaces: null },
    operators: [], approvalStates: [], connectorStates: [], unavailable: message,
  };
}

export async function getProductData(): Promise<ProductData> {
  await requireInternalAdmin();
  if (!hasSupabaseAdminConfig()) return unavailable("Supabase is not configured.");

  const db = createSupabaseAdmin();
  const [runResult, approvalResult, managedConnectorResult, nativeCredentialResult] = await Promise.all([
    safely(() => db.from("os_operator_runs").select("operator_key,status,workspace_id,created_at").order("created_at", { ascending: false }).limit(500)),
    safely(() => db.from("os_approvals").select("status,workspace_id,created_at").order("created_at", { ascending: false }).limit(500)),
    safely(() => db.from("os_connectors").select("connector_key,status,workspace_id,connected_at").limit(500)),
    // Direct-OAuth connectors (Gmail, Microsoft 365, Microsoft Teams,
    // Salesforce) live in os_connector_credentials, not os_connectors.
    // Only non-secret columns are selected here - never any token column.
    safely(() => db.from("os_connector_credentials").select("connector_key,status,workspace_id,scopes,metadata").limit(500)),
  ]);
  // Native credential rows are projected into the same {connector_key,status,
  // workspace_id} shape the aggregation below already understands. Microsoft
  // Teams is derived from the shared Microsoft row so internal connector
  // intelligence shows its real per-workspace state (enabled, permission
  // required, needs attention) rather than hiding inside "microsoft".
  const connectorResult = {
    available: managedConnectorResult.available,
    rows: [...managedConnectorResult.rows, ...nativeConnectorRows(nativeCredentialResult.rows)],
  };
  const flags = [runResult.available, approvalResult.available, connectorResult.available];
  const sourceStatus: Availability = flags.every(Boolean) ? "connected" : flags.some(Boolean) ? "partial" : "unavailable";
  if (sourceStatus === "unavailable") return unavailable("Product operation sources are unavailable in the current database.");

  const countRuns = (state: RunState) => runResult.rows.filter((row) => runState(row.status) === state).length;
  const countApprovals = (states: string[]) => approvalResult.rows.filter((row) => states.includes(String(row.status).toLowerCase())).length;
  const connected = connectorResult.rows.filter((row) => String(row.status).toLowerCase() === "connected");
  const attentionStates = new Set(["error", "needs_attention", "reconnect_required", "permission_required"]);
  const operators = new Map<string, { total: number; completed: number; running: number; failed: number }>();
  for (const row of runResult.rows) {
    const key = String(row.operator_key ?? "unknown");
    const record = operators.get(key) ?? { total: 0, completed: 0, running: 0, failed: 0 };
    record.total += 1;
    const state = runState(row.status);
    if (state !== "other") record[state] += 1;
    operators.set(key, record);
  }

  const connectorTotals = new Map<string, { key: string; status: string; count: number }>();
  for (const row of connectorResult.rows) {
    const key = String(row.connector_key ?? "connector");
    const status = String(row.status ?? "unknown");
    const mapKey = `${key}:${status}`;
    const record = connectorTotals.get(mapKey) ?? { key, status, count: 0 };
    record.count += 1;
    connectorTotals.set(mapKey, record);
  }

  return {
    sourceStatus,
    runs: { total: runResult.available ? runResult.rows.length : null, completed: runResult.available ? countRuns("completed") : null, running: runResult.available ? countRuns("running") : null, failed: runResult.available ? countRuns("failed") : null },
    approvals: { pending: approvalResult.available ? countApprovals(["pending"]) : null, approved: approvalResult.available ? countApprovals(["approved", "partially_completed"]) : null, rejected: approvalResult.available ? countApprovals(["rejected"]) : null },
    connectors: { connected: connectorResult.available ? connected.length : null, needsAttention: connectorResult.available ? connectorResult.rows.filter((row) => attentionStates.has(String(row.status).toLowerCase())).length : null, workspaces: connectorResult.available ? new Set(connectorResult.rows.map((row) => String(row.workspace_id ?? "")).filter(Boolean)).size : null },
    operators: [...operators.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8).map(([key, value]) => ({ key, ...value })),
    approvalStates: approvalResult.available ? tally(approvalResult.rows, "status").slice(0, 6).map(([state, count]) => ({ state, count })) : [],
    connectorStates: [...connectorTotals.values()].sort((a, b) => b.count - a.count).slice(0, 8),
  };
}

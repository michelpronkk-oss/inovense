import "server-only";

import { requireInternalAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type Row = Record<string, unknown>;
export type GrowthRange = "7d" | "30d" | "90d" | "ytd";
export type GrowthData = {
  range: GrowthRange;
  sourceStatus: "connected" | "partial" | "unavailable";
  visitors: number | null;
  workspacesCreated: number | null;
  workspacesRunning: number | null;
  paidWorkspaces: number | null;
  visitorToWorkspaceRate: number | null;
  workspaceActivationRate: number | null;
  paidWorkspaceRate: number | null;
  sources: Array<{ name: string; visitors: number }>;
  landingPaths: Array<{ path: string; visitors: number }>;
  recentWorkspaces: Array<{ id: string; name: string; createdAt: string; billingStatus: string; running: boolean }>;
  unavailable?: string;
};

const rangeDays: Record<GrowthRange, number | null> = { "7d": 7, "30d": 30, "90d": 90, ytd: null };

function startFor(range: GrowthRange) {
  const date = new Date();
  if (range === "ytd") return new Date(Date.UTC(date.getUTCFullYear(), 0, 1)).toISOString();
  date.setUTCDate(date.getUTCDate() - ((rangeDays[range] ?? 30) - 1));
  return date.toISOString();
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object") : [];
}

function tally(rows: Row[], field: string, fallback: string) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[field] ?? "").trim() || fallback;
    totals.set(value, (totals.get(value) ?? 0) + 1);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, visitors]) => ({ name, visitors }));
}

export async function getGrowthData(range: GrowthRange): Promise<GrowthData> {
  await requireInternalAdmin();
  if (!hasSupabaseAdminConfig()) return unavailable(range, "Supabase is not configured.");

  const client = createSupabaseAdmin();
  const start = startFor(range);
  const [trafficResult, workspaceResult, runResult] = await Promise.all([
    client.from("traffic_sessions").select("session_key,first_seen_at,first_touch_source,utm_source,landing_path").gte("first_seen_at", start),
    client.from("os_workspaces").select("id,name,created_at,billing_status").gte("created_at", start).order("created_at", { ascending: false }).limit(100),
    client.from("os_operator_runs").select("workspace_id,created_at").limit(500),
  ]);

  const traffic = asRows(trafficResult.data);
  const workspaces = asRows(workspaceResult.data);
  const runs = asRows(runResult.data);
  const trafficAvailable = !trafficResult.error;
  const workspaceAvailable = !workspaceResult.error;
  const runsAvailable = !runResult.error;
  const sources = [trafficAvailable, workspaceAvailable, runsAvailable];
  const sourceStatus = sources.every(Boolean) ? "connected" : sources.some(Boolean) ? "partial" : "unavailable";
  if (sourceStatus === "unavailable") return unavailable(range, "The product growth sources are unavailable.");

  const runningWorkspaceIds = new Set(runs.map((run) => String(run.workspace_id ?? "")).filter(Boolean));
  const running = workspaces.filter((workspace) => runningWorkspaceIds.has(String(workspace.id))).length;
  const paid = workspaces.filter((workspace) => String(workspace.billing_status) === "active").length;
  const visitors = trafficAvailable ? traffic.length : null;
  const workspaceCount = workspaceAvailable ? workspaces.length : null;
  const runningCount = workspaceAvailable && runsAvailable ? running : null;
  const paidCount = workspaceAvailable ? paid : null;

  return {
    range,
    sourceStatus,
    visitors,
    workspacesCreated: workspaceCount,
    workspacesRunning: runningCount,
    paidWorkspaces: paidCount,
    visitorToWorkspaceRate: visitors && workspaceCount !== null ? workspaceCount / visitors : null,
    workspaceActivationRate: workspaceCount ? (runningCount ?? 0) / workspaceCount : null,
    paidWorkspaceRate: workspaceCount ? (paidCount ?? 0) / workspaceCount : null,
    sources: trafficAvailable ? tally(traffic.map((row) => ({ first_touch_source: row.first_touch_source ?? row.utm_source })), "first_touch_source", "Direct or unknown") : [],
    landingPaths: trafficAvailable ? tally(traffic, "landing_path", "Unknown entry page").map(({ name, visitors }) => ({ path: name, visitors })) : [],
    recentWorkspaces: workspaces.slice(0, 12).map((workspace) => ({ id: String(workspace.id), name: String(workspace.name ?? "Unnamed workspace"), createdAt: String(workspace.created_at), billingStatus: String(workspace.billing_status ?? "preview"), running: runningWorkspaceIds.has(String(workspace.id)) })),
  };
}

function unavailable(range: GrowthRange, message: string): GrowthData {
  return { range, sourceStatus: "unavailable", visitors: null, workspacesCreated: null, workspacesRunning: null, paidWorkspaces: null, visitorToWorkspaceRate: null, workspaceActivationRate: null, paidWorkspaceRate: null, sources: [], landingPaths: [], recentWorkspaces: [], unavailable: message };
}

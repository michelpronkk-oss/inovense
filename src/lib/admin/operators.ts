import "server-only";

import { requireInternalAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type Row = Record<string, unknown>;
type Availability = "connected" | "unavailable";
type Health = "clear" | "active" | "attention" | "other";

export type OperatorFleetData = {
  sourceStatus: Availability;
  sampledRuns: number | null;
  activeRuns: number | null;
  needsAttention: number | null;
  workspaces: number | null;
  fleet: Array<{ key: string; total: number; clear: number; active: number; attention: number; lastRunAt: string | null }>;
  exceptions: Array<{ key: string; status: string; createdAt: string | null }>;
  latest: Array<{ key: string; status: string; createdAt: string | null }>;
  unavailable?: string;
};

const asRows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object") : [];

function healthFor(status: unknown): Health {
  const value = String(status ?? "").toLowerCase();
  if (["completed", "success", "succeeded"].includes(value)) return "clear";
  if (["running", "queued", "pending"].includes(value)) return "active";
  if (["blocked", "failed", "error", "canceled", "cancelled"].includes(value)) return "attention";
  return "other";
}

function unavailable(message: string): OperatorFleetData {
  return { sourceStatus: "unavailable", sampledRuns: null, activeRuns: null, needsAttention: null, workspaces: null, fleet: [], exceptions: [], latest: [], unavailable: message };
}

export async function getOperatorFleetData(): Promise<OperatorFleetData> {
  await requireInternalAdmin();
  if (!hasSupabaseAdminConfig()) return unavailable("Supabase is not configured.");

  const db = createSupabaseAdmin();
  try {
    const result = await db.from("os_operator_runs").select("operator_key,status,workspace_id,created_at").order("created_at", { ascending: false }).limit(500);
    if (result.error) return unavailable("The operator runtime source is unavailable in the current database.");
    const runs = asRows(result.data);
    const fleet = new Map<string, { total: number; clear: number; active: number; attention: number; lastRunAt: string | null }>();
    for (const run of runs) {
      const key = String(run.operator_key ?? "unknown");
      const record = fleet.get(key) ?? { total: 0, clear: 0, active: 0, attention: 0, lastRunAt: null };
      record.total += 1;
      const health = healthFor(run.status);
      if (health === "clear") record.clear += 1;
      if (health === "active") record.active += 1;
      if (health === "attention") record.attention += 1;
      record.lastRunAt ||= typeof run.created_at === "string" ? run.created_at : null;
      fleet.set(key, record);
    }
    const item = (run: Row) => ({ key: String(run.operator_key ?? "unknown"), status: String(run.status ?? "unknown"), createdAt: typeof run.created_at === "string" ? run.created_at : null });
    return {
      sourceStatus: "connected",
      sampledRuns: runs.length,
      activeRuns: runs.filter((run) => healthFor(run.status) === "active").length,
      needsAttention: runs.filter((run) => healthFor(run.status) === "attention").length,
      workspaces: new Set(runs.map((run) => String(run.workspace_id ?? "")).filter(Boolean)).size,
      fleet: [...fleet.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8).map(([key, record]) => ({ key, ...record })),
      exceptions: runs.filter((run) => healthFor(run.status) === "attention").slice(0, 8).map(item),
      latest: runs.slice(0, 6).map(item),
    };
  } catch {
    return unavailable("The operator runtime source is unavailable in the current database.");
  }
}

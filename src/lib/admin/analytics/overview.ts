import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { requireInternalAdmin } from "@/lib/admin/auth";

export type AdminRange = "today" | "7d" | "30d" | "90d" | "ytd";

export type AdminOverview = {
  range: AdminRange;
  generatedAt: string;
  sourceStatus: "connected" | "partial" | "unavailable";
  kpis: {
    mrr: Metric;
    activeSubscriptions: Metric;
    activeWorkspaces: Metric;
    newCustomers: Metric;
    previewConversion: Metric;
    runs: Metric;
  };
  growth: {
    visits: number | null;
    previews: number | null;
    workspaces: number | null;
    paid: number | null;
    funnelAvailable: boolean;
  };
  revenue: { available: boolean; reason: string };
  usage: { runs: number | null; approvals: number | null; failedRuns: number | null };
  operators: Array<{ key: string; runs: number; label: string }>;
  connectors: Array<{ name: string; connected: number; status: string }>;
  activity: Array<{ id: string; type: string; entity: string; createdAt: string }>;
};

type Metric = { value: number | null; label: string; state: "live" | "unavailable" };
type Row = Record<string, unknown>;

const RANGE_DAYS: Record<AdminRange, number | null> = { today: 1, "7d": 7, "30d": 30, "90d": 90, ytd: null };

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((row): row is Row => Boolean(row) && typeof row === "object") : [];
}

function dateStart(range: AdminRange): string {
  const date = new Date();
  if (range === "ytd") return new Date(Date.UTC(date.getUTCFullYear(), 0, 1)).toISOString();
  date.setUTCDate(date.getUTCDate() - ((RANGE_DAYS[range] ?? 30) - 1));
  return date.toISOString();
}

function metric(value: number | null, label: string): Metric {
  return { value, label, state: value === null ? "unavailable" : "live" };
}

function monthlyAmount(minor: number, count: number, interval: string): number | null {
  if (!Number.isFinite(minor) || !Number.isFinite(count) || count <= 0) return null;
  if (interval === "month") return minor / count;
  if (interval === "year") return minor / (count * 12);
  if (interval === "week") return (minor * 52) / (count * 12);
  if (interval === "day") return (minor * 365) / (count * 12);
  return null;
}

function operatorLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function safeRows(client: ReturnType<typeof createSupabaseAdmin>, table: string, select: string, start?: string, field = "created_at") {
  try {
    let query = client.from(table).select(select);
    if (start) query = query.gte(field, start);
    const result = await query;
    return { rows: asRows(result.data), available: !result.error };
  } catch {
    return { rows: [], available: false };
  }
}

export async function getAdminOverview(range: AdminRange = "30d"): Promise<AdminOverview> {
  await requireInternalAdmin();
  if (!hasSupabaseAdminConfig()) {
    return unavailableOverview(range);
  }

  const client = createSupabaseAdmin();
  const start = dateStart(range);
  const [workspaces, traffic, runs, approvals, connectors, activity, subscriptions] = await Promise.all([
    safeRows(client, "os_workspaces", "id,name,billing_status,created_at,updated_at"),
    safeRows(client, "traffic_sessions", "session_key,first_seen_at", start, "first_seen_at"),
    safeRows(client, "os_operator_runs", "id,operator_key,status,created_at", start),
    safeRows(client, "os_approvals", "id,status,created_at", start),
    safeRows(client, "os_connectors", "id,name,connected,status"),
    safeRows(client, "activity_events", "id,event_type,entity_type,created_at", start),
    safeRows(client, "os_billing_subscriptions", "status,currency,recurring_amount_minor,frequency_count,frequency_interval"),
  ]);

  const workspaceRows = workspaces.rows;
  const paidStatuses = new Set(["active", "trialing", "past_due"]);
  const activeSubscriptionCount = workspaceRows.filter((row) => paidStatuses.has(String(row.billing_status))).length;
  const activeWorkspaceCount = workspaceRows.filter((row) => {
    const updated = typeof row.updated_at === "string" ? row.updated_at : "";
    return updated >= start;
  }).length;
  const previews = traffic.rows.length;
  const newWorkspaceCount = workspaceRows.filter((row) => String(row.created_at) >= start).length;
  const runRows = runs.rows;
  const failedRuns = runRows.filter((row) => ["failed", "error", "canceled"].includes(String(row.status))).length;
  const normalizedSubscriptions = subscriptions.rows.filter((row) => String(row.status) === "active");
  const hasOnlyUsdSubscriptions = normalizedSubscriptions.every((row) => String(row.currency).toUpperCase() === "USD");
  const normalizedMrrMinor = hasOnlyUsdSubscriptions ? normalizedSubscriptions.reduce((total, row) => total + (monthlyAmount(Number(row.recurring_amount_minor), Number(row.frequency_count), String(row.frequency_interval)) ?? 0), 0) : null;
  const mrrReady = subscriptions.available && hasOnlyUsdSubscriptions && (normalizedSubscriptions.length > 0 || activeSubscriptionCount === 0);
  const sourceFlags = [workspaces.available, traffic.available, runs.available, approvals.available, connectors.available, activity.available, subscriptions.available];
  const sourceStatus = sourceFlags.every(Boolean) ? "connected" : sourceFlags.some(Boolean) ? "partial" : "unavailable";

  const operatorCounts = new Map<string, number>();
  for (const row of runRows) {
    const key = String(row.operator_key || "unknown");
    operatorCounts.set(key, (operatorCounts.get(key) ?? 0) + 1);
  }

  return {
    range,
    generatedAt: new Date().toISOString(),
    sourceStatus,
    kpis: {
      mrr: metric(mrrReady && normalizedMrrMinor !== null ? normalizedMrrMinor / 100 : null, mrrReady ? "Normalized active Dodo subscriptions" : subscriptions.available && !hasOnlyUsdSubscriptions ? "Multiple currencies require a reporting currency" : "Replay active Dodo subscription events after migration"),
      activeSubscriptions: metric(workspaces.available ? activeSubscriptionCount : null, "Workspace billing status"),
      activeWorkspaces: metric(workspaces.available ? activeWorkspaceCount : null, "Updated in selected range"),
      newCustomers: metric(workspaces.available ? newWorkspaceCount : null, "Workspaces created in selected range"),
      previewConversion: metric(traffic.available && workspaces.available && previews > 0 ? newWorkspaceCount / previews : null, "Workspaces / captured sessions"),
      runs: metric(runs.available ? runRows.length : null, "Operator runs in selected range"),
    },
    growth: { visits: traffic.available ? traffic.rows.length : null, previews: traffic.available ? previews : null, workspaces: workspaces.available ? newWorkspaceCount : null, paid: workspaces.available ? activeSubscriptionCount : null, funnelAvailable: traffic.available && workspaces.available },
    revenue: { available: mrrReady, reason: mrrReady ? "Recurring amount, currency, and billing interval are normalized from active Dodo subscriptions." : "Dodo webhooks are stored, but active subscription events need to populate recurring amount, currency, and billing interval." },
    usage: { runs: runs.available ? runRows.length : null, approvals: approvals.available ? approvals.rows.length : null, failedRuns: runs.available ? failedRuns : null },
    operators: [...operatorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key, count]) => ({ key, runs: count, label: operatorLabel(key) })),
    connectors: connectors.rows.slice(0, 8).map((row) => ({ name: String(row.name ?? "Connector"), connected: row.connected === true ? 1 : 0, status: String(row.status ?? "unknown") })),
    activity: activity.rows.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8).map((row) => ({ id: String(row.id), type: String(row.event_type ?? "event"), entity: String(row.entity_type ?? "system"), createdAt: String(row.created_at) })),
  };
}

function unavailableOverview(range: AdminRange): AdminOverview {
  const unavailable = (label: string): Metric => metric(null, label);
  return {
    range, generatedAt: new Date().toISOString(), sourceStatus: "unavailable",
    kpis: { mrr: unavailable("Billing source not connected"), activeSubscriptions: unavailable("Workspace source not connected"), activeWorkspaces: unavailable("Workspace source not connected"), newCustomers: unavailable("Workspace source not connected"), previewConversion: unavailable("Traffic source not connected"), runs: unavailable("Usage source not connected") },
    growth: { visits: null, previews: null, workspaces: null, paid: null, funnelAvailable: false },
    revenue: { available: false, reason: "Supabase is not configured in this environment." },
    usage: { runs: null, approvals: null, failedRuns: null }, operators: [], connectors: [], activity: [],
  };
}

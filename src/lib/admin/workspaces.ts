import "server-only";

import { requireInternalAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getCanonicalPlanLabel } from "@/lib/plan-identity";

type Row = Record<string, unknown>;
type QueryResult = { rows: Row[]; available: boolean; count?: number | null };
export type AdminWorkspaceRow = {
  id: string;
  name: string;
  owner: string;
  plan: string;
  entitlement: string;
  trial: string;
  subscription: string;
  operators: string;
  connectors: string;
  approvals: string;
  lastActivity: string;
};
export type AdminWorkspaceData = { available: boolean; total: number; page: number; pageSize: number; rows: AdminWorkspaceRow[]; sources: string[] };
export type AdminCommandCounts = {
  available: boolean;
  totalWorkspaces: number | null;
  activeTrials: number | null;
  expiredTrials: number | null;
  activePaidSubscriptions: number | null;
  configuredOperators: number | null;
  connectorIssues: number | null;
  billingIssues: number | null;
  pendingApprovals: number | null;
  failedRuns7d: number | null;
};

function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object") : []; }
async function safely(query: () => PromiseLike<{ data: unknown; error: unknown; count?: number | null }>): Promise<QueryResult> {
  try {
    const result = await query();
    return { rows: rows(result.data), available: !result.error, count: result.count };
  } catch {
    return { rows: [], available: false, count: null };
  }
}
const text = (value: unknown) => typeof value === "string" ? value : "";
async function exactCount(query: () => PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
  try {
    const result = await query();
    return result.error ? null : result.count ?? 0;
  } catch { return null; }
}
const groupByWorkspace = (items: Row[]) => {
  const map = new Map<string, Row[]>();
  for (const item of items) {
    const key = text(item.workspace_id);
    if (!key) continue;
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
};

export async function getAdminWorkspaceData(requestedPage = 1): Promise<AdminWorkspaceData> {
  await requireInternalAdmin();
  const pageSize = 25;
  const page = Math.max(1, Math.min(999, Math.trunc(requestedPage || 1)));
  if (!hasSupabaseAdminConfig()) return { available: false, total: 0, page, pageSize, rows: [], sources: ["Supabase is not configured"] };

  const db = createSupabaseAdmin();
  const workspaceResult = await safely(() => db.from("os_workspaces").select("id,name,plan,plan_tier,billing_status,trial_ends_at,created_at", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1));
  if (!workspaceResult.available) return { available: false, total: 0, page, pageSize, rows: [], sources: ["Workspace records unavailable"] };
  const workspaces = workspaceResult.rows;
  const ids = workspaces.map((row) => text(row.id)).filter(Boolean);
  if (!ids.length) return { available: true, total: workspaceResult.count ?? 0, page, pageSize, rows: [], sources: ["Workspace records"] };

  const [owners, trials, subscriptions, activations, connectors, approvals, runs] = await Promise.all([
    safely(() => db.from("os_workspace_members").select("workspace_id,email,full_name,role_key,active,status").in("workspace_id", ids).eq("role_key", "owner").eq("active", true).limit(100)),
    safely(() => db.from("os_trial_entitlements").select("workspace_id,trial_status,trial_ends_at").in("workspace_id", ids).limit(100)),
    safely(() => db.from("os_billing_subscriptions").select("workspace_id,status,updated_at").in("workspace_id", ids).order("updated_at", { ascending: false }).limit(300)),
    safely(() => db.from("os_operator_triggers").select("workspace_id,operator_key,enabled").eq("trigger_type", "operator_activation").in("workspace_id", ids).limit(1000)),
    safely(() => db.from("os_connectors").select("workspace_id,connector_key,status,connected").in("workspace_id", ids).limit(1000)),
    safely(() => db.from("os_approvals").select("workspace_id,status").eq("status", "pending").in("workspace_id", ids).limit(1000)),
    safely(() => db.from("os_operator_runs").select("workspace_id,operator_key,status,created_at").in("workspace_id", ids).order("created_at", { ascending: false }).limit(1000)),
  ]);
  const ownersById = groupByWorkspace(owners.rows);
  const trialsById = groupByWorkspace(trials.rows);
  const subscriptionsById = groupByWorkspace(subscriptions.rows);
  const activationsById = groupByWorkspace(activations.rows);
  const connectorsById = groupByWorkspace(connectors.rows);
  const approvalsById = groupByWorkspace(approvals.rows);
  const runsById = groupByWorkspace(runs.rows);
  const now = Date.now();

  const resultRows = workspaces.map((workspace): AdminWorkspaceRow => {
    const id = text(workspace.id);
    const billingStatus = text(workspace.billing_status).toLowerCase();
    const rawPlan = workspace.plan_tier ?? workspace.plan ?? "preview";
    const plan = getCanonicalPlanLabel(rawPlan) ?? "Unknown";
    const trialRecord = trialsById.get(id)?.[0];
    const trialEnd = text(trialRecord?.trial_ends_at ?? workspace.trial_ends_at);
    const trialEndPassed = Boolean(trialEnd && Number.isFinite(Date.parse(trialEnd)) && Date.parse(trialEnd) <= now);
    const trialStatus = text(trialRecord?.trial_status).toLowerCase();
    let entitlement = "Unknown";
    if (billingStatus === "preview" || plan === "Preview") entitlement = "Preview";
    else if (billingStatus === "trialing") entitlement = trialEndPassed || trialStatus === "expired" ? "Expired trial" : "Trial active";
    else if (billingStatus === "active") entitlement = "Paid active";
    else if (billingStatus === "past_due") entitlement = "Past due";
    else if (billingStatus === "canceled") entitlement = "Canceled";

    let trial = "No trial record";
    if (trials.available) {
      if (!trialRecord) trial = "Not started";
      else if (trialStatus === "active" && (trialEndPassed || billingStatus === "canceled")) trial = "Expired";
      else if (trialStatus === "active") trial = "Active";
      else if (trialStatus === "expired") trial = "Expired";
      else if (trialStatus === "converted") trial = "Converted";
      else if (trialStatus === "consumed") trial = "Consumed";
      else trial = "Unknown";
    } else trial = "Unavailable";

    const latestSubscription = subscriptionsById.get(id)?.[0];
    const rawSubscriptionStatus = text(latestSubscription?.status).toLowerCase();
    const subscriptionLabels: Record<string, string> = { active: "Active", cancelled: "Canceled", on_hold: "On hold", pending: "Pending", failed: "Failed", expired: "Expired" };
    const subscriptionStatus = !subscriptions.available ? "Unavailable" : rawSubscriptionStatus ? subscriptionLabels[rawSubscriptionStatus] ?? "Unknown" : "None";
    const entitled = entitlement === "Paid active" || entitlement === "Trial active";
    let operatorSummary = "Unavailable";
    if (activations.available) {
      const configured = activationsById.get(id) ?? [];
      const distinct = new Map(configured.map((item) => [text(item.operator_key), item]));
      const active = [...distinct.values()].filter((item) => item.enabled === true && entitled).length;
      const waiting = [...distinct.values()].filter((item) => item.enabled === true && !entitled).length;
      const paused = [...distinct.values()].filter((item) => item.enabled !== true).length;
      const latestByOperator = new Map<string, Row>();
      for (const run of runsById.get(id) ?? []) if (!latestByOperator.has(text(run.operator_key))) latestByOperator.set(text(run.operator_key), run);
      const issues = [...latestByOperator.values()].filter((run) => ["failed", "error", "blocked"].includes(text(run.status).toLowerCase())).length;
      operatorSummary = `${distinct.size} configured · ${active} active${waiting ? ` · ${waiting} waiting for plan` : ""}${paused ? ` · ${paused} paused` : ""}${runs.available ? ` · ${issues} recent issues` : " · issue state unavailable"}`;
    }

    let connectorSummary = "Unavailable";
    if (connectors.available) {
      const workspaceConnectors = connectorsById.get(id) ?? [];
      const connected = workspaceConnectors.filter((item) => item.connected === true).length;
      const issueStates = new Set(["error", "needs_attention", "reconnect_required", "permission_required", "configuration_required", "degraded"]);
      const issues = workspaceConnectors.filter((item) => issueStates.has(text(item.status).toLowerCase())).length;
      connectorSummary = `${connected} connected · ${issues} issues`;
    }

    const owner = ownersById.get(id)?.[0];
    const ownerLabel = !owners.available ? "Unavailable" : owner ? text(owner.full_name) || text(owner.email) || "Owner" : "Not found";
    const pending = approvalsById.get(id)?.length;
    const lastRun = runsById.get(id)?.[0];
    return {
      id, name: text(workspace.name) || "Unnamed workspace", owner: ownerLabel, plan, entitlement,
      trial, subscription: subscriptionStatus,
      operators: operatorSummary,
      connectors: connectorSummary,
      approvals: approvals.available ? String(pending ?? 0) : "Unavailable",
      lastActivity: runs.available ? text(lastRun?.created_at) || "No run in latest 1,000 records" : "Unavailable",
    };
  });
  const sources = ["Workspaces", "Owners", "Trial entitlements", "Dodo subscriptions", "Operator activation", "Connector records", "Pending approvals", "Operator runs"];
  const sourceResults = [workspaceResult, owners, trials, subscriptions, activations, connectors, approvals, runs];
  return { available: true, total: workspaceResult.count ?? workspaces.length, page, pageSize, rows: resultRows, sources: sourceResults.every((item) => item.available) ? sources : sources.filter((_, index) => !sourceResults[index].available).map((source) => `${source} unavailable`) };
}

export async function getAdminCommandCounts(): Promise<AdminCommandCounts> {
  await requireInternalAdmin();
  const unavailable: AdminCommandCounts = { available: false, totalWorkspaces: null, activeTrials: null, expiredTrials: null, activePaidSubscriptions: null, configuredOperators: null, connectorIssues: null, billingIssues: null, pendingApprovals: null, failedRuns7d: null };
  if (!hasSupabaseAdminConfig()) return unavailable;
  const db = createSupabaseAdmin();
  const now = new Date().toISOString();
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const connectorProblems = ["error", "needs_attention", "reconnect_required", "permission_required", "configuration_required", "degraded"];
  const [totalWorkspaces, activeTrials, expiredStatus, lapsedStatus, activePaidSubscriptions, configuredOperators, connectorIssues, holdSubscriptions, failedSubscriptions, failedBillingEvents, warningBillingEvents, pendingApprovals, failedRuns7d] = await Promise.all([
    exactCount(() => db.from("os_workspaces").select("id", { count: "exact", head: true })),
    exactCount(() => db.from("os_trial_entitlements").select("id", { count: "exact", head: true }).eq("trial_status", "active").or(`trial_ends_at.is.null,trial_ends_at.gt.${now}`)),
    exactCount(() => db.from("os_trial_entitlements").select("id", { count: "exact", head: true }).eq("trial_status", "expired")),
    exactCount(() => db.from("os_trial_entitlements").select("id", { count: "exact", head: true }).eq("trial_status", "active").lte("trial_ends_at", now)),
    exactCount(() => db.from("os_billing_subscriptions").select("dodo_subscription_id", { count: "exact", head: true }).eq("status", "active")),
    exactCount(() => db.from("os_operator_triggers").select("id", { count: "exact", head: true }).eq("trigger_type", "operator_activation").eq("enabled", true)),
    exactCount(() => db.from("os_connectors").select("id", { count: "exact", head: true }).in("status", connectorProblems)),
    exactCount(() => db.from("os_billing_subscriptions").select("dodo_subscription_id", { count: "exact", head: true }).eq("status", "on_hold")),
    exactCount(() => db.from("os_billing_subscriptions").select("dodo_subscription_id", { count: "exact", head: true }).eq("status", "failed")),
    exactCount(() => db.from("os_billing_events").select("id", { count: "exact", head: true }).eq("processing_status", "failed")),
    exactCount(() => db.from("os_billing_events").select("id", { count: "exact", head: true }).ilike("processing_status", "%warning%")),
    exactCount(() => db.from("os_approvals").select("id", { count: "exact", head: true }).eq("status", "pending")),
    exactCount(() => db.from("os_operator_runs").select("id", { count: "exact", head: true }).in("status", ["failed", "error"]).gte("created_at", week)),
  ]);
  const billingIssues = [holdSubscriptions, failedSubscriptions, failedBillingEvents, warningBillingEvents].some((value) => value === null) ? null : holdSubscriptions! + failedSubscriptions! + failedBillingEvents! + warningBillingEvents!;
  const counts = { totalWorkspaces, activeTrials, expiredTrials: expiredStatus === null || lapsedStatus === null ? null : expiredStatus + lapsedStatus, activePaidSubscriptions, configuredOperators, connectorIssues, billingIssues, pendingApprovals, failedRuns7d };
  return { available: Object.values(counts).every((value) => value !== null), ...counts };
}

import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getConnectorTruth } from "@/lib/connectors/truth";

export type WorkspaceNotification = { id: string; type: string; title: string; description: string; severity: "info" | "attention" | "critical"; status: "open" | "resolved"; createdAt: string; readAt: string | null; dismissedAt: string | null; relatedRoute: string | null };
type Candidate = Omit<WorkspaceNotification, "id" | "status" | "createdAt" | "readAt" | "dismissedAt"> & { dedupeKey: string; sourceType: string; sourceId: string };
type Row = Record<string, unknown>;

const text = (value: unknown) => typeof value === "string" ? value : null;
const connectorName = (key: string) => key.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function rowToNotification(row: Row): WorkspaceNotification {
  return { id: String(row.id), type: String(row.notification_type), title: String(row.title), description: String(row.description), severity: String(row.severity) as WorkspaceNotification["severity"], status: String(row.status) as WorkspaceNotification["status"], createdAt: String(row.created_at), readAt: text(row.read_at), dismissedAt: text(row.dismissed_at), relatedRoute: text(row.related_route) };
}

async function candidatesFor(workspaceId: string): Promise<Candidate[]> {
  const supabase = createSupabaseAdmin();
  const now = Date.now();
  const [approvals, workspace, pauses, connectorTruth] = await Promise.all([
    supabase.from("os_approvals").select("id,agent_id,created_at").eq("workspace_id", workspaceId).eq("status", "pending").limit(100),
    supabase.from("os_workspaces").select("billing_status,trial_ends_at").eq("id", workspaceId).maybeSingle(),
    supabase.from("os_operator_triggers").select("operator_key").eq("workspace_id", workspaceId).eq("trigger_type", "operator_execution_pause").eq("enabled", true),
    getConnectorTruth({ workspaceId, supabase }),
  ]);
  if (approvals.error || workspace.error || pauses.error) throw new Error("Notification sources are unavailable.");
  const output: Candidate[] = (approvals.data ?? []).map((row) => ({ type: "approval_required", title: "Approval waiting", description: `${text(row.agent_id)?.replace(/_/g, " ") ?? "An operator"} prepared work for review.`, severity: "attention", relatedRoute: "/approvals", dedupeKey: `approval:${row.id}`, sourceType: "approval", sourceId: String(row.id) }));
  for (const pause of pauses.data ?? []) {
    const operator = text(pause.operator_key)?.replace(/_/g, " ") ?? "An operator";
    output.push({ type: "operator_paused", title: "Operator execution paused", description: `${operator} cannot perform business actions until an owner or admin resumes it.`, severity: "critical", relatedRoute: "/policies", dedupeKey: `operator_pause:${pause.operator_key}`, sourceType: "execution_policy", sourceId: String(pause.operator_key) });
  }
  for (const connector of connectorTruth) {
    if (connector.status !== "error" && connector.status !== "reconnect_required") continue;
    output.push({ type: "connector_attention", title: `${connectorName(connector.connectorKey)} needs attention`, description: `Reconnect ${connectorName(connector.connectorKey)} so dependent operators can continue using current context.`, severity: "attention", relatedRoute: "/connectors", dedupeKey: `connector:${connector.connectorKey}`, sourceType: "connector", sourceId: connector.connectorKey });
  }
  const billingStatus = text(workspace.data?.billing_status);
  const trialEnd = text(workspace.data?.trial_ends_at);
  const trialEndTime = trialEnd ? new Date(trialEnd).getTime() : Number.NaN;
  if (billingStatus === "past_due") output.push({ type: "billing_attention", title: "Payment needs attention", description: "Execution may be limited until billing is restored.", severity: "critical", relatedRoute: "/plans", dedupeKey: "billing:past_due", sourceType: "billing", sourceId: "past_due" });
  if (billingStatus === "trialing" && Number.isFinite(trialEndTime) && trialEndTime > now && trialEndTime - now <= 25 * 60 * 60 * 1000) output.push({ type: "trial_ending", title: "Trial ends soon", description: "Choose a plan to keep live execution available after your trial ends.", severity: "attention", relatedRoute: "/plans", dedupeKey: "billing:trial_ending", sourceType: "billing", sourceId: "trial_ending" });
  if (billingStatus === "canceled" && Number.isFinite(trialEndTime) && trialEndTime <= now) output.push({ type: "trial_expired", title: "Trial has ended", description: "Live execution is paused until you choose a plan.", severity: "critical", relatedRoute: "/plans", dedupeKey: "billing:trial_expired", sourceType: "billing", sourceId: "trial_expired" });
  return output;
}

export async function syncWorkspaceNotifications(workspaceId: string) {
  const supabase = createSupabaseAdmin();
  const [candidates, current] = await Promise.all([candidatesFor(workspaceId), supabase.from("os_notifications").select("*").eq("workspace_id", workspaceId).limit(300)]);
  if (current.error) throw new Error("Notification state is unavailable.");
  const currentByKey = new Map((current.data ?? []).map((row) => [String(row.dedupe_key), row as Row]));
  const keys = new Set(candidates.map((candidate) => candidate.dedupeKey));
  for (const candidate of candidates) {
    const existing = currentByKey.get(candidate.dedupeKey);
    if (!existing) {
      await supabase.from("os_notifications").insert({ workspace_id: workspaceId, notification_type: candidate.type, source_type: candidate.sourceType, source_id: candidate.sourceId, title: candidate.title, description: candidate.description, severity: candidate.severity, related_route: candidate.relatedRoute, dedupe_key: candidate.dedupeKey });
    } else if (text(existing.status) === "resolved") {
      await supabase.from("os_notifications").update({ title: candidate.title, description: candidate.description, severity: candidate.severity, related_route: candidate.relatedRoute, status: "open", read_at: null, dismissed_at: null, resolved_at: null }).eq("id", existing.id);
    } else if (text(existing.dismissed_at) === null) {
      await supabase.from("os_notifications").update({ title: candidate.title, description: candidate.description, severity: candidate.severity, related_route: candidate.relatedRoute }).eq("id", existing.id);
    }
  }
  const stale = (current.data ?? []).filter((row) => row.status === "open" && !keys.has(String(row.dedupe_key)));
  if (stale.length) await supabase.from("os_notifications").update({ status: "resolved", resolved_at: new Date().toISOString() }).in("id", stale.map((row) => row.id));
}

export async function getWorkspaceNotifications(workspaceId: string) {
  await syncWorkspaceNotifications(workspaceId);
  const supabase = createSupabaseAdmin();
  const result = await supabase.from("os_notifications").select("id,notification_type,title,description,severity,status,created_at,read_at,dismissed_at,related_route").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(60);
  if (result.error) throw new Error("Notification state is unavailable.");
  const items = (result.data ?? []).map((row) => rowToNotification(row as Row));
  return { items, unreadCount: items.filter((item) => item.status === "open" && !item.dismissedAt && !item.readAt).length };
}

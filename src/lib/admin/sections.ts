import "server-only";

import { requireInternalAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type Row = Record<string, unknown>;
export type AdminSectionData = { source: string; rows: Row[]; counts: Array<{ label: string; value: number }>; unavailable?: string };
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((row): row is Row => !!row && typeof row === "object") : [];

export async function getAdminSectionData(section: string): Promise<AdminSectionData> {
  await requireInternalAdmin();
  if (!hasSupabaseAdminConfig()) return { source: "Supabase", rows: [], counts: [], unavailable: "Supabase is not configured." };
  const db = createSupabaseAdmin();
  const definitions: Record<string, { source: string; table: string; select: string; counts: string[] }> = {
    customers: { source: "Workspace records", table: "os_workspaces", select: "id,name,plan_tier,billing_status,created_at,billing_updated_at", counts: ["total workspaces", "active billing", "trials"] },
    support: { source: "os_support_requests", table: "os_support_requests", select: "id,workspace_id,user_email,topic,status,created_at", counts: ["open", "in review", "waiting"] },
    feedback: { source: "os_feedback", table: "os_feedback", select: "id,workspace_id,user_email,feedback_type,requested_system,requested_work,status,created_at", counts: ["new", "connector requests", "bug reports"] },
    connectors: { source: "Workspace connector records", table: "os_connectors", select: "workspace_id,connector_key,status,connected_at", counts: ["connected", "needs attention", "workspaces"] },
    operators: { source: "Operator runtime", table: "os_operator_runs", select: "workspace_id,operator_key,status,created_at", counts: ["runs", "failed", "workspaces"] },
    "system-health": { source: "Operator runtime", table: "os_operator_runs", select: "workspace_id,operator_key,status,created_at", counts: ["failed runs", "recent runs", "unavailable sources"] },
  };
  const definition = definitions[section];
  if (!definition) return { source: "Auterim data layer", rows: [], counts: [], unavailable: "No source-backed view is defined for this section." };
  const response = await db.from(definition.table).select(definition.select).order("created_at", { ascending: false }).limit(100);
  if (response.error) return { source: definition.source, rows: [], counts: [], unavailable: "This source is not available in the current database." };
  const data = rows(response.data);
  const count = (predicate: (row: Row) => boolean) => data.filter(predicate).length;
  const status = (value: string) => (row: Row) => String(row.status) === value;
  let counts: Array<{ label: string; value: number }>;
  if (section === "customers") counts = [{ label: "total workspaces", value: data.length }, { label: "active billing", value: count(status("active")) }, { label: "trials", value: count(status("trialing")) }];
  else if (section === "support") counts = [{ label: "open", value: count(status("open")) }, { label: "in review", value: count(status("in_review")) }, { label: "waiting", value: count(status("waiting")) }];
  else if (section === "feedback") counts = [{ label: "new", value: count(status("new")) }, { label: "connector requests", value: count((row) => row.feedback_type === "connector_request") }, { label: "bug reports", value: count((row) => row.feedback_type === "bug") }];
  else if (section === "connectors") counts = [{ label: "connected", value: count(status("connected")) }, { label: "needs attention", value: count((row) => ["needs_attention", "reconnect_required", "error"].includes(String(row.status))) }, { label: "workspaces", value: new Set(data.map((row) => row.workspace_id)).size }];
  else counts = [{ label: section === "system-health" ? "failed runs" : "runs", value: count((row) => ["failed", "error"].includes(String(row.status))) }, { label: "recent runs", value: data.length }, { label: "workspaces", value: new Set(data.map((row) => row.workspace_id)).size }];
  return { source: definition.source, rows: data.slice(0, 20), counts };
}

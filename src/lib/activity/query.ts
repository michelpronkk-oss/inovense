import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizeWorkforceActivity } from "@/lib/activity/normalize";
import type { WorkforceActivityPage } from "@/lib/activity/types";

type Range = "24h" | "7d" | "30d";
const hoursFor: Record<Range, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

export async function getWorkforceActivity(input: { workspaceId: string; range: Range; limit?: number }): Promise<WorkforceActivityPage> {
  const supabase = createSupabaseAdmin();
  const start = new Date(Date.now() - hoursFor[input.range] * 60 * 60 * 1000).toISOString();
  const [approvals, runs, logs, workflows] = await Promise.all([
    supabase.from("os_approvals").select("id,status,created_at,resolved_at,agent_id,continuation_payload").eq("workspace_id", input.workspaceId).gte("created_at", start).order("created_at", { ascending: false }).limit(250),
    supabase.from("os_operator_runs").select("id,operator_key,status,created_at,completed_at").eq("workspace_id", input.workspaceId).gte("created_at", start).order("created_at", { ascending: false }).limit(250),
    supabase.from("os_operator_run_logs").select("id,event_type,created_at,metadata").eq("workspace_id", input.workspaceId).gte("created_at", start).order("created_at", { ascending: false }).limit(250),
    supabase.from("os_workflow_runs").select("id,operator_key,objective,status,created_at").eq("workspace_id", input.workspaceId).gte("created_at", start).order("created_at", { ascending: false }).limit(250),
  ]);
  if (approvals.error || runs.error || logs.error || workflows.error) throw new Error("Workforce activity is temporarily unavailable.");
  return normalizeWorkforceActivity({ approvals: approvals.data ?? [], runs: runs.data ?? [], logs: logs.data ?? [], workflows: workflows.data ?? [], rangeStart: start, limit: input.limit });
}

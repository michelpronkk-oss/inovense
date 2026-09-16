import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizeWorkforceActivity } from "@/lib/activity/normalize";
import type { WorkforceActivityPage } from "@/lib/activity/types";
import { getWorkforceActivityRangeDefinition, type WorkforceActivityRange } from "@/lib/dashboard/workforce-activity-range";
import { aggregateWorkforceActivity, type WorkforceActivityChartSummary } from "@/lib/dashboard/workforce-activity";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
const SOURCE_LIMIT = 1000;

async function queryWorkforceActivity(input: { workspaceId: string; range: WorkforceActivityRange; limit?: number; supabase?: SupabaseAdmin }) {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const definition = getWorkforceActivityRangeDefinition(input.range);
  const start = definition.start;
  const end = definition.end;
  const [approvals, runs, logs, workflows, outcomes] = await Promise.all([
    supabase.from("os_approvals").select("id,status,created_at,resolved_at,agent_id,continuation_payload").eq("workspace_id", input.workspaceId).or(`and(created_at.gte.${start},created_at.lt.${end}),and(resolved_at.gte.${start},resolved_at.lt.${end})`).order("created_at", { ascending: false }).limit(SOURCE_LIMIT),
    supabase.from("os_operator_runs").select("id,operator_key,status,created_at,completed_at").eq("workspace_id", input.workspaceId).or(`and(created_at.gte.${start},created_at.lt.${end}),and(completed_at.gte.${start},completed_at.lt.${end})`).order("created_at", { ascending: false }).limit(SOURCE_LIMIT),
    supabase.from("os_operator_run_logs").select("id,event_type,created_at,metadata").eq("workspace_id", input.workspaceId).gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false }).limit(SOURCE_LIMIT),
    supabase.from("os_workflow_runs").select("id,operator_key,objective,status,created_at,parent_workflow_id,supporting_operators,dependency_state").eq("workspace_id", input.workspaceId).gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false }).limit(SOURCE_LIMIT),
    supabase.from("os_workflow_outcomes").select("id,operator_key,workflow_id,outcome_type,attribution_level,confidence,evidence_refs,observed_at").eq("workspace_id", input.workspaceId).gte("observed_at", start).lt("observed_at", end).order("observed_at", { ascending: false }).limit(SOURCE_LIMIT),
  ]);
  if (approvals.error || runs.error || logs.error || workflows.error || outcomes.error) throw new Error("Workforce activity is temporarily unavailable.");
  const page = normalizeWorkforceActivity({
    approvals: approvals.data ?? [], runs: runs.data ?? [], logs: logs.data ?? [], workflows: workflows.data ?? [], outcomes: outcomes.data ?? [],
    rangeStart: start, rangeEnd: end, limit: input.limit,
    partialHistory: [approvals.data, runs.data, logs.data, workflows.data, outcomes.data].some((rows) => (rows?.length ?? 0) >= SOURCE_LIMIT),
  });
  return { page, definition };
}

export async function getWorkforceActivity(input: { workspaceId: string; range: WorkforceActivityRange; limit?: number; supabase?: SupabaseAdmin }): Promise<WorkforceActivityPage> {
  return (await queryWorkforceActivity(input)).page;
}

export async function getWorkforceActivityChart(input: { workspaceId: string; range: WorkforceActivityRange; supabase?: SupabaseAdmin }): Promise<WorkforceActivityChartSummary> {
  const { page, definition } = await queryWorkforceActivity({ workspaceId: input.workspaceId, range: input.range, limit: SOURCE_LIMIT * 8, supabase: input.supabase });
  return aggregateWorkforceActivity(page.items, definition, page.partialHistory, page.summary);
}

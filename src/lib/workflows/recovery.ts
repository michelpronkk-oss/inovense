import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/**
 * Moves old executing steps to manual review. It never retries a provider write
 * after an ambiguous result; the linked execution intent is the evidence an
 * operator can reconcile before deciding what to do next.
 */
export async function recoverStuckWorkflowSteps(input: { workspaceId: string; olderThanMinutes?: number; supabase?: SupabaseAdmin }): Promise<{ reviewed: number }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const age = Math.max(5, Math.min(input.olderThanMinutes ?? 30, 24 * 60));
  const threshold = new Date(Date.now() - age * 60_000).toISOString();
  const result = await supabase.from("os_workflow_steps").select("id,workflow_id,execution_intent_id").eq("workspace_id", input.workspaceId).eq("status", "executing").lt("updated_at", threshold).limit(100);
  if (result.error) throw new Error(`Stuck workflow steps could not be loaded: ${result.error.message}`);
  let reviewed = 0;
  for (const step of result.data ?? []) {
    const update = await supabase.from("os_workflow_steps").update({ status: "blocked", block_reason: step.execution_intent_id ? "execution_unknown" : "execution_recovery_required" }).eq("id", step.id).eq("workspace_id", input.workspaceId).eq("status", "executing");
    if (update.error) throw new Error(`Stuck workflow step could not be reviewed: ${update.error.message}`);
    reviewed += 1;
    await supabase.from("os_workflow_runs").update({ status: "blocked" }).eq("id", step.workflow_id).eq("workspace_id", input.workspaceId).not("status", "eq", "completed");
  }
  return { reviewed };
}

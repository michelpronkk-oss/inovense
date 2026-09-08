import "server-only";

import { deriveWorkflowStatus, type WorkflowStepStatus } from "@/lib/workflows/engine";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { materializeWorkflowStep } from "@/lib/workflows/materialize";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type StepRow = { id: string; workflow_id: string; workspace_id: string; status: WorkflowStepStatus; dependency_step_ids: unknown; approval_id: string | null };

function dependencyIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Reconciles workflow state after the canonical approval system decides or
 * executes an action. It intentionally never contacts a provider: the route
 * that owns the existing approval continuation remains the only writer.
 */
export async function advanceWorkflow(input: { workflowId: string; workspaceId: string; supabase?: SupabaseAdmin }): Promise<{ status: string; updatedSteps: number }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const stepsResult = await supabase.from("os_workflow_steps").select("id,workflow_id,workspace_id,status,dependency_step_ids,approval_id").eq("workflow_id", input.workflowId).eq("workspace_id", input.workspaceId).order("step_order");
  if (stepsResult.error) throw new Error(`Workflow steps could not be loaded: ${stepsResult.error.message}`);
  const steps = (stepsResult.data ?? []) as StepRow[];
  const approvalIds = steps.flatMap((step) => step.approval_id ? [step.approval_id] : []);
  const approvalsResult = approvalIds.length ? await supabase.from("os_approvals").select("id,status").eq("workspace_id", input.workspaceId).in("id", approvalIds) : { data: [], error: null };
  if (approvalsResult.error) throw new Error(`Workflow approvals could not be loaded: ${approvalsResult.error.message}`);
  const approvalStatus = new Map((approvalsResult.data ?? []).map((approval) => [String(approval.id), String(approval.status)]));
  const states = new Map(steps.map((step) => [step.id, step.status]));
  let updatedSteps = 0;
  for (const step of steps) {
    const dependencies = dependencyIds(step.dependency_step_ids).map((id) => `${input.workflowId}:${id}`);
    const dependencyStates = dependencies.map((id) => states.get(id));
    let next = step.status;
    let blockReason: string | null = null;
    if (dependencyStates.some((state) => ["failed", "rejected", "blocked", "skipped"].includes(state ?? ""))) {
      next = "blocked"; blockReason = "dependency_unavailable";
    } else if (step.approval_id) {
      const decision = approvalStatus.get(step.approval_id);
      if (decision === "approved") next = "completed";
      else if (decision === "rejected") next = "rejected";
      else if (decision === "failed") { next = "blocked"; blockReason = "approval_execution_failed"; }
      else if (decision === "pending") next = dependencyStates.every((state) => state === "completed") ? "awaiting_approval" : "proposed";
    }
    if (next !== step.status) {
      const update = await supabase.from("os_workflow_steps").update({ status: next, block_reason: blockReason }).eq("id", step.id).eq("workspace_id", input.workspaceId);
      if (update.error) throw new Error(`Workflow step update failed: ${update.error.message}`);
      states.set(step.id, next); updatedSteps += 1;
    }
  }
  const status = deriveWorkflowStatus(Array.from(states.values()).map((state) => ({ status: state })));
  const workflowUpdate = await supabase.from("os_workflow_runs").update({ status }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
  if (workflowUpdate.error) throw new Error(`Workflow status update failed: ${workflowUpdate.error.message}`);
  // A successful prerequisite may make the next exact, configured action
  // eligible for materialization. The materializer remains fail-closed.
  await Promise.all(steps.filter((step) => states.get(step.id) === "proposed" && dependencyIds(step.dependency_step_ids).every((dependency) => states.get(`${input.workflowId}:${dependency}`) === "completed")).map(async (step) => {
    try { await materializeWorkflowStep({ workflowId: input.workflowId, stepId: step.id, workspaceId: input.workspaceId, supabase }); } catch { /* a blocked next step is persisted by the materializer */ }
  }));
  return { status, updatedSteps };
}

export async function advanceWorkflowForApproval(input: { approvalId: string; workspaceId: string; supabase?: SupabaseAdmin }): Promise<void> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const step = await supabase.from("os_workflow_steps").select("workflow_id").eq("workspace_id", input.workspaceId).eq("approval_id", input.approvalId).maybeSingle();
  if (step.error || !step.data?.workflow_id) return;
  await advanceWorkflow({ workflowId: String(step.data.workflow_id), workspaceId: input.workspaceId, supabase });
}

export async function cancelWorkflow(input: { workflowId: string; workspaceId: string; supabase?: SupabaseAdmin }): Promise<void> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workflow = await supabase.from("os_workflow_runs").select("status").eq("id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (workflow.error || !workflow.data) throw new Error("Workflow not found.");
  if (["completed", "cancelled"].includes(String(workflow.data.status))) return;
  const steps = await supabase.from("os_workflow_steps").update({ status: "skipped", block_reason: "workflow_cancelled" }).eq("workflow_id", input.workflowId).eq("workspace_id", input.workspaceId).in("status", ["proposed", "awaiting_approval", "approved"]);
  if (steps.error) throw new Error(`Workflow cancellation failed: ${steps.error.message}`);
  const update = await supabase.from("os_workflow_runs").update({ status: "cancelled" }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
  if (update.error) throw new Error(`Workflow cancellation failed: ${update.error.message}`);
}

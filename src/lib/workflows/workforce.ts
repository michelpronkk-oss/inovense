import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { advanceWorkflow } from "@/lib/workflows/lifecycle";
import { explicitBusinessProblemKey } from "@/lib/workflows/identity";
import type { WorkforceOperator } from "@/lib/workforce/ownership";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type SupportingWorkInput = {
  supabase: SupabaseAdmin;
  workspaceId: string;
  parentWorkflowId: string;
  sourceSignalId: string;
  parentPrimaryOperator: WorkforceOperator;
  supportingOperator: WorkforceOperator;
  handoffReason: string;
  requestedOutcome: string;
  relevantContext: Record<string, unknown>;
  customerImpact?: string | null;
  deadline?: string | null;
  returnCondition: string;
  priority: number;
  confidence: "low" | "medium" | "high";
  entityRefs: string[];
  sourceProblemKey?: string | null;
};

export function buildSupportingWorkContract(input: Omit<SupportingWorkInput, "supabase">): Record<string, unknown> {
  return {
    parent_workflow_id: input.parentWorkflowId,
    originating_signal_id: input.sourceSignalId,
    primary_owner: input.supportingOperator,
    parent_primary_owner: input.parentPrimaryOperator,
    supporting_operator: input.supportingOperator,
    handoff_reason: bounded(input.handoffReason, 500),
    requested_outcome: bounded(input.requestedOutcome, 500),
    relevant_context: input.relevantContext,
    customer_impact: input.customerImpact ? bounded(input.customerImpact, 500) : null,
    deadline: input.deadline ?? null,
    external_communication_allowed: false,
    external_communication_owner: null,
    return_condition: bounded(input.returnCondition, 500),
    dependency_state: "waiting_on_supporting_work",
    handoff_status: "active",
    source_problem_key: input.sourceProblemKey ?? null,
    return_path: [input.parentWorkflowId],
  };
}

export async function findSupportingWorkflow(input: { supabase: SupabaseAdmin; workspaceId: string; sourceSignalId: string; supportingOperator: WorkforceOperator }): Promise<string | null> {
  const result = await input.supabase.from("os_workflow_runs").select("id").eq("workspace_id", input.workspaceId).eq("originating_signal_id", input.sourceSignalId).eq("operator_key", input.supportingOperator).not("parent_workflow_id", "is", null).in("status", ["planned", "blocked", "awaiting_approval", "executing"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error(`Supporting workflow lookup failed: ${result.error.message}`);
  return typeof result.data?.id === "string" ? result.data.id : null;
}

function bounded(value: string, max: number): string {
  return value.slice(0, max);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 20) : [];
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** One bounded child per parent/operator pair. Child work cannot communicate externally. */
export async function createSupportingWorkflow(input: SupportingWorkInput): Promise<{ childWorkflowId: string; created: boolean }> {
  const childWorkflowId = `${input.parentWorkflowId}:supporting:${input.supportingOperator}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
  const dedupeKey = `workflow:${input.parentWorkflowId}:supporting:${input.supportingOperator}`.slice(0, 480);
  const contract = buildSupportingWorkContract(input);
  const child = await input.supabase.from("os_workflow_runs").upsert({
    id: childWorkflowId,
    workspace_id: input.workspaceId,
    operator_key: input.supportingOperator,
    originating_signal_id: input.sourceSignalId,
    objective: input.requestedOutcome,
    entity_refs: input.entityRefs.slice(0, 20),
    context_refs: ["supporting-work", input.handoffReason, `return:${input.returnCondition}`].slice(0, 20),
    priority: Math.max(0, Math.min(100, input.priority)),
    confidence: input.confidence,
    status: "planned",
    dedupe_key: dedupeKey,
    ...contract,
    supporting_operators: [],
  }, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true });
  if (child.error) throw new Error(`Supporting workflow persistence failed: ${child.error.message}`);

  const parent = await input.supabase.from("os_workflow_runs").select("operator_key,supporting_operators,return_path").eq("id", input.parentWorkflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (parent.error || !parent.data) throw new Error(`Parent workflow could not be loaded: ${parent.error?.message ?? "not found"}`);
  const owners = Array.from(new Set([...stringArray(parent.data.supporting_operators), input.supportingOperator]));
  const returnPath = Array.from(new Set([...stringArray(parent.data.return_path), childWorkflowId]));
  const parentUpdate = await input.supabase.from("os_workflow_runs").update({
    supporting_owner: owners[0] ?? input.supportingOperator,
    supporting_operators: owners,
    handoff_reason: bounded(input.handoffReason, 500),
    requested_outcome: bounded(input.requestedOutcome, 500),
    dependency_state: "waiting_on_supporting_work",
    handoff_status: "active",
    external_communication_owner: input.parentPrimaryOperator,
    return_path: returnPath,
    source_problem_key: input.sourceProblemKey ?? null,
  }).eq("id", input.parentWorkflowId).eq("workspace_id", input.workspaceId);
  if (parentUpdate.error) throw new Error(`Parent supporting-work update failed: ${parentUpdate.error.message}`);
  return { childWorkflowId, created: true };
}

/**
 * Returns evidence to the parent and resumes only when all required children
 * have returned. A changed parent context invalidates scoped approvals and
 * leaves the next parent step proposed for a fresh policy decision.
 */
export async function returnSupportingOutcome(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  childWorkflowId: string;
  outcomeType: string;
  evidence: Record<string, unknown>;
  evidenceRefs: string[];
  contextChanged?: boolean;
  now?: string;
}): Promise<{ parentWorkflowId: string | null; parentReady: boolean; reapprovalRequired: boolean }> {
  const now = input.now ?? new Date().toISOString();
  const childResult = await input.supabase.from("os_workflow_runs").select("id,parent_workflow_id,operator_key,status").eq("id", input.childWorkflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (childResult.error || !childResult.data) throw new Error(`Supporting workflow could not be loaded: ${childResult.error?.message ?? "not found"}`);
  const parentWorkflowId = typeof childResult.data.parent_workflow_id === "string" ? childResult.data.parent_workflow_id : null;
  const childUpdate = await input.supabase.from("os_workflow_runs").update({ status: "completed", dependency_state: "ready_to_continue", handoff_status: "completed", result_evidence: input.evidence }).eq("id", input.childWorkflowId).eq("workspace_id", input.workspaceId);
  if (childUpdate.error) throw new Error(`Supporting workflow completion failed: ${childUpdate.error.message}`);
  if (!parentWorkflowId) return { parentWorkflowId: null, parentReady: false, reapprovalRequired: false };

  const outcomeId = `outcome-${input.workspaceId}-${parentWorkflowId}-${input.childWorkflowId}-${input.outcomeType}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
  const outcome = await input.supabase.from("os_workflow_outcomes").upsert({
    id: outcomeId,
    workspace_id: input.workspaceId,
    operator_key: String(childResult.data.operator_key),
    workflow_id: parentWorkflowId,
    outcome_type: input.outcomeType,
    attribution_level: "influenced",
    confidence: "high",
    evidence_refs: input.evidenceRefs.slice(0, 20),
    observed_at: now,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (outcome.error) throw new Error(`Supporting outcome persistence failed: ${outcome.error.message}`);

  const children = await input.supabase.from("os_workflow_runs").select("status").eq("parent_workflow_id", parentWorkflowId).eq("workspace_id", input.workspaceId);
  if (children.error) throw new Error(`Supporting workflow state could not be loaded: ${children.error.message}`);
  const childStates = (children.data ?? []).map((row) => String(row.status));
  const parentReady = childStates.length > 0 && childStates.every((status) => ["completed", "cancelled"].includes(status));
  const parent = await input.supabase.from("os_workflow_runs").select("status,relevant_context,result_evidence,return_path").eq("id", parentWorkflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (parent.error || !parent.data) throw new Error(`Parent workflow could not be loaded: ${parent.error?.message ?? "not found"}`);
  const parentContext = { ...recordValue(parent.data.relevant_context), supportingResults: { ...recordValue(recordValue(parent.data.relevant_context).supportingResults), [input.childWorkflowId]: input.evidence } };
  const nextReturnPath = stringArray(parent.data.return_path).filter((id) => id !== input.childWorkflowId);
  const parentUpdate = await input.supabase.from("os_workflow_runs").update({
    relevant_context: parentContext,
    result_evidence: { ...recordValue(parent.data.result_evidence), [input.childWorkflowId]: input.evidence },
    dependency_state: parentReady ? "ready_to_continue" : "waiting_on_supporting_work",
    handoff_status: parentReady ? "completed" : "active",
    return_path: nextReturnPath,
    status: parentReady && ["blocked", "planned"].includes(String(parent.data.status)) ? "planned" : parent.data.status,
  }).eq("id", parentWorkflowId).eq("workspace_id", input.workspaceId);
  if (parentUpdate.error) throw new Error(`Parent workflow resume update failed: ${parentUpdate.error.message}`);

  let reapprovalRequired = false;
  if (input.contextChanged && parentReady) {
    const steps = await input.supabase.from("os_workflow_steps").select("id,approval_id,status").eq("workflow_id", parentWorkflowId).eq("workspace_id", input.workspaceId).in("status", ["awaiting_approval", "approved"]);
    if (steps.error) throw new Error(`Parent approval scope could not be loaded: ${steps.error.message}`);
    const approvalIds = (steps.data ?? []).map((row) => typeof row.approval_id === "string" ? row.approval_id : null).filter((id): id is string => Boolean(id));
    if (approvalIds.length) {
      await input.supabase.from("os_approvals").update({ status: "rejected", resolved_at: now, resolved_by: "system:context_change", policy_reason: "Supporting work changed the parent context; reapproval is required." }).eq("workspace_id", input.workspaceId).in("id", approvalIds).in("status", ["pending", "approved"]);
    }
    if ((steps.data ?? []).length) {
      const reset = await input.supabase.from("os_workflow_steps").update({ status: "proposed", approval_id: null, execution_intent_id: null, block_reason: "context_changed_reapproval_required" }).eq("workflow_id", parentWorkflowId).eq("workspace_id", input.workspaceId).in("status", ["awaiting_approval", "approved"]);
      if (reset.error) throw new Error(`Parent reapproval reset failed: ${reset.error.message}`);
      reapprovalRequired = true;
    }
  }
  if (parentReady && !reapprovalRequired) await advanceWorkflow({ workflowId: parentWorkflowId, workspaceId: input.workspaceId, supabase: input.supabase });
  return { parentWorkflowId, parentReady, reapprovalRequired };
}

/** Explicit transfer; it records history and revokes scoped open approvals. */
export async function transferWorkflowOwnership(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  workflowId: string;
  fromOperator: WorkforceOperator;
  toOperator: WorkforceOperator;
  reason: string;
  contextSnapshot: Record<string, unknown>;
  transferredBy: string;
}): Promise<void> {
  if (input.fromOperator === input.toOperator) throw new Error("Ownership transfer requires a different operator.");
  const current = await input.supabase.from("os_workflow_runs").select("operator_key,primary_owner,ownership_transfers").eq("id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (current.error || !current.data) throw new Error(`Workflow ownership could not be loaded: ${current.error?.message ?? "not found"}`);
  if (![current.data.operator_key, current.data.primary_owner].includes(input.fromOperator)) throw new Error("Ownership transfer source does not match the current primary owner.");
  const transfer = { fromOperator: input.fromOperator, toOperator: input.toOperator, reason: input.reason.slice(0, 500), timestamp: new Date().toISOString(), sourceWorkflow: input.workflowId, contextSnapshot: input.contextSnapshot, externalCommunicationOwner: input.toOperator, transferredBy: input.transferredBy };
  const history = Array.isArray(current.data.ownership_transfers) ? current.data.ownership_transfers.slice(-9) : [];
  const update = await input.supabase.from("os_workflow_runs").update({ operator_key: input.toOperator, primary_owner: input.toOperator, external_communication_owner: input.toOperator, ownership_transfers: [...history, transfer], dependency_state: "ready_to_continue", handoff_status: "transferred" }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
  if (update.error) throw new Error(`Workflow ownership transfer failed: ${update.error.message}`);
  const steps = await input.supabase.from("os_workflow_steps").select("approval_id").eq("workflow_id", input.workflowId).eq("workspace_id", input.workspaceId).in("status", ["awaiting_approval", "approved"]);
  if (steps.error) throw new Error(`Workflow transfer approvals could not be loaded: ${steps.error.message}`);
  const approvalIds = (steps.data ?? []).map((row) => typeof row.approval_id === "string" ? row.approval_id : null).filter((id): id is string => Boolean(id));
  if (approvalIds.length) await input.supabase.from("os_approvals").update({ status: "rejected", resolved_at: new Date().toISOString(), resolved_by: "system:ownership_transfer", policy_reason: "Ownership changed; the original scoped approval cannot authorize the new owner." }).eq("workspace_id", input.workspaceId).in("id", approvalIds).in("status", ["pending", "approved"]);
  await input.supabase.from("os_workflow_steps").update({ status: "proposed", approval_id: null, execution_intent_id: null, block_reason: "ownership_changed_reapproval_required" }).eq("workflow_id", input.workflowId).eq("workspace_id", input.workspaceId).in("status", ["awaiting_approval", "approved"]);
  await input.supabase.from("os_execution_logs").insert({
    id: `log-workflow-transfer-${input.workflowId}-${Date.now()}`.slice(0, 180),
    ts: new Date().toISOString(), run_id: input.workflowId, agent_id: "system", agent_mark: "WF", agent_color: "#66D0E0",
    event: "workflow.ownership_transferred", message: `Ownership transferred from ${input.fromOperator} to ${input.toOperator}: ${input.reason.slice(0, 240)}`,
    duration: "-", status: "ok",
  });
}

export function problemKeyFromWorkflowContext(metadata: Record<string, unknown> | null | undefined): string | null {
  return explicitBusinessProblemKey(metadata);
}

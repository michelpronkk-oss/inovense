import type { PreparedAction } from "@/lib/actions/types";
import { ingestSignalBatch } from "@/lib/signals/store";
import { routeSignalEvent } from "@/lib/signals/engine";
import type { SignalCandidate, SignalEvent } from "@/lib/signals/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { canonicalBusinessProblemWorkflowDedupeKey, canonicalWorkflowDedupeKey, explicitBusinessProblemKey } from "@/lib/workflows/identity";
import type { ClientFlowContext } from "@/lib/operators/client-flow/context";
import { createSupportingWorkflow } from "@/lib/workflows/workforce";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export function buildClientFlowCandidate(input: { workspaceId: string; provider: string; sourceId: string; signalType: string; priority: number; confidence: SignalCandidate["confidence"]; reasonCodes: string[]; dedupeKey: string; supportingOperators?: string[] }): SignalCandidate {
  return { id: `candidate_${input.workspaceId}_${input.provider}_${input.sourceId}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180), signalId: undefined, workspaceId: input.workspaceId, operatorKey: "client_flow", signalType: input.signalType, confidence: input.confidence, priority: Math.max(0, Math.min(100, input.priority)), priorityLevel: input.priority >= 85 ? "critical" : input.priority >= 65 ? "high" : input.priority >= 35 ? "normal" : "low", urgency: input.priority >= 85 ? "critical" : input.priority >= 60 ? "high" : input.priority >= 30 ? "medium" : "low", reasonCodes: input.reasonCodes.slice(0, 12), evidence: { provider: input.provider, sourceId: input.sourceId, sourceType: "customer_continuity" }, recommendedActionTypes: ["prepare_customer_update"], dedupeKey: input.dedupeKey, source: input.provider, sourceId: input.sourceId, routeReason: "Client Flow customer-continuity signal.", status: "routed", metadata: {}, actionability: "WORKFLOW_CANDIDATE", supportingOperators: input.supportingOperators ?? [] };
}

export async function persistCanonicalClientFlowSignal(input: { supabase: SupabaseAdmin; event: SignalEvent }): Promise<{ candidate: SignalCandidate; signalId: string } | null> {
  const routed = routeSignalEvent(input.event);
  const candidate = routed.candidates.find((item) => item.operatorKey === "client_flow");
  if (!candidate || !routed.event.id) return null;
  await ingestSignalBatch({ workspaceId: input.event.workspaceId, events: [{ ...routed.event, id: routed.event.id }], supabase: input.supabase, materializeWorkflows: false });
  const saved = await input.supabase.from("os_signal_candidates").upsert({ id: candidate.id, signal_id: routed.event.id, workspace_id: input.event.workspaceId, operator_key: "client_flow", signal_type: candidate.signalType, priority: candidate.priority ?? 0, confidence: candidate.confidence, urgency: candidate.urgency ?? "low", reason_codes: candidate.reasonCodes ?? [], evidence: candidate.evidence ?? {}, recommended_action_types: candidate.recommendedActionTypes ?? [], dedupe_key: candidate.dedupeKey, status: "routed", last_seen_at: new Date().toISOString() }, { onConflict: "workspace_id,dedupe_key" });
  if (saved.error) throw new Error(`Client Flow candidate persistence failed: ${saved.error.message}`);
  return { candidate, signalId: routed.event.id };
}

export async function persistClientFlowCandidate(input: { supabase: SupabaseAdmin; workspaceId: string; event: SignalEvent; candidate: SignalCandidate }): Promise<{ candidate: SignalCandidate; signalId: string }> {
  await ingestSignalBatch({ workspaceId: input.workspaceId, events: [input.event], supabase: input.supabase, materializeWorkflows: false });
  const signalId = String(input.event.id ?? "");
  const candidate = { ...input.candidate, signalId };
  const saved = await input.supabase.from("os_signal_candidates").upsert({ id: candidate.id, signal_id: signalId, workspace_id: input.workspaceId, operator_key: "client_flow", signal_type: candidate.signalType, priority: candidate.priority ?? 0, confidence: candidate.confidence, urgency: candidate.urgency ?? "low", reason_codes: candidate.reasonCodes ?? [], evidence: candidate.evidence ?? {}, recommended_action_types: candidate.recommendedActionTypes ?? [], dedupe_key: candidate.dedupeKey, status: "routed", last_seen_at: new Date().toISOString() }, { onConflict: "workspace_id,dedupe_key" });
  if (saved.error) throw new Error(`Client Flow candidate persistence failed: ${saved.error.message}`);
  return { candidate, signalId };
}

export async function ensureClientFlowWorkflow(input: { supabase: SupabaseAdmin; workspaceId: string; signalId: string; candidate: SignalCandidate; entityId: string; action: PreparedAction; context: ClientFlowContext }): Promise<{ workflowId: string; stepId: string; existingApprovalId: string | null }> {
  const problemKey = explicitBusinessProblemKey(input.candidate.metadata);
  const dedupeKey = problemKey ? canonicalBusinessProblemWorkflowDedupeKey({ workspaceId: input.workspaceId, problemKey, intent: "customer_continuity", primaryOperator: "client_flow" }) : canonicalWorkflowDedupeKey({ workspaceId: input.workspaceId, provider: input.candidate.source, entityId: input.entityId, intent: "customer_continuity", primaryOperator: "client_flow" });
  const workflowId = `wf_${dedupeKey}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
  const workflow = await input.supabase.from("os_workflow_runs").upsert({ id: workflowId, workspace_id: input.workspaceId, operator_key: "client_flow", originating_signal_id: input.signalId, objective: "Preserve customer continuity", entity_refs: [input.entityId, input.candidate.sourceId].slice(0, 10), context_refs: ["client-flow-primary", input.context.preparationState, ...input.context.priorityReasons].slice(0, 20), priority: input.context.priority, confidence: input.candidate.confidence, status: "planned", dedupe_key: dedupeKey, primary_owner: "client_flow", parent_primary_owner: null, supporting_operator: null, supporting_operators: input.candidate.supportingOperators ?? [], requested_outcome: "Return a customer-confirmed continuity outcome.", relevant_context: input.context.businessContext, external_communication_allowed: true, external_communication_owner: "client_flow", return_condition: "customer_confirmation_observed", dependency_state: "none", handoff_status: "none", source_problem_key: typeof input.candidate.metadata?.businessProblemKey === "string" ? input.candidate.metadata.businessProblemKey : null }, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true });
  if (workflow.error) throw new Error(`Client Flow workflow persistence failed: ${workflow.error.message}`);
  const existing = await input.supabase.from("os_workflow_steps").select("id,approval_id,status").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).eq("step_order", 1).maybeSingle();
  if (existing.error) throw new Error(`Client Flow workflow step lookup failed: ${existing.error.message}`);
  if (existing.data) return { workflowId, stepId: String(existing.data.id), existingApprovalId: typeof existing.data.approval_id === "string" ? existing.data.approval_id : null };
  const stepId = `${workflowId}:customer-continuity`.slice(0, 220);
  const step = await input.supabase.from("os_workflow_steps").insert({ id: stepId, workflow_id: workflowId, workspace_id: input.workspaceId, step_order: 1, action_type: input.action.actionType, connector_key: input.action.connectorKey, target_ref: input.action.normalizedTarget ?? input.entityId, payload_ref: "prepared:client_flow_context", dependency_step_ids: [], risk_level: "high", approval_required: true, status: "proposed" });
  if (step.error) {
    if (step.error.code !== "23505") throw new Error(`Client Flow workflow step persistence failed: ${step.error.message}`);
    const raced = await input.supabase.from("os_workflow_steps").select("id,approval_id").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).eq("step_order", 1).maybeSingle();
    if (raced.error || !raced.data) throw new Error(`Client Flow workflow step race could not be resolved: ${raced.error?.message || "step missing"}`);
    return { workflowId, stepId: String(raced.data.id), existingApprovalId: typeof raced.data.approval_id === "string" ? raced.data.approval_id : null };
  }
  return { workflowId, stepId, existingApprovalId: null };
}

export async function linkClientFlowApprovalWorkflow(input: { supabase: SupabaseAdmin; workspaceId: string; workflowId: string; stepId: string; approvalId: string; context: ClientFlowContext }): Promise<void> {
  const step = await input.supabase.from("os_workflow_steps").update({ status: "awaiting_approval", approval_id: input.approvalId }).eq("id", input.stepId).eq("workspace_id", input.workspaceId);
  if (step.error) throw new Error(`Client Flow workflow approval link failed: ${step.error.message}`);
  const workflow = await input.supabase.from("os_workflow_runs").update({ status: "awaiting_approval", context_refs: ["client-flow-primary", input.context.preparationState, ...input.context.priorityReasons].slice(0, 20) }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
  if (workflow.error) throw new Error(`Client Flow workflow status update failed: ${workflow.error.message}`);
}

export async function createClientFlowSupportingHandoffs(input: { supabase: SupabaseAdmin; workspaceId: string; parentWorkflowId: string; signalId: string; candidate: SignalCandidate; context: ClientFlowContext }): Promise<void> {
  for (const owner of (input.candidate.supportingOperators ?? []).filter((key): key is "operations" | "support" | "revenue" => ["operations", "support", "revenue"].includes(key))) {
    const reason = owner === "operations" ? "Client Flow needs delivery or dependency work before the customer situation can be closed." : owner === "support" ? "Client Flow needs support state so it does not duplicate technical resolution." : "Client Flow detected commercial context that remains Revenue-owned.";
    await createSupportingWorkflow({
      supabase: input.supabase,
      workspaceId: input.workspaceId,
      parentWorkflowId: input.parentWorkflowId,
      sourceSignalId: input.signalId,
      parentPrimaryOperator: "client_flow",
      supportingOperator: owner,
      handoffReason: reason,
      requestedOutcome: owner === "operations" ? "Return delivery context." : owner === "support" ? "Return support resolution context." : "Return commercial context.",
      relevantContext: { source: "client_flow", preparationState: input.context.preparationState, priority: input.context.priority },
      returnCondition: owner === "operations" ? "delivery_context_returned" : owner === "support" ? "support_state_returned" : "commercial_context_returned",
      priority: input.context.priority,
      confidence: input.candidate.confidence,
      entityRefs: [input.candidate.sourceId],
    });
  }
}

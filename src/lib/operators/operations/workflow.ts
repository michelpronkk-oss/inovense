import type { PreparedAction } from "@/lib/actions/types";
import { ingestSignalBatch } from "@/lib/signals/store";
import { routeSignalEvent } from "@/lib/signals/engine";
import type { SignalCandidate, SignalEvent } from "@/lib/signals/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { canonicalBusinessProblemWorkflowDedupeKey, canonicalWorkflowDedupeKey, explicitBusinessProblemKey } from "@/lib/workflows/identity";
import { createSupportingWorkflow, findSupportingWorkflow } from "@/lib/workflows/workforce";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export function buildOperationsCandidate(input: {
  workspaceId: string;
  provider: string;
  sourceId: string;
  signalType: string;
  priority: number;
  confidence: SignalCandidate["confidence"];
  reasonCodes: string[];
  routeReason: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
  supportingOperators?: string[];
}): SignalCandidate {
  return {
    id: `candidate_${input.workspaceId}_${input.provider}_${input.sourceId}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180),
    signalId: undefined,
    workspaceId: input.workspaceId,
    operatorKey: "operations",
    signalType: input.signalType,
    confidence: input.confidence,
    priority: Math.max(0, Math.min(100, input.priority)),
    priorityLevel: input.priority >= 85 ? "critical" : input.priority >= 65 ? "high" : input.priority >= 35 ? "normal" : "low",
    urgency: input.priority >= 85 ? "critical" : input.priority >= 60 ? "high" : input.priority >= 30 ? "medium" : "low",
    reasonCodes: input.reasonCodes.slice(0, 12),
    evidence: { provider: input.provider, sourceId: input.sourceId, sourceType: "project_task" },
    recommendedActionTypes: ["prepare_recommendation"],
    dedupeKey: input.dedupeKey,
    source: input.provider,
    sourceId: input.sourceId,
    routeReason: input.routeReason,
    status: "routed",
    metadata: input.metadata ?? {},
    actionability: "WORKFLOW_CANDIDATE",
    supportingOperators: input.supportingOperators ?? [],
  };
}

export async function persistOperationsCandidate(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  event: SignalEvent;
  fallbackCandidate: SignalCandidate;
}): Promise<{ candidate: SignalCandidate; signalId: string }> {
  const routed = routeSignalEvent(input.event);
  const event = routed.event;
  await ingestSignalBatch({ workspaceId: input.workspaceId, events: [event], supabase: input.supabase, materializeWorkflows: false });
  const candidate = routed.candidates.find((item) => item.operatorKey === "operations") ?? input.fallbackCandidate;
  const normalizedCandidate = { ...candidate, id: input.fallbackCandidate.id, signalId: event.id, workspaceId: input.workspaceId, operatorKey: "operations", source: event.source, sourceId: event.sourceId, dedupeKey: input.fallbackCandidate.dedupeKey, metadata: { ...candidate.metadata, ...input.fallbackCandidate.metadata } };
  const saved = await input.supabase.from("os_signal_candidates").upsert({
    id: normalizedCandidate.id,
    signal_id: event.id,
    workspace_id: input.workspaceId,
    operator_key: "operations",
    signal_type: normalizedCandidate.signalType,
    priority: normalizedCandidate.priority ?? 0,
    confidence: normalizedCandidate.confidence,
    urgency: normalizedCandidate.urgency ?? "low",
    reason_codes: normalizedCandidate.reasonCodes ?? [],
    evidence: normalizedCandidate.evidence ?? {},
    recommended_action_types: normalizedCandidate.recommendedActionTypes ?? [],
    dedupe_key: normalizedCandidate.dedupeKey,
    status: "routed",
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "workspace_id,dedupe_key" });
  if (saved.error) throw new Error(`Operations candidate persistence failed: ${saved.error.message}`);
  return { candidate: normalizedCandidate, signalId: String(event.id ?? "") };
}

export async function ensureOperationsWorkflow(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  signalId: string;
  candidate: SignalCandidate;
  action?: PreparedAction | null;
  objective?: string;
  contextRefs?: string[];
  parentWorkflowId?: string | null;
}): Promise<{ workflowId: string; stepId: string | null; existingApprovalId: string | null }> {
  const problemKey = explicitBusinessProblemKey(input.candidate.metadata);
  const dedupeKey = problemKey ? canonicalBusinessProblemWorkflowDedupeKey({ workspaceId: input.workspaceId, problemKey, intent: "operations_work", primaryOperator: "operations" }) : canonicalWorkflowDedupeKey({ workspaceId: input.workspaceId, provider: input.candidate.source, entityId: input.candidate.sourceId, intent: "operations_work", primaryOperator: "operations" });
  const generatedWorkflowId = `wf_${dedupeKey}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
  const supportingWorkflowId = input.parentWorkflowId ? null : await findSupportingWorkflow({ supabase: input.supabase, workspaceId: input.workspaceId, sourceSignalId: input.signalId, supportingOperator: "operations" });
  const workflowId = supportingWorkflowId ?? generatedWorkflowId;
  const saved = await input.supabase.from("os_workflow_runs").upsert({
    id: workflowId,
    workspace_id: input.workspaceId,
    operator_key: "operations",
    originating_signal_id: input.signalId,
    objective: input.objective ?? "Resolve operational blocker",
    entity_refs: [input.candidate.sourceId],
    context_refs: ["operations-primary", ...(input.contextRefs ?? [])].slice(0, 20),
    priority: Math.max(0, Math.min(100, input.candidate.priority ?? 0)),
    confidence: input.candidate.confidence,
    status: "planned",
    dedupe_key: dedupeKey,
    primary_owner: "operations",
    parent_primary_owner: null,
    supporting_operator: null,
    supporting_operators: input.candidate.supportingOperators ?? [],
    requested_outcome: "Return verified operational progress or a bounded recovery result.",
    relevant_context: { contextRefs: input.contextRefs ?? [], parentWorkflowId: input.parentWorkflowId ?? null },
    external_communication_allowed: false,
    external_communication_owner: null,
    return_condition: "provider_progress_observed",
    dependency_state: input.parentWorkflowId ? "waiting_on_supporting_work" : "none",
    handoff_status: input.parentWorkflowId ? "active" : "none",
    source_problem_key: typeof input.candidate.metadata?.businessProblemKey === "string" ? input.candidate.metadata.businessProblemKey : null,
    parent_workflow_id: input.parentWorkflowId ?? null,
  }, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true });
  if (saved.error) throw new Error(`Operations workflow persistence failed: ${saved.error.message}`);

  const existing = await input.supabase.from("os_workflow_steps").select("id,approval_id,status").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).eq("step_order", 1).maybeSingle();
  if (existing.error) throw new Error(`Operations workflow step lookup failed: ${existing.error.message}`);
  if (existing.data) {
    const stepId = String(existing.data.id);
    const existingApprovalId = typeof existing.data.approval_id === "string" ? existing.data.approval_id : null;
    if (!existingApprovalId && input.action) {
      const updated = await input.supabase.from("os_workflow_steps").update({ action_type: input.action.actionType, connector_key: input.action.connectorKey, target_ref: input.action.normalizedTarget ?? input.candidate.sourceId, payload_ref: `prepared:${input.action.id}`, risk_level: input.action.riskLevel, approval_required: true }).eq("id", stepId).eq("workspace_id", input.workspaceId).in("status", ["proposed", "blocked"]);
      if (updated.error) throw new Error(`Operations workflow step update failed: ${updated.error.message}`);
    }
    return { workflowId, stepId, existingApprovalId };
  }
  if (!input.action) return { workflowId, stepId: null, existingApprovalId: null };
  const stepId = `${workflowId}:corrective-action`.slice(0, 220);
  const inserted = await input.supabase.from("os_workflow_steps").insert({
    id: stepId,
    workflow_id: workflowId,
    workspace_id: input.workspaceId,
    step_order: 1,
    action_type: input.action.actionType,
    connector_key: input.action.connectorKey,
    target_ref: input.action.normalizedTarget ?? input.candidate.sourceId,
    payload_ref: `prepared:${input.action.id}`,
    dependency_step_ids: [],
    risk_level: input.action.riskLevel,
    approval_required: true,
    status: "proposed",
  });
  if (inserted.error) {
    if (inserted.error.code !== "23505") throw new Error(`Operations workflow step persistence failed: ${inserted.error.message}`);
    const raced = await input.supabase.from("os_workflow_steps").select("id,approval_id").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).eq("step_order", 1).maybeSingle();
    if (raced.error || !raced.data) throw new Error(`Operations workflow step race could not be resolved: ${raced.error?.message || "step missing"}`);
    return { workflowId, stepId: String(raced.data.id), existingApprovalId: typeof raced.data.approval_id === "string" ? raced.data.approval_id : null };
  }
  return { workflowId, stepId, existingApprovalId: null };
}

export async function linkOperationsApprovalWorkflow(input: { supabase: SupabaseAdmin; workspaceId: string; workflowId: string; stepId: string; approvalId: string; executionIntentId?: string | null; contextRefs?: string[] }): Promise<void> {
  const step = await input.supabase.from("os_workflow_steps").update({ status: "awaiting_approval", approval_id: input.approvalId, execution_intent_id: input.executionIntentId ?? null }).eq("id", input.stepId).eq("workspace_id", input.workspaceId);
  if (step.error) throw new Error(`Operations workflow approval link failed: ${step.error.message}`);
  const workflow = await input.supabase.from("os_workflow_runs").update({ status: "awaiting_approval", context_refs: ["operations-primary", ...(input.contextRefs ?? [])].slice(0, 20) }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
  if (workflow.error) throw new Error(`Operations workflow status update failed: ${workflow.error.message}`);
}

export async function createOperationsSupportingHandoff(input: { supabase: SupabaseAdmin; workspaceId: string; parentWorkflowId: string; signalId: string; candidate: SignalCandidate; owner: "client_flow" | "revenue"; reason: string }): Promise<void> {
  await createSupportingWorkflow({
    supabase: input.supabase,
    workspaceId: input.workspaceId,
    parentWorkflowId: input.parentWorkflowId,
    sourceSignalId: input.signalId,
    parentPrimaryOperator: "operations",
    supportingOperator: input.owner,
    handoffReason: input.reason,
    requestedOutcome: input.owner === "client_flow" ? "Return customer commitment context." : "Return commercial context.",
    relevantContext: { source: "operations", priority: input.candidate.priority ?? 0 },
    returnCondition: input.owner === "client_flow" ? "customer_context_returned" : "commercial_context_returned",
    priority: input.candidate.priority ?? 0,
    confidence: input.candidate.confidence,
    entityRefs: [input.candidate.sourceId],
  });
}

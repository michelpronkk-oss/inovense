import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { SignalCandidate, SignalEvent } from "@/lib/signals/types";
import { canonicalBusinessProblemWorkflowDedupeKey, canonicalWorkflowDedupeKey, explicitBusinessProblemKey } from "@/lib/workflows/identity";
import { createSupportingWorkflow, findSupportingWorkflow } from "@/lib/workflows/workforce";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export async function persistManualRevenueCandidate(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  provider: "gmail" | "microsoft";
  sourceId: string;
  threadId: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  dedupeKey: string;
}): Promise<{ candidate: SignalCandidate; signalId: string }> {
  const signalId = `sig_${input.workspaceId}_${input.dedupeKey}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
  const observedAt = new Date().toISOString();
  const event: SignalEvent = {
    id: signalId,
    workspaceId: input.workspaceId,
    connectorKey: input.provider,
    provider: input.provider,
    source: "manual",
    sourceType: "email",
    eventType: "revenue.manual_request",
    sourceId: input.sourceId,
    sourceParentId: input.threadId,
    threadId: input.threadId,
    from: input.fromEmail,
    subject: input.subject,
    snippet: input.snippet.slice(0, 320),
    occurredAt: observedAt,
    observedAt,
    actor: input.fromEmail,
    category: "sales_opportunity",
    dedupeKey: input.dedupeKey,
    metadata: { manual: true, fromEmail: input.fromEmail, subject: input.subject },
    trustLevel: "system_derived",
  };
  const savedEvent = await input.supabase.from("os_signal_events").upsert({ id: signalId, workspace_id: input.workspaceId, connector_key: input.provider, provider: input.provider, source_type: event.sourceType, source_id: input.sourceId, source_parent_id: input.threadId, event_type: event.eventType, occurred_at: observedAt, observed_at: observedAt, actor: input.fromEmail, category: "sales_opportunity", content_preview: input.snippet.slice(0, 320), metadata: event.metadata, dedupe_key: input.dedupeKey, trust_level: event.trustLevel }, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true });
  if (savedEvent.error) throw new Error(`Manual Revenue signal persistence failed: ${savedEvent.error.message}`);
  const candidate: SignalCandidate = {
    id: `candidate_${signalId}`.slice(0, 180),
    signalId,
    workspaceId: input.workspaceId,
    operatorKey: "revenue",
    signalType: "sales_opportunity",
    confidence: "high",
    priority: 75,
    priorityLevel: "high",
    urgency: "high",
    reasonCodes: ["manual_commercial_request"],
    evidence: { provider: input.provider, sourceId: input.sourceId, threadId: input.threadId, sourceType: "email" },
    recommendedActionTypes: ["prepare_recommendation"],
    dedupeKey: input.dedupeKey,
    source: "manual",
    sourceId: input.sourceId,
    routeReason: "Explicit manual Revenue request.",
    status: "routed",
    metadata: { manual: true },
    actionability: "WORKFLOW_CANDIDATE",
  };
  const savedCandidate = await input.supabase.from("os_signal_candidates").upsert({ id: candidate.id, signal_id: signalId, workspace_id: input.workspaceId, operator_key: "revenue", signal_type: candidate.signalType, priority: candidate.priority, confidence: candidate.confidence, urgency: candidate.urgency, reason_codes: candidate.reasonCodes, evidence: candidate.evidence, recommended_action_types: candidate.recommendedActionTypes, dedupe_key: candidate.dedupeKey, status: "routed", last_seen_at: observedAt }, { onConflict: "workspace_id,dedupe_key" });
  if (savedCandidate.error) throw new Error(`Manual Revenue candidate persistence failed: ${savedCandidate.error.message}`);
  return { candidate, signalId };
}

export async function ensureRevenueWorkflow(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  signalId: string;
  candidate: SignalCandidate;
  connectorKey: string;
  targetRef: string;
  objective?: string;
  priority?: number;
  contextRefs?: string[];
}): Promise<{ workflowId: string; stepId: string; existingApprovalId: string | null }> {
  const problemKey = explicitBusinessProblemKey(input.candidate.metadata);
  const dedupeKey = problemKey ? canonicalBusinessProblemWorkflowDedupeKey({ workspaceId: input.workspaceId, problemKey, intent: input.candidate.signalType, primaryOperator: "revenue" }) : canonicalWorkflowDedupeKey({ workspaceId: input.workspaceId, provider: input.candidate.source, entityId: input.candidate.sourceId, intent: input.candidate.signalType, primaryOperator: "revenue" });
  const generatedWorkflowId = `wf_${dedupeKey}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
  const supportingWorkflowId = await findSupportingWorkflow({ supabase: input.supabase, workspaceId: input.workspaceId, sourceSignalId: input.signalId, supportingOperator: "revenue" });
  const workflowId = supportingWorkflowId ?? generatedWorkflowId;
  const workflow = await input.supabase.from("os_workflow_runs").upsert({
    id: workflowId,
    workspace_id: input.workspaceId,
    operator_key: "revenue",
    originating_signal_id: input.signalId,
    objective: input.objective ?? "Follow up on commercial opportunity",
    entity_refs: [input.candidate.sourceId],
    context_refs: [input.candidate.source, ...(input.contextRefs ?? [])].slice(0, 20),
    priority: Math.max(0, Math.min(100, input.priority ?? input.candidate.priority ?? 0)),
    confidence: input.candidate.confidence,
    status: "planned",
    dedupe_key: dedupeKey,
    primary_owner: "revenue",
    parent_primary_owner: null,
    supporting_operator: null,
    supporting_operators: input.candidate.supportingOperators ?? [],
    requested_outcome: "Return a governed commercial follow-up.",
    relevant_context: { source: input.candidate.source, contextRefs: input.contextRefs ?? [] },
    external_communication_allowed: true,
    external_communication_owner: "revenue",
    return_condition: "customer_commercial_response_observed",
    dependency_state: "none",
    handoff_status: "none",
    source_problem_key: typeof input.candidate.metadata?.businessProblemKey === "string" ? input.candidate.metadata.businessProblemKey : null,
  }, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true });
  if (workflow.error) throw new Error(`Revenue workflow persistence failed: ${workflow.error.message}`);

  const stepId = `${workflowId}:customer-follow-up`.slice(0, 220);
  const existing = await input.supabase.from("os_workflow_steps").select("id,approval_id,status").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).eq("step_order", 1).maybeSingle();
  if (existing.error) throw new Error(`Revenue workflow step lookup failed: ${existing.error.message}`);
  if (existing.data) return { workflowId, stepId: String(existing.data.id), existingApprovalId: typeof existing.data.approval_id === "string" ? existing.data.approval_id : null };

  const step = await input.supabase.from("os_workflow_steps").insert({
    id: stepId,
    workflow_id: workflowId,
    workspace_id: input.workspaceId,
    step_order: 1,
    action_type: "send_email",
    connector_key: input.connectorKey,
    target_ref: input.targetRef,
    payload_ref: "derived:commercial_follow_up",
    dependency_step_ids: [],
    risk_level: "high",
    approval_required: true,
    status: "proposed",
  });
  if (step.error) {
    if (step.error.code !== "23505") throw new Error(`Revenue workflow step persistence failed: ${step.error.message}`);
    const raced = await input.supabase.from("os_workflow_steps").select("id,approval_id").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).eq("step_order", 1).maybeSingle();
    if (raced.error || !raced.data) throw new Error(`Revenue workflow step race could not be resolved: ${raced.error?.message || "step missing"}`);
    return { workflowId, stepId: String(raced.data.id), existingApprovalId: typeof raced.data.approval_id === "string" ? raced.data.approval_id : null };
  }
  return { workflowId, stepId, existingApprovalId: null };
}

export async function linkRevenueApprovalWorkflow(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  workflowId: string;
  stepId: string;
  approvalId: string;
  executionIntentId?: string | null;
  sourceMetadata?: Record<string, unknown>;
  candidate?: SignalCandidate;
}): Promise<void> {
  const step = await input.supabase.from("os_workflow_steps").update({ status: "awaiting_approval", approval_id: input.approvalId, execution_intent_id: input.executionIntentId ?? null }).eq("id", input.stepId).eq("workspace_id", input.workspaceId);
  if (step.error) throw new Error(`Revenue workflow approval link failed: ${step.error.message}`);
  const workflow = await input.supabase.from("os_workflow_runs").update({ status: "awaiting_approval", context_refs: ["revenue-primary", ...Object.entries(input.sourceMetadata ?? {}).filter(([key]) => ["preparationState", "whyThisMatters", "workflowId"].includes(key)).map(([key, value]) => `${key}:${String(value).slice(0, 180)}`)].slice(0, 20) }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
  if (workflow.error) throw new Error(`Revenue workflow status update failed: ${workflow.error.message}`);
}

export async function createRevenueSupportingHandoff(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  parentWorkflowId: string;
  signalId: string;
  candidate: SignalCandidate;
  priority: number;
  reason: string;
}): Promise<void> {
  if (!input.candidate.supportingOperators?.includes("operations")) return;
  await createSupportingWorkflow({
    supabase: input.supabase,
    workspaceId: input.workspaceId,
    parentWorkflowId: input.parentWorkflowId,
    sourceSignalId: input.signalId,
    parentPrimaryOperator: "revenue",
    supportingOperator: "operations",
    handoffReason: input.reason,
    requestedOutcome: "Return delivery feasibility evidence before Revenue continues the commercial response.",
    relevantContext: { source: "revenue", priority: input.priority, feasibility: true },
    returnCondition: "feasibility_returned",
    priority: input.priority,
    confidence: input.candidate.confidence,
    entityRefs: [input.candidate.sourceId],
  });
}

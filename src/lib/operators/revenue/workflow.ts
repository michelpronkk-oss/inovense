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
}): Promise<{ workflowId: string; stepId: string; existingApprovalId: string | null; stepOrder: number; identity: "business_problem" | "thread" | "message"; updatedAt: string | null }> {
  const problemKey = explicitBusinessProblemKey(input.candidate.metadata);
  const candidateThreadId = input.candidate.evidence?.threadId;
  const threadId = typeof candidateThreadId === "string" && candidateThreadId.trim() ? candidateThreadId.trim() : null;
  const identity = problemKey ? "business_problem" : threadId ? "thread" : "message";
  const identityEntityId = problemKey ?? threadId ?? input.candidate.sourceId;
  const dedupeKey = problemKey
    ? canonicalBusinessProblemWorkflowDedupeKey({ workspaceId: input.workspaceId, problemKey, intent: input.candidate.signalType, primaryOperator: "revenue" })
    : canonicalWorkflowDedupeKey({ workspaceId: input.workspaceId, provider: input.candidate.source, entityId: identityEntityId, intent: threadId ? "commercial_conversation" : input.candidate.signalType, primaryOperator: "revenue" });
  const generatedWorkflowId = `wf_${dedupeKey}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
  const supportingWorkflowId = await findSupportingWorkflow({ supabase: input.supabase, workspaceId: input.workspaceId, sourceSignalId: input.signalId, supportingOperator: "revenue" });
  let legacyThreadWorkflowId: string | null = null;
  if (!problemKey && threadId) {
    // Adopt an older message-keyed Revenue workflow for this conversation so
    // deploying the new identity rule does not fork an already active thread.
    const legacyStep = await input.supabase.from("os_workflow_steps").select("workflow_id").eq("workspace_id", input.workspaceId).eq("connector_key", input.connectorKey).eq("target_ref", threadId).order("step_order", { ascending: false }).limit(1).maybeSingle();
    if (legacyStep.error) throw new Error(`Revenue thread workflow lookup failed: ${legacyStep.error.message}`);
    if (typeof legacyStep.data?.workflow_id === "string") {
      const legacyWorkflow = await input.supabase.from("os_workflow_runs").select("id").eq("id", legacyStep.data.workflow_id).eq("workspace_id", input.workspaceId).eq("operator_key", "revenue").maybeSingle();
      if (legacyWorkflow.error) throw new Error(`Revenue thread workflow verification failed: ${legacyWorkflow.error.message}`);
      if (typeof legacyWorkflow.data?.id === "string") legacyThreadWorkflowId = legacyWorkflow.data.id;
    }
  }
  const existingWorkflowId = supportingWorkflowId ?? legacyThreadWorkflowId;
  const workflowId = existingWorkflowId ?? generatedWorkflowId;
  const sameSignalStep = await input.supabase.from("os_workflow_steps").select("id,approval_id,step_order").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).eq("source_signal_id", input.signalId).eq("action_type", "send_email").maybeSingle();
  if (sameSignalStep.error) throw new Error(`Revenue signal action lookup failed: ${sameSignalStep.error.message}`);
  if (sameSignalStep.data) {
    const timestamp = await input.supabase.from("os_workflow_runs").select("updated_at").eq("id", workflowId).eq("workspace_id", input.workspaceId).maybeSingle();
    if (timestamp.error) throw new Error(`Revenue workflow timestamp lookup failed: ${timestamp.error.message}`);
    return {
      workflowId,
      stepId: String(sameSignalStep.data.id),
      existingApprovalId: typeof sameSignalStep.data.approval_id === "string" ? sameSignalStep.data.approval_id : null,
      stepOrder: Number(sameSignalStep.data.step_order),
      identity,
      updatedAt: typeof timestamp.data?.updated_at === "string" ? timestamp.data.updated_at : null,
    };
  }
  const workflowValues = {
    originating_signal_id: input.signalId,
    objective: input.objective ?? "Follow up on commercial opportunity",
    entity_refs: Array.from(new Set([identityEntityId, input.candidate.sourceId, ...(threadId ? [threadId] : [])])).slice(0, 20),
    context_refs: [input.candidate.source, ...(input.contextRefs ?? [])].slice(0, 20),
    priority: Math.max(0, Math.min(100, input.priority ?? input.candidate.priority ?? 0)),
    confidence: input.candidate.confidence,
    status: "planned",
    primary_owner: "revenue",
    parent_primary_owner: null,
    supporting_operator: null,
    supporting_operators: input.candidate.supportingOperators ?? [],
    requested_outcome: "Return a governed commercial follow-up.",
    relevant_context: { source: input.candidate.source, contextRefs: input.contextRefs ?? [], latestSignalId: input.signalId, identity },
    external_communication_allowed: true,
    external_communication_owner: "revenue",
    return_condition: "customer_commercial_response_observed",
    dependency_state: "none",
    handoff_status: "none",
    source_problem_key: problemKey,
  };
  if (existingWorkflowId) {
    const workflow = await input.supabase.from("os_workflow_runs").update(workflowValues).eq("id", workflowId).eq("workspace_id", input.workspaceId);
    if (workflow.error) throw new Error(`Revenue workflow refresh failed: ${workflow.error.message}`);
  } else {
    const workflow = await input.supabase.from("os_workflow_runs").upsert({
      id: workflowId,
      workspace_id: input.workspaceId,
      operator_key: "revenue",
      dedupe_key: dedupeKey,
      ...workflowValues,
    }, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true });
    if (workflow.error) throw new Error(`Revenue workflow persistence failed: ${workflow.error.message}`);
    // ignoreDuplicates protects the identity race; the update is essential:
    // a duplicate signal must still refresh the latest signal and timestamp.
    const refreshed = await input.supabase.from("os_workflow_runs").update(workflowValues).eq("id", workflowId).eq("workspace_id", input.workspaceId);
    if (refreshed.error) throw new Error(`Revenue workflow refresh failed: ${refreshed.error.message}`);
  }

  const workflowTimestamp = await input.supabase.from("os_workflow_runs").select("updated_at").eq("id", workflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (workflowTimestamp.error) throw new Error(`Revenue workflow timestamp lookup failed: ${workflowTimestamp.error.message}`);

  const history = await input.supabase.from("os_workflow_steps").select("id,step_order,status,approval_id").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).order("step_order", { ascending: true });
  if (history.error) throw new Error(`Revenue workflow history lookup failed: ${history.error.message}`);
  for (const oldStep of history.data ?? []) {
    if (oldStep.status !== "awaiting_approval" || typeof oldStep.approval_id !== "string") continue;
    const oldApproval = await input.supabase.from("os_approvals").select("status,continuation_payload").eq("id", oldStep.approval_id).eq("workspace_id", input.workspaceId).maybeSingle();
    if (oldApproval.error) throw new Error(`Revenue prior approval lookup failed: ${oldApproval.error.message}`);
    if (oldApproval.data?.status !== "pending") continue;
    const continuation = oldApproval.data.continuation_payload && typeof oldApproval.data.continuation_payload === "object"
      ? oldApproval.data.continuation_payload as Record<string, unknown>
      : {};
    const superseded = await input.supabase.from("os_approvals").update({
      status: "superseded",
      resolved_at: new Date().toISOString(),
      resolved_by: "system:revenue_new_signal",
      continuation_payload: { ...continuation, supersededBySignalId: input.signalId },
    }).eq("id", oldStep.approval_id).eq("workspace_id", input.workspaceId).eq("status", "pending");
    if (superseded.error) throw new Error(`Revenue prior approval supersession failed: ${superseded.error.message}`);
    const skipped = await input.supabase.from("os_workflow_steps").update({ status: "skipped", block_reason: "superseded_by_new_signal" }).eq("id", oldStep.id).eq("workspace_id", input.workspaceId).eq("status", "awaiting_approval");
    if (skipped.error) throw new Error(`Revenue prior action supersession failed: ${skipped.error.message}`);
  }

  const refreshedHistory = await input.supabase.from("os_workflow_steps").select("step_order").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).order("step_order", { ascending: false }).limit(1).maybeSingle();
  if (refreshedHistory.error) throw new Error(`Revenue workflow action order lookup failed: ${refreshedHistory.error.message}`);
  const stepOrder = Number(refreshedHistory.data?.step_order ?? 0) + 1;
  const stepId = `revenue-step:${input.signalId}:send-email`.slice(0, 220);
  const step = await input.supabase.from("os_workflow_steps").insert({
    id: stepId,
    workflow_id: workflowId,
    workspace_id: input.workspaceId,
    source_signal_id: input.signalId,
    step_order: stepOrder,
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
    const raced = await input.supabase.from("os_workflow_steps").select("id,approval_id,step_order").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).eq("source_signal_id", input.signalId).eq("action_type", "send_email").maybeSingle();
    if (raced.error || !raced.data) throw new Error(`Revenue workflow step race could not be resolved: ${raced.error?.message || "step missing"}`);
    return { workflowId, stepId: String(raced.data.id), existingApprovalId: typeof raced.data.approval_id === "string" ? raced.data.approval_id : null, stepOrder: Number(raced.data.step_order), identity, updatedAt: typeof workflowTimestamp.data?.updated_at === "string" ? workflowTimestamp.data.updated_at : null };
  }
  return { workflowId, stepId, existingApprovalId: null, stepOrder, identity, updatedAt: typeof workflowTimestamp.data?.updated_at === "string" ? workflowTimestamp.data.updated_at : null };
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
}): Promise<{ updatedAt: string | null; approvalStatus: string; workflowStatus: string }> {
  const approval = await input.supabase.from("os_approvals").select("status").eq("id", input.approvalId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (approval.error || !approval.data) throw new Error(`Revenue approval lookup failed: ${approval.error?.message || "approval missing"}`);
  const approvalStatus = String(approval.data.status);
  const stepStatus = approvalStatus === "pending" ? "awaiting_approval"
    : approvalStatus === "executing" || approvalStatus === "approved" || approvalStatus === "partially_completed" ? "executing"
      : approvalStatus === "rejected" ? "rejected"
        : approvalStatus === "failed" ? "blocked"
          : "skipped";
  const workflowStatus = stepStatus === "awaiting_approval" ? "awaiting_approval"
    : stepStatus === "executing" ? "executing"
      : stepStatus === "blocked" || stepStatus === "rejected" ? "blocked"
        : "planned";
  const step = await input.supabase.from("os_workflow_steps").update({ status: stepStatus, approval_id: input.approvalId, execution_intent_id: input.executionIntentId ?? null, block_reason: stepStatus === "blocked" ? "approval_execution_failed" : stepStatus === "skipped" ? "approval_no_longer_actionable" : null }).eq("id", input.stepId).eq("workspace_id", input.workspaceId);
  if (step.error) throw new Error(`Revenue workflow approval link failed: ${step.error.message}`);
  const workflow = await input.supabase.from("os_workflow_runs").update({ status: workflowStatus, context_refs: ["revenue-primary", ...Object.entries(input.sourceMetadata ?? {}).filter(([key]) => ["preparationState", "whyThisMatters", "workflowId"].includes(key)).map(([key, value]) => `${key}:${String(value).slice(0, 180)}`)].slice(0, 20) }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
  if (workflow.error) throw new Error(`Revenue workflow status update failed: ${workflow.error.message}`);
  const refreshed = await input.supabase.from("os_workflow_runs").select("updated_at").eq("id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (refreshed.error) throw new Error(`Revenue workflow timestamp refresh failed: ${refreshed.error.message}`);
  return { updatedAt: typeof refreshed.data?.updated_at === "string" ? refreshed.data.updated_at : null, approvalStatus, workflowStatus };
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

import {
  GMAIL_SCAN_REQUIRED_SCOPES,
  GMAIL_SEND_REQUIRED_SCOPES,
  getMessageDetails,
  getMissingGmailScopes,
  listRecentMessages,
  resolveAccessTokenFromCredential,
  type SafeGmailMessage,
  type StoredConnectorCredential,
} from "@/lib/connectors/gmail";
import {
  MICROSOFT_READ_REQUIRED_SCOPES,
  MICROSOFT_SEND_REQUIRED_SCOPES,
  getMicrosoftCredential,
  getMicrosoftMessage,
  getMissingMicrosoftScopes,
  listRecentMicrosoftMessages,
  resolveMicrosoftAccessToken,
  type SafeMicrosoftMessage,
  type StoredMicrosoftCredential,
} from "@/lib/connectors/microsoft";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { getStoredZendeskCredential, listZendeskTickets, normalizeZendeskTicket, resolveZendeskAccessToken } from "@/lib/connectors/zendesk";
import { getStoredIntercomCredential, listIntercomConversations, normalizeIntercomConversation, resolveIntercomAccessToken } from "@/lib/connectors/intercom";
import { prepareAction } from "@/lib/actions/execute";
import type { PreparedAction } from "@/lib/actions/types";
import { getOperatorReadiness, type OperatorReadiness } from "@/lib/operators/readiness";
import { operatorRuntimeId } from "@/lib/operators/logging";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import { buildApprovalScope, emailPayloadIdentity } from "@/lib/policies/approval-scope";
import { evaluateExecutionPolicy } from "@/lib/policies/execution-policy";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizeEmailToSignalEvent } from "@/lib/signals/intake";
import { routeSignalEvent } from "@/lib/signals/engine";
import type { SignalCandidate, SignalEvent } from "@/lib/signals/types";
import { ingestSignalBatch } from "@/lib/signals/store";
import { canonicalWorkflowDedupeKey } from "@/lib/workflows/identity";
import { recordObservedWorkflowOutcome } from "@/lib/workflows/store";
import { observeEmailSupportReply, observeIntercomResolution, observeZendeskResolution } from "@/lib/workflows/outcome-observers";
import { buildSupportContext, prepareSupportReply, publicSupportContext, type SupportContext } from "@/lib/operators/support/context";
import { loadGovernedMemoryContext } from "@/lib/memory/reader";
import { createSupportingWorkflow, findSupportingWorkflow, returnSupportingOutcome } from "@/lib/workflows/workforce";
import { connectorObservationsFromTruth, materializeConnectorObservations } from "@/lib/memory/materialize";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type SupportSourceMode = "scheduled" | "manual";

export type SupportScanSummary = {
  type?: "support_scan_summary";
  status?: string;
  message?: string;
  sourceMode?: SupportSourceMode;
  scanned?: number;
  signalsFound?: number;
  approvalsCreated?: number;
  skippedCount?: number;
  outcomesObserved?: number;
  providers?: { email: number; zendesk: number; intercom: number };
  completedAt?: string;
  readiness?: unknown;
  missingScopes?: string[];
};

export type SupportScanResult = { ok: boolean; status: number; body: SupportScanSummary & Record<string, unknown> };

const SUPPORT_AGENT_ID = "support";
const SUPPORT_AGENT_MARK = "SU";
const SUPPORT_AGENT_COLOR = "#66D0E0";

function fromMicrosoftMessage(message: SafeMicrosoftMessage): SafeGmailMessage {
  return {
    id: message.id,
    threadId: message.conversationId ?? undefined,
    labelIds: [],
    from: message.fromName ? `${message.fromName} <${message.from ?? ""}>` : message.from ?? "",
    fromEmail: message.from ?? "",
    to: "",
    subject: message.subject ?? "",
    date: message.receivedAt ?? "",
    snippet: message.bodyPreview ?? "",
    bodyText: message.bodyText ?? message.bodyPreview ?? "",
    internalDate: message.receivedAt ?? undefined,
  };
}

function dailyNext(iso: string) { return new Date(new Date(iso).getTime() + 86_400_000).toISOString(); }

function emailDedupe(provider: string, message: SafeGmailMessage) {
  return `support:${provider}:message:${message.id}`;
}

function emailThreadDedupe(provider: string, message: SafeGmailMessage) {
  return message.threadId ? `support:${provider}:thread:${message.threadId}` : null;
}

function ageHours(value?: string | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.max(0, (Date.now() - time) / 3_600_000) : null;
}

function supportEvent(input: {
  workspaceId: string;
  provider: string;
  sourceType: "support_ticket" | "support_conversation";
  sourceId: string;
  subject?: string | null;
  snippet?: string | null;
  status?: string | null;
  priority?: string | null;
  updatedAt?: string | null;
  metadata?: Record<string, unknown>;
}): SignalEvent {
  return {
    workspaceId: input.workspaceId,
    connectorKey: input.provider,
    provider: input.provider,
    source: input.provider,
    sourceType: input.sourceType,
    eventType: `${input.provider}.support_observed`,
    sourceId: input.sourceId,
    subject: input.subject ?? null,
    snippet: input.snippet ?? null,
    occurredAt: input.updatedAt ?? null,
    metadata: { status: input.status ?? null, priority: input.priority ?? null, updatedAt: input.updatedAt ?? null, ...input.metadata },
  };
}

async function persistCanonicalSupportSignal(input: { supabase: SupabaseAdmin; event: SignalEvent }): Promise<{ candidate: SignalCandidate; signalId: string } | null> {
  const routed = routeSignalEvent(input.event);
  const candidate = routed.candidates.find((item) => item.operatorKey === "support");
  if (!candidate || !routed.event.id) return null;
  await ingestSignalBatch({ workspaceId: input.event.workspaceId, events: [{ ...routed.event, id: routed.event.id }], supabase: input.supabase, materializeWorkflows: false });
  return { candidate, signalId: routed.event.id };
}

async function ensureSupportWorkflow(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  signalId: string;
  candidate: SignalCandidate;
  action: PreparedAction;
  context: SupportContext;
}): Promise<{ workflowId: string; stepId: string; existingApprovalId: string | null }> {
  const generatedWorkflowId = `wf_${input.workspaceId}_${input.candidate.dedupeKey}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
  const supportingWorkflowId = await findSupportingWorkflow({ supabase: input.supabase, workspaceId: input.workspaceId, sourceSignalId: input.signalId, supportingOperator: "support" });
  const workflowId = supportingWorkflowId ?? generatedWorkflowId;
  const dedupeKey = canonicalWorkflowDedupeKey({ workspaceId: input.workspaceId, provider: input.candidate.source, entityId: input.candidate.sourceId, intent: input.candidate.signalType, primaryOperator: "support" });
  const workflow = await input.supabase.from("os_workflow_runs").upsert({
    id: workflowId,
    workspace_id: input.workspaceId,
    operator_key: "support",
    originating_signal_id: input.signalId,
    objective: "Resolve support request",
    entity_refs: [input.candidate.sourceId],
    context_refs: [input.candidate.source, input.context.preparationState, ...input.context.priorityReasons].slice(0, 20),
    priority: Math.max(0, Math.min(100, input.context.priority)),
    confidence: input.candidate.confidence,
    status: "planned",
    dedupe_key: dedupeKey,
    primary_owner: "support",
    parent_primary_owner: null,
    supporting_operator: null,
    supporting_operators: input.candidate.supportingOperators ?? [],
    requested_outcome: "Return a safe customer support resolution.",
    relevant_context: { preparationState: input.context.preparationState, priorityReasons: input.context.priorityReasons },
    external_communication_allowed: true,
    external_communication_owner: "support",
    return_condition: "customer_resolution_observed",
    dependency_state: "none",
    handoff_status: "none",
    source_problem_key: typeof input.candidate.metadata?.businessProblemKey === "string" ? input.candidate.metadata.businessProblemKey : null,
  }, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true });
  if (workflow.error) throw new Error(`Support workflow persistence failed: ${workflow.error.message}`);

  const stepId = `${workflowId}:support-response`.slice(0, 220);
  const existingStep = await input.supabase.from("os_workflow_steps").select("id,approval_id,status").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).eq("step_order", 1).maybeSingle();
  if (existingStep.error) throw new Error(`Support workflow step lookup failed: ${existingStep.error.message}`);
  if (existingStep.data) {
    if (!existingStep.data.approval_id && ["proposed", "blocked"].includes(String(existingStep.data.status))) {
      const refreshed = await input.supabase.from("os_workflow_steps").update({ action_type: input.action.actionType, connector_key: input.action.connectorKey, target_ref: input.action.normalizedTarget ?? input.candidate.sourceId, payload_ref: "derived:support_contextual_response", dependency_step_ids: [], risk_level: "high", approval_required: true, status: "proposed", block_reason: null }).eq("id", String(existingStep.data.id)).eq("workspace_id", input.workspaceId);
      if (refreshed.error) throw new Error(`Support workflow step refresh failed: ${refreshed.error.message}`);
    }
    return { workflowId, stepId: String(existingStep.data.id), existingApprovalId: typeof existingStep.data.approval_id === "string" ? existingStep.data.approval_id : null };
  }
  const step = await input.supabase.from("os_workflow_steps").insert({
    id: stepId,
    workflow_id: workflowId,
    workspace_id: input.workspaceId,
    step_order: 1,
    action_type: input.action.actionType,
    connector_key: input.action.connectorKey,
    target_ref: input.action.normalizedTarget ?? input.candidate.sourceId,
    payload_ref: "derived:support_contextual_response",
    dependency_step_ids: [],
    risk_level: "high",
    approval_required: true,
    status: "proposed",
  });
  if (step.error) {
    if (step.error.code !== "23505") throw new Error(`Support workflow step persistence failed: ${step.error.message}`);
    const raced = await input.supabase.from("os_workflow_steps").select("id,approval_id").eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).eq("step_order", 1).maybeSingle();
    if (raced.error || !raced.data) throw new Error(`Support workflow step race could not be resolved: ${raced.error?.message || "step missing"}`);
    return { workflowId, stepId: String(raced.data.id), existingApprovalId: typeof raced.data.approval_id === "string" ? raced.data.approval_id : null };
  }
  const insertedStep = step.data as { id: string; approval_id?: string | null } | null;
  return { workflowId, stepId: String(insertedStep?.id ?? stepId), existingApprovalId: typeof insertedStep?.approval_id === "string" ? insertedStep.approval_id : null };
}

async function createSupportingHandoff(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  parentWorkflowId: string;
  signalId: string;
  candidate: SignalCandidate;
  context: SupportContext;
}): Promise<void> {
  const supportingOwner = input.candidate.supportingOperators?.find((key) => key === "operations" || key === "client_flow");
  if (!supportingOwner) return;
  const handoffReason = supportingOwner === "operations"
    ? "Support detected a delivery or internal blocker that needs supporting Operations work."
    : "Support detected a customer continuity issue that needs supporting Client Flow work.";
  await createSupportingWorkflow({
    supabase: input.supabase,
    workspaceId: input.workspaceId,
    parentWorkflowId: input.parentWorkflowId,
    sourceSignalId: input.signalId,
    parentPrimaryOperator: "support",
    supportingOperator: supportingOwner,
    handoffReason,
    requestedOutcome: supportingOwner === "operations" ? "Return a resolved delivery dependency." : "Return current customer-continuity context.",
    relevantContext: { source: "support", priority: input.context.priority, preparationState: input.context.preparationState },
    customerImpact: `Support priority ${input.context.priority}.`,
    returnCondition: supportingOwner === "operations" ? "dependency_resolved" : "context_returned",
    priority: input.context.priority,
    confidence: input.candidate.confidence,
    entityRefs: [input.candidate.sourceId],
  });
}

async function existingDedupe(supabase: SupabaseAdmin, workspaceId: string) {
  const result = await supabase.from("os_approvals").select("dedupe_key,status,continuation_payload").eq("workspace_id", workspaceId).eq("agent_id", SUPPORT_AGENT_ID).limit(500);
  const seen = new Map<string, string>();
  (result.data ?? []).forEach((row) => {
    const status = String(row.status ?? "handled");
    if (typeof row.dedupe_key === "string") seen.set(row.dedupe_key, status);
    const continuation = row.continuation_payload && typeof row.continuation_payload === "object" ? row.continuation_payload as Record<string, unknown> : {};
    const action = continuation.preparedAction && typeof continuation.preparedAction === "object" ? continuation.preparedAction as Record<string, unknown> : {};
    const metadata = action.metadata && typeof action.metadata === "object" ? action.metadata as Record<string, unknown> : {};
    if (typeof metadata.threadDedupeKey === "string") seen.set(metadata.threadDedupeKey, status);
  });
  return seen;
}

async function createApproval(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  readiness: OperatorReadiness;
  action: PreparedAction;
  triggerType: string;
  dedupeKey: string;
  policyReason: string;
  signalId: string;
  candidate: SignalCandidate;
  context: SupportContext;
}): Promise<{ created: boolean; approvalId?: string; workflowId?: string }> {
  const workflow = await ensureSupportWorkflow({ supabase: input.supabase, workspaceId: input.workspaceId, signalId: input.signalId, candidate: input.candidate, action: input.action, context: input.context });
  await createSupportingHandoff({ supabase: input.supabase, workspaceId: input.workspaceId, parentWorkflowId: workflow.workflowId, signalId: input.signalId, candidate: input.candidate, context: input.context });
  if (workflow.existingApprovalId) return { created: false, approvalId: workflow.existingApprovalId, workflowId: workflow.workflowId };
  if (!input.action.policyInput || !input.action.policyDecision) throw new Error("Support action policy input is missing.");
  const policyDecision = await evaluateExecutionPolicy({ supabase: input.supabase, policyInput: input.action.policyInput });
  if (policyDecision.executionDecision === "deny" || policyDecision.executionDecision === "pause_operator") {
    await input.supabase.from("os_workflow_steps").update({ status: "blocked", block_reason: policyDecision.reasonCode, execution_intent_id: policyDecision.intentId ?? null }).eq("id", workflow.stepId).eq("workspace_id", input.workspaceId);
    await input.supabase.from("os_workflow_runs").update({ status: "blocked" }).eq("id", workflow.workflowId).eq("workspace_id", input.workspaceId);
    return { created: false, workflowId: workflow.workflowId };
  }
  const runId = operatorRuntimeId("oprun-support");
  const startedAt = new Date().toISOString();
  const run = await input.supabase.from("os_operator_runs").insert({
    id: runId, workspace_id: input.workspaceId, operator_key: "support", trigger_type: input.triggerType,
    status: "waiting_for_approval", input: { source: input.triggerType, dedupeKey: input.dedupeKey, targetRef: input.action.normalizedTarget, workflowId: workflow.workflowId, preparationState: input.context.preparationState },
    output: {}, readiness: input.readiness, risk_level: "high", started_at: startedAt,
  });
  if (run.error) throw new Error(run.error.message);
  const approvalId = operatorRuntimeId("appr-support");
  const approvalScope = buildApprovalScope(input.action.policyInput, policyDecision);
  const isEmail = input.action.actionType === "send_email" && ["gmail", "microsoft"].includes(input.action.connectorKey);
  const actionInput = input.action.input;
  const continuation = isEmail
    ? {
        kind: input.action.connectorKey === "microsoft" ? "microsoft.send_after_approval" : "gmail.send_after_approval",
        workspaceId: input.workspaceId,
        operatorRunId: runId,
        operatorKey: "support",
        dedupeKey: input.dedupeKey,
        dedupeMetadata: { candidate: input.candidate.dedupeKey, workflowId: workflow.workflowId },
        to: String(actionInput.to ?? "").trim().toLowerCase(),
        subject: String(actionInput.subject ?? "").trim(),
        body: String(actionInput.body ?? "").trim(),
        draftSubject: String(actionInput.subject ?? "").trim(),
        draftBody: String(actionInput.body ?? "").trim(),
        originalDraftSubject: String(actionInput.subject ?? "").trim(),
        originalDraftBody: String(actionInput.body ?? "").trim(),
        editedDraftSubject: null,
        editedDraftBody: null,
        wasEdited: false,
        sourceMetadata: { ...input.action.metadata, workflowId: workflow.workflowId, supportContext: publicSupportContext(input.context), businessContext: input.context.businessContext, subjectType: "support_thread", subjectId: input.action.normalizedTarget ?? input.candidate.sourceId },
        preparedActions: ["support_reply"],
        approvalScope,
        policyEvidence: policyDecision.evidence,
        customerEmailPolicy: { mode: "approval_required", humanReview: "Required", crmUpdate: "Not prepared", trelloTask: "Not prepared", slackAlert: "Disabled" },
      }
    : {
        kind: "shared_action.execute_after_approval",
        workspaceId: input.workspaceId,
        operatorKey: "support",
        preparedAction: input.action,
        workflowId: workflow.workflowId,
        workflowStepId: workflow.stepId,
        approvalScope,
        policyEvidence: policyDecision.evidence,
      };
  const approval = await input.supabase.from("os_approvals").insert({
    id: approvalId, workspace_id: input.workspaceId, type: isEmail ? "email" : "action", title: input.action.title, body: input.action.summary,
    agent_id: SUPPORT_AGENT_ID, agent_mark: SUPPORT_AGENT_MARK, agent_color: SUPPORT_AGENT_COLOR, run_id: runId,
    status: "pending", dedupe_key: input.dedupeKey, created_at: startedAt,
    continuation_payload: continuation,
    approval_scope: approvalScope,
    policy_evidence: policyDecision.evidence,
    policy_reason: input.policyReason,
  });
  if (approval.error) throw new Error(approval.error.message);
  const output = await input.supabase.from("os_operator_outputs").insert({
    id: operatorRuntimeId("opout-support"), workspace_id: input.workspaceId, run_id: runId, operator_key: "support",
    output_type: "support_action", title: input.action.title,
    payload: { type: "support_action", source: input.triggerType, targetRef: input.action.normalizedTarget, approvalId, workflowId: workflow.workflowId, preparedAction: input.action, supportContext: publicSupportContext(input.context) },
    requires_approval: true, approval_id: approvalId,
  });
  if (output.error) throw new Error(output.error.message);
  await input.supabase.from("os_execution_intents").update({ status: "awaiting_approval", approval_id: approvalId }).eq("id", policyDecision.intentId ?? "").eq("workspace_id", input.workspaceId);
  await input.supabase.from("os_workflow_steps").update({ status: "awaiting_approval", approval_id: approvalId, execution_intent_id: policyDecision.intentId ?? null }).eq("id", workflow.stepId).eq("workspace_id", input.workspaceId);
  await input.supabase.from("os_workflow_runs").update({ status: "awaiting_approval" }).eq("id", workflow.workflowId).eq("workspace_id", input.workspaceId);
  return { created: true, approvalId, workflowId: workflow.workflowId };
}

async function upsertMonitoring(input: { supabase: SupabaseAdmin; workspaceId: string; sourceMode: SupportSourceMode; summary: SupportScanSummary; at: string }) {
  return input.supabase.from("os_operator_triggers").upsert({
    id: `optrig-${input.workspaceId}-support-monitoring`, workspace_id: input.workspaceId, operator_key: "support", trigger_type: "scheduled_monitoring", enabled: true,
    config: { monitoringEnabled: true, cadence: "daily", scheduleProvider: "trigger.dev", triggerTaskId: "support-operator-daily-scan", lastRunAt: input.at, nextRunAt: dailyNext(input.at), lastRunStatus: input.summary.status ?? "completed", lastRunSummary: input.summary, manualRunAvailable: true, sourceMode: input.sourceMode },
  });
}

async function observeSupportWorkflows(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  emailMessages: SafeGmailMessage[];
  zendeskTickets: Array<ReturnType<typeof normalizeZendeskTicket>>;
  intercomConversations: Array<ReturnType<typeof normalizeIntercomConversation>>;
}): Promise<number> {
  const workflowsResult = await input.supabase.from("os_workflow_runs")
    .select("id,originating_signal_id,entity_refs,status,parent_workflow_id")
    .eq("workspace_id", input.workspaceId)
    .eq("operator_key", "support")
    .eq("status", "executing")
    .limit(100);
  if (workflowsResult.error || !workflowsResult.data?.length) return 0;
  const workflows = workflowsResult.data as Array<Record<string, unknown>>;
  const workflowIds = workflows.map((row) => String(row.id));
  const signalIds = workflows.map((row) => String(row.originating_signal_id ?? "")).filter(Boolean);
  const [stepsResult, signalsResult] = await Promise.all([
    input.supabase.from("os_workflow_steps").select("id,workflow_id,execution_intent_id,status").eq("workspace_id", input.workspaceId).in("workflow_id", workflowIds).eq("status", "executing"),
    signalIds.length ? input.supabase.from("os_signal_events").select("id,source,source_id,source_parent_id,observed_at").eq("workspace_id", input.workspaceId).in("id", signalIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (stepsResult.error || signalsResult.error) return 0;
  const steps = new Map((stepsResult.data ?? []).map((row) => [String(row.workflow_id), row as Record<string, unknown>]));
  const signals = new Map((signalsResult.data ?? []).map((row) => [String(row.id), row as Record<string, unknown>]));
  let observed = 0;
  for (const workflow of workflows) {
    const workflowId = String(workflow.id);
    const step = steps.get(workflowId);
    if (!step) continue;
    const signal = signals.get(String(workflow.originating_signal_id ?? ""));
    const provider = String(signal?.source ?? "");
    const sourceId = String(signal?.source_id ?? (Array.isArray(workflow.entity_refs) ? workflow.entity_refs[0] : ""));
    let observation: ReturnType<typeof observeEmailSupportReply> | ReturnType<typeof observeZendeskResolution> | ReturnType<typeof observeIntercomResolution> | null = null;
    if (["gmail", "microsoft"].includes(provider)) {
      const threadId = String(signal?.source_parent_id ?? "");
      const initialAt = Date.parse(String(signal?.observed_at ?? ""));
      const reply = input.emailMessages.find((message) => Boolean(threadId && message.threadId === threadId && message.id !== sourceId && (!Number.isFinite(initialAt) || Date.parse(message.date || message.internalDate || "") >= initialAt)));
      if (reply) observation = observeEmailSupportReply({ workflowId, threadId, messageId: reply.id, subject: reply.subject, snippet: reply.snippet || reply.bodyText, linkedActionExecuted: true });
    } else if (provider === "zendesk") {
      const ticket = input.zendeskTickets.find((item) => item.ticketId === sourceId);
      if (ticket) observation = observeZendeskResolution({ workflowId, ticketId: ticket.ticketId, status: ticket.status, linkedActionExecuted: true });
    } else if (provider === "intercom") {
      const conversationId = sourceId.includes(":") ? sourceId.slice(sourceId.indexOf(":") + 1) : sourceId;
      const conversation = input.intercomConversations.find((item) => item.conversationId === conversationId);
      if (conversation) observation = observeIntercomResolution({ workflowId, conversationId, state: conversation.state, linkedActionExecuted: true });
    }
    if (!observation) continue;
    const observedAt = new Date().toISOString();
    await recordObservedWorkflowOutcome({ workspaceId: input.workspaceId, operatorKey: "support", workflowId, signalId: signal?.id ? String(signal.id) : null, executionIntentId: step.execution_intent_id ? String(step.execution_intent_id) : null, outcomeType: observation.outcomeType, attributionLevel: observation.attributionLevel, confidence: observation.confidence, evidenceRefs: observation.evidenceRefs, observedAt, supabase: input.supabase });
    await input.supabase.from("os_workflow_steps").update({ status: "completed", result_ref: observation.evidenceRefs[0] ?? "support_outcome_observed", safe_error_code: null }).eq("id", String(step.id)).eq("workspace_id", input.workspaceId);
    await input.supabase.from("os_workflow_runs").update({ status: "completed" }).eq("id", workflowId).eq("workspace_id", input.workspaceId);
    if (typeof workflow.parent_workflow_id === "string") {
      await returnSupportingOutcome({ supabase: input.supabase, workspaceId: input.workspaceId, childWorkflowId: workflowId, outcomeType: observation.outcomeType, evidence: { provider, evidenceRefs: observation.evidenceRefs }, evidenceRefs: observation.evidenceRefs });
    }
    observed += 1;
  }
  return observed;
}

export async function scanSupportSignals(input: { workspaceId: string; maxResults?: number; sourceMode?: SupportSourceMode; supabase?: SupabaseAdmin }): Promise<SupportScanResult> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workspaceId = input.workspaceId.trim();
  const sourceMode = input.sourceMode ?? "manual";
  const readiness = await getOperatorReadiness({ workspaceId, operatorKey: "support" });
  if (!readiness) return { ok: false, status: 404, body: { status: "not_found", message: "Support Operator readiness was not found." } };
  if (readiness.status === "upgrade_required") return { ok: false, status: 402, body: { status: "upgrade_required", message: readiness.reason, readiness } };
  if (readiness.status === "missing_connector") return { ok: false, status: 409, body: { status: "missing_connector", message: "Connect Zendesk, Intercom, Gmail, or Microsoft 365 to monitor support work.", readiness } };
  if (!readiness.canRunManual) return { ok: false, status: 409, body: { status: readiness.status, message: readiness.reason, readiness } };
  const eligibility = await getWorkspaceExecutionEligibility(workspaceId, supabase);
  if (!eligibility.eligible) return { ok: false, status: 402, body: { status: "execution_ineligible", message: eligibility.reason, readiness } };

  const truth = await getConnectorTruth({ workspaceId, supabase });
  await materializeConnectorObservations({ supabase, workspaceId, observations: connectorObservationsFromTruth(truth, "support"), trigger: "support_scan" });
  const maxResults = Math.min(Math.max(Number(input.maxResults) || 15, 1), 25);
  const seen = await existingDedupe(supabase, workspaceId);
  const policySettings = await loadPolicyWorkspaceSettings({ supabase, workspaceId });
  const workspaceMemory = await loadGovernedMemoryContext({ supabase, workspaceId, operatorKey: "support" });
  const now = new Date().toISOString();
  let scanned = 0; let signalsFound = 0; let approvalsCreated = 0; let skippedCount = 0;
  const providers = { email: 0, zendesk: 0, intercom: 0 };
  const missingScopes: string[] = [];
  const emailObservations: SafeGmailMessage[] = [];
  const zendeskObservations: Array<ReturnType<typeof normalizeZendeskTicket>> = [];
  const intercomObservations: Array<ReturnType<typeof normalizeIntercomConversation>> = [];

  const emailTruth = truth.find((item) => (item.connectorKey === "gmail" || item.connectorKey === "microsoft") && (item.status === "healthy" || item.status === "connected"));
  if (emailTruth) {
    try {
      const provider = emailTruth.connectorKey as "gmail" | "microsoft";
      let messages: SafeGmailMessage[] = [];
      if (provider === "gmail") {
        const credentialResult = await supabase.from("os_connector_credentials").select("*").eq("workspace_id", workspaceId).eq("connector_key", "gmail").maybeSingle();
        const credential = credentialResult.data as StoredConnectorCredential | null;
        if (credential) {
          missingScopes.push(...getMissingGmailScopes(credential.scopes, GMAIL_SCAN_REQUIRED_SCOPES));
          missingScopes.push(...getMissingGmailScopes(credential.scopes, GMAIL_SEND_REQUIRED_SCOPES));
          if (!missingScopes.length) { const token = await resolveAccessTokenFromCredential(credential); const listed = await listRecentMessages(token, { maxResults, query: "newer_than:30d" }); messages = await Promise.all(listed.map((item) => getMessageDetails(token, item.id))); }
        }
      } else {
        const credential = await getMicrosoftCredential(workspaceId, supabase);
        if (credential) {
          missingScopes.push(...getMissingMicrosoftScopes(credential.scopes, MICROSOFT_READ_REQUIRED_SCOPES));
          missingScopes.push(...getMissingMicrosoftScopes(credential.scopes, MICROSOFT_SEND_REQUIRED_SCOPES));
          if (!missingScopes.length) { const token = await resolveMicrosoftAccessToken({ workspaceId, credential: credential as StoredMicrosoftCredential, supabase }); messages = await Promise.all((await listRecentMicrosoftMessages(token, maxResults)).map((item) => getMicrosoftMessage(token, item.id).then(fromMicrosoftMessage))); }
        }
      }
      for (const message of messages) {
        scanned += 1; providers.email += 1;
        emailObservations.push(message);
        const dedupeKey = emailDedupe(provider, message);
        const threadKey = emailThreadDedupe(provider, message);
        if (seen.has(dedupeKey) || (threadKey ? seen.has(threadKey) : false)) { skippedCount += 1; continue; }
        const routed = routeSignalEvent(normalizeEmailToSignalEvent({ workspaceId, message, provider, rawRef: `${provider}:${message.id}`, metadata: { sourceMode } }));
        const candidate = routed.candidates.find((item) => item.operatorKey === "support");
        if (!candidate || !routed.event.id) { skippedCount += 1; continue; }
        if (seen.has(candidate.dedupeKey)) { skippedCount += 1; continue; }
        const canonical = await persistCanonicalSupportSignal({ supabase, event: { ...routed.event, id: routed.event.id } });
        if (!canonical) { skippedCount += 1; continue; }
        signalsFound += 1;
        const to = message.fromEmail || message.from || "";
        const context = buildSupportContext({ provider, sourceId: message.id, threadId: message.threadId, customerEmail: message.fromEmail || message.from, subject: message.subject, request: message.bodyText || message.snippet, ageHours: ageHours(message.date || message.internalDate), priorReplies: [message.snippet || message.bodyText || ""], workspaceMemory });
        const reply = prepareSupportReply(context);
        const supportDedupeKey = candidate.dedupeKey;
        const action = prepareAction({ workspaceId, operatorKey: "support", actionType: "send_email", connectorKey: provider, capability: "email.send_after_approval", title: context.preparationState === "needs_escalation" ? "Prepare an escalated support reply" : "Prepare a contextual support reply", summary: `Prepare an approval-gated support reply for ${message.subject || "an inbound support request"}.`, input: { to, subject: reply.subject, body: reply.body, subjectType: "support_thread", subjectId: message.threadId || message.id, businessContext: context.businessContext }, dedupeKey: supportDedupeKey, source: `${provider}_scan`, destinationType: "customer", confidence: candidate.confidence, riskLevel: "high", normalizedTarget: message.threadId || message.id, metadata: { operatorKey: "support", signalType: candidate.signalType, sourceId: message.id, dedupeKey: supportDedupeKey, payloadIdentity: emailPayloadIdentity(reply.subject, reply.body), supportContext: publicSupportContext(context), businessContext: context.businessContext, memoryDependencies: context.workspaceMemory.dependencies, preparationState: context.preparationState, priority: context.priority, priorityReasons: context.priorityReasons, ...(threadKey ? { threadDedupeKey: threadKey } : {}) } }, { policySettings });
        const created = await createApproval({ supabase, workspaceId, readiness, action, triggerType: "email_scan", dedupeKey: supportDedupeKey, signalId: canonical.signalId, candidate: canonical.candidate, context, policyReason: "Customer-facing support replies require human approval before execution." });
        seen.set(supportDedupeKey, created.created ? "pending" : "handled"); if (threadKey) seen.set(threadKey, created.created ? "pending" : "handled"); if (created.created) approvalsCreated += 1;
      }
    } catch (error) {
      return { ok: false, status: 502, body: { status: "email_scan_failed", message: error instanceof Error ? error.message : "Support email scan failed.", readiness } };
    }
  }

  const zendeskTruth = truth.find((item) => item.connectorKey === "zendesk" && (item.status === "healthy" || item.status === "connected"));
  if (zendeskTruth) {
    try {
      const credential = await getStoredZendeskCredential(workspaceId, supabase);
      const subdomain = typeof credential?.metadata?.subdomain === "string" ? credential.metadata.subdomain : null;
      if (credential && subdomain) {
        const token = await resolveZendeskAccessToken({ workspaceId, credential, supabase });
        const listed = await listZendeskTickets(token, subdomain, { maxResults });
        for (const row of listed.tickets) {
          scanned += 1; providers.zendesk += 1;
          const ticket = normalizeZendeskTicket(row, subdomain);
          zendeskObservations.push(ticket);
          if (["solved", "closed"].includes(ticket.status)) { skippedCount += 1; continue; }
          const ticketAgeHours = ageHours(ticket.updatedAt) ?? 0;
          if (!(ticket.priority === "urgent" || ticket.priority === "high" || ticketAgeHours >= 48)) { skippedCount += 1; continue; }
          const routed = routeSignalEvent(supportEvent({ workspaceId, provider: "zendesk", sourceType: "support_ticket", sourceId: ticket.ticketId, subject: ticket.subject, snippet: ticket.commentPreview, status: ticket.status, priority: ticket.priority, updatedAt: ticket.updatedAt, metadata: { subdomain, organizationId: ticket.organizationId } }));
          const candidate = routed.candidates.find((item) => item.operatorKey === "support");
          if (!candidate || !routed.event.id || seen.has(candidate.dedupeKey)) { skippedCount += 1; continue; }
          const canonical = await persistCanonicalSupportSignal({ supabase, event: { ...routed.event, id: routed.event.id } });
          if (!canonical) { skippedCount += 1; continue; }
          signalsFound += 1;
          const context = buildSupportContext({ provider: "zendesk", sourceId: ticket.ticketId, customerName: ticket.requesterName, company: ticket.organizationName, status: ticket.status, providerPriority: ticket.priority, subject: ticket.subject, request: ticket.commentPreview, ageHours: ticketAgeHours, reopened: ticket.tags.some((tag) => /reopen/i.test(tag)), priorReplies: ticket.commentPreview ? [ticket.commentPreview] : [], productArea: ticket.tags.find((tag) => /product|area|module/i.test(tag)), workspaceMemory });
          const reply = prepareSupportReply(context);
          const action = prepareAction({ workspaceId, operatorKey: "support", actionType: "reply_zendesk_ticket", connectorKey: "zendesk", capability: "support.tickets.reply_after_approval", title: context.preparationState === "needs_escalation" ? "Prepare an escalated Zendesk reply" : "Prepare a contextual Zendesk reply", summary: `Prepare an approval-gated reply for ${ticket.subject || "an unresolved support ticket"}.`, input: { ticketId: ticket.ticketId, subject: ticket.subject, body: reply.body, subjectType: "support_ticket", subjectId: ticket.ticketId, businessContext: context.businessContext }, dedupeKey: candidate.dedupeKey, source: "zendesk_scan", destinationType: "customer", confidence: candidate.confidence, riskLevel: "high", normalizedTarget: ticket.ticketId, metadata: { operatorKey: "support", ticketId: ticket.ticketId, dedupeKey: candidate.dedupeKey, supportContext: publicSupportContext(context), businessContext: context.businessContext, memoryDependencies: context.workspaceMemory.dependencies, preparationState: context.preparationState, priority: context.priority, priorityReasons: context.priorityReasons } }, { policySettings });
          const created = await createApproval({ supabase, workspaceId, readiness, action, triggerType: "zendesk_scan", dedupeKey: candidate.dedupeKey, signalId: canonical.signalId, candidate: canonical.candidate, context, policyReason: "Zendesk customer replies require human approval before execution." });
          seen.set(candidate.dedupeKey, created.created ? "pending" : "handled"); if (created.created) approvalsCreated += 1;
        }
      }
    } catch (error) { console.warn("[support-scan] Zendesk scan skipped", { workspaceId, error: error instanceof Error ? error.message : "unknown" }); }
  }

  const intercomTruth = truth.find((item) => item.connectorKey === "intercom" && (item.status === "healthy" || item.status === "connected"));
  if (intercomTruth) {
    try {
      const credential = await getStoredIntercomCredential(workspaceId, supabase);
      if (credential) {
        const token = await resolveIntercomAccessToken({ workspaceId, credential, supabase });
        const region = (typeof credential.metadata?.region === "string" ? credential.metadata.region : "us") as "us" | "eu" | "au";
        const listed = await listIntercomConversations(token, region, { maxResults });
        for (const row of listed.conversations) {
          scanned += 1; providers.intercom += 1;
          const conversation = normalizeIntercomConversation(row, region);
          intercomObservations.push(conversation);
          if (["closed", "resolved"].includes(conversation.state)) { skippedCount += 1; continue; }
          const conversationAgeHours = ageHours(conversation.updatedAt) ?? 0;
          const text = conversation.subjectOrPreview?.toLowerCase() ?? "";
          if (!(conversation.priority || /urgent|critical|outage|blocked|error|issue|help|not working/.test(text) || conversationAgeHours >= 48)) { skippedCount += 1; continue; }
          const routed = routeSignalEvent(supportEvent({ workspaceId, provider: "intercom", sourceType: "support_conversation", sourceId: `${conversation.region}:${conversation.conversationId}`, subject: conversation.subjectOrPreview, snippet: conversation.parts.map((part) => part.preview ?? "").filter(Boolean).slice(-3).join(" "), status: conversation.state, priority: conversation.priority ? "high" : null, updatedAt: conversation.updatedAt, metadata: { region: conversation.region, companyId: conversation.companyId } }));
          const candidate = routed.candidates.find((item) => item.operatorKey === "support");
          if (!candidate || !routed.event.id || seen.has(candidate.dedupeKey)) { skippedCount += 1; continue; }
          const canonical = await persistCanonicalSupportSignal({ supabase, event: { ...routed.event, id: routed.event.id } });
          if (!canonical) { skippedCount += 1; continue; }
          signalsFound += 1;
          const context = buildSupportContext({ provider: "intercom", sourceId: conversation.conversationId, threadId: conversation.conversationId, customerName: conversation.contactName, company: conversation.companyName, status: conversation.state, providerPriority: conversation.priority ? "high" : null, subject: conversation.subjectOrPreview, request: conversation.parts.map((part) => part.preview ?? "").filter(Boolean).slice(-3).join(" "), ageHours: conversationAgeHours, priorReplies: conversation.parts.map((part) => part.preview ?? ""), productArea: null, workspaceMemory });
          const reply = prepareSupportReply(context);
          const action = prepareAction({ workspaceId, operatorKey: "support", actionType: "reply_intercom_conversation", connectorKey: "intercom", capability: "support.conversations.reply_after_approval", title: context.preparationState === "needs_escalation" ? "Prepare an escalated Intercom reply" : "Prepare a contextual Intercom reply", summary: "Prepare an approval-gated reply for an unresolved support conversation.", input: { conversationId: conversation.conversationId, body: reply.body, region: conversation.region, subjectType: "support_conversation", subjectId: conversation.conversationId, businessContext: context.businessContext }, dedupeKey: candidate.dedupeKey, source: "intercom_scan", destinationType: "customer", confidence: candidate.confidence, riskLevel: "high", normalizedTarget: conversation.conversationId, metadata: { operatorKey: "support", conversationId: conversation.conversationId, dedupeKey: candidate.dedupeKey, supportContext: publicSupportContext(context), businessContext: context.businessContext, memoryDependencies: context.workspaceMemory.dependencies, preparationState: context.preparationState, priority: context.priority, priorityReasons: context.priorityReasons } }, { policySettings });
          const created = await createApproval({ supabase, workspaceId, readiness, action, triggerType: "intercom_scan", dedupeKey: candidate.dedupeKey, signalId: canonical.signalId, candidate: canonical.candidate, context, policyReason: "Intercom customer replies require human approval before execution." });
          seen.set(candidate.dedupeKey, created.created ? "pending" : "handled"); if (created.created) approvalsCreated += 1;
        }
      }
    } catch (error) { console.warn("[support-scan] Intercom scan skipped", { workspaceId, error: error instanceof Error ? error.message : "unknown" }); }
  }

  const outcomesObserved = await observeSupportWorkflows({ supabase, workspaceId, emailMessages: emailObservations, zendeskTickets: zendeskObservations, intercomConversations: intercomObservations });
  const summary: SupportScanSummary = { type: "support_scan_summary", status: "completed", sourceMode, scanned, signalsFound, approvalsCreated, skippedCount, providers, completedAt: now, readiness, ...(outcomesObserved ? { outcomesObserved } : {}), ...(missingScopes.length ? { missingScopes: [...new Set(missingScopes)] } : {}) };
  await supabase.from("os_operator_runs").insert({ id: operatorRuntimeId("oprun-support-summary"), workspace_id: workspaceId, operator_key: "support", trigger_type: "support_scan", status: "completed", input: { sourceMode }, output: summary, readiness, risk_level: "medium", started_at: now, completed_at: now });
  await upsertMonitoring({ supabase, workspaceId, sourceMode, summary, at: now });
  return { ok: true, status: 200, body: summary as SupportScanSummary & Record<string, unknown> };
}

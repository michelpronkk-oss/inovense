import "server-only";

import { getOperatorDefinition } from "@/lib/operators/registry";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { workforceState } from "@/lib/workforce/ownership";

type Row = Record<string, unknown>;

export type WorkflowStepPresentation = {
  id: string;
  order: number;
  label: string;
  destination: string;
  status: string;
  approvalRequired: boolean;
  approvalId: string | null;
  blocker: string | null;
};

export type WorkflowOutcomePresentation = {
  id: string;
  label: string;
  attribution: "observed" | "influenced" | "direct";
  observedAt: string;
};

export type SupportingWorkflowPresentation = {
  id: string;
  operatorKey: string;
  operatorName: string;
  status: string;
  handoffReason: string | null;
  requestedOutcome: string | null;
  dependencyState: string | null;
  externalCommunicationAllowed: boolean;
  resultEvidence: Record<string, unknown>;
};

export type WorkflowPresentation = {
  id: string;
  objective: string;
  operatorKey: string;
  operatorName: string;
  primaryOwner: string;
  supportingOperators: string[];
  externalCommunicationOwner: string | null;
  dependencyState: string | null;
  workforceState: string;
  handoffReason: string | null;
  requestedOutcome: string | null;
  returnedEvidence: Record<string, unknown>;
  supportingWork: SupportingWorkflowPresentation[];
  status: string;
  priority: "low" | "normal" | "high";
  confidence: "low" | "medium" | "high";
  createdAt: string;
  source: { label: string; detail: string | null } | null;
  whyStarted: string[];
  nextAttention: string;
  steps: WorkflowStepPresentation[];
  outcomes: WorkflowOutcomePresentation[];
};

const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const records = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => Boolean(item && typeof item === "object")) : [];
const humanize = (value: string) => value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function priority(value: unknown): WorkflowPresentation["priority"] {
  const score = typeof value === "number" ? value : Number(value);
  return score >= 75 ? "high" : score <= 35 ? "low" : "normal";
}

function sourceLabel(row: Row | undefined): WorkflowPresentation["source"] {
  if (!row) return null;
  const connectorKey = text(row.connector_key);
  const sourceType = text(row.source_type);
  const sourceId = text(row.source_id);
  const connector = connectorKey ? getConnectorDefinition(connectorKey)?.displayName ?? humanize(connectorKey) : "Connected system";
  return { label: sourceType ? `${connector} ${humanize(sourceType)}` : connector, detail: sourceId ? `Reference ${sourceId}` : null };
}

function reasonLabel(value: string): string {
  const labels: Record<string, string> = {
    due_date_overdue: "The work is overdue.",
    blocker_detected: "A blocker needs attention.",
    customer_escalation: "A customer escalation needs attention.",
    stale_handoff: "A handoff has gone quiet.",
    high_intent: "A high-intent commercial signal was found.",
  };
  return labels[value] ?? humanize(value).replace(/\.$/, ".");
}

function actionLabel(value: string): string {
  const labels: Record<string, string> = {
    draft_follow_up: "Prepare a follow-up",
    draft_customer_reply: "Prepare a customer response",
    create_task: "Prepare a recovery task",
    create_jira_issue: "Prepare a Jira issue",
    update_crm_record: "Prepare a CRM update",
    post_team_update: "Prepare an internal update",
  };
  return labels[value] ?? humanize(value);
}

function nextAttention(steps: WorkflowStepPresentation[], status: string): string {
  const blocked = steps.find((step) => step.status === "blocked" || step.status === "failed");
  if (blocked) return blocked.blocker || `${blocked.label} needs attention.`;
  const approval = steps.find((step) => step.status === "awaiting_approval" || (step.approvalRequired && step.status === "proposed"));
  if (approval) return `${approval.label} is ready for approval.`;
  const active = steps.find((step) => step.status === "executing" || step.status === "approved");
  if (active) return `${active.label} is in progress.`;
  if (["completed", "partially_completed"].includes(status)) return "This workflow has finished. Outcome evidence is shown below when observed.";
  return "Auterim is reviewing the next safe step.";
}

export async function getWorkflowPresentations(input: { workspaceId: string; workflowId?: string | null; operatorKey?: string | null; limit?: number }) {
  const supabase = createSupabaseAdmin();
  let runsQuery = supabase
    .from("os_workflow_runs")
    .select("id,operator_key,primary_owner,supporting_operators,external_communication_owner,dependency_state,handoff_reason,requested_outcome,relevant_context,result_evidence,originating_signal_id,objective,priority,confidence,status,created_at,parent_workflow_id")
    .eq("workspace_id", input.workspaceId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 80);
  if (input.workflowId) runsQuery = runsQuery.eq("id", input.workflowId);
  if (input.operatorKey) runsQuery = runsQuery.eq("operator_key", input.operatorKey);
  if (!input.workflowId) runsQuery = runsQuery.is("parent_workflow_id", null);
  const { data: runs, error: runsError } = await runsQuery;
  if (runsError) throw new Error("Workflow records are temporarily unavailable.");
  const workflowRows = records(runs);
  if (!workflowRows.length) return [] as WorkflowPresentation[];
  const workflowIds = workflowRows.map((row) => String(row.id));
  const signalIds = workflowRows.map((row) => text(row.originating_signal_id)).filter((id): id is string => Boolean(id));
  const [stepsResult, outcomesResult, signalsResult, candidatesResult, childrenResult] = await Promise.all([
    supabase.from("os_workflow_steps").select("id,workflow_id,step_order,action_type,connector_key,approval_required,status,approval_id,block_reason").eq("workspace_id", input.workspaceId).in("workflow_id", workflowIds).order("step_order", { ascending: true }),
    supabase.from("os_workflow_outcomes").select("id,workflow_id,outcome_type,attribution_level,observed_at").eq("workspace_id", input.workspaceId).in("workflow_id", workflowIds).order("observed_at", { ascending: false }),
    signalIds.length ? supabase.from("os_signal_events").select("id,connector_key,source_type,source_id").eq("workspace_id", input.workspaceId).in("id", signalIds) : Promise.resolve({ data: [], error: null }),
    signalIds.length ? supabase.from("os_signal_candidates").select("signal_id,reason_codes").eq("workspace_id", input.workspaceId).in("signal_id", signalIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("os_workflow_runs").select("id,parent_workflow_id,operator_key,status,handoff_reason,requested_outcome,dependency_state,external_communication_allowed,result_evidence").eq("workspace_id", input.workspaceId).in("parent_workflow_id", workflowIds).order("created_at", { ascending: true }),
  ]);
  if (stepsResult.error || outcomesResult.error || signalsResult.error || candidatesResult.error || childrenResult.error) throw new Error("Workflow detail is temporarily unavailable.");
  const stepsByWorkflow = new Map<string, WorkflowStepPresentation[]>();
  for (const row of records(stepsResult.data)) {
    const workflowId = String(row.workflow_id);
    const step: WorkflowStepPresentation = {
      id: String(row.id), order: Number(row.step_order), label: actionLabel(String(row.action_type ?? "Prepare work")),
      destination: getConnectorDefinition(String(row.connector_key ?? ""))?.displayName ?? humanize(String(row.connector_key ?? "Connected system")),
      status: String(row.status ?? "proposed"), approvalRequired: row.approval_required === true,
      approvalId: text(row.approval_id), blocker: text(row.block_reason),
    };
    stepsByWorkflow.set(workflowId, [...(stepsByWorkflow.get(workflowId) ?? []), step]);
  }
  const outcomesByWorkflow = new Map<string, WorkflowOutcomePresentation[]>();
  for (const row of records(outcomesResult.data)) {
    const workflowId = text(row.workflow_id);
    if (!workflowId) continue;
    const attribution = text(row.attribution_level);
    outcomesByWorkflow.set(workflowId, [...(outcomesByWorkflow.get(workflowId) ?? []), {
      id: String(row.id), label: humanize(String(row.outcome_type ?? "Observed outcome")),
      attribution: attribution === "direct" || attribution === "influenced" ? attribution : "observed",
      observedAt: String(row.observed_at),
    }]);
  }
  const signalById = new Map(records(signalsResult.data).map((row) => [String(row.id), row]));
  const reasonsBySignal = new Map<string, string[]>();
  for (const row of records(candidatesResult.data)) {
    const signalId = text(row.signal_id);
    if (!signalId) continue;
    const reasons = Array.isArray(row.reason_codes) ? row.reason_codes.filter((value): value is string => typeof value === "string").map(reasonLabel) : [];
    reasonsBySignal.set(signalId, reasons);
  }
  const childrenByParent = new Map<string, SupportingWorkflowPresentation[]>();
  for (const row of records(childrenResult.data)) {
    const parentId = text(row.parent_workflow_id);
    if (!parentId) continue;
    const operatorKey = String(row.operator_key ?? "unknown");
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), {
      id: String(row.id), operatorKey, operatorName: getOperatorDefinition(operatorKey)?.name ?? humanize(operatorKey), status: String(row.status ?? "planned"),
      handoffReason: text(row.handoff_reason), requestedOutcome: text(row.requested_outcome), dependencyState: text(row.dependency_state), externalCommunicationAllowed: row.external_communication_allowed === true,
      resultEvidence: recordValue(row.result_evidence),
    }]);
  }
  return workflowRows.map((row): WorkflowPresentation => {
    const id = String(row.id);
    const steps = stepsByWorkflow.get(id) ?? [];
    const signalId = text(row.originating_signal_id);
    const operatorKey = String(row.operator_key);
    const supportingOperators = Array.isArray(row.supporting_operators) ? row.supporting_operators.filter((value): value is string => typeof value === "string") : [];
    return {
      id, objective: String(row.objective), operatorKey,
      operatorName: getOperatorDefinition(operatorKey)?.name ?? humanize(operatorKey),
      primaryOwner: text(row.primary_owner) ?? operatorKey,
      supportingOperators,
      externalCommunicationOwner: text(row.external_communication_owner),
      dependencyState: text(row.dependency_state),
      workforceState: workforceState({ status: String(row.status), dependencyState: text(row.dependency_state), hasPendingApproval: steps.some((step) => step.status === "awaiting_approval") }),
      handoffReason: text(row.handoff_reason),
      requestedOutcome: text(row.requested_outcome),
      returnedEvidence: recordValue(row.result_evidence),
      supportingWork: childrenByParent.get(id) ?? [],
      status: String(row.status), priority: priority(row.priority),
      confidence: text(row.confidence) === "high" || text(row.confidence) === "low" ? text(row.confidence) as "high" | "low" : "medium",
      createdAt: String(row.created_at), source: sourceLabel(signalId ? signalById.get(signalId) : undefined),
      whyStarted: signalId ? (reasonsBySignal.get(signalId) ?? []) : [], nextAttention: nextAttention(steps, String(row.status)), steps,
      outcomes: outcomesByWorkflow.get(id) ?? [],
    };
  });
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

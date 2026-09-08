import { getActionDefinition } from "@/lib/actions/registry";
import type { ActionType } from "@/lib/actions/types";
import { connectorHasCapability } from "@/lib/connectors/capabilities";
import type { SignalCandidate } from "@/lib/signals/types";

export type WorkflowStatus = "planned" | "awaiting_approval" | "partially_approved" | "executing" | "completed" | "partially_completed" | "blocked" | "failed" | "cancelled";
export type WorkflowStepStatus = "proposed" | "awaiting_approval" | "approved" | "executing" | "completed" | "blocked" | "rejected" | "failed" | "skipped";
export type WorkflowStep = {
  id: string;
  order: number;
  actionType: ActionType;
  connectorKey: string;
  targetRef: string | null;
  payloadRef: string | null;
  dependencyStepIds: string[];
  risk: "low" | "medium" | "high" | "critical";
  approvalRequired: boolean;
  status: WorkflowStepStatus;
  reason: string;
};
export type WorkflowPlan = {
  id: string;
  workspaceId: string;
  operatorKey: "revenue" | "client_flow" | "operations";
  originatingSignalId: string;
  objective: string;
  entityRefs: string[];
  contextRefs: string[];
  status: WorkflowStatus;
  priority: number;
  confidence: "low" | "medium" | "high";
  dedupeKey: string;
  steps: WorkflowStep[];
  createdAt: string;
};

export type WorkflowPlanningContext = {
  activeOperatorKeys: string[];
  connectedConnectorKeys: string[];
  executableConnectorKeys: string[];
  executionEligible: boolean;
};

const PM_PREFERENCE = ["jira", "asana", "trello"];

export function chooseProjectConnector(connectedConnectorKeys: string[], executableConnectorKeys: string[]): string | null {
  return PM_PREFERENCE.find((connector) => connectedConnectorKeys.includes(connector) && executableConnectorKeys.includes(connector)) ?? null;
}

function step(input: Omit<WorkflowStep, "id" | "status"> & { id: string }): WorkflowStep {
  return { ...input, status: "proposed" };
}

/** A small internal template library. It creates controlled proposals, never writes. */
export function planCandidateWorkflow(input: { candidate: SignalCandidate; signalId: string; context: WorkflowPlanningContext; now?: string }): WorkflowPlan | null {
  const candidate = input.candidate;
  if (!input.context.activeOperatorKeys.includes(candidate.operatorKey) || !input.context.executionEligible || (candidate.priority ?? 0) < 65) return null;
  const operatorKey = candidate.operatorKey as WorkflowPlan["operatorKey"];
  if (!["revenue", "client_flow", "operations"].includes(operatorKey)) return null;
  const now = input.now ?? new Date().toISOString();
  const connector = chooseProjectConnector(input.context.connectedConnectorKeys, input.context.executableConnectorKeys);
  const base = {
    id: `wf_${candidate.workspaceId}_${candidate.dedupeKey}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180),
    workspaceId: candidate.workspaceId,
    operatorKey,
    originatingSignalId: input.signalId,
    entityRefs: [candidate.sourceId],
    contextRefs: [candidate.source],
    status: "planned" as WorkflowStatus,
    priority: candidate.priority ?? 0,
    confidence: candidate.confidence,
    dedupeKey: `workflow:${candidate.dedupeKey}`.slice(0, 480),
    createdAt: now,
  };
  if (operatorKey === "client_flow" && ["support_risk", "escalation"].includes(candidate.signalType)) {
    const steps: WorkflowStep[] = [];
    if (connector === "jira") steps.push(step({ id: "pm-follow-up", order: 1, actionType: "create_jira_issue", connectorKey: connector, targetRef: null, payloadRef: "derived:project_follow_up", dependencyStepIds: [], risk: "medium", approvalRequired: true, reason: "Create an internal recovery follow-up." }));
    if (connector === "asana") steps.push(step({ id: "pm-follow-up", order: 1, actionType: "create_asana_task", connectorKey: connector, targetRef: null, payloadRef: "derived:project_follow_up", dependencyStepIds: [], risk: "medium", approvalRequired: true, reason: "Create an internal recovery follow-up." }));
    if (connector === "trello") steps.push(step({ id: "pm-follow-up", order: 1, actionType: "create_task", connectorKey: connector, targetRef: null, payloadRef: "derived:project_follow_up", dependencyStepIds: [], risk: "medium", approvalRequired: true, reason: "Create an internal recovery follow-up." }));
    if (input.context.executableConnectorKeys.includes("microsoft_teams")) steps.push(step({ id: "internal-escalation", order: steps.length + 1, actionType: "send_teams_message", connectorKey: "microsoft_teams", targetRef: null, payloadRef: "derived:internal_escalation", dependencyStepIds: steps.length ? ["pm-follow-up"] : [], risk: "medium", approvalRequired: true, reason: "Prepare an internal escalation after the follow-up is ready." }));
    if (input.context.executableConnectorKeys.includes("zendesk")) steps.push(step({ id: "customer-response", order: steps.length + 1, actionType: "reply_zendesk_ticket", connectorKey: "zendesk", targetRef: candidate.sourceId, payloadRef: "derived:customer_reply", dependencyStepIds: steps.filter((item) => item.id === "internal-escalation").map((item) => item.id), risk: "high", approvalRequired: true, reason: "Prepare a separately reviewable customer response." }));
    return { ...base, objective: "Resolve customer escalation", steps };
  }
  if (operatorKey === "operations" && ["blocked_work", "overdue_work", "stalled_work", "delivery_risk"].includes(candidate.signalType)) {
    const steps: WorkflowStep[] = [];
    if (connector === "jira") steps.push(step({ id: "pm-follow-up", order: 1, actionType: "create_jira_issue", connectorKey: connector, targetRef: null, payloadRef: "derived:delivery_recovery", dependencyStepIds: [], risk: "medium", approvalRequired: true, reason: "Create a tracked delivery recovery item." }));
    if (connector === "asana") steps.push(step({ id: "pm-follow-up", order: 1, actionType: "create_asana_task", connectorKey: connector, targetRef: null, payloadRef: "derived:delivery_recovery", dependencyStepIds: [], risk: "medium", approvalRequired: true, reason: "Create a tracked delivery recovery item." }));
    if (connector === "trello") steps.push(step({ id: "pm-follow-up", order: 1, actionType: "create_task", connectorKey: connector, targetRef: null, payloadRef: "derived:delivery_recovery", dependencyStepIds: [], risk: "medium", approvalRequired: true, reason: "Create a tracked delivery recovery item." }));
    if (input.context.executableConnectorKeys.includes("slack")) steps.push(step({ id: "internal-escalation", order: steps.length + 1, actionType: "send_slack_message", connectorKey: "slack", targetRef: null, payloadRef: "derived:delivery_escalation", dependencyStepIds: steps.length ? ["pm-follow-up"] : [], risk: "low", approvalRequired: true, reason: "Prepare an internal delivery escalation." }));
    return { ...base, objective: "Recover delivery risk", steps };
  }
  if (operatorKey === "revenue" && ["sales_opportunity", "commercial_intent"].includes(candidate.signalType) && input.context.executableConnectorKeys.some((key) => ["gmail", "microsoft"].includes(key))) {
    const emailConnector = input.context.executableConnectorKeys.includes("gmail") ? "gmail" : "microsoft";
    return { ...base, objective: "Follow up on sales opportunity", steps: [step({ id: "customer-follow-up", order: 1, actionType: "send_email", connectorKey: emailConnector, targetRef: candidate.sourceId, payloadRef: "derived:commercial_follow_up", dependencyStepIds: [], risk: "high", approvalRequired: true, reason: "Prepare an independently reviewable commercial follow-up." })] };
  }
  return null;
}

export function validateWorkflowPlan(plan: WorkflowPlan, context: WorkflowPlanningContext): { validSteps: WorkflowStep[]; blockedReasons: string[] } {
  const reasons: string[] = [];
  const ids = new Set(plan.steps.map((item) => item.id));
  const validSteps = plan.steps.filter((item) => {
    const def = getActionDefinition(item.actionType);
    if (!def || !def.allowedExecutionAdapters.includes(item.connectorKey) || !connectorHasCapability(item.connectorKey, def.capability)) { reasons.push(`unsupported_action:${item.id}`); return false; }
    if (!context.connectedConnectorKeys.includes(item.connectorKey) || !context.executableConnectorKeys.includes(item.connectorKey)) { reasons.push(`connector_not_ready:${item.id}`); return false; }
    if (item.dependencyStepIds.some((dependency) => !ids.has(dependency) || dependency === item.id)) { reasons.push(`invalid_dependency:${item.id}`); return false; }
    if ((item.payloadRef?.length ?? 0) > 240 || (item.targetRef?.length ?? 0) > 240) { reasons.push(`unbounded_reference:${item.id}`); return false; }
    return true;
  });
  const graph = new Map(validSteps.map((item) => [item.id, item.dependencyStepIds]));
  const visiting = new Set<string>(); const visited = new Set<string>();
  const cyclic = (id: string): boolean => { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); const found = (graph.get(id) ?? []).some(cyclic); visiting.delete(id); visited.add(id); return found; };
  if (validSteps.some((item) => cyclic(item.id))) reasons.push("dependency_cycle");
  return { validSteps: reasons.includes("dependency_cycle") ? [] : validSteps, blockedReasons: reasons };
}

export type AttributionLevel = "observed" | "influenced" | "direct";
export function conservativeAttribution(input: { hasObservedProviderState: boolean; hasLinkedAction: boolean; hasDeterministicProviderRelation: boolean }): AttributionLevel | null {
  if (!input.hasObservedProviderState) return null;
  if (input.hasLinkedAction && input.hasDeterministicProviderRelation) return "direct";
  return input.hasLinkedAction ? "influenced" : "observed";
}

/** Derive plan state from durable step truth; no caller may mark a plan done by fiat. */
export function deriveWorkflowStatus(steps: Array<Pick<WorkflowStep, "status">>): WorkflowStatus {
  if (steps.length === 0) return "blocked";
  const states = steps.map((step) => step.status);
  if (states.every((state) => state === "completed" || state === "skipped")) return "completed";
  if (states.some((state) => state === "executing")) return "executing";
  const hasCompleted = states.some((state) => state === "completed");
  if (states.some((state) => state === "blocked" || state === "failed")) return hasCompleted ? "partially_completed" : "blocked";
  if (states.some((state) => state === "rejected")) return hasCompleted ? "partially_completed" : "blocked";
  if (states.some((state) => state === "awaiting_approval")) return "awaiting_approval";
  if (states.some((state) => state === "approved")) return "partially_approved";
  return "planned";
}

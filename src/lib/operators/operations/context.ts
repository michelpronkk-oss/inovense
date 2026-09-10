import type { PreparedAction } from "@/lib/actions/types";
import type { PolicyBusinessContext, PolicyContextReliability, PolicyContextValue } from "@/lib/policies/types";
import type { GovernedMemoryContext } from "@/lib/memory/reader";

export type OperationsPreparationState =
  | "ready_to_resolve"
  | "needs_owner"
  | "needs_dependency"
  | "needs_customer_context"
  | "needs_commercial_context"
  | "needs_escalation";

export type OperationsContext = {
  provider: string;
  project: {
    id: string | null;
    name: string | null;
    priority: string | null;
    status: string | null;
    owner: string | null;
    reliability: PolicyContextReliability;
  };
  task: {
    id: string | null;
    title: string | null;
    status: string | null;
    assignee: string | null;
    dueAt: string | null;
    labels: string[];
    blockerIndicators: string[];
    checklist: { total: number; completed: number } | null;
    lastActivityAt: string | null;
    reliability: PolicyContextReliability;
  };
  dependency: {
    blockedBy: string | null;
    blocking: string | null;
    owner: string | null;
    state: string | null;
    external: boolean | null;
    reliability: PolicyContextReliability;
  };
  businessImpact: {
    customerCommitment: string | null;
    linkedClientFlowWorkflowId: string | null;
    linkedRevenueWorkflowId: string | null;
    slaDeadline: string | null;
    projectImportance: string | null;
    externalCollaborator: boolean | null;
  };
  preparationState: OperationsPreparationState;
  priority: number;
  priorityReasons: string[];
  businessContext: PolicyBusinessContext;
  workspaceMemory: GovernedMemoryContext;
};

function bounded(value: string | null | undefined, max: number): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function value<T>(input: T | null | undefined, reliability: PolicyContextReliability): PolicyContextValue<T> {
  return { value: input ?? null, reliability: input == null ? "missing" : reliability };
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? (timestamp - Date.now()) / 86_400_000 : null;
}

export function buildOperationsContext(input: {
  provider: string;
  project?: { id?: string | null; name?: string | null; priority?: string | null; status?: string | null; owner?: string | null };
  task: { id: string; title: string; status?: string | null; assignee?: string | null; dueAt?: string | null; labels?: string[]; blockerIndicators?: string[]; checklist?: { total: number; completed: number } | null; lastActivityAt?: string | null };
  blockerReason?: string | null;
  dependency?: { blockedBy?: string | null; blocking?: string | null; owner?: string | null; state?: string | null; external?: boolean | null };
  businessImpact?: { customerCommitment?: string | null; linkedClientFlowWorkflowId?: string | null; linkedRevenueWorkflowId?: string | null; slaDeadline?: string | null; projectImportance?: string | null; externalCollaborator?: boolean | null };
  signalType: string;
  score: number;
  priorityReasons?: string[];
  supportingOperators?: string[];
  workspaceMemory?: GovernedMemoryContext;
}): OperationsContext {
  const project = input.project ?? {};
  const dependency = input.dependency ?? {};
  const impact = input.businessImpact ?? {};
  const taskReliability: PolicyContextReliability = "verified";
  const projectReliability: PolicyContextReliability = Object.values(project).some((item) => item != null) ? "verified" : "missing";
  const dependencyReliability: PolicyContextReliability = Object.values(dependency).some((item) => item != null) ? "observed" : "missing";
  const dueInDays = daysUntil(input.task.dueAt ?? null);
  const reasons = [...(input.priorityReasons ?? [])];
  if (dueInDays != null && dueInDays < 0) reasons.push(`${Math.floor(Math.abs(dueInDays))} day(s) overdue.`);
  else if (dueInDays != null && dueInDays <= 2) reasons.push("Due within 2 days.");
  if (input.task.assignee == null) reasons.push("No owner is assigned.");
  if (input.blockerReason) reasons.push(`Blocker: ${input.blockerReason}.`);
  if (impact.customerCommitment) reasons.push("A customer commitment is linked.");
  if (impact.externalCollaborator === true) reasons.push("An external collaborator is involved.");

  let priority = Math.max(0, Math.min(100, 35 + input.score * 7));
  if (dueInDays != null && dueInDays < 0) priority += Math.min(15, Math.ceil(Math.abs(dueInDays)));
  if (impact.customerCommitment || impact.linkedClientFlowWorkflowId) priority += 10;
  if (impact.linkedRevenueWorkflowId) priority += 10;
  priority = Math.min(100, priority);

  const externalDependency = dependency.external === true || /client|customer|vendor|external/i.test(`${input.blockerReason ?? ""} ${dependency.blockedBy ?? ""}`);
  const preparationState: OperationsPreparationState = input.task.assignee == null
    ? "needs_owner"
    : externalDependency
      ? "needs_dependency"
      : impact.linkedClientFlowWorkflowId
        ? "needs_customer_context"
        : impact.linkedRevenueWorkflowId
          ? "needs_commercial_context"
          : input.score >= 7 || input.signalType === "escalation_label"
            ? "needs_escalation"
            : "ready_to_resolve";

  const businessContext: PolicyBusinessContext = {
    project: {
      priority: value(project.priority, projectReliability),
      due_date_impact: value(dueInDays != null && dueInDays < 0 ? "overdue" : dueInDays != null && dueInDays <= 2 ? "due_soon" : null, dueInDays == null ? "missing" : "derived"),
    },
    task: {
      type: value(input.signalType, taskReliability),
      external_collaborator: value(impact.externalCollaborator, impact.externalCollaborator == null ? "missing" : "verified"),
    },
  };

  return {
    provider: input.provider,
    project: { id: bounded(project.id, 180), name: bounded(project.name, 180), priority: bounded(project.priority, 80), status: bounded(project.status, 80), owner: bounded(project.owner, 160), reliability: projectReliability },
    task: { id: bounded(input.task.id, 180), title: bounded(input.task.title, 240), status: bounded(input.task.status, 80), assignee: bounded(input.task.assignee, 160), dueAt: bounded(input.task.dueAt, 40), labels: (input.task.labels ?? []).slice(0, 20).map((item) => item.slice(0, 80)), blockerIndicators: [...(input.task.blockerIndicators ?? []), ...(input.blockerReason ? [input.blockerReason] : [])].slice(0, 8).map((item) => item.slice(0, 160)), checklist: input.task.checklist ? { total: Math.max(0, input.task.checklist.total), completed: Math.max(0, input.task.checklist.completed) } : null, lastActivityAt: bounded(input.task.lastActivityAt, 40), reliability: taskReliability },
    dependency: { blockedBy: bounded(dependency.blockedBy, 240), blocking: bounded(dependency.blocking, 240), owner: bounded(dependency.owner, 160), state: bounded(dependency.state, 80), external: dependency.external ?? null, reliability: dependencyReliability },
    businessImpact: { customerCommitment: bounded(impact.customerCommitment, 240), linkedClientFlowWorkflowId: bounded(impact.linkedClientFlowWorkflowId, 180), linkedRevenueWorkflowId: bounded(impact.linkedRevenueWorkflowId, 180), slaDeadline: bounded(impact.slaDeadline, 40), projectImportance: bounded(impact.projectImportance, 80), externalCollaborator: impact.externalCollaborator ?? null },
    preparationState,
    priority,
    priorityReasons: Array.from(new Set(reasons)).slice(0, 10),
    businessContext,
    workspaceMemory: input.workspaceMemory ?? { items: [], dependencies: [], keysUsed: [], attentionCount: 0 },
  };
}

export function operationsActionMetadata(context: OperationsContext, action: PreparedAction | null): Record<string, unknown> {
  return {
    contextQuality: { project: context.project.reliability, task: context.task.reliability, dependency: context.dependency.reliability },
    operationsContext: context,
    preparationState: context.preparationState,
    businessContext: context.businessContext,
    expectedOutcome: "The provider task state changes in a way that reduces or removes the detected blocker.",
    actionConnector: action?.connectorKey ?? null,
    memoryDependencies: context.workspaceMemory.dependencies,
  };
}

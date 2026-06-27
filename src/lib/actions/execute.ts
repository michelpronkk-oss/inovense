import { getActionDefinition } from "@/lib/actions/registry";
import { renderActionPreview } from "@/lib/actions/preview";
import type { ActionExecutionResult, ActionIntent, ActionType, PreparedAction, WorkspaceActionPolicy } from "@/lib/actions/types";
import { DEFAULT_POLICY_WORKSPACE_SETTINGS, defaultRiskForAction, destinationTypeForAction } from "@/lib/policies/defaults";
import { evaluatePolicy } from "@/lib/policies/evaluate";
import type { DestinationType, PolicyInput } from "@/lib/policies/types";
import {
  addTrelloCardCommentAfterApproval,
  createTrelloCardAfterApproval,
  moveTrelloCardAfterApproval,
} from "@/lib/operators/executors/trello";
import { operatorRuntimeId } from "@/lib/operators/logging";

function buildPolicyInput(intent: ActionIntent, prepared: Omit<PreparedAction, "policyInput" | "policyDecision">): PolicyInput {
  const rawInput = intent.input ?? {};
  const recipient = typeof rawInput.to === "string" ? rawInput.to.trim().toLowerCase() : undefined;
  const destinationType = (intent.destinationType ?? prepared.destinationType) as DestinationType;
  return {
    workspaceId: intent.workspaceId,
    operatorKey: intent.operatorKey,
    actionType: intent.actionType,
    connectorKey: prepared.connectorKey,
    capability: prepared.capability,
    destinationType,
    riskLevel: prepared.riskLevel ?? defaultRiskForAction(intent.actionType),
    confidence: intent.confidence,
    recipient,
    domain: recipient?.includes("@") ? recipient.split("@")[1] : undefined,
    channelId: typeof rawInput.channelId === "string" ? rawInput.channelId.trim() : undefined,
    cardId: typeof rawInput.cardId === "string" ? rawInput.cardId.trim() : undefined,
    listId: typeof rawInput.listId === "string" ? rawInput.listId.trim() : undefined,
    source: intent.source ?? undefined,
    metadata: intent.metadata ?? {},
  };
}

export function prepareAction(intent: ActionIntent, workspacePolicy: WorkspaceActionPolicy = {}): PreparedAction {
  const def = getActionDefinition(intent.actionType);
  const prepared: PreparedAction = {
    id: intent.id || operatorRuntimeId("act"),
    workspaceId: intent.workspaceId,
    operatorKey: intent.operatorKey,
    actionType: intent.actionType,
    connectorKey: intent.connectorKey || def.defaultConnectorKey,
    capability: intent.capability || def.capability,
    connectorCategory: def.connectorCategory,
    riskLevel: intent.riskLevel ?? defaultRiskForAction(intent.actionType),
    requiresApproval: true,
    title: intent.title,
    summary: intent.summary,
    input: intent.input,
    preview: renderActionPreview(intent),
    status: "prepared",
    dedupeKey: intent.dedupeKey ?? null,
    source: intent.source ?? null,
    destinationType: intent.destinationType ?? destinationTypeForAction(intent.actionType),
    confidence: intent.confidence,
    normalizedTarget: intent.normalizedTarget ?? null,
    metadata: intent.metadata ?? {},
  };
  const policyInput = buildPolicyInput(intent, prepared);
  const policyDecision = evaluatePolicy(
    policyInput,
    workspacePolicy.policySettings ?? {
      ...DEFAULT_POLICY_WORKSPACE_SETTINGS,
      customerEmailMode: workspacePolicy.customerEmailMode ?? DEFAULT_POLICY_WORKSPACE_SETTINGS.customerEmailMode,
      internalSlackNotificationsAllowed: workspacePolicy.internalSlackNotificationsAllowed ?? DEFAULT_POLICY_WORKSPACE_SETTINGS.internalSlackNotificationsAllowed,
    },
    workspacePolicy.entitlements,
  );
  const requiresApproval = policyDecision.requiresHumanReview;
  return {
    ...prepared,
    policyInput,
    policyDecision,
    requiresApproval,
    status: requiresApproval ? "approval_required" : "prepared",
  };
}

function stringInput(action: PreparedAction, key: string): string {
  const value = action.input[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function executePreparedActionAfterApproval(input: {
  action: PreparedAction;
  approvalId: string;
}): Promise<ActionExecutionResult> {
  const action = input.action;
  if (action.connectorKey !== "trello") {
    throw new Error(`No execution adapter enabled for ${action.connectorKey}/${action.actionType}.`);
  }

  if (action.actionType === "create_task") {
    const result = await createTrelloCardAfterApproval({
      workspaceId: action.workspaceId,
      boardId: stringInput(action, "boardId"),
      listId: stringInput(action, "listId"),
      name: stringInput(action, "name"),
      description: stringInput(action, "description"),
      due: stringInput(action, "due") || null,
      labels: Array.isArray(action.input.labels) ? action.input.labels.filter((item): item is string => typeof item === "string") : [],
      approvalId: input.approvalId,
      metadata: action.metadata,
    });
    return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result: { ...result } };
  }

  if (action.actionType === "move_task") {
    const result = await moveTrelloCardAfterApproval({
      workspaceId: action.workspaceId,
      cardId: stringInput(action, "cardId"),
      listId: stringInput(action, "listId"),
      approvalId: input.approvalId,
      metadata: action.metadata,
    });
    return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result: { ...result } };
  }

  if (action.actionType === "add_task_comment") {
    const result = await addTrelloCardCommentAfterApproval({
      workspaceId: action.workspaceId,
      cardId: stringInput(action, "cardId"),
      text: stringInput(action, "text"),
      approvalId: input.approvalId,
      metadata: action.metadata,
    });
    return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result: { ...result } };
  }

  throw new Error(`Unsupported prepared action for Trello: ${action.actionType}`);
}

// Future operators can call:
// prepareAction({ actionType: "create_task", capability: "pm.tasks.write_after_approval",
// connectorKey: "trello", ... }) and then place the PreparedAction in an
// approval continuation payload. Execution remains approval-gated here.

import { getActionDefinition, requiresApprovalForAction } from "@/lib/actions/registry";
import { renderActionPreview } from "@/lib/actions/preview";
import type { ActionExecutionResult, ActionIntent, PreparedAction, WorkspaceActionPolicy } from "@/lib/actions/types";
import {
  addTrelloCardCommentAfterApproval,
  createTrelloCardAfterApproval,
  moveTrelloCardAfterApproval,
} from "@/lib/operators/executors/trello";
import { operatorRuntimeId } from "@/lib/operators/logging";

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
    riskLevel: def.riskLevel,
    requiresApproval: true,
    title: intent.title,
    summary: intent.summary,
    input: intent.input,
    preview: renderActionPreview(intent),
    status: "prepared",
    dedupeKey: intent.dedupeKey ?? null,
    source: intent.source ?? null,
    metadata: intent.metadata ?? {},
  };
  return {
    ...prepared,
    requiresApproval: requiresApprovalForAction(prepared, workspacePolicy),
    status: requiresApprovalForAction(prepared, workspacePolicy) ? "approval_required" : "prepared",
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

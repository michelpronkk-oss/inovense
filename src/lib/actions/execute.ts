import { getActionDefinition } from "@/lib/actions/registry";
import { renderActionPreview } from "@/lib/actions/preview";
import type { ActionExecutionResult, ActionIntent, PreparedAction, WorkspaceActionPolicy } from "@/lib/actions/types";
import { DEFAULT_POLICY_WORKSPACE_SETTINGS, defaultRiskForAction, destinationTypeForAction } from "@/lib/policies/defaults";
import { evaluatePolicy } from "@/lib/policies/evaluate";
import type { DestinationType, PolicyInput } from "@/lib/policies/types";
import {
  addTrelloCardCommentAfterApproval,
  createTrelloCardAfterApproval,
  moveTrelloCardAfterApproval,
} from "@/lib/operators/executors/trello";
import { addAsanaTaskComment, createAsanaTask, updateAsanaTask } from "@/lib/connectors/asana";
import { addJiraComment, createJiraIssue, updateJiraIssue } from "@/lib/connectors/jira";
import { addZendeskInternalNote, replyZendeskTicket, updateZendeskTicket } from "@/lib/connectors/zendesk";
import { replyToIntercomConversation, updateIntercomConversation } from "@/lib/connectors/intercom";
import { operatorRuntimeId } from "@/lib/operators/logging";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/runtime/provider-health";

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

/**
 * The one place a shared, approval-gated provider write is dispatched. It is
 * wrapped by executePreparedActionAfterApproval() below so every write outcome
 * lands in the shared provider-failure record without each adapter having to
 * remember to report it.
 */
async function dispatchPreparedAction(input: {
  action: PreparedAction;
  approvalId: string;
}): Promise<ActionExecutionResult> {
  const action = input.action;
  if (action.connectorKey === "asana") {
    if (action.actionType === "create_asana_task") {
      const result = await createAsanaTask({ workspaceId: action.workspaceId, projectId: stringInput(action, "projectId") || undefined, name: stringInput(action, "name"), notes: stringInput(action, "notes") || null, dueOn: stringInput(action, "dueOn") || null, assigneeGid: stringInput(action, "assigneeGid") || null });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    if (action.actionType === "update_asana_task") {
      const result = await updateAsanaTask({ workspaceId: action.workspaceId, taskId: stringInput(action, "taskId"), name: Object.prototype.hasOwnProperty.call(action.input, "name") ? stringInput(action, "name") : undefined, dueOn: Object.prototype.hasOwnProperty.call(action.input, "dueOn") ? stringInput(action, "dueOn") || null : undefined, assigneeGid: Object.prototype.hasOwnProperty.call(action.input, "assigneeGid") ? stringInput(action, "assigneeGid") || null : undefined, completed: typeof action.input.completed === "boolean" ? action.input.completed : undefined });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    if (action.actionType === "add_asana_comment") {
      const result = await addAsanaTaskComment({ workspaceId: action.workspaceId, taskId: stringInput(action, "taskId"), text: stringInput(action, "text") });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    throw new Error(`Unsupported prepared action for Asana: ${action.actionType}.`);
  }
  if (action.connectorKey === "jira") {
    if (action.actionType === "create_jira_issue") {
      const result = await createJiraIssue({ workspaceId: action.workspaceId, projectId: stringInput(action, "projectId") || undefined, summary: stringInput(action, "summary"), description: stringInput(action, "description") || null, issueTypeId: stringInput(action, "issueTypeId"), assigneeAccountId: stringInput(action, "assigneeAccountId") || null, priorityId: stringInput(action, "priorityId") || null, dueDate: stringInput(action, "dueDate") || null });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    if (action.actionType === "update_jira_issue") {
      const result = await updateJiraIssue({ workspaceId: action.workspaceId, issueKey: stringInput(action, "issueKey"), summary: Object.prototype.hasOwnProperty.call(action.input, "summary") ? stringInput(action, "summary") : undefined, assigneeAccountId: Object.prototype.hasOwnProperty.call(action.input, "assigneeAccountId") ? stringInput(action, "assigneeAccountId") || null : undefined, priorityId: Object.prototype.hasOwnProperty.call(action.input, "priorityId") ? stringInput(action, "priorityId") || null : undefined, dueDate: Object.prototype.hasOwnProperty.call(action.input, "dueDate") ? stringInput(action, "dueDate") || null : undefined });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    if (action.actionType === "add_jira_comment") {
      const result = await addJiraComment({ workspaceId: action.workspaceId, issueKey: stringInput(action, "issueKey"), text: stringInput(action, "text") });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    throw new Error(`Unsupported prepared action for Jira: ${action.actionType}.`);
  }
  if (action.connectorKey === "zendesk") {
    if (action.actionType === "reply_zendesk_ticket") {
      const result = await replyZendeskTicket({ workspaceId: action.workspaceId, ticketId: stringInput(action, "ticketId"), body: stringInput(action, "body") });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    if (action.actionType === "add_zendesk_internal_note") {
      const result = await addZendeskInternalNote({ workspaceId: action.workspaceId, ticketId: stringInput(action, "ticketId"), body: stringInput(action, "body") });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    if (action.actionType === "update_zendesk_ticket") {
      const result = await updateZendeskTicket({ workspaceId: action.workspaceId, ticketId: stringInput(action, "ticketId"), status: Object.prototype.hasOwnProperty.call(action.input, "status") ? stringInput(action, "status") || null : undefined, priority: Object.prototype.hasOwnProperty.call(action.input, "priority") ? stringInput(action, "priority") || null : undefined, assigneeId: Object.prototype.hasOwnProperty.call(action.input, "assigneeId") ? stringInput(action, "assigneeId") || null : undefined });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    throw new Error(`Unsupported prepared action for Zendesk: ${action.actionType}.`);
  }
  if (action.connectorKey === "intercom") {
    if (action.actionType === "reply_intercom_conversation") {
      const result = await replyToIntercomConversation({ workspaceId: action.workspaceId, conversationId: stringInput(action, "conversationId"), body: stringInput(action, "body") });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    if (action.actionType === "update_intercom_conversation") {
      const result = await updateIntercomConversation({ workspaceId: action.workspaceId, conversationId: stringInput(action, "conversationId"), status: (stringInput(action, "status") || undefined) as "open" | "closed" | undefined, adminId: Object.prototype.hasOwnProperty.call(action.input, "adminId") ? stringInput(action, "adminId") || null : undefined });
      return { status: "executed", actionId: action.id, actionType: action.actionType, connectorKey: action.connectorKey, result };
    }
    throw new Error(`Unsupported prepared action for Intercom: ${action.actionType}.`);
  }
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

/**
 * Execute an approved provider write and record its operational outcome.
 *
 * The recording is best effort and never changes the result: a successful
 * write stays successful even if telemetry is unavailable, and a failure is
 * re-thrown unchanged so the caller's existing execution_unknown handling is
 * untouched. Only a normalized operation category and a safe error code are
 * stored, never the payload or the target.
 */
export async function executePreparedActionAfterApproval(input: {
  action: PreparedAction;
  approvalId: string;
}): Promise<ActionExecutionResult> {
  const action = input.action;
  try {
    const result = await dispatchPreparedAction(input);
    await recordProviderSuccess({ workspaceId: action.workspaceId, connectorKey: action.connectorKey, operation: "write" });
    return result;
  } catch (error) {
    const detail = (error ?? {}) as { status?: unknown; code?: unknown };
    await recordProviderFailure({
      workspaceId: action.workspaceId,
      connectorKey: action.connectorKey,
      operation: "write",
      status: typeof detail.status === "number" ? detail.status : null,
      code: typeof detail.code === "string" ? detail.code : null,
    });
    throw error;
  }
}

// Future operators can call:
// prepareAction({ actionType: "create_task", capability: "pm.tasks.write_after_approval",
// connectorKey: "trello", ... }) and then place the PreparedAction in an
// approval continuation payload. Execution remains approval-gated here.

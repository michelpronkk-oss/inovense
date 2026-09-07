import type { Capability } from "@/lib/connectors/capabilities";
import type { ConnectorCategory, ConnectorRiskLevel } from "@/lib/connectors/registry";
import type { ActionType, PreparedAction, WorkspaceActionPolicy } from "@/lib/actions/types";
import type { PolicyDecision } from "@/lib/policies/types";

export type ActionDefinition = {
  actionType: ActionType;
  capability: Capability;
  connectorCategory: ConnectorCategory;
  defaultConnectorKey: string;
  riskLevel: ConnectorRiskLevel;
  approvalDefault: boolean;
  allowedExecutionAdapters: string[];
  canAutoExecute: boolean;
  permanentlyBlocked?: boolean;
};

export const ACTION_REGISTRY: Record<ActionType, ActionDefinition> = {
  send_email: {
    actionType: "send_email",
    capability: "email.send_after_approval",
    connectorCategory: "email",
    defaultConnectorKey: "gmail",
    riskLevel: "high",
    approvalDefault: true,
    allowedExecutionAdapters: ["gmail", "microsoft"],
    canAutoExecute: false,
  },
  send_slack_message: {
    actionType: "send_slack_message",
    capability: "chat.messages.send_after_approval",
    connectorCategory: "team_chat",
    defaultConnectorKey: "slack",
    riskLevel: "low",
    approvalDefault: true,
    allowedExecutionAdapters: ["slack"],
    canAutoExecute: false,
  },
  create_crm_contact: {
    actionType: "create_crm_contact",
    capability: "crm.contacts.write",
    connectorCategory: "crm",
    defaultConnectorKey: "hubspot",
    riskLevel: "high",
    approvalDefault: true,
    allowedExecutionAdapters: ["hubspot"],
    canAutoExecute: false,
  },
  create_crm_deal: {
    actionType: "create_crm_deal",
    capability: "crm.deals.write",
    connectorCategory: "crm",
    defaultConnectorKey: "hubspot",
    riskLevel: "high",
    approvalDefault: true,
    allowedExecutionAdapters: ["hubspot"],
    canAutoExecute: false,
  },
  create_crm_note: {
    actionType: "create_crm_note",
    capability: "crm.contacts.write",
    connectorCategory: "crm",
    defaultConnectorKey: "hubspot",
    riskLevel: "low",
    approvalDefault: true,
    allowedExecutionAdapters: ["hubspot"],
    canAutoExecute: false,
  },
  create_crm_task: {
    actionType: "create_crm_task",
    capability: "crm.contacts.write",
    connectorCategory: "crm",
    defaultConnectorKey: "hubspot",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["hubspot"],
    canAutoExecute: false,
  },
  update_crm_record: {
    actionType: "update_crm_record",
    capability: "crm.contacts.write",
    connectorCategory: "crm",
    defaultConnectorKey: "hubspot",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["hubspot"],
    canAutoExecute: false,
  },
  create_task: {
    actionType: "create_task",
    capability: "pm.tasks.write_after_approval",
    connectorCategory: "project_management",
    defaultConnectorKey: "trello",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["trello"],
    canAutoExecute: false,
  },
  move_task: {
    actionType: "move_task",
    capability: "pm.tasks.update_after_approval",
    connectorCategory: "project_management",
    defaultConnectorKey: "trello",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["trello"],
    canAutoExecute: false,
  },
  add_task_comment: {
    actionType: "add_task_comment",
    capability: "pm.comments.write_after_approval",
    connectorCategory: "project_management",
    defaultConnectorKey: "trello",
    riskLevel: "low",
    approvalDefault: true,
    allowedExecutionAdapters: ["trello"],
    canAutoExecute: true,
  },
};

export function getActionDefinition(actionType: ActionType): ActionDefinition {
  return ACTION_REGISTRY[actionType];
}

export function requiresApprovalForAction(
  action: Pick<PreparedAction, "actionType" | "connectorKey"> | { actionType: ActionType; connectorKey?: string },
  workspacePolicy: WorkspaceActionPolicy = {},
): boolean {
  const maybeDecision = (action as { policyDecision?: PolicyDecision | null }).policyDecision;
  if (maybeDecision) {
    return maybeDecision.requiresHumanReview;
  }
  if (action.actionType === "send_email") {
    return true;
  }
  if (action.actionType === "send_slack_message") {
    return !workspacePolicy.internalSlackNotificationsAllowed;
  }
  return ACTION_REGISTRY[action.actionType].approvalDefault;
}

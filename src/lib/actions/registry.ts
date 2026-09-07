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
  send_teams_message: {
    actionType: "send_teams_message",
    capability: "chat.messages.send_after_approval",
    connectorCategory: "team_chat",
    defaultConnectorKey: "microsoft_teams",
    // Higher baseline risk than Slack: a Teams shared channel can include
    // federated external tenants, and Graph cannot always prove otherwise.
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["microsoft_teams"],
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
  create_asana_task: {
    actionType: "create_asana_task",
    capability: "pm.tasks.create_after_approval",
    connectorCategory: "project_management",
    defaultConnectorKey: "asana",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["asana"],
    canAutoExecute: false,
  },
  update_asana_task: {
    actionType: "update_asana_task",
    capability: "pm.tasks.update_after_approval",
    connectorCategory: "project_management",
    defaultConnectorKey: "asana",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["asana"],
    canAutoExecute: false,
  },
  add_asana_comment: {
    actionType: "add_asana_comment",
    capability: "pm.comments.write_after_approval",
    connectorCategory: "project_management",
    defaultConnectorKey: "asana",
    riskLevel: "low",
    approvalDefault: true,
    allowedExecutionAdapters: ["asana"],
    canAutoExecute: false,
  },
  create_jira_issue: {
    actionType: "create_jira_issue",
    capability: "pm.tasks.create_after_approval",
    connectorCategory: "project_management",
    defaultConnectorKey: "jira",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["jira"],
    canAutoExecute: false,
  },
  update_jira_issue: {
    actionType: "update_jira_issue",
    capability: "pm.tasks.update_after_approval",
    connectorCategory: "project_management",
    defaultConnectorKey: "jira",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["jira"],
    canAutoExecute: false,
  },
  add_jira_comment: {
    actionType: "add_jira_comment",
    capability: "pm.comments.write_after_approval",
    connectorCategory: "project_management",
    defaultConnectorKey: "jira",
    riskLevel: "low",
    approvalDefault: true,
    allowedExecutionAdapters: ["jira"],
    canAutoExecute: false,
  },
  reply_zendesk_ticket: {
    actionType: "reply_zendesk_ticket",
    capability: "support.tickets.reply_after_approval",
    connectorCategory: "support",
    defaultConnectorKey: "zendesk",
    riskLevel: "high",
    approvalDefault: true,
    allowedExecutionAdapters: ["zendesk"],
    canAutoExecute: false,
  },
  add_zendesk_internal_note: {
    actionType: "add_zendesk_internal_note",
    capability: "support.tickets.comment_after_approval",
    connectorCategory: "support",
    defaultConnectorKey: "zendesk",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["zendesk"],
    canAutoExecute: false,
  },
  update_zendesk_ticket: {
    actionType: "update_zendesk_ticket",
    capability: "support.tickets.update_after_approval",
    connectorCategory: "support",
    defaultConnectorKey: "zendesk",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["zendesk"],
    canAutoExecute: false,
  },
  reply_intercom_conversation: {
    actionType: "reply_intercom_conversation",
    capability: "support.conversations.reply_after_approval",
    connectorCategory: "support",
    defaultConnectorKey: "intercom",
    riskLevel: "high",
    approvalDefault: true,
    allowedExecutionAdapters: ["intercom"],
    canAutoExecute: false,
  },
  update_intercom_conversation: {
    actionType: "update_intercom_conversation",
    capability: "support.conversations.update_after_approval",
    connectorCategory: "support",
    defaultConnectorKey: "intercom",
    riskLevel: "medium",
    approvalDefault: true,
    allowedExecutionAdapters: ["intercom"],
    canAutoExecute: false,
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
  // Teams sends always require approval. There is deliberately no workspace
  // setting that can turn this off in this pass - see the policy evaluator.
  if (action.actionType === "send_teams_message") {
    return true;
  }
  return ACTION_REGISTRY[action.actionType].approvalDefault;
}

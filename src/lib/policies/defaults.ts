import type { ActionType } from "@/lib/actions/types";
import type { DestinationType, PolicyActionRule, PolicyRiskLevel, PolicyWorkspaceSettings } from "@/lib/policies/types";

export const POLICY_ENGINE_VERSION = "policy-v2";

// Feature flag: auto-execution of low-risk actions inside scans is OFF in v1.
// The policy engine still evaluates every action and enforces decisions at
// approval/execution time. Flip this on only after auto-execution is verified.
export const policyEngineAutoExecuteLowRiskActions = true;

export const DEFAULT_ACTION_RULES: PolicyActionRule[] = [
  {
    id: "hubspot.deal.eur_10000.approval",
    enabled: true,
    connector: "hubspot",
    action: null,
    subjectType: "deal",
    conditions: [
      { field: "deal.amount", operator: "gte", value: 10000 },
      { field: "deal.currency", operator: "eq", value: "EUR" },
    ],
    decision: "approval_required",
    // These are the existing server-authorized approval roles. The evaluator
    // records them as evidence; the approval route remains the final authority.
    approverRoles: ["owner", "admin", "reviewer"],
    expiresAfterMinutes: 60,
    priority: 100,
    reason: "HubSpot deals of €10,000 or more in EUR require approval.",
  },
];

export const DEFAULT_POLICY_WORKSPACE_SETTINGS: PolicyWorkspaceSettings = {
  version: 2,
  autonomyMode: "approval_first",
  emergencyStopEnabled: false,
  customerEmailMode: "approval_required",
  internalSlackNotificationsAllowed: false,
  dailyBriefAllowed: true,
  connectorHealthChecksAllowed: true,
  lowRiskProjectToolCommentsAllowed: false,
  crmWritesRequireApproval: true,
  projectToolWritesRequireApproval: true,
  customerFacingActionsRequireApproval: true,
  maxAutonomousActionsPerHour: 10,
  maxAutonomousActionsPerDay: 50,
  actionRules: DEFAULT_ACTION_RULES,
};

// Stable destination classification per action type. Falls back to "system".
export function destinationTypeForAction(actionType: ActionType | string): DestinationType {
  switch (actionType) {
    case "send_email":
      return "customer";
    case "send_slack_message":
      return "internal";
    // Default only. Teams callers override this to "external" whenever the
    // target channel's membership type cannot be proven internal (shared /
    // federated channels), which forces the approval path.
    case "send_teams_message":
      return "internal";
    case "create_crm_contact":
    case "create_crm_deal":
      return "crm";
    case "create_crm_note":
    case "create_crm_task":
    case "update_crm_record":
      return "crm";
    case "create_task":
    case "move_task":
    case "add_task_comment":
    case "add_asana_comment":
      return "project_tool";
    case "create_asana_task":
    case "update_asana_task":
    case "create_jira_issue":
    case "update_jira_issue":
      return "project_tool";
    case "reply_zendesk_ticket":
      return "customer";
    case "add_zendesk_internal_note":
    case "update_zendesk_ticket":
      return "internal";
    case "reply_intercom_conversation":
      return "customer";
    case "update_intercom_conversation":
      return "internal";
    default:
      return "system";
  }
}

// Meaningful per-action baseline risk (no longer always "medium").
export function defaultRiskForAction(actionType: ActionType | string): PolicyRiskLevel {
  switch (actionType) {
    case "send_email":
      return "high";
    case "create_crm_contact":
    case "create_crm_deal":
      return "high";
    case "update_crm_record":
    case "create_crm_task":
      return "medium";
    case "create_crm_note":
      return "low";
    case "move_task":
    case "create_task":
      return "medium";
    case "add_task_comment":
    case "add_asana_comment":
      return "low";
    case "create_asana_task":
    case "update_asana_task":
    case "create_jira_issue":
    case "update_jira_issue":
      return "medium";
    case "reply_zendesk_ticket":
      return "high";
    case "add_zendesk_internal_note":
    case "update_zendesk_ticket":
      return "medium";
    case "reply_intercom_conversation":
      return "high";
    case "update_intercom_conversation":
      return "medium";
    case "send_slack_message":
      return "low";
    case "send_teams_message":
      return "medium";
    default:
      return "medium";
  }
}

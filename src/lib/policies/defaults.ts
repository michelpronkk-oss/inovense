import type { ActionType } from "@/lib/actions/types";
import type { DestinationType, PolicyRiskLevel, PolicyWorkspaceSettings } from "@/lib/policies/types";

export const POLICY_ENGINE_VERSION = "policy-v2";

// Feature flag: auto-execution of low-risk actions inside scans is OFF in v1.
// The policy engine still evaluates every action and enforces decisions at
// approval/execution time. Flip this on only after auto-execution is verified.
export const policyEngineAutoExecuteLowRiskActions = true;

export const DEFAULT_POLICY_WORKSPACE_SETTINGS: PolicyWorkspaceSettings = {
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
};

// Stable destination classification per action type. Falls back to "system".
export function destinationTypeForAction(actionType: ActionType | string): DestinationType {
  switch (actionType) {
    case "send_email":
      return "customer";
    case "send_slack_message":
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
      return "project_tool";
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
      return "low";
    case "send_slack_message":
      return "low";
    default:
      return "medium";
  }
}

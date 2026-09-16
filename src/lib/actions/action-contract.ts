import type { Capability } from "@/lib/connectors/capabilities";
import type { ActionType } from "@/lib/actions/types";

/** Provider-independent actions are the stable product vocabulary. Provider
 * actionType values remain persisted for compatibility and map into this
 * contract only at the execution/presentation boundary. */
export type SharedAction = "create_task" | "update_task" | "add_comment" | "complete_task" | "send_message" | "send_email" | "update_contact" | "update_deal";

export type SharedActionContract = {
  action: SharedAction;
  label: string;
  capabilities: Capability[];
  approvalRequired: boolean;
};

export const SHARED_ACTION_CONTRACTS: Record<SharedAction, SharedActionContract> = {
  create_task: { action: "create_task", label: "Create task", capabilities: ["pm.tasks.create_after_approval", "pm.tasks.write_after_approval"], approvalRequired: true },
  update_task: { action: "update_task", label: "Update task", capabilities: ["pm.tasks.update_after_approval"], approvalRequired: true },
  add_comment: { action: "add_comment", label: "Add comment", capabilities: ["pm.comments.write_after_approval", "support.tickets.comment_after_approval"], approvalRequired: true },
  complete_task: { action: "complete_task", label: "Complete task", capabilities: ["pm.tasks.update_after_approval"], approvalRequired: true },
  send_message: { action: "send_message", label: "Send message", capabilities: ["chat.messages.send_after_approval"], approvalRequired: true },
  send_email: { action: "send_email", label: "Send email", capabilities: ["email.send_after_approval"], approvalRequired: true },
  update_contact: { action: "update_contact", label: "Update contact", capabilities: ["crm.contacts.write"], approvalRequired: true },
  update_deal: { action: "update_deal", label: "Update deal", capabilities: ["crm.deals.write"], approvalRequired: true },
};

export function sharedActionForActionType(actionType: ActionType | string, input?: Record<string, unknown>): SharedAction | null {
  if (actionType === "send_email") return "send_email";
  if (actionType === "send_slack_message" || actionType === "send_teams_message") return "send_message";
  if (["create_task", "create_asana_task", "create_jira_issue"].includes(actionType)) return "create_task";
  if (["move_task", "update_asana_task", "update_jira_issue"].includes(actionType)) return "update_task";
  if (["add_task_comment", "add_asana_comment", "add_jira_comment", "add_zendesk_internal_note"].includes(actionType)) return "add_comment";
  if (actionType === "update_zendesk_ticket" || actionType === "update_intercom_conversation") return "update_task";
  if (actionType === "create_crm_contact" || actionType === "update_crm_record") return input?.subjectType === "deal" ? "update_deal" : "update_contact";
  if (actionType === "create_crm_deal") return "update_deal";
  return null;
}

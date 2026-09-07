// Human-readable translations for real OperatorDefinition.allowedActions ids
// (see src/lib/operators/registry.ts). Never invents an action - only
// relabels what the registry actually declares, and drops internal-only
// bookkeeping actions (memory/log/approval scaffolding) that are not a real
// customer-facing capability.
//
// Single source of truth for this translation so operator detail pages never
// each invent their own copy for the same underlying action id.

const ACTION_LABELS: Record<string, string> = {
  "gmail.createDraft": "Draft follow-up emails",
  "hubspot.createOrUpdateContact": "Update HubSpot contacts",
  "hubspot.createOrUpdateDeal": "Update HubSpot deals",
  "trello.scanBoards": "Read Trello boards",
  "trello.prepareAction": "Prepare Trello card updates",
  "slack.prepareMessage": "Prepare Slack messages",
  "teams.readChannelMessages": "Monitor Teams channel messages",
  "teams.prepareMessage": "Send approved Teams messages",
  "calendar.createExternalInvite": "Prepare calendar invites",
  "google_drive.searchFiles": "Search Google Drive files",
  "asana.createApprovedTask": "Create approved Asana tasks",
  "asana.updateApprovedTask": "Update approved Asana tasks",
  "asana.addApprovedComment": "Add approved Asana comments",
  "jira.createApprovedIssue": "Create approved Jira issues",
  "jira.updateApprovedIssue": "Update approved Jira issues",
  "jira.addApprovedComment": "Add approved Jira comments",
  "zendesk.readTickets": "Monitor Zendesk tickets",
  "zendesk.prepareReply": "Send approved Zendesk replies",
  "zendesk.prepareInternalNote": "Add approved Zendesk internal notes",
  "zendesk.prepareTicketUpdate": "Update approved Zendesk tickets",
  "intercom.readConversations": "Monitor Intercom conversations",
  "intercom.prepareReply": "Send approved Intercom replies",
  "intercom.prepareConversationUpdate": "Update approved Intercom conversations",
};

const INTERNAL_ACTIONS = new Set([
  "memory.read",
  "memory.stageWrite",
  "log.write",
  "approval.create",
  "approval.prepare",
]);

function fallbackLabel(action: string): string {
  const label = action
    .replace(/\./g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;
}

/** Filters out internal bookkeeping actions and translates the rest into short customer-facing copy. */
export function humanizeOperatorActions(actions: string[]): string[] {
  const out: string[] = [];
  for (const action of actions) {
    if (INTERNAL_ACTIONS.has(action)) continue;
    out.push(ACTION_LABELS[action] ?? fallbackLabel(action));
  }
  return out;
}

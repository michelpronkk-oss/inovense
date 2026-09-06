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
  "calendar.createExternalInvite": "Prepare calendar invites",
};

const INTERNAL_ACTIONS = new Set([
  "memory.read",
  "memory.stageWrite",
  "log.write",
  "approval.create",
  "approval.prepare",
]);

function fallbackLabel(action: string): string {
  return action
    .replace(/\./g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
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

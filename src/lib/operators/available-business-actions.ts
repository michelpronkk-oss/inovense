import { getCapabilitiesForConnectors, type Capability } from "@/lib/connectors/capabilities";
import { getOperatorConnectorReadiness, OPERATOR_CONNECTOR_REQUIREMENTS } from "@/lib/operators/connector-requirements";
import { humanizeCapabilities } from "@/lib/operators/capability-labels";
import { humanizeOperatorActions } from "@/lib/operators/action-labels";
import { getOperatorDefinition, type OperatorKey } from "@/lib/operators/registry";

// This adapter maps existing real actions onto the existing connector
// capability graph. It does not define connector support independently.
const ACTION_CAPABILITY_REQUIREMENTS: Record<string, Capability[]> = {
  "gmail.createDraft": ["email.draft"],
  "hubspot.createOrUpdateContact": ["crm.contacts.write"],
  "hubspot.createOrUpdateDeal": ["crm.deals.write"],
  "trello.scanBoards": ["pm.tasks.read"],
  "trello.prepareAction": ["pm.tasks.update_after_approval"],
  "slack.prepareMessage": ["chat.messages.send_after_approval"],
  // Microsoft Teams. Read and send are separate capability requirements so a
  // workspace that only consented to Teams read never sees a send claim.
  "teams.readChannelMessages": ["chat.channels.read", "chat.messages.read"],
  "teams.prepareMessage": ["chat.messages.read", "chat.messages.send_after_approval"],
  "asana.createApprovedTask": ["pm.tasks.create_after_approval"],
  "asana.updateApprovedTask": ["pm.tasks.update_after_approval"],
  "asana.addApprovedComment": ["pm.comments.write_after_approval"],
  "jira.createApprovedIssue": ["pm.tasks.create_after_approval"],
  "jira.updateApprovedIssue": ["pm.tasks.update_after_approval"],
  "jira.addApprovedComment": ["pm.comments.write_after_approval"],
  "zendesk.readTickets": ["support.tickets.read"],
  "zendesk.prepareReply": ["support.tickets.reply_after_approval"],
  "zendesk.prepareInternalNote": ["support.tickets.comment_after_approval"],
  "zendesk.prepareTicketUpdate": ["support.tickets.update_after_approval"],
  "intercom.readConversations": ["support.conversations.read"],
  "intercom.prepareReply": ["support.conversations.reply_after_approval"],
  "intercom.prepareConversationUpdate": ["support.conversations.update_after_approval"],
  "calendar.createExternalInvite": ["calendar.events.write_after_approval"],
  "google_drive.searchFiles": ["docs.read"],
};

/**
 * Actions whose id names a specific provider AND whose capability is also
 * provided by another connector. Without this, a Slack-only workspace would
 * satisfy chat.messages.* and be told Auterim can "Monitor Teams channel
 * messages" - a capability claim Microsoft Teams alone can back. The
 * connector named here must itself be healthy for the action to be listed.
 */
const ACTION_CONNECTOR_REQUIREMENTS: Record<string, string> = {
  "teams.readChannelMessages": "microsoft_teams",
  "teams.prepareMessage": "microsoft_teams",
  "asana.createApprovedTask": "asana",
  "asana.updateApprovedTask": "asana",
  "asana.addApprovedComment": "asana",
  "jira.createApprovedIssue": "jira",
  "jira.updateApprovedIssue": "jira",
  "jira.addApprovedComment": "jira",
  "zendesk.readTickets": "zendesk",
  "zendesk.prepareReply": "zendesk",
  "zendesk.prepareInternalNote": "zendesk",
  "zendesk.prepareTicketUpdate": "zendesk",
  "intercom.readConversations": "intercom",
  "intercom.prepareReply": "intercom",
  "intercom.prepareConversationUpdate": "intercom",
  "slack.prepareMessage": "slack",
  "google_drive.searchFiles": "google_drive",
};

/**
 * Actions that additionally need the connector to be *executable* right now,
 * not merely healthy. Microsoft Teams read consent and Teams send consent are
 * separate Graph scopes, so a workspace that only granted read must never be
 * shown a Teams sending claim. Connector truth sets `executable` for Teams
 * from the real send scope plus a chosen destination.
 */
const ACTIONS_REQUIRING_EXECUTABLE_CONNECTOR = new Set(["teams.prepareMessage", "asana.createApprovedTask", "asana.updateApprovedTask", "asana.addApprovedComment", "jira.createApprovedIssue", "jira.updateApprovedIssue", "jira.addApprovedComment", "zendesk.prepareReply", "zendesk.prepareInternalNote", "zendesk.prepareTicketUpdate", "intercom.prepareReply", "intercom.prepareConversationUpdate"]);

const INTERNAL_ACTIONS = new Set([
  "memory.read",
  "memory.stageWrite",
  "log.write",
  "approval.create",
  "approval.prepare",
]);

export type WorkspaceConnectorCapabilityTruth = { connectorKey: string; status: string; executable?: boolean };

export type WorkspaceAvailableBusinessActions = {
  operatorKey: OperatorKey;
  healthyConnectorKeys: string[];
  relevantConnectorKeys: string[];
  actionIds: string[];
  actionLabels: string[];
  capabilityLabels: string[];
  labels: string[];
};

/** Current, healthy-connector-backed business actions for one operator. */
export function getWorkspaceAvailableBusinessActions(input: {
  operatorKey: OperatorKey;
  connectorTruth: WorkspaceConnectorCapabilityTruth[];
}): WorkspaceAvailableBusinessActions {
  const operator = getOperatorDefinition(input.operatorKey);
  const healthyConnectorKeys = Array.from(new Set(input.connectorTruth
    .filter((connector) => connector.status === "connected" || connector.status === "healthy")
    .map((connector) => connector.connectorKey)));
  const empty: WorkspaceAvailableBusinessActions = {
    operatorKey: input.operatorKey,
    healthyConnectorKeys,
    relevantConnectorKeys: [],
    actionIds: [],
    actionLabels: [],
    capabilityLabels: [],
    labels: [],
  };
  if (!operator) return empty;

  const declared = OPERATOR_CONNECTOR_REQUIREMENTS[input.operatorKey];
  const declaredCapabilities = new Set([...declared.required, ...declared.optional]);
  const relevantConnectorKeys = healthyConnectorKeys.filter((connectorKey) =>
    getCapabilitiesForConnectors([connectorKey]).some((capability) => declaredCapabilities.has(capability)),
  );
  empty.relevantConnectorKeys = relevantConnectorKeys;

  const readiness = getOperatorConnectorReadiness(input.operatorKey, healthyConnectorKeys);
  if (!readiness?.ready) return empty;

  const availableCapabilities = new Set(getCapabilitiesForConnectors(healthyConnectorKeys));
  const healthySet = new Set(healthyConnectorKeys);
  const actionIds = operator.allowedActions.filter((action) => {
    if (INTERNAL_ACTIONS.has(action)) return false;
    const requiredConnector = ACTION_CONNECTOR_REQUIREMENTS[action];
    if (requiredConnector && !healthySet.has(requiredConnector)) return false;
    if (requiredConnector && ACTIONS_REQUIRING_EXECUTABLE_CONNECTOR.has(action)) {
      const row = input.connectorTruth.find((connector) => connector.connectorKey === requiredConnector);
      if (row?.executable !== true) return false;
    }
    const requirements = ACTION_CAPABILITY_REQUIREMENTS[action];
    return Boolean(requirements?.length && requirements.every((capability) => availableCapabilities.has(capability)));
  });
  const capabilityLabels = humanizeCapabilities(
    [...declared.required, ...declared.optional].filter((capability) => availableCapabilities.has(capability)),
  );
  const actionLabels = humanizeOperatorActions(actionIds);

  return {
    operatorKey: input.operatorKey,
    healthyConnectorKeys,
    relevantConnectorKeys,
    actionIds,
    actionLabels,
    capabilityLabels,
    labels: Array.from(new Set([...capabilityLabels, ...actionLabels])),
  };
}

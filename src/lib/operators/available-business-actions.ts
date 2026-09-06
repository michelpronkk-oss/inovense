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
  "calendar.createExternalInvite": ["calendar.events.write_after_approval"],
};

const INTERNAL_ACTIONS = new Set([
  "memory.read",
  "memory.stageWrite",
  "log.write",
  "approval.create",
  "approval.prepare",
]);

export type WorkspaceConnectorCapabilityTruth = { connectorKey: string; status: string };

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
  const actionIds = operator.allowedActions.filter((action) => {
    if (INTERNAL_ACTIONS.has(action)) return false;
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

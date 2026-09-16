import { isApprovalGatedCapability, type Capability } from "@/lib/connectors/capabilities";
import { getConnectorDefinition, listConnectors } from "@/lib/connectors/registry";
import type { CapabilityDefinition, ConnectorState } from "@/lib/product/presentation-models";

export type ConnectorExtensionContract = {
  connectorKey: string;
  auth: { type: string; setupNotes: string };
  capabilities: CapabilityDefinition[];
  executorActionTypes: string[];
  eventTypes: string[];
  healthEvaluator: (input: { status?: string | null; connected?: boolean; executable?: boolean }) => ConnectorState["health"];
};

const label = (key: string) => key.split(".").pop()?.replace(/_after_approval$/, "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? key;

/** Registry-derived capability definitions. Unknown providers are ignored,
 * allowing a future connector to be absent without breaking a page. */
export function listCapabilityDefinitions(): CapabilityDefinition[] {
  const capabilities = new Set<Capability>(listConnectors().flatMap((connector) => connector.capabilities));
  return [...capabilities].sort().map((key) => ({
    key,
    label: label(key),
    category: key.split(".")[0] ?? "internal",
    approvalRequired: isApprovalGatedCapability(key),
    providerIndependent: true,
    connectorKeys: listConnectors().filter((connector) => connector.capabilities.includes(key)).map((connector) => connector.connectorKey),
  }));
}

export function getCapabilityDefinition(key: string): CapabilityDefinition | null {
  return listCapabilityDefinitions().find((definition) => definition.key === key) ?? null;
}

export function connectorStateFromRegistry(connectorKey: string, input?: Partial<ConnectorState>): ConnectorState | null {
  const definition = getConnectorDefinition(connectorKey);
  if (!definition) return null;
  return {
    key: definition.connectorKey,
    displayName: definition.displayName,
    status: input?.status ?? (definition.status === "available" ? "available" : "disabled"),
    health: input?.health ?? "unknown",
    executable: input?.executable ?? false,
    capabilities: [...definition.capabilities],
    lastCheckedAt: input?.lastCheckedAt ?? null,
    setupRoute: input?.setupRoute ?? `/connectors?connector=${encodeURIComponent(definition.connectorKey)}`,
  };
}

export function getConnectorExtensionContract(connectorKey: string): ConnectorExtensionContract | null {
  const definition = getConnectorDefinition(connectorKey);
  if (!definition) return null;
  const connectorCapabilities = listCapabilityDefinitions().filter((capability) => definition.capabilities.includes(capability.key as Capability));
  return {
    connectorKey: definition.connectorKey,
    auth: { type: definition.authType, setupNotes: definition.setupNotes },
    capabilities: connectorCapabilities,
    executorActionTypes: [...definition.writeActions],
    eventTypes: [...definition.eventTypes],
    healthEvaluator: ({ status, connected, executable }) => {
      if (status === "error") return "error";
      if (connected && executable) return "healthy";
      if (connected) return "degraded";
      return "disabled";
    },
  };
}

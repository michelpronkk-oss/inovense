// Connector capability model.
//
// Capabilities are the stable vocabulary operators use to express what they
// need, independent of any specific connector. "Connector X provides
// capability Y" lives in the catalog (registry.ts); "operator A needs
// capability Y" lives in operators/connector-requirements.ts.
//
// Naming convention: any capability ending in `_after_approval` is gated by
// the human approval step and must never execute without it.

import {
  CONNECTOR_CATALOG,
  getConnectorDefinition,
  listConnectors,
  type ConnectorDefinition,
  type ConnectorRiskLevel,
} from "@/lib/connectors/registry";
import type { OperatorKey } from "@/lib/operators/registry";

export type Capability =
  // email
  | "email.read"
  | "email.draft"
  | "email.send_after_approval"
  | "email.thread.read"
  // crm
  | "crm.contacts.read"
  | "crm.contacts.write"
  | "crm.deals.read"
  | "crm.deals.write"
  | "crm.notes.write"
  | "crm.tasks.write"
  // calendar
  | "calendar.events.read"
  | "calendar.events.write_after_approval"
  // team chat
  | "chat.channels.read"
  | "chat.messages.read"
  | "chat.messages.send_after_approval"
  | "chat.alerts.send_after_approval"
  // project management
  | "pm.tasks.read"
  | "pm.tasks.write_after_approval"
  // docs and knowledge
  | "docs.read"
  | "docs.write_after_approval"
  // billing and finance
  | "billing.invoices.read"
  | "billing.payment_status.read"
  // support
  | "support.tickets.read"
  | "support.replies.send_after_approval"
  // website and ecommerce
  | "website.pages.read"
  | "website.pages.write_after_approval"
  // marketing
  | "marketing.posts.write_after_approval"
  // analytics
  | "analytics.read"
  // automation
  | "automation.webhook.receive"
  | "automation.workflow.trigger_after_approval"
  // internal (platform-provided, not a third-party connector)
  | "approved_outputs.read"
  | "approvals.read"
  | "audit_logs.write";

/** Capabilities the platform provides itself, with no external connector. */
export const INTERNAL_CAPABILITIES: Capability[] = [
  "approved_outputs.read",
  "approvals.read",
  "audit_logs.write",
];

export function isInternalCapability(capability: Capability): boolean {
  return INTERNAL_CAPABILITIES.includes(capability);
}

/** Approval-gated capabilities always require the human approval step. */
export function isApprovalGatedCapability(capability: Capability): boolean {
  return capability.endsWith("_after_approval");
}

export function connectorHasCapability(connectorKey: string, capability: Capability): boolean {
  const def = getConnectorDefinition(connectorKey);
  return Boolean(def && def.capabilities.includes(capability));
}

export function getConnectorsForCapability(capability: Capability): ConnectorDefinition[] {
  return listConnectors().filter((def) => def.capabilities.includes(capability));
}

export function getConnectorsForOperator(operatorKey: OperatorKey): ConnectorDefinition[] {
  return listConnectors().filter((def) => def.usedByOperators.includes(operatorKey));
}

export function getAvailableConnectors(): ConnectorDefinition[] {
  return listConnectors().filter((def) => def.status === "available");
}

export function getComingSoonConnectors(): ConnectorDefinition[] {
  return listConnectors().filter((def) => def.status === "coming_soon" || def.status === "planned");
}

export function getConnectorRiskProfile(connectorKey: string): {
  connectorKey: string;
  riskLevel: ConnectorRiskLevel;
  approvalRequiredActions: string[];
  writeActions: string[];
} | null {
  const def = getConnectorDefinition(connectorKey);
  if (!def) return null;
  return {
    connectorKey: def.connectorKey,
    riskLevel: def.riskLevel,
    approvalRequiredActions: def.approvalRequiredActions,
    writeActions: def.writeActions,
  };
}

/** Union of capabilities provided by a set of connector keys. */
export function getCapabilitiesForConnectors(connectorKeys: string[]): Capability[] {
  const set = new Set<Capability>();
  for (const key of connectorKeys) {
    const def = CONNECTOR_CATALOG[key];
    if (!def) continue;
    for (const capability of def.capabilities) set.add(capability);
  }
  return Array.from(set);
}

// Operator -> capability requirements.
//
// Operators declare what capabilities they need in stable capability terms,
// not specific connectors. Readiness is then computed against real workspace
// connector truth (what is actually connected). This keeps operator logic
// connector-agnostic so new connectors light operators up automatically.

import {
  getCapabilitiesForConnectors,
  getConnectorsForCapability,
  type Capability,
} from "@/lib/connectors/capabilities";
import {
  getConnectorDefinition,
  listConnectors,
  type ConnectorDefinition,
} from "@/lib/connectors/registry";
import type { OperatorKey } from "@/lib/operators/registry";

export type OperatorConnectorRequirement = {
  operatorKey: OperatorKey;
  required: Capability[];
  optional: Capability[];
};

export const OPERATOR_CONNECTOR_REQUIREMENTS: Record<OperatorKey, OperatorConnectorRequirement> = {
  revenue: {
    operatorKey: "revenue",
    required: ["email.read", "email.send_after_approval"],
    // crm.contacts.read/crm.deals.read are what Salesforce actually provides
    // today (read-only CRM context - see Salesforce's real capabilities in
    // connectors/registry.ts and "Add Salesforce read-context capability to
    // Revenue Operator"); declared here so the connector-impact model
    // (getConnectorImpactForOperators) and optional-upsell suggestions
    // correctly recognize Salesforce as a real Revenue enhancement, not an
    // untracked connector.
    optional: ["crm.contacts.write", "crm.deals.write", "crm.contacts.read", "crm.deals.read", "calendar.events.read"],
  },
  client_flow: {
    operatorKey: "client_flow",
    // Client Flow prepares approval-gated replies, so it needs the same
    // read+send email capability pair Revenue needs (see readiness.ts's
    // client_flow branch, which resolves a specific Gmail/Microsoft 365
    // connector via this exact capability pair) - not read-only access.
    required: ["email.read", "email.send_after_approval"],
    optional: ["docs.read", "pm.tasks.write_after_approval", "chat.messages.send_after_approval"],
  },
  operations: {
    operatorKey: "operations",
    // Operations reads Trello boards directly and cannot run at all without
    // one connected (see readiness.ts's operations branch and
    // scanOperationsSignals()), so pm.tasks.read is a real requirement here,
    // matching OPERATOR_REGISTRY's requiredConnectors: ["trello"].
    required: ["pm.tasks.read"],
    optional: ["chat.channels.read", "calendar.events.read", "automation.workflow.trigger_after_approval"],
  },
  finance_billing: {
    operatorKey: "finance_billing",
    required: ["billing.payment_status.read"],
    optional: ["billing.invoices.read", "email.send_after_approval"],
  },
  support: {
    operatorKey: "support",
    required: ["support.tickets.read", "support.replies.send_after_approval"],
    optional: ["email.read"],
  },
  marketing: {
    operatorKey: "marketing",
    required: [],
    optional: ["docs.read", "marketing.posts.write_after_approval", "analytics.read"],
  },
  website_conversion: {
    operatorKey: "website_conversion",
    required: ["website.pages.read"],
    optional: ["website.pages.write_after_approval", "analytics.read"],
  },
  knowledge_memory: {
    operatorKey: "knowledge_memory",
    required: ["docs.read"],
    optional: ["crm.contacts.read", "approved_outputs.read"],
  },
  approval_risk: {
    operatorKey: "approval_risk",
    required: ["approvals.read", "audit_logs.write"],
    optional: [],
  },
  automation_architect: {
    operatorKey: "automation_architect",
    required: ["automation.webhook.receive"],
    optional: ["automation.workflow.trigger_after_approval"],
  },
  // Operators without a dedicated capability spec yet. Optional-only so they
  // never report missing required capabilities.
  seo_implementation: {
    operatorKey: "seo_implementation",
    required: [],
    optional: ["website.pages.read", "analytics.read", "docs.read"],
  },
  proposal_quote: {
    operatorKey: "proposal_quote",
    required: [],
    optional: ["email.send_after_approval", "crm.deals.write", "docs.read"],
  },
  review_proof: {
    operatorKey: "review_proof",
    required: [],
    optional: ["docs.read"],
  },
  hiring_team: {
    operatorKey: "hiring_team",
    required: [],
    optional: ["email.send_after_approval", "calendar.events.read"],
  },
  social_community: {
    operatorKey: "social_community",
    required: [],
    optional: ["marketing.posts.write_after_approval"],
  },
};

export type WorkspaceConnectorTruthInput =
  | string[]
  | Array<{ connectorKey: string; connected?: boolean; status?: string }>;

function normalizeConnectedKeys(truth: WorkspaceConnectorTruthInput): string[] {
  if (truth.length === 0) return [];
  if (typeof truth[0] === "string") {
    return (truth as string[]).filter(Boolean);
  }
  return (truth as Array<{ connectorKey: string; connected?: boolean; status?: string }>)
    .filter((row) => row.connected === true || row.status === "connected" || row.status === "healthy")
    .map((row) => row.connectorKey)
    .filter(Boolean);
}

export function getOperatorConnectorRequirement(operatorKey: string): OperatorConnectorRequirement | null {
  return (OPERATOR_CONNECTOR_REQUIREMENTS as Record<string, OperatorConnectorRequirement>)[operatorKey] ?? null;
}

export type OperatorConnectorReadiness = {
  operatorKey: OperatorKey;
  ready: boolean;
  connectedCapabilities: Capability[];
  requiredCapabilities: Capability[];
  satisfiedRequired: Capability[];
  missingRequired: Capability[];
  satisfiedOptional: Capability[];
  missingOptional: Capability[];
};

export function getOperatorConnectorReadiness(
  operatorKey: string,
  workspaceConnectorTruth: WorkspaceConnectorTruthInput,
): OperatorConnectorReadiness | null {
  const requirement = getOperatorConnectorRequirement(operatorKey);
  if (!requirement) return null;

  const connectedKeys = normalizeConnectedKeys(workspaceConnectorTruth);
  const connectedCapabilities = getCapabilitiesForConnectors(connectedKeys);
  const has = (capability: Capability) => connectedCapabilities.includes(capability);

  const satisfiedRequired = requirement.required.filter(has);
  const missingRequired = requirement.required.filter((capability) => !has(capability));
  const satisfiedOptional = requirement.optional.filter(has);
  const missingOptional = requirement.optional.filter((capability) => !has(capability));

  return {
    operatorKey: requirement.operatorKey,
    ready: missingRequired.length === 0,
    connectedCapabilities,
    requiredCapabilities: requirement.required,
    satisfiedRequired,
    missingRequired,
    satisfiedOptional,
    missingOptional,
  };
}

export function getMissingRequiredCapabilities(
  operatorKey: string,
  workspaceConnectorTruth: WorkspaceConnectorTruthInput,
): Capability[] {
  return getOperatorConnectorReadiness(operatorKey, workspaceConnectorTruth)?.missingRequired ?? [];
}

/**
 * Connectors that would add still-missing optional capabilities for an operator
 * and are not already connected. Ranked available -> coming_soon -> planned so
 * upsell never points at a connector that cannot be built yet over one that can.
 */
export function getOptionalUpsellConnectors(
  operatorKey: string,
  workspaceConnectorTruth: WorkspaceConnectorTruthInput,
): ConnectorDefinition[] {
  const readiness = getOperatorConnectorReadiness(operatorKey, workspaceConnectorTruth);
  if (!readiness) return [];

  const stillMissing = new Set<Capability>([...readiness.missingRequired, ...readiness.missingOptional]);
  if (stillMissing.size === 0) return [];

  const connectedKeys = new Set(normalizeConnectedKeys(workspaceConnectorTruth));
  const statusRank: Record<ConnectorDefinition["status"], number> = {
    available: 0,
    coming_soon: 1,
    planned: 2,
    internal_only: 3,
  };

  return listConnectors()
    .filter((def) => !connectedKeys.has(def.connectorKey))
    .filter((def) => def.capabilities.some((capability) => stillMissing.has(capability)))
    .sort((a, b) => statusRank[a.status] - statusRank[b.status]);
}

/** Convenience: connector definitions an operator can use, from the catalog. */
export function getOperatorCatalogConnectors(operatorKey: OperatorKey): ConnectorDefinition[] {
  return listConnectors().filter((def) => def.usedByOperators.includes(operatorKey));
}

export type RequiredCapabilityHealth = "ok" | "unhealthy" | "missing";

/**
 * Health of an operator's hard-required capability set against real
 * connector truth. Distinguishes "never connected" (-> needs_setup) from
 * "was connected, now unhealthy" (-> needs_attention), which a plain
 * connected/not-connected boolean cannot - see
 * src/lib/operators/product-state.ts, the one shared consumer of this
 * distinction. `truth` only needs connectorKey + a coarse status string, so
 * any real SafeConnectorTruth[]-shaped array works without a direct import
 * of that (Supabase-backed) module here.
 */
export function getRequiredConnectorHealth(
  operatorKey: string,
  truth: Array<{ connectorKey: string; status: string }>,
): RequiredCapabilityHealth {
  const requirement = getOperatorConnectorRequirement(operatorKey);
  if (!requirement || requirement.required.length === 0) return "ok";

  let anyHealthy = false;
  let anyUnhealthy = false;
  for (const capability of requirement.required) {
    for (const def of getConnectorsForCapability(capability)) {
      const row = truth.find((item) => item.connectorKey === def.connectorKey);
      if (!row) continue;
      if (row.status === "connected" || row.status === "healthy") anyHealthy = true;
      else if (row.status === "reconnect_required" || row.status === "error") anyUnhealthy = true;
    }
  }
  if (anyHealthy) return "ok";
  if (anyUnhealthy) return "unhealthy";
  return "missing";
}

export type OperatorConnectorImpact = {
  operatorKey: OperatorKey;
  impact: "hard_requirement" | "enhancement";
  lostCapabilities: Capability[];
  stillAvailableCapabilities: Capability[];
};

/**
 * What happens to each real operator if `connectorKey` becomes unhealthy,
 * given the workspace's other currently-connected connectors (the connector
 * in question must not already be included in
 * `connectedConnectorKeysWithoutThisConnector`). Diffs each operator's
 * declared capability readiness with vs without this one connector added
 * back as healthy - a direct extension of getOperatorConnectorReadiness
 * above, not a new parallel capability system. Used by the connectors page
 * (degraded connector rows), operator detail pages (the "degraded" section),
 * and dashboard State F.
 */
export function getConnectorImpactForOperators(input: {
  connectorKey: string;
  connectedConnectorKeysWithoutThisConnector: string[];
}): OperatorConnectorImpact[] {
  const currentKeys = input.connectedConnectorKeysWithoutThisConnector.filter((key) => key !== input.connectorKey);
  const healthyKeys = [...currentKeys, input.connectorKey];

  const impacts: OperatorConnectorImpact[] = [];
  for (const operatorKey of Object.keys(OPERATOR_CONNECTOR_REQUIREMENTS) as OperatorKey[]) {
    const requirement = OPERATOR_CONNECTOR_REQUIREMENTS[operatorKey];
    const withThisHealthy = getOperatorConnectorReadiness(operatorKey, healthyKeys);
    const withoutThisConnector = getOperatorConnectorReadiness(operatorKey, currentKeys);
    if (!withThisHealthy || !withoutThisConnector) continue;

    const lostRequired = withThisHealthy.satisfiedRequired.filter((capability) => !withoutThisConnector.satisfiedRequired.includes(capability));
    const lostOptional = withThisHealthy.satisfiedOptional.filter((capability) => !withoutThisConnector.satisfiedOptional.includes(capability));
    if (lostRequired.length === 0 && lostOptional.length === 0) continue;

    const stillAvailable = [...requirement.required, ...requirement.optional].filter((capability) => withoutThisConnector.connectedCapabilities.includes(capability));

    impacts.push({
      operatorKey,
      impact: lostRequired.length > 0 ? "hard_requirement" : "enhancement",
      lostCapabilities: [...lostRequired, ...lostOptional],
      stillAvailableCapabilities: stillAvailable,
    });
  }
  return impacts;
}

/**
 * Convenience wrapper: takes the workspace's real connected-connector keys
 * (or truth rows) directly and excludes `connectorKey` itself before diffing
 * - the shape the connectors page / dashboard already have on hand.
 */
export function getWorkspaceConnectorImpact(input: {
  connectorKey: string;
  workspaceConnectorTruth: WorkspaceConnectorTruthInput;
}): { connectorKey: string; affectedOperators: OperatorConnectorImpact[] } {
  const connectedKeys = normalizeConnectedKeys(input.workspaceConnectorTruth).filter((key) => key !== input.connectorKey);
  return {
    connectorKey: input.connectorKey,
    affectedOperators: getConnectorImpactForOperators({
      connectorKey: input.connectorKey,
      connectedConnectorKeysWithoutThisConnector: connectedKeys,
    }),
  };
}

// Re-export for callers that only import this module.
export { getConnectorDefinition };

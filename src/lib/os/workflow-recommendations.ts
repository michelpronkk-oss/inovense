import type { OSState, PolicyActionType, Workflow } from "@/lib/os/types";

export type WorkflowRiskLevel = "low" | "medium" | "high";
export type SuggestionInstallStatus = "available" | "missing_connectors" | "missing_agent" | "installed";

export interface SuggestedWorkflow {
  id: string;
  title: string;
  description: string;
  category: string;
  whySuggested: string;
  estimatedImpact: string;
  confidence: number;
  requiredConnectors: string[];
  requiredAgents: string[];
  requiredPolicies: PolicyActionType[];
  riskLevel: WorkflowRiskLevel;
  suggestedTrigger: string;
  previewSteps: string[];
  installStatus: SuggestionInstallStatus;
  missingRequirements: string[];
  installActionLabel: string;
  expectedOutput: string;
  requiresApprovalFor: string[];
}

const INSTALL_LOOKUP: Record<string, string> = {
  "suggest-inbound-revenue-operator": "Inbound Revenue Operator",
  "suggest-weekly-operating-digest": "Weekly operating digest",
  "suggest-revenue-event-monitor": "Revenue event monitor",
  "suggest-company-memory-sync": "Company memory sync",
  "suggest-approval-routing-rules": "Approval routing rules",
  "suggest-content-brief-pipeline": "Content brief pipeline",
  "suggest-meeting-scheduling-assistant": "Meeting scheduling assistant",
};

function hasAnyConnected(state: OSState, ids: string[]): boolean {
  return ids.some((id) => state.connectors.some((c) => c.id === id && c.isConnected));
}

function hasAgent(state: OSState, name: string): boolean {
  return state.agents.some((a) => a.name === name && a.status !== "paused");
}

function hasPolicyAction(state: OSState, action: PolicyActionType): boolean {
  return state.policies.some((p) => p.actionType === action && p.enabled && p.active);
}

function workflowInstalled(state: OSState, suggestionId: string): boolean {
  const title = INSTALL_LOOKUP[suggestionId]?.toLowerCase();
  if (!title) return false;
  return state.workflows.some((w) => w.name.toLowerCase().includes(title));
}

function finalizeSuggestion(
  state: OSState,
  base: Omit<SuggestedWorkflow, "installStatus" | "missingRequirements" | "installActionLabel">
): SuggestedWorkflow {
  const missingConnectors = base.requiredConnectors
    .filter((id) => !state.connectors.some((c) => c.id === id && c.isConnected))
    .map((id) => `connector:${id}`);
  const missingAgents = base.requiredAgents
    .filter((name) => !hasAgent(state, name))
    .map((name) => `agent:${name}`);
  const missingPolicies = base.requiredPolicies
    .filter((action) => !hasPolicyAction(state, action))
    .map((action) => `policy:${action}`);
  const missingRequirements = [...missingConnectors, ...missingAgents, ...missingPolicies];

  let installStatus: SuggestionInstallStatus = "available";
  let installActionLabel = "Install workflow";
  if (workflowInstalled(state, base.id)) {
    installStatus = "installed";
    installActionLabel = "Installed";
  } else if (missingConnectors.length > 0) {
    installStatus = "missing_connectors";
    installActionLabel = "Connect missing tools";
  } else if (missingAgents.length > 0) {
    installStatus = "missing_agent";
    installActionLabel = "Deploy required operator";
  } else if (missingPolicies.length > 0) {
    installStatus = "available";
    installActionLabel = "Install workflow";
  }

  return { ...base, installStatus, missingRequirements, installActionLabel };
}

export function getSuggestedWorkflows(state: OSState): SuggestedWorkflow[] {
  const suggestions: SuggestedWorkflow[] = [];
  const pendingApprovals = state.approvals.filter((a) => a.status === "pending").length;
  const hasOperationalLogs = state.logs.length > 4 || state.agentRuns.length > 0;

  if (
    hasAnyConnected(state, ["gmail", "microsoft"])
    && hasAnyConnected(state, ["hubspot", "salesforce", "pipedrive", "airtable"])
  ) {
    suggestions.push(finalizeSuggestion(state, {
      id: "suggest-inbound-revenue-operator",
      title: "Inbound Revenue Operator",
      description: "Qualify inbound leads, draft personalized follow-up, route approval, then update CRM and summary channels.",
      category: "Revenue",
      whySuggested: "You have email and CRM connected. The execution layer can qualify inbound leads, draft replies and update CRM after approval.",
      estimatedImpact: "Reduce first-response time by 45 percent and increase qualified follow-up coverage.",
      confidence: 96,
      requiredConnectors: ["gmail", "hubspot"],
      requiredAgents: ["Revenue Operator"],
      requiredPolicies: ["email.send", "crm.updateRecord"],
      riskLevel: "medium",
      suggestedTrigger: "Inbound form submission or new CRM lead",
      previewSteps: ["Read inbound lead", "Score fit", "Draft follow-up", "Request approval", "Send email and update CRM", "Post summary"],
      expectedOutput: "Qualified lead record, approved outbound message, CRM stage update, internal summary.",
      requiresApprovalFor: ["send_external_email"],
    }));
  }

  if (hasAnyConnected(state, ["slack", "teams"]) && hasOperationalLogs) {
    suggestions.push(finalizeSuggestion(state, {
      id: "suggest-weekly-operating-digest",
      title: "Weekly operating digest",
      description: "Aggregate execution logs, approvals and run outcomes into a leadership digest.",
      category: "Operations",
      whySuggested: "Your workspace has operational activity and connected communication channels.",
      estimatedImpact: "Improve leadership visibility and reduce manual reporting time by 6 hours weekly.",
      confidence: 90,
      requiredConnectors: ["slack"],
      requiredAgents: ["Operations Operator"],
      requiredPolicies: ["memory.write"],
      riskLevel: "low",
      suggestedTrigger: "Weekly schedule - Monday 9:00",
      previewSteps: ["Collect weekly logs", "Group by operator and workflow", "Highlight approval bottlenecks", "Draft digest", "Publish summary"],
      expectedOutput: "Weekly operational digest with workload, approvals, and outcomes.",
      requiresApprovalFor: [],
    }));
  }

  if (hasAnyConnected(state, ["stripe", "shopify"])) {
    suggestions.push(finalizeSuggestion(state, {
      id: "suggest-revenue-event-monitor",
      title: "Revenue event monitor",
      description: "Monitor payment and customer events, route important events to CRM and internal channels.",
      category: "Revenue operations",
      whySuggested: "Payment and customer events can trigger CRM updates, customer follow-ups and internal alerts.",
      estimatedImpact: "Faster response to revenue events and better customer lifecycle tracking.",
      confidence: 88,
      requiredConnectors: ["stripe"],
      requiredAgents: ["Operations Operator", "Revenue Operator"],
      requiredPolicies: ["crm.updateRecord"],
      riskLevel: "medium",
      suggestedTrigger: "Payment succeeded, subscription change, chargeback event",
      previewSteps: ["Ingest payment event", "Classify impact", "Update CRM context", "Route alert to operations", "Write memory"],
      expectedOutput: "Event classification, CRM enrichment, and internal alert.",
      requiresApprovalFor: [],
    }));
  }

  if (hasAnyConnected(state, ["notion", "google-drive", "confluence"])) {
    suggestions.push(finalizeSuggestion(state, {
      id: "suggest-company-memory-sync",
      title: "Company memory sync",
      description: "Index selected docs and notes into memory so operators execute with current company context.",
      category: "Memory",
      whySuggested: "Connected knowledge systems can feed the memory layer and improve execution quality.",
      estimatedImpact: "Reduce context gaps across operators and improve consistency of outputs.",
      confidence: 93,
      requiredConnectors: ["notion"],
      requiredAgents: ["Operations Operator"],
      requiredPolicies: ["memory.write"],
      riskLevel: "low",
      suggestedTrigger: "Document updates and scheduled nightly sync",
      previewSteps: ["Read updated documents", "Extract structured context", "Deduplicate memory entries", "Write memory updates", "Log sync summary"],
      expectedOutput: "Updated memory entries scoped to active operators.",
      requiresApprovalFor: [],
    }));
  }

  if (pendingApprovals >= 2) {
    suggestions.push(finalizeSuggestion(state, {
      id: "suggest-approval-routing-rules",
      title: "Approval routing rules",
      description: "Route approval requests by category, risk and operator ownership to reduce queue delays.",
      category: "Governance",
      whySuggested: "Pending approvals are building up. Routing can send each action to the right reviewer automatically.",
      estimatedImpact: "Reduce approval wait time and lower blocked execution runs.",
      confidence: 84,
      requiredConnectors: [],
      requiredAgents: ["Operations Operator"],
      requiredPolicies: ["email.send"],
      riskLevel: "medium",
      suggestedTrigger: "Approval item created",
      previewSteps: ["Inspect approval type", "Match routing policy", "Assign reviewer group", "Escalate stale requests", "Log routing action"],
      expectedOutput: "Faster approval handling with assigned owners.",
      requiresApprovalFor: [],
    }));
  }

  if (hasAgent(state, "Marketing Operator") && hasAnyConnected(state, ["notion", "google-drive"])) {
    suggestions.push(finalizeSuggestion(state, {
      id: "suggest-content-brief-pipeline",
      title: "Content brief pipeline",
      description: "Turn research notes and memory context into campaign and SEO-ready briefs for review.",
      category: "Marketing",
      whySuggested: "Marketing operator and content systems are connected, enabling repeatable brief generation.",
      estimatedImpact: "Increase campaign throughput and keep content aligned with brand boundaries.",
      confidence: 89,
      requiredConnectors: ["google-drive"],
      requiredAgents: ["Marketing Operator"],
      requiredPolicies: ["memory.write"],
      riskLevel: "low",
      suggestedTrigger: "Keyword batch upload or content request",
      previewSteps: ["Read source notes", "Generate structured brief", "Apply brand memory constraints", "Request review", "Store final brief"],
      expectedOutput: "Review-ready content brief with references and constraints.",
      requiresApprovalFor: [],
    }));
  }

  if (hasAnyConnected(state, ["google-calendar", "outlook-calendar", "calendly"]) && hasAgent(state, "Revenue Operator")) {
    suggestions.push(finalizeSuggestion(state, {
      id: "suggest-meeting-scheduling-assistant",
      title: "Meeting scheduling assistant",
      description: "After lead qualification, propose meeting windows and route external invites for approval.",
      category: "Revenue",
      whySuggested: "Calendar systems and Revenue Operator are active, so qualified leads can be moved to meetings quickly.",
      estimatedImpact: "Shorten time-to-meeting for qualified leads and reduce back-and-forth scheduling.",
      confidence: 87,
      requiredConnectors: ["google-calendar"],
      requiredAgents: ["Revenue Operator"],
      requiredPolicies: ["email.send"],
      riskLevel: "high",
      suggestedTrigger: "Lead reaches qualified stage",
      previewSteps: ["Read lead status", "Check calendar availability", "Draft meeting options", "Request approval for external invite", "Send confirmed schedule"],
      expectedOutput: "Approved meeting proposal and calendar hold.",
      requiresApprovalFor: ["calendar_external_invite", "send_external_email"],
    }));
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

export function installWorkflowFromSuggestion(state: OSState, suggestion: SuggestedWorkflow): Workflow {
  const fallbackAgent = state.agents.find((a) => a.status !== "paused") ?? state.agents[0];
  const requiredAgent = state.agents.find((a) => suggestion.requiredAgents.includes(a.name) && a.status !== "paused");
  const selectedAgent = requiredAgent ?? fallbackAgent;
  return {
    id: `wf-${Date.now()}`,
    name: suggestion.title,
    trigger: suggestion.suggestedTrigger,
    agentId: selectedAgent?.id ?? "agent-unknown",
    agentColor: selectedAgent?.color ?? "#4DE8E1",
    agentLabel: selectedAgent?.mark ?? "OS",
    status: "active",
    totalRuns: 0,
    successRate: 0,
    avgDuration: "-",
    lastRun: "never",
    createdAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Real-workspace workflow suggestions (Pass 2B).
//
// getSuggestedWorkflows(state) above operates on the older mock/demo OSState
// shape and references several aspirational connectors that are not real in
// this product (pipedrive, airtable, teams, notion, google-drive, confluence,
// stripe, shopify, google-calendar, outlook-calendar, calendly - only gmail,
// microsoft, hubspot, salesforce, trello, and slack are real). It is left
// completely untouched here - src/app/app/workflows/page.tsx and
// src/lib/os/app-provider.tsx keep calling it exactly as before.
//
// This section is a real-data ADAPTER, not a second recommendation engine:
// it defines its own small, real-connector-only suggestion pool (no
// installStatus/missingRequirements/confidence-sorting machinery - that
// mock-engine complexity is not needed here since every entry is either
// fully real-eligible or hidden) and filters it against real, healthy
// connector truth and real per-operator readiness. The first entry
// intentionally mirrors "suggest-inbound-revenue-operator"'s title/intent
// above (same real Gmail/Microsoft 365 + CRM -> Revenue follow-up combo) -
// duplicated as a real-connector-only definition here rather than having
// getSuggestedWorkflows() reference this module, because touching that
// function's body at all was explicitly out of scope for this pass.

export type RealOperatorKey = "revenue" | "client_flow" | "operations";

type RealWorkflowSuggestionDefinition = {
  id: string;
  title: string;
  description: string;
  operatorKey: RealOperatorKey;
  /** Each inner array is an OR-group (any one connector satisfies it); all groups must be satisfied (AND) for the suggestion to be real-eligible. */
  requiredConnectorGroups: string[][];
};

const REAL_WORKFLOW_SUGGESTION_DEFINITIONS: RealWorkflowSuggestionDefinition[] = [
  {
    id: "real-inbound-revenue-followup",
    title: "Inbound Revenue Operator",
    description: "Qualify inbound leads from your inbox, draft a personalized follow-up, and update CRM context after approval.",
    operatorKey: "revenue",
    requiredConnectorGroups: [["gmail", "microsoft"], ["hubspot", "salesforce"]],
  },
  {
    id: "real-operations-trello-slack-escalation",
    title: "Operations escalation workflow",
    description: "When a Trello card stalls or is overdue, prepare an internal Slack alert for the team to review.",
    operatorKey: "operations",
    requiredConnectorGroups: [["trello"], ["slack"]],
  },
  {
    id: "real-client-flow-email-trello-delivery",
    title: "Client Flow delivery task workflow",
    description: "When a client email needs follow-through, prepare a Trello delivery task alongside the approval-gated reply draft.",
    operatorKey: "client_flow",
    requiredConnectorGroups: [["gmail", "microsoft"], ["trello"]],
  },
];

export type RealWorkflowSuggestion = {
  id: string;
  title: string;
  description: string;
  operatorKey: RealOperatorKey;
  /** The specific real, currently-healthy connectors that satisfy this suggestion in this workspace. */
  requiredConnectors: string[];
  /** Always routes to the operator's detail page to inspect/configure/activate - this adapter never executes a workflow directly. */
  href: string;
};

function operatorHref(operatorKey: RealOperatorKey): string {
  return `/agents/${operatorKey === "client_flow" ? "client-flow" : operatorKey}`;
}

/**
 * Real-data adapter over REAL_WORKFLOW_SUGGESTION_DEFINITIONS: only surfaces
 * a suggestion when every required-connector group has at least one real,
 * currently-healthy connector AND the suggestion's operator has real,
 * healthy readiness for its hard capability requirements (never
 * state.agents/mock status, never a connector that exists only in the
 * catalog as coming_soon/planned).
 */
export function getRealWorkspaceSuggestedWorkflows(input: {
  /** Real, currently-healthy/connected connector keys only (e.g. from getConnectorTruth, status "connected"/"healthy"). */
  connectedConnectorKeys: string[];
  /** Real per-operator readiness - true only when that operator's hard capability requirements are actually met right now. */
  operatorReadiness: Array<{ operatorKey: string; ready: boolean }>;
}): RealWorkflowSuggestion[] {
  const connected = new Set(input.connectedConnectorKeys);
  const readyOperators = new Set(input.operatorReadiness.filter((item) => item.ready).map((item) => item.operatorKey));

  const suggestions: RealWorkflowSuggestion[] = [];
  for (const def of REAL_WORKFLOW_SUGGESTION_DEFINITIONS) {
    if (!readyOperators.has(def.operatorKey)) continue;

    const matchedConnectors: string[] = [];
    const allGroupsSatisfied = def.requiredConnectorGroups.every((group) => {
      const satisfied = group.filter((connectorKey) => connected.has(connectorKey));
      matchedConnectors.push(...satisfied);
      return satisfied.length > 0;
    });
    if (!allGroupsSatisfied) continue;

    suggestions.push({
      id: def.id,
      title: def.title,
      description: def.description,
      operatorKey: def.operatorKey,
      requiredConnectors: matchedConnectors,
      href: operatorHref(def.operatorKey),
    });
  }
  return suggestions;
}

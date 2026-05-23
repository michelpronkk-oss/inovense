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
    hasAnyConnected(state, ["gmail", "outlook"])
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

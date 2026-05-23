import type { OSState, PolicyActionType } from "@/lib/os/types";

export type ToolRiskLevel = "low" | "medium" | "high";

export interface ToolRuntimeContext {
  state: OSState;
  agentId: string;
  runId: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  connectorId?: string;
  description: string;
  inputSchema: Record<string, string>;
  outputShape: Record<string, string>;
  riskLevel: ToolRiskLevel;
  requiresApproval: boolean;
  blocked: boolean;
  actionType: PolicyActionType;
  requiredReadScopes?: string[];
  requiredWriteScopes?: string[];
  handler: (input: Record<string, unknown>, ctx: ToolRuntimeContext) => { output: string; payload?: Record<string, unknown> };
}

function simpleOutput(output: string, payload: Record<string, unknown> = {}): { output: string; payload?: Record<string, unknown> } {
  return { output, payload };
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: "gmail.createDraft",
    name: "Gmail Create Draft",
    connectorId: "gmail",
    description: "Create outbound draft email for review.",
    inputSchema: { email: "string", company: "string", summary: "string" },
    outputShape: { draftId: "string", message: "string" },
    riskLevel: "medium",
    requiresApproval: false,
    blocked: false,
    actionType: "email.createDraft",
    requiredWriteScopes: ["drafts.write"],
    handler: (input) => simpleOutput(`Draft created for ${String(input.company ?? "lead")}`, { draftId: `draft-${Date.now()}` }),
  },
  {
    id: "gmail.sendEmailMock",
    name: "Gmail Send Email (Mock)",
    connectorId: "gmail",
    description: "Mock send approved outbound email.",
    inputSchema: { email: "string", draftId: "string" },
    outputShape: { sent: "boolean", messageId: "string" },
    riskLevel: "high",
    requiresApproval: true,
    blocked: false,
    actionType: "email.send",
    requiredWriteScopes: ["messages.send"],
    handler: (input) => simpleOutput(`Mock email sent to ${String(input.email ?? "recipient")}`, { sent: true, messageId: `msg-${Date.now()}` }),
  },
  {
    id: "outlook.createDraft",
    name: "Outlook Create Draft",
    connectorId: "outlook",
    description: "Create outbound draft in Outlook.",
    inputSchema: { email: "string", company: "string" },
    outputShape: { draftId: "string" },
    riskLevel: "medium",
    requiresApproval: false,
    blocked: false,
    actionType: "email.createDraft",
    handler: (input) => simpleOutput(`Outlook draft created for ${String(input.company ?? "lead")}`, { draftId: `odraft-${Date.now()}` }),
  },
  {
    id: "hubspot.createLead",
    name: "HubSpot Create Lead",
    connectorId: "hubspot",
    description: "Create a lead in HubSpot.",
    inputSchema: { email: "string", company: "string", score: "number" },
    outputShape: { leadId: "string" },
    riskLevel: "medium",
    requiresApproval: false,
    blocked: false,
    actionType: "crm.createRecord",
    requiredWriteScopes: ["contacts.write"],
    handler: (input) => simpleOutput(`Created HubSpot lead for ${String(input.company ?? "lead")}`, { leadId: `hs-${Date.now()}` }),
  },
  {
    id: "hubspot.updateLead",
    name: "HubSpot Update Lead",
    connectorId: "hubspot",
    description: "Update lead status in HubSpot.",
    inputSchema: { leadId: "string", stage: "string" },
    outputShape: { updated: "boolean" },
    riskLevel: "medium",
    requiresApproval: false,
    blocked: false,
    actionType: "crm.updateRecord",
    requiredWriteScopes: ["deals.write"],
    handler: (input) => simpleOutput(`Updated HubSpot lead stage to ${String(input.stage ?? "qualified")}`, { updated: true }),
  },
  {
    id: "salesforce.updateLead",
    name: "Salesforce Update Lead",
    connectorId: "salesforce",
    description: "Update Salesforce lead fields.",
    inputSchema: { leadId: "string", stage: "string" },
    outputShape: { updated: "boolean" },
    riskLevel: "medium",
    requiresApproval: false,
    blocked: false,
    actionType: "crm.updateRecord",
    requiredWriteScopes: ["leads.write"],
    handler: () => simpleOutput("Updated Salesforce lead", { updated: true }),
  },
  {
    id: "slack.postMessage",
    name: "Slack Post Message",
    connectorId: "slack",
    description: "Post internal summary to Slack channel.",
    inputSchema: { channel: "string", summary: "string" },
    outputShape: { posted: "boolean" },
    riskLevel: "low",
    requiresApproval: false,
    blocked: false,
    actionType: "slack.postMessage",
    requiredWriteScopes: ["messages.write"],
    handler: (input) => simpleOutput(`Posted summary to ${String(input.channel ?? "#ops")}`, { posted: true }),
  },
  {
    id: "calendar.proposeMeetingTimes",
    name: "Calendar Propose Meeting Times",
    connectorId: "google-calendar",
    description: "Propose available meeting times.",
    inputSchema: { attendee: "string", external: "boolean" },
    outputShape: { slots: "string[]" },
    riskLevel: "high",
    requiresApproval: true,
    blocked: false,
    actionType: "calendar.createExternalInvite",
    requiredWriteScopes: ["events.write"],
    handler: () => simpleOutput("Proposed 3 meeting slots", { slots: ["Tue 10:00", "Wed 14:00", "Thu 09:30"] }),
  },
  {
    id: "notion.searchDocs",
    name: "Notion Search Docs",
    connectorId: "notion",
    description: "Search docs for context.",
    inputSchema: { query: "string" },
    outputShape: { hits: "string[]" },
    riskLevel: "low",
    requiresApproval: false,
    blocked: false,
    actionType: "memory.read",
    requiredReadScopes: ["pages.read"],
    handler: (input) => simpleOutput(`Found context for ${String(input.query ?? "query")}`, { hits: ["Brand voice guide", "Service catalogue"] }),
  },
  {
    id: "drive.searchDocs",
    name: "Drive Search Docs",
    connectorId: "google-drive",
    description: "Search Drive documents.",
    inputSchema: { query: "string" },
    outputShape: { hits: "string[]" },
    riskLevel: "low",
    requiresApproval: false,
    blocked: false,
    actionType: "file.read",
    requiredReadScopes: ["files.read"],
    handler: (input) => simpleOutput(`Drive search completed for ${String(input.query ?? "query")}`, { hits: ["Q3 brief", "Revenue report"] }),
  },
  {
    id: "memory.search",
    name: "Memory Search",
    description: "Search company memory layer.",
    inputSchema: { query: "string" },
    outputShape: { hits: "string[]" },
    riskLevel: "low",
    requiresApproval: false,
    blocked: false,
    actionType: "memory.read",
    handler: (input, ctx) => {
      const query = String(input.query ?? "").toLowerCase();
      const hits = ctx.state.memory
        .filter((entry) => entry.label.toLowerCase().includes(query) || entry.summary.toLowerCase().includes(query))
        .slice(0, 3)
        .map((entry) => entry.label);
      return simpleOutput(`Memory search returned ${hits.length} entries`, { hits });
    },
  },
  {
    id: "memory.write",
    name: "Memory Write",
    description: "Write an entry to company memory.",
    inputSchema: { label: "string", summary: "string", content: "string" },
    outputShape: { written: "boolean" },
    riskLevel: "low",
    requiresApproval: false,
    blocked: false,
    actionType: "internal.approvalCreate",
    handler: (input) => simpleOutput(`Memory staged for ${String(input.label ?? "entry")}`, { written: true }),
  },
  {
    id: "approvals.create",
    name: "Approvals Create",
    description: "Create approval request for risky action.",
    inputSchema: { title: "string", body: "string", action: "string" },
    outputShape: { approvalId: "string" },
    riskLevel: "high",
    requiresApproval: false,
    blocked: false,
    actionType: "internal.logWrite",
    handler: () => simpleOutput("Approval request created"),
  },
  {
    id: "logs.write",
    name: "Logs Write",
    description: "Write execution log entry.",
    inputSchema: { event: "string", message: "string" },
    outputShape: { logged: "boolean" },
    riskLevel: "low",
    requiresApproval: false,
    blocked: false,
    actionType: "memory.write",
    handler: () => simpleOutput("Execution log written", { logged: true }),
  },
];

export function getToolDefinition(toolId: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === toolId);
}

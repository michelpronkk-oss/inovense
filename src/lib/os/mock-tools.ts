import type { Connector, PolicyEffect } from "@/lib/os/types";

export interface ToolContext {
  connectors: Connector[];
}

export interface ToolExecutionInput {
  tool: string;
  connectorId: string;
  readScopes?: string[];
  writeScopes?: string[];
  payload: Record<string, string | number | boolean>;
}

export interface ToolExecutionResult {
  ok: boolean;
  blockedReason?: string;
  output: string;
}

function findConnector(connectors: Connector[], id: string): Connector | undefined {
  return connectors.find((c) => c.id === id);
}

function hasScopes(connector: Connector, readScopes: string[], writeScopes: string[]): boolean {
  return readScopes.every((s) => connector.readScopes.includes(s))
    && writeScopes.every((s) => connector.writeScopes.includes(s));
}

export function executeMockTool(
  ctx: ToolContext,
  input: ToolExecutionInput,
  policyEffect: PolicyEffect
): ToolExecutionResult {
  const connector = findConnector(ctx.connectors, input.connectorId);
  if (!connector || !connector.isConnected) return { ok: false, blockedReason: `Missing connector: ${input.connectorId}`, output: "blocked" };
  if (policyEffect === "block") return { ok: false, blockedReason: "Blocked by policy", output: "blocked" };

  const readScopes = input.readScopes ?? [];
  const writeScopes = input.writeScopes ?? [];
  if (!hasScopes(connector, readScopes, writeScopes)) return { ok: false, blockedReason: `Scope mismatch on ${connector.name}`, output: "blocked" };

  switch (input.tool) {
    case "gmail.createDraft":
      return { ok: true, output: `Drafted follow-up email for ${String(input.payload.company ?? "lead")}` };
    case "gmail.sendApprovedEmailMock":
      return { ok: true, output: `Mock-sent approved email to ${String(input.payload.email ?? "recipient")}` };
    case "microsoft.createDraft":
      return { ok: true, output: "Drafted Microsoft 365 response" };
    case "hubspot.createLead":
      return { ok: true, output: `Created HubSpot lead ${String(input.payload.leadId ?? "new")}` };
    case "hubspot.updateLead":
      return { ok: true, output: `Updated HubSpot lead stage to ${String(input.payload.stage ?? "qualified")}` };
    case "salesforce.updateLead":
      return { ok: true, output: "Updated Salesforce lead" };
    case "slack.postSummary":
      return { ok: true, output: `Posted summary to ${String(input.payload.channel ?? "#ops")}` };
    case "calendar.proposeMeetingTimes":
      return { ok: true, output: "Proposed three meeting slots" };
    case "notion.readWorkspaceContext":
      return { ok: true, output: "Read workspace context from Notion" };
    case "drive.readDocumentSummary":
      return { ok: true, output: "Read document summary from Drive" };
    case "stripe.readCustomerEvents":
      return { ok: true, output: "Read customer payment events" };
    case "shopify.readOrderEvents":
      return { ok: true, output: "Read order events from Shopify" };
    case "memory.search":
      return { ok: true, output: "Memory context fetched" };
    case "memory.write":
      return { ok: true, output: "Memory entry written" };
    case "logs.write":
      return { ok: true, output: "Execution log written" };
    default:
      return { ok: false, blockedReason: `Unknown tool: ${input.tool}`, output: "blocked" };
  }
}


import type { SignalDecision } from "@/lib/signals/engine";
import type { SignalEvent } from "@/lib/signals/types";

export type WorkforceOperator = "revenue" | "client_flow" | "operations" | "support";

export type WorkforceOwnershipDecision = {
  primaryOperator: WorkforceOperator | null;
  supportingOperators: WorkforceOperator[];
  externalCommunicationOwner: WorkforceOperator | null;
  reason: string;
  customerFacing: boolean;
};

const OPERATORS: WorkforceOperator[] = ["revenue", "client_flow", "operations", "support"];
const SUPPORT_TERMS = ["support", "help", "not working", "broken", "bug", "error", "issue", "problem", "outage"];
const DELIVERY_TERMS = ["delivery", "implementation", "rollout", "timeline", "blocked", "blocker", "delayed", "dependency", "stuck", "handoff"];
const COMMERCIAL_TERMS = ["pricing", "quote", "proposal", "renewal", "expansion", "purchase", "buy", "contract"];

function textOf(input: { subject?: string | null; snippet?: string | null; metadata?: Record<string, unknown> }): string {
  return [input.subject, input.snippet, input.metadata?.status, input.metadata?.priority]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function hasTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function validOperator(value: unknown): value is WorkforceOperator {
  return typeof value === "string" && OPERATORS.includes(value as WorkforceOperator);
}

/**
 * Deterministic ownership arbitration for one business problem. This is a
 * pure contract used by signal routing and provider-specific adapters. It
 * chooses exactly one primary owner and keeps supporting work non-competing.
 */
export function arbitrateOwnership(input: {
  sourceType: string;
  connectorKey?: string | null;
  provider?: string | null;
  category?: string | null;
  primaryIntent?: string | null;
  primaryOperator?: string | null;
  supportingOperators?: string[];
  subject?: string | null;
  snippet?: string | null;
  metadata?: Record<string, unknown>;
}): WorkforceOwnershipDecision {
  const text = textOf(input);
  const connector = String(input.connectorKey ?? input.provider ?? "").toLowerCase();
  const supportSource = ["support_ticket", "support_conversation"].includes(input.sourceType) || ["zendesk", "intercom"].includes(connector);
  const category = String(input.category ?? "");

  let primary: WorkforceOperator | null = validOperator(input.primaryOperator) ? input.primaryOperator : validOperator(input.metadata?.primaryOperator) ? input.metadata?.primaryOperator : null;
  if (!primary && supportSource) primary = "support";
  if (!primary && (connector === "hubspot" || input.sourceType === "crm") && hasTerm(text, COMMERCIAL_TERMS)) primary = "revenue";
  if (!primary && ["sales_opportunity", "commercial_intent"].includes(category)) primary = "revenue";
  if (!primary && ["blocked_work", "overdue_work", "stalled_work", "delivery_risk", "internal_coordination", "delivery_risk"].includes(category)) primary = "operations";
  if (!primary && ["customer_request", "follow_up_needed", "unanswered_message", "escalation"].includes(category)) primary = "client_flow";

  const supporting = new Set<WorkforceOperator>();
  for (const value of input.supportingOperators ?? []) if (validOperator(value) && value !== primary) supporting.add(value);
  if (primary === "support" && hasTerm(text, DELIVERY_TERMS)) supporting.add("operations");
  if (primary === "support" && hasTerm(text, ["onboarding", "customer continuity", "change request", "delivery"])) supporting.add("client_flow");
  if (primary === "revenue" && hasTerm(text, DELIVERY_TERMS)) supporting.add("operations");
  if (primary === "client_flow" && hasTerm(text, SUPPORT_TERMS)) supporting.add("support");
  if (primary === "client_flow" && hasTerm(text, DELIVERY_TERMS)) supporting.add("operations");
  if (primary === "operations" && hasTerm(text, SUPPORT_TERMS)) supporting.add("support");
  supporting.delete(primary as WorkforceOperator);

  const customerFacing = primary === "revenue" || primary === "client_flow" || primary === "support";
  return {
    primaryOperator: primary,
    supportingOperators: Array.from(supporting),
    externalCommunicationOwner: customerFacing ? primary : null,
    customerFacing,
    reason: primary ? `${primary} owns the primary business objective; supporting operators are limited to linked internal work.` : "No deterministic primary owner was established.",
  };
}

export function arbitrateSignalOwnership(event: SignalEvent, decision: SignalDecision): WorkforceOwnershipDecision {
  return arbitrateOwnership({
    sourceType: event.sourceType,
    connectorKey: event.connectorKey,
    provider: event.provider,
    category: decision.category,
    primaryIntent: decision.primaryIntent,
    primaryOperator: decision.primaryOperator,
    supportingOperators: decision.supportingOperators,
    subject: event.subject,
    snippet: event.snippet,
    metadata: event.metadata,
  });
}

export function externalCommunicationAllowed(input: { operator: WorkforceOperator; primaryOperator: WorkforceOperator; explicitTransfer?: boolean }): boolean {
  return input.explicitTransfer === true && input.operator === input.primaryOperator;
}

export function workforceState(input: { status: string; dependencyState?: string | null; hasPendingApproval?: boolean; hasExternalResponsePending?: boolean }): "owned" | "supported" | "waiting_on_approval" | "waiting_on_supporting_work" | "waiting_on_external_response" | "ready_to_continue" | "needs_attention" | "completed" {
  if (["completed", "cancelled"].includes(input.status)) return "completed";
  if (["blocked", "failed"].includes(input.status)) return "needs_attention";
  if (input.hasPendingApproval || ["awaiting_approval", "partially_approved"].includes(input.status)) return "waiting_on_approval";
  if (input.dependencyState === "waiting_on_supporting_work") return "waiting_on_supporting_work";
  if (input.hasExternalResponsePending || input.dependencyState === "waiting_on_external_response") return "waiting_on_external_response";
  if (input.dependencyState === "ready_to_continue") return "ready_to_continue";
  return input.dependencyState === "supported" ? "supported" : "owned";
}

import type { PolicyBusinessContext, PolicyContextReliability, PolicyContextValue } from "@/lib/policies/types";
import type { ClientFlowSignalType } from "@/lib/operators/client-flow/scan";

export type ClientFlowPreparationState =
  | "ready_to_respond"
  | "needs_internal_update"
  | "needs_operations_work"
  | "needs_support_context"
  | "needs_commercial_context"
  | "needs_clarification"
  | "needs_escalation";

export type ClientFlowContext = {
  provider: string;
  customer: { email: string | null; name: string | null; company: string | null; tier: string | null; lifecycleStage: string | null; region: string | null; reliability: PolicyContextReliability };
  communication: { messageId: string; threadId: string | null; subject: string | null; request: string | null; matchedSignals: string[]; unansweredHours: number | null; knownCommitment: string | null; requestedChange: string | null; urgency: string | null; reliability: PolicyContextReliability };
  delivery: { projectId: string | null; projectName: string | null; taskId: string | null; owner: string | null; dueAt: string | null; milestone: string | null; blocker: string | null; dependency: string | null; handoffStatus: string | null; reliability: PolicyContextReliability };
  support: { ticketId: string | null; openIssue: string | null; escalationState: string | null; impact: string | null; reliability: PolicyContextReliability };
  commercial: { revenueWorkflowId: string | null; accountContext: string | null; reliability: PolicyContextReliability };
  preparationState: ClientFlowPreparationState;
  priority: number;
  priorityReasons: string[];
  supportingOperators: string[];
  businessContext: PolicyBusinessContext;
};

function bounded(value: string | null | undefined, max: number): string | null {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function value<T>(input: T | null | undefined, reliability: PolicyContextReliability): PolicyContextValue<T> {
  return { value: input ?? null, reliability: input == null ? "missing" : reliability, observedAt: new Date().toISOString() };
}

function hoursSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 3_600_000) : null;
}

export function buildClientFlowContext(input: {
  provider: string;
  messageId: string;
  threadId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  company?: string | null;
  subject?: string | null;
  request?: string | null;
  receivedAt?: string | null;
  signalType: ClientFlowSignalType | string;
  matchedSignals?: string[];
  confidence?: "low" | "medium" | "high";
  supportingOperators?: string[];
  delivery?: { projectId?: string | null; projectName?: string | null; taskId?: string | null; owner?: string | null; dueAt?: string | null; milestone?: string | null; blocker?: string | null; dependency?: string | null; handoffStatus?: string | null };
  support?: { ticketId?: string | null; openIssue?: string | null; escalationState?: string | null; impact?: string | null };
  commercial?: { revenueWorkflowId?: string | null; accountContext?: string | null };
}): ClientFlowContext {
  const subject = bounded(input.subject, 240);
  const request = bounded(input.request, 900);
  const text = `${subject ?? ""} ${request ?? ""}`;
  const unansweredHours = hoursSince(input.receivedAt);
  const supportingOperators = Array.from(new Set((input.supportingOperators ?? []).filter((key) => ["operations", "support", "revenue"].includes(key))));
  const reasons = [...(input.matchedSignals ?? [])].slice(0, 8).map((item) => item.replace(/_/g, " "));
  let priority = input.confidence === "high" ? 58 : 45;
  if (["change_request", "timeline_question", "awaiting_delivery"].includes(input.signalType)) { priority += 12; reasons.push("A delivery or timing request needs a clear next step."); }
  if (["issue_report"].includes(input.signalType)) { priority += 15; reasons.push("The customer reported an issue affecting continuity."); }
  if (unansweredHours != null && unansweredHours >= 48) { priority += 15; reasons.push(`The request has been unanswered for ${Math.floor(unansweredHours / 24)} day(s).`); }
  else if (unansweredHours != null && unansweredHours >= 24) { priority += 8; reasons.push("The request has been unanswered for more than a day."); }
  if (input.delivery?.dueAt) reasons.push("A delivery deadline is available for review.");
  if (input.delivery?.owner == null && ["change_request", "timeline_question", "awaiting_delivery"].includes(input.signalType)) { priority += 8; reasons.push("No delivery owner is verified."); }
  if (supportingOperators.includes("operations")) { priority += 8; reasons.push("Internal delivery work is required before continuity is restored."); }
  if (supportingOperators.includes("support")) { priority += 8; reasons.push("Support context may affect the customer situation."); }
  if (supportingOperators.includes("revenue")) { priority += 5; reasons.push("Commercial context is present and remains Revenue-owned."); }
  priority = Math.min(100, priority);

  const needsClarification = !request && !subject;
  const preparationState: ClientFlowPreparationState = priority >= 85 || /\b(urgent|critical|escalat|unacceptable|missed deadline)\b/i.test(text)
    ? "needs_escalation"
    : supportingOperators.includes("operations") && !input.delivery?.projectId && !input.delivery?.taskId
      ? "needs_internal_update"
      : supportingOperators.includes("operations")
        ? "needs_operations_work"
        : supportingOperators.includes("support")
          ? "needs_support_context"
          : supportingOperators.includes("revenue")
            ? "needs_commercial_context"
            : needsClarification
              ? "needs_clarification"
              : "ready_to_respond";

  const customerReliability: PolicyContextReliability = input.customerEmail || input.customerName ? "observed" : "missing";
  const deliveryReliability: PolicyContextReliability = input.delivery && Object.values(input.delivery).some((item) => item != null) ? "observed" : "missing";
  const supportReliability: PolicyContextReliability = input.support && Object.values(input.support).some((item) => item != null) ? "observed" : "missing";
  const commercialReliability: PolicyContextReliability = input.commercial && Object.values(input.commercial).some((item) => item != null) ? "observed" : "missing";
  const businessContext: PolicyBusinessContext = {
    customer: { tier: value<string>(null, "missing"), region: value<string>(null, "missing") },
    project: { due_date_impact: value(input.delivery?.dueAt ? "deadline_present" : null, input.delivery?.dueAt ? "observed" : "missing") },
    task: { type: value(input.signalType, "derived"), external_collaborator: value(supportingOperators.includes("operations") ? true : null, supportingOperators.includes("operations") ? "derived" : "missing") },
  };

  return {
    provider: bounded(input.provider, 60) ?? "unknown",
    customer: { email: bounded(input.customerEmail, 254), name: bounded(input.customerName, 160), company: bounded(input.company, 160), tier: null, lifecycleStage: null, region: null, reliability: customerReliability },
    communication: { messageId: bounded(input.messageId, 180) ?? "unknown", threadId: bounded(input.threadId, 180), subject, request, matchedSignals: (input.matchedSignals ?? []).slice(0, 10), unansweredHours, knownCommitment: null, requestedChange: input.signalType === "change_request" ? request : null, urgency: input.signalType === "timeline_question" || input.signalType === "awaiting_delivery" ? "delivery_timing" : null, reliability: subject || request ? "observed" : "missing" },
    delivery: { projectId: bounded(input.delivery?.projectId, 180), projectName: bounded(input.delivery?.projectName, 180), taskId: bounded(input.delivery?.taskId, 180), owner: bounded(input.delivery?.owner, 160), dueAt: bounded(input.delivery?.dueAt, 40), milestone: bounded(input.delivery?.milestone, 160), blocker: bounded(input.delivery?.blocker, 240), dependency: bounded(input.delivery?.dependency, 240), handoffStatus: bounded(input.delivery?.handoffStatus, 80), reliability: deliveryReliability },
    support: { ticketId: bounded(input.support?.ticketId, 180), openIssue: bounded(input.support?.openIssue, 240), escalationState: bounded(input.support?.escalationState, 100), impact: bounded(input.support?.impact, 240), reliability: supportReliability },
    commercial: { revenueWorkflowId: bounded(input.commercial?.revenueWorkflowId, 180), accountContext: bounded(input.commercial?.accountContext, 240), reliability: commercialReliability },
    preparationState,
    priority,
    priorityReasons: Array.from(new Set(reasons)).slice(0, 12),
    supportingOperators,
    businessContext,
  };
}

export function publicClientFlowContext(context: ClientFlowContext): Record<string, unknown> {
  return { ...context, contextReliability: { customer: context.customer.reliability, communication: context.communication.reliability, delivery: context.delivery.reliability, support: context.support.reliability, commercial: context.commercial.reliability } };
}

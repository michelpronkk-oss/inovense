import type { PolicyBusinessContext, PolicyContextValue } from "@/lib/policies/types";

export type SupportPreparationState =
  | "ready_to_answer"
  | "needs_clarification"
  | "needs_internal_investigation"
  | "needs_escalation";

export type SupportContext = {
  provider: string;
  sourceId: string;
  threadId: string | null;
  customer: {
    email: string | null;
    name: string | null;
    company: string | null;
    tier: string | null;
  };
  ticket: {
    status: string | null;
    priority: string | null;
    subject: string | null;
    request: string | null;
    ageHours: number | null;
    reopened: boolean;
  };
  service: {
    slaPriority: string | null;
    escalation: boolean;
    priorReplies: string[];
    productArea: string | null;
  };
  priority: number;
  priorityReasons: string[];
  preparationState: SupportPreparationState;
  businessContext: PolicyBusinessContext;
};

type SupportContextInput = {
  provider: string;
  sourceId: string;
  threadId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  company?: string | null;
  customerTier?: string | null;
  status?: string | null;
  providerPriority?: string | null;
  subject?: string | null;
  request?: string | null;
  ageHours?: number | null;
  reopened?: boolean;
  slaPriority?: string | null;
  priorReplies?: string[];
  productArea?: string | null;
};

function safeText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return result || null;
}

function value<T>(input: T | null, reliability: PolicyContextValue<T>["reliability"]): PolicyContextValue<T> {
  return { value: input, reliability, observedAt: new Date().toISOString() };
}

function priorityFor(input: SupportContextInput, text: string): { score: number; reasons: string[] } {
  let score = 20;
  const reasons: string[] = [];
  const providerPriority = input.providerPriority?.toLowerCase() ?? "";
  if (providerPriority === "urgent") { score += 45; reasons.push("provider_priority:urgent"); }
  else if (providerPriority === "high") { score += 30; reasons.push("provider_priority:high"); }
  else if (providerPriority === "normal") { score += 10; reasons.push("provider_priority:normal"); }
  if (input.slaPriority) { score += 20; reasons.push("sla_priority:present"); }
  if (input.reopened) { score += 20; reasons.push("ticket_reopened"); }
  if ((input.ageHours ?? 0) >= 72) { score += 25; reasons.push("ticket_age:72h+"); }
  else if ((input.ageHours ?? 0) >= 48) { score += 15; reasons.push("ticket_age:48h+"); }
  else if ((input.ageHours ?? 0) >= 24) { score += 8; reasons.push("ticket_age:24h+"); }
  if (/\b(urgent|critical|escalat|outage|unacceptable|cannot proceed|can't proceed)\b/i.test(text)) { score += 25; reasons.push("explicit_escalation"); }
  if (/\b(blocked|stuck|broken|error|bug|not working|incident)\b/i.test(text)) { score += 15; reasons.push("technical_or_blocker_signal"); }
  if (/\b(still waiting|again|third time|no response|not resolved)\b/i.test(text)) { score += 15; reasons.push("repeated_unresolved_issue"); }
  return { score: Math.min(100, score), reasons };
}

function preparationFor(input: SupportContextInput, text: string, priority: number): SupportPreparationState {
  if (priority >= 85 || /\b(urgent|critical|escalat|outage|unacceptable)\b/i.test(text)) return "needs_escalation";
  if (/\b(blocked|stuck|broken|error|bug|not working|incident|failure)\b/i.test(text)) return "needs_internal_investigation";
  if (!input.subject && !input.request) return "needs_clarification";
  if (/\b(how|what|when|can you|could you|please|help|question)\b/i.test(text)) return "needs_clarification";
  return "ready_to_answer";
}

function businessContextFor(input: SupportContextInput): PolicyBusinessContext {
  const observedSla = safeText(input.slaPriority, 40);
  const tier = safeText(input.customerTier, 40);
  return {
    customer: {
      ...(tier ? { tier: value(tier, "verified") } : { tier: value<string>(null, "missing") }),
      ...(observedSla ? { sla_priority: value(observedSla, "observed") } : { sla_priority: value<string>(null, "missing") }),
    },
    workspace: { risk_level: value<string>(null, "missing") },
  };
}

export function buildSupportContext(input: SupportContextInput): SupportContext {
  const subject = safeText(input.subject, 240);
  const request = safeText(input.request, 600);
  const text = `${subject ?? ""} ${request ?? ""}`.trim();
  const priority = priorityFor(input, text);
  return {
    provider: safeText(input.provider, 40) ?? "unknown",
    sourceId: safeText(input.sourceId, 180) ?? "unknown",
    threadId: safeText(input.threadId, 180),
    customer: {
      email: safeText(input.customerEmail, 254),
      name: safeText(input.customerName, 160),
      company: safeText(input.company, 160),
      tier: safeText(input.customerTier, 40),
    },
    ticket: {
      status: safeText(input.status, 40),
      priority: safeText(input.providerPriority, 40),
      subject,
      request,
      ageHours: typeof input.ageHours === "number" && Number.isFinite(input.ageHours) ? Math.max(0, Math.round(input.ageHours * 10) / 10) : null,
      reopened: input.reopened === true,
    },
    service: {
      slaPriority: safeText(input.slaPriority, 40),
      escalation: /\b(urgent|critical|escalat|outage|unacceptable)\b/i.test(text),
      priorReplies: (input.priorReplies ?? []).map((item) => safeText(item, 180)).filter((item): item is string => Boolean(item)).slice(-5),
      productArea: safeText(input.productArea, 120),
    },
    priority: priority.score,
    priorityReasons: priority.reasons,
    preparationState: preparationFor(input, text, priority.score),
    businessContext: businessContextFor(input),
  };
}

export function prepareSupportReply(context: SupportContext): { subject: string; body: string } {
  const subject = context.ticket.subject ? `Re: ${context.ticket.subject.replace(/^((re|fw|fwd):\s*)+/i, "")}` : "Re: Your support request";
  const reference = context.ticket.subject ? ` about “${context.ticket.subject.slice(0, 120)}”` : "";
  let body: string;
  if (context.preparationState === "needs_escalation") {
    body = `Thanks for reaching out${reference}. We’ve marked this for priority review and are coordinating the next owner. We’ll follow up with the next update.`;
  } else if (context.preparationState === "needs_internal_investigation") {
    body = `Thanks for reporting this${reference}. We’re reviewing it with the relevant team. If you can share the exact error message, affected workspace, or time of occurrence, that will help us narrow the investigation.`;
  } else if (context.preparationState === "needs_clarification") {
    body = `Thanks for reaching out${reference}. To make sure we route this correctly, could you share what you expected to happen, what happened instead, and when you first noticed it?`;
  } else {
    body = `Thanks for reaching out${reference}. We’ve received your request and are reviewing the next step. We’ll follow up with an update shortly.`;
  }
  return { subject, body };
}

export function publicSupportContext(context: SupportContext): Record<string, unknown> {
  return {
    provider: context.provider,
    sourceId: context.sourceId,
    threadId: context.threadId,
    customer: context.customer,
    ticket: context.ticket,
    service: context.service,
    priority: context.priority,
    priorityReasons: context.priorityReasons,
    preparationState: context.preparationState,
    contextReliability: {
      customer: context.customer.email || context.customer.company ? "observed" : "missing",
      ticket: context.ticket.subject || context.ticket.request ? "observed" : "missing",
      service: context.service.slaPriority || context.service.priorReplies.length ? "observed" : "missing",
    },
  };
}

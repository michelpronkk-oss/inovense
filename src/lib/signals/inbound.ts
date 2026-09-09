import type { SignalEvent } from "@/lib/signals/types";

export type InboundIntent =
  | "COMMERCIAL_INTENT"
  | "PRICING_REQUEST"
  | "PROPOSAL_REQUEST"
  | "CUSTOMER_QUESTION"
  | "SUPPORT_REQUEST"
  | "COMPLAINT"
  | "ESCALATION"
  | "CHANGE_REQUEST"
  | "DELIVERY_STATUS_REQUEST"
  | "INTERNAL_BLOCKER"
  | "DELIVERY_RISK"
  | "HANDOFF_ISSUE"
  | "VENDOR_ISSUE"
  | "FYI"
  | "AUTOMATED_NOTIFICATION"
  | "NEWSLETTER"
  | "SPAM"
  | "UNKNOWN";

export type InboundActionability = "OBSERVE" | "RECOMMEND" | "WORKFLOW_CANDIDATE" | "IGNORE";
export type InboundSenderKind = "human" | "automated" | "newsletter" | "unknown";
export type InboundOperatorKey = "revenue" | "client_flow" | "operations" | "support";

/** The live routing registry. Future operators can subscribe to intents here without changing provider intake. */
export const INBOUND_OPERATOR_INTENTS: Record<InboundOperatorKey, readonly InboundIntent[]> = {
  revenue: ["COMMERCIAL_INTENT", "PRICING_REQUEST", "PROPOSAL_REQUEST"],
  client_flow: ["CUSTOMER_QUESTION", "COMPLAINT", "ESCALATION", "CHANGE_REQUEST", "DELIVERY_STATUS_REQUEST"],
  operations: ["INTERNAL_BLOCKER", "DELIVERY_RISK", "HANDOFF_ISSUE", "VENDOR_ISSUE"],
  support: ["SUPPORT_REQUEST", "CUSTOMER_QUESTION", "COMPLAINT", "ESCALATION"],
};

export type InboundCommunicationEvent = {
  provider: string;
  workspaceId: string;
  messageId: string;
  threadId: string | null;
  receivedAt: string | null;
  sender: { email: string | null; name: string | null; kind: InboundSenderKind };
  recipients: string[];
  subject: string;
  safeText: string;
  direction: "inbound";
  channelType: "email";
  providerReferences: { messageId: string; threadId: string | null };
  replyContext: { isReply: boolean; messageCount: number; priorResponseAt: string | null; unresolved: boolean };
};

export type InboundClassification = {
  primaryIntent: InboundIntent;
  secondaryIntents: InboundIntent[];
  confidence: "low" | "medium" | "high";
  actionability: InboundActionability;
  customerFacing: boolean;
  commercialSignal: boolean;
  supportSignal: boolean;
  operationsSignal: boolean;
  primaryOperator: InboundOperatorKey | null;
  supportingOperators: InboundOperatorKey[];
  priority: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  evidenceRefs: string[];
};

const NOISE_PATTERNS: Array<[InboundIntent, RegExp]> = [
  ["NEWSLETTER", /\b(newsletter|digest|unsubscribe|view in browser|marketing preferences)\b/i],
  ["SPAM", /\b(casino|crypto giveaway|claim your prize|viagra|work from home)\b/i],
  ["AUTOMATED_NOTIFICATION", /\b(password reset|verification code|security alert|receipt|invoice paid|automated notification|do not reply|no-reply|noreply)\b/i],
];

const TERMS: Record<Exclude<InboundIntent, "NEWSLETTER" | "SPAM" | "AUTOMATED_NOTIFICATION" | "UNKNOWN" | "FYI">, string[]> = {
  PRICING_REQUEST: ["pricing", "price", "cost", "how much", "additional seats", "quote"],
  PROPOSAL_REQUEST: ["proposal", "scope", "statement of work", "sow", "send a proposal"],
  COMMERCIAL_INTENT: ["buy", "purchase", "upgrade", "expansion", "additional users", "additional seats", "interested in"],
  COMPLAINT: ["complaint", "unacceptable", "disappointed", "frustrated", "unhappy", "not satisfied"],
  ESCALATION: ["escalate", "escalation", "third time", "urgent", "critical", "still waiting", "cannot proceed", "can't proceed"],
  CHANGE_REQUEST: ["change request", "please change", "revise", "revision", "amend", "adjust", "update the", "edit the"],
  DELIVERY_STATUS_REQUEST: ["when will", "when can", "eta", "timeline", "implementation", "rollout", "delivery", "project status", "status update"],
  INTERNAL_BLOCKER: ["internal blocker", "blocked", "blocker", "stuck", "waiting on", "dependency", "on hold"],
  DELIVERY_RISK: ["delivery risk", "delayed", "delay", "slipping", "missed deadline", "at risk"],
  HANDOFF_ISSUE: ["handoff", "hand-off", "no owner", "ownership", "lost in the handoff"],
  VENDOR_ISSUE: ["vendor", "supplier", "third party", "third-party"],
  CUSTOMER_QUESTION: ["can you", "could you", "what is", "what are", "how do", "please clarify", "question"],
  SUPPORT_REQUEST: ["need help", "support", "not working", "broken", "error", "issue", "problem", "help me"],
};

const SUPPORT_CONTEXT_TERMS = [
  "support", "help", "not working", "doesn't work", "does not work", "broken", "bug", "error", "issue", "problem",
  "integration", "feature", "reset", "login", "sign in", "password", "account access", "outage", "service failure",
];

function hasSupportContext(text: string): boolean {
  return SUPPORT_CONTEXT_TERMS.some((term) => text.includes(term));
}

function inboundBounded(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function normalizeInboundEmail(value?: string | null): string | null {
  const match = (value || "").toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return match?.[0] ?? null;
}

function senderKind(email: string | null, metadata: Record<string, unknown>): InboundSenderKind {
  const declared = metadata.senderKind;
  if (declared === "automated" || declared === "newsletter" || declared === "human") return declared;
  if (!email) return "unknown";
  const local = email.split("@")[0] || "";
  if (/^(no-?reply|do-?not-?reply|notification|notifications|alert|alerts|mailer|system|billing)$/i.test(local)) return "automated";
  return "human";
}

function inboundMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" ? inboundBounded(value, 240) : null;
}

export function normalizeInboundCommunication(event: SignalEvent): InboundCommunicationEvent {
  const metadata = event.metadata ?? {};
  const from = normalizeInboundEmail(event.from);
  const recipients = Array.isArray(metadata.recipients)
    ? metadata.recipients.filter((value): value is string => typeof value === "string").map((value) => normalizeInboundEmail(value)).filter((value): value is string => Boolean(value)).slice(0, 20)
    : [];
  const messageId = inboundBounded(event.sourceId || event.id || "unknown", 180);
  const threadId = event.threadId ? inboundBounded(event.threadId, 180) : null;
  const messageCount = typeof metadata.threadMessageCount === "number" && Number.isFinite(metadata.threadMessageCount) ? Math.max(1, Math.min(50, metadata.threadMessageCount)) : 1;
  const unresolved = metadata.threadUnresolved === true || metadata.unresolved === true;
  const safeText = inboundBounded([event.subject, event.snippet].filter(Boolean).join("\n"), 1600);
  return {
    provider: inboundBounded(event.provider || event.connectorKey || event.source || "unknown", 80),
    workspaceId: event.workspaceId,
    messageId,
    threadId,
    receivedAt: event.receivedAt || event.occurredAt || null,
    sender: { email: from, name: inboundMetadataString(metadata, "senderName"), kind: senderKind(from, metadata) },
    recipients,
    subject: inboundBounded(event.subject || "", 240),
    safeText,
    direction: "inbound",
    channelType: "email",
    providerReferences: { messageId, threadId },
    replyContext: {
      isReply: /^(re|fw|fwd)\s*:/i.test(event.subject || ""),
      messageCount,
      priorResponseAt: inboundMetadataString(metadata, "priorResponseAt"),
      unresolved,
    },
  };
}

function inboundMatches(text: string, terms: string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

function choosePrimary(intents: InboundIntent[], text: string): InboundOperatorKey | null {
  const support = intents.some((intent) => intent === "SUPPORT_REQUEST" || ((intent === "CUSTOMER_QUESTION" || intent === "COMPLAINT" || intent === "ESCALATION") && hasSupportContext(text)));
  const client = intents.some((intent) => INBOUND_OPERATOR_INTENTS.client_flow.includes(intent) && intent !== "CUSTOMER_QUESTION");
  const operations = intents.some((intent) => INBOUND_OPERATOR_INTENTS.operations.includes(intent));
  const commercial = intents.some((intent) => INBOUND_OPERATOR_INTENTS.revenue.includes(intent));
  if (support) return "support";
  if (client) return "client_flow";
  if (operations) return "operations";
  if (commercial) return "revenue";
  if (intents.includes("CUSTOMER_QUESTION")) return "client_flow";
  if (/\b(fyi|for your information|scheduled for)\b/i.test(text) && /\b(delivery|deployment|rollout|implementation)\b/i.test(text)) return "operations";
  return null;
}

export function createInboundDedupeKey(input: { event: InboundCommunicationEvent; intent: InboundIntent }): string {
  const anchor = input.event.threadId || input.event.messageId;
  return `${input.event.workspaceId}:${input.event.provider}:${anchor}:${input.intent}`.replace(/[^a-zA-Z0-9:_-]+/g, "-").slice(0, 480);
}

export function classifyInboundCommunication(event: InboundCommunicationEvent): InboundClassification {
  const text = `${event.subject}\n${event.safeText}`.toLowerCase();
  for (const [intent, pattern] of NOISE_PATTERNS) {
    if (pattern.test(text) || (intent === "NEWSLETTER" && event.sender.kind === "newsletter") || (intent === "AUTOMATED_NOTIFICATION" && event.sender.kind === "automated" && !/\b(urgent|blocked|complaint|problem|issue)\b/i.test(text))) {
      return { primaryIntent: intent, secondaryIntents: [], confidence: "high", actionability: "IGNORE", customerFacing: false, commercialSignal: false, supportSignal: false, operationsSignal: false, primaryOperator: null, supportingOperators: [], priority: "LOW", reason: `Suppressed ${intent.toLowerCase().replace(/_/g, " ")} content.`, evidenceRefs: [intent.toLowerCase()] };
    }
  }
  if (/\b(thanks|thank you|all good|that solved it|solved now)\b/i.test(text) && !event.replyContext.unresolved) {
    return { primaryIntent: "FYI", secondaryIntents: [], confidence: "high", actionability: "OBSERVE", customerFacing: true, commercialSignal: false, supportSignal: false, operationsSignal: false, primaryOperator: null, supportingOperators: [], priority: "LOW", reason: "Acknowledgement or resolved reply; no new work is requested.", evidenceRefs: ["resolved_reply"] };
  }
  const intentOrder: InboundIntent[] = ["ESCALATION", "COMPLAINT", "DELIVERY_RISK", "INTERNAL_BLOCKER", "HANDOFF_ISSUE", "VENDOR_ISSUE", "CHANGE_REQUEST", "SUPPORT_REQUEST", "PRICING_REQUEST", "PROPOSAL_REQUEST", "COMMERCIAL_INTENT", "CUSTOMER_QUESTION", "DELIVERY_STATUS_REQUEST"];
  const detected = (Object.entries(TERMS) as Array<[InboundIntent, string[]]>).map(([intent, terms]) => [intent, inboundMatches(text, terms)] as const).filter(([, hits]) => hits.length > 0).sort(([left], [right]) => intentOrder.indexOf(left) - intentOrder.indexOf(right));
  const intents = detected.map(([intent]) => intent);
  const primaryIntent = intents[0] ?? (event.replyContext.messageCount > 1 && event.replyContext.unresolved ? "ESCALATION" : "UNKNOWN");
  const secondaryIntents = intents.slice(1, 4);
  const primaryOperator = choosePrimary([primaryIntent, ...secondaryIntents], text);
  const supportingOperators: InboundOperatorKey[] = [];
  if ((primaryOperator === "client_flow" || primaryOperator === "support") && (intents.some((intent) => ["ESCALATION", "DELIVERY_RISK", "INTERNAL_BLOCKER", "DELIVERY_STATUS_REQUEST"].includes(intent)) || event.replyContext.unresolved)) supportingOperators.push("operations");
  if ((primaryOperator === "client_flow" || primaryOperator === "support") && intents.some((intent) => ["PRICING_REQUEST", "PROPOSAL_REQUEST", "COMMERCIAL_INTENT"].includes(intent))) supportingOperators.push("revenue");
  if (primaryOperator === "support" && (intents.includes("COMPLAINT") || intents.includes("ESCALATION") || hasSupportContext(text))) supportingOperators.push("client_flow");
  const allHits = detected.flatMap(([, hits]) => hits);
  const repeatedFollowUp = event.replyContext.messageCount >= 2 && event.replyContext.unresolved;
  const confidence: InboundClassification["confidence"] = repeatedFollowUp || allHits.length >= 2 ? "high" : allHits.length === 1 ? "medium" : "low";
  const customerFacing = primaryOperator === "client_flow" || primaryOperator === "revenue" || primaryOperator === "support";
  const commercialSignal = intents.some((intent) => ["COMMERCIAL_INTENT", "PRICING_REQUEST", "PROPOSAL_REQUEST"].includes(intent));
  const supportSignal = intents.some((intent) => ["CUSTOMER_QUESTION", "SUPPORT_REQUEST", "COMPLAINT", "ESCALATION"].includes(intent));
  const operationsSignal = intents.some((intent) => ["INTERNAL_BLOCKER", "DELIVERY_RISK", "HANDOFF_ISSUE", "VENDOR_ISSUE"].includes(intent));
  const explicitRequest = /\b(can you|could you|please|need|request|send|provide|when will|how much)\b/i.test(text);
  const actionability: InboundActionability = primaryIntent === "UNKNOWN" ? "OBSERVE" : repeatedFollowUp || ["COMPLAINT", "ESCALATION", "PRICING_REQUEST", "PROPOSAL_REQUEST", "CHANGE_REQUEST", "INTERNAL_BLOCKER", "DELIVERY_RISK", "VENDOR_ISSUE"].includes(primaryIntent) ? "WORKFLOW_CANDIDATE" : explicitRequest ? "RECOMMEND" : "OBSERVE";
  const priority: InboundClassification["priority"] = repeatedFollowUp || ["COMPLAINT", "ESCALATION", "DELIVERY_RISK"].includes(primaryIntent) ? "HIGH" : actionability === "WORKFLOW_CANDIDATE" ? "MEDIUM" : "LOW";
  return {
    primaryIntent,
    secondaryIntents,
    confidence,
    actionability,
    customerFacing,
    commercialSignal,
    supportSignal,
    operationsSignal,
    primaryOperator,
    supportingOperators,
    priority,
    reason: allHits.length > 0 ? `Matched ${allHits.slice(0, 4).join(", ")}.` : "No bounded business-intent rule matched.",
    evidenceRefs: allHits.slice(0, 10).map((hit) => `term:${hit}`),
  };
}

export function classifyInboundSignalEvent(event: SignalEvent): { inbound: InboundCommunicationEvent; classification: InboundClassification; dedupeKey: string } {
  const inbound = normalizeInboundCommunication(event);
  const classification = classifyInboundCommunication(inbound);
  return { inbound, classification, dedupeKey: createInboundDedupeKey({ event: inbound, intent: classification.primaryIntent }) };
}

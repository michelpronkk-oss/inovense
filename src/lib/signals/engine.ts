import type { SignalCandidate, SignalCategory, SignalEvent, SignalPriority } from "@/lib/signals/types";
import { classifyInboundSignalEvent, type InboundActionability, type InboundClassification, type InboundOperatorKey } from "@/lib/signals/inbound";

export const SIGNAL_ENGINE_VERSION = "2026-09-08";

const NOISE_TERMS = ["unsubscribe", "newsletter", "verification code", "password reset", "no-reply", "noreply", "automated message"];
const COMMERCIAL_TERMS = ["pricing", "quote", "proposal", "demo", "budget", "contract", "purchase", "buy", "interested"];
const REQUEST_TERMS = ["can you", "could you", "please", "need help", "any update", "follow up", "following up", "waiting for a reply"];
const ESCALATION_TERMS = ["urgent", "escalate", "escalation", "unacceptable", "outage", "incident", "cannot proceed", "can't proceed"];
const BLOCKER_TERMS = ["blocked", "blocker", "stuck", "waiting on", "on hold", "delayed", "slipping", "missed deadline"];

export type SignalDecision = {
  category: SignalCategory;
  confidence: "low" | "medium" | "high";
  priority: number;
  priorityLevel: SignalPriority;
  urgency: "low" | "medium" | "high" | "critical";
  reasonCodes: string[];
  suppressed: boolean;
  primaryIntent?: string;
  secondaryIntents?: string[];
  actionability?: InboundActionability;
  primaryOperator?: InboundOperatorKey | null;
  supportingOperators?: InboundOperatorKey[];
  customerFacing?: boolean;
  commercialSignal?: boolean;
  supportSignal?: boolean;
  operationsSignal?: boolean;
  evidenceRefs?: string[];
  classificationFailed?: boolean;
};

export type RoutedSignal = {
  event: SignalEvent;
  decision: SignalDecision;
  candidates: SignalCandidate[];
};

function textOf(event: SignalEvent): string {
  return [event.from, event.subject, event.snippet, event.metadata?.status, event.metadata?.priority]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function matches(text: string, terms: string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

function bounded(value: string, max: number): string {
  return value.replace(/[^a-zA-Z0-9:_-]+/g, "-").replace(/-+/g, "-").slice(0, max);
}

function safeMetadata(value: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set(["body", "html", "raw", "token", "authorization", "description", "content"]);
  return Object.entries(value).slice(0, 30).reduce<Record<string, unknown>>((safe, [key, item]) => {
    if (blocked.has(key.toLowerCase())) return safe;
    if (typeof item === "string") safe[key] = item.slice(0, 240);
    else if (typeof item === "number" || typeof item === "boolean" || item === null) safe[key] = item;
    else if (Array.isArray(item)) safe[key] = item.slice(0, 20).filter((entry) => typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean").map((entry) => typeof entry === "string" ? entry.slice(0, 120) : entry);
    return safe;
  }, {});
}

/**
 * Provider deliveries are at-least-once. The meaningful version makes an
 * update a new event without letting a repeated poll recreate it.
 */
export function createSignalDedupeKey(event: SignalEvent): string {
  const connector = event.connectorKey || event.provider || event.source || "unknown";
  const version = event.occurredAt || event.receivedAt || String(event.metadata?.version ?? event.metadata?.updatedAt ?? event.eventType);
  return bounded([event.workspaceId, connector, event.sourceType, event.sourceId, version].join(":"), 480);
}

export function createSignalId(event: SignalEvent): string {
  return `sig_${bounded(createSignalDedupeKey(event), 180)}`;
}

export function normalizeSignalEvent(event: SignalEvent, observedAt = new Date().toISOString()): SignalEvent {
  const occurredAt = event.occurredAt || event.receivedAt || null;
  const source = event.source || event.connectorKey || event.provider || "unknown";
  const safePreview = (event.snippet || event.subject || "").replace(/\s+/g, " ").trim().slice(0, 320) || null;
  const normalized: SignalEvent = {
    ...event,
    id: event.id || createSignalId(event),
    source,
    connectorKey: event.connectorKey || source,
    provider: event.provider || source,
    sourceParentId: event.sourceParentId || event.threadId || null,
    occurredAt,
    observedAt: event.observedAt || observedAt,
    snippet: safePreview,
    dedupeKey: event.dedupeKey || createSignalDedupeKey(event),
    trustLevel: "untrusted_provider_content",
    metadata: safeMetadata(event.metadata ?? {}),
  };
  return normalized;
}

function priorityLevel(priority: number): SignalPriority {
  if (priority >= 85) return "critical";
  if (priority >= 65) return "high";
  if (priority >= 35) return "normal";
  return "low";
}

function urgencyFor(priority: number): SignalDecision["urgency"] {
  if (priority >= 85) return "critical";
  if (priority >= 60) return "high";
  if (priority >= 30) return "medium";
  return "low";
}

/** Pure, explainable, deterministic filtering. Provider content is data only. */
export function classifySignalEvent(event: SignalEvent, now = new Date()): SignalDecision {
  const text = textOf(event);
  const reasonCodes: string[] = [];
  const noise = matches(text, NOISE_TERMS);
  if (noise.length > 0) {
    return { category: "noise", confidence: "high", priority: 0, priorityLevel: "low", urgency: "low", reasonCodes: noise.map((term) => `noise:${term}`), suppressed: true };
  }

  const metadata = event.metadata ?? {};
  const status = typeof metadata.status === "string" ? metadata.status.toLowerCase() : "";
  const providerPriority = typeof metadata.priority === "string" ? metadata.priority.toLowerCase() : "";
  const dueAt = typeof metadata.dueAt === "string" ? Date.parse(metadata.dueAt) : Number.NaN;
  const updatedAt = typeof metadata.updatedAt === "string" ? Date.parse(metadata.updatedAt) : Number.NaN;
  const isResolved = ["solved", "closed", "completed", "done", "cancelled"].includes(status);
  if (isResolved) {
    return { category: "noise", confidence: "high", priority: 0, priorityLevel: "low", urgency: "low", reasonCodes: ["resolved_source"], suppressed: true };
  }

  let category: SignalCategory = "internal_coordination";
  let priority = 20;
  let confidence: SignalDecision["confidence"] = "medium";
  const commercial = matches(text, COMMERCIAL_TERMS);
  const requests = matches(text, REQUEST_TERMS);
  const escalations = matches(text, ESCALATION_TERMS);
  const blockers = matches(text, BLOCKER_TERMS);

  if (Number.isFinite(dueAt) && dueAt < now.getTime()) {
    category = "overdue_work"; priority = 70; reasonCodes.push("due_date_overdue");
  } else if (blockers.length > 0) {
    category = "blocked_work"; priority = blockers.length >= 2 ? 72 : 58; reasonCodes.push(...blockers.map((term) => `blocker:${term}`));
  } else if (["urgent", "high"].includes(providerPriority) || escalations.length > 0) {
    category = event.sourceType === "support_ticket" ? "support_risk" : "escalation"; priority = providerPriority === "urgent" || escalations.length >= 2 ? 90 : 75; reasonCodes.push(providerPriority ? `provider_priority:${providerPriority}` : "escalation_language");
  } else if (event.sourceType === "document" || event.connectorKey === "google_drive") {
    category = "document_change"; priority = 20; reasonCodes.push("document_modified");
  } else if (commercial.length >= 2) {
    category = "sales_opportunity"; priority = 65; confidence = "high"; reasonCodes.push(...commercial.map((term) => `commercial:${term}`));
  } else if (commercial.length === 1) {
    category = "commercial_intent"; priority = 45; reasonCodes.push(`commercial:${commercial[0]}`);
  } else if (requests.length >= 1) {
    category = "customer_request"; priority = 52; reasonCodes.push(...requests.map((term) => `request:${term}`));
  } else if (Number.isFinite(updatedAt) && now.getTime() - updatedAt > 1000 * 60 * 60 * 24 * 14) {
    category = "stalled_work"; priority = 48; reasonCodes.push("stale_update");
  } else if (event.sourceType === "support_ticket") {
    category = "support_risk"; priority = 42; reasonCodes.push("open_support_ticket");
  } else {
    reasonCodes.push("no_actionable_deterministic_rule");
    confidence = "low";
  }
  return { category, confidence, priority, priorityLevel: priorityLevel(priority), urgency: urgencyFor(priority), reasonCodes, suppressed: priority < 30 && category === "internal_coordination" };
}

function candidateFor(event: SignalEvent, decision: SignalDecision, operatorKey: string, inbound?: InboundClassification, inboundDedupeKey?: string): SignalCandidate {
  const dedupeKey = inboundDedupeKey || bounded([event.workspaceId, operatorKey, event.connectorKey || event.source, event.sourceId, decision.category].join(":"), 480);
  return {
    id: `candidate_${bounded(dedupeKey, 170)}`,
    signalId: event.id,
    dedupeKey,
    workspaceId: event.workspaceId,
    operatorKey,
    signalType: decision.category,
    confidence: decision.confidence,
    priority: decision.priority,
    priorityLevel: decision.priorityLevel,
    urgency: decision.urgency,
    reasonCodes: decision.reasonCodes,
    evidence: {
      provider: event.provider || event.source,
      messageId: event.sourceId,
      threadId: event.threadId ?? event.sourceParentId ?? null,
      sourceId: event.sourceId,
      sourceType: event.sourceType,
      sourceParentId: event.sourceParentId ?? null,
      ...(inbound ? {
        primaryIntent: inbound.primaryIntent,
        secondaryIntents: inbound.secondaryIntents,
        reason: inbound.reason,
        evidenceRefs: inbound.evidenceRefs,
        actionability: inbound.actionability,
        supportingOperators: inbound.supportingOperators,
      } : {}),
    },
    recommendedActionTypes: decision.priority >= 65 ? ["review", "prepare_recommendation"] : ["observe"],
    source: event.source,
    sourceId: event.sourceId,
    routeReason: `Central signal routing: ${decision.reasonCodes.join(", ")}.`,
    status: "candidate",
    createdAt: event.observedAt ?? undefined,
    metadata: { category: decision.category, connectorKey: event.connectorKey, trustLevel: event.trustLevel },
    actionability: decision.actionability,
    primaryIntent: decision.primaryIntent,
    supportingOperators: decision.supportingOperators,
  };
}

function categoryForInbound(classification: InboundClassification): SignalCategory {
  if (classification.primaryIntent === "COMPLAINT" || classification.primaryIntent === "ESCALATION") return "escalation";
  if (classification.operationsSignal) {
    if (["DELIVERY_RISK", "INTERNAL_BLOCKER"].includes(classification.primaryIntent)) return "delivery_risk";
    return "internal_coordination";
  }
  if (classification.commercialSignal) return "sales_opportunity";
  if (classification.supportSignal || classification.primaryOperator === "client_flow") return "customer_request";
  return "internal_coordination";
}

function decisionFromInbound(classification: InboundClassification): SignalDecision {
  const category = categoryForInbound(classification);
  const priority = classification.priority === "HIGH" ? 75 : classification.priority === "MEDIUM" ? 45 : 20;
  return {
    category,
    confidence: classification.confidence,
    priority,
    priorityLevel: priorityLevel(priority),
    urgency: urgencyFor(priority),
    reasonCodes: classification.evidenceRefs,
    suppressed: ["IGNORE", "OBSERVE"].includes(classification.actionability) || !classification.primaryOperator,
    primaryIntent: classification.primaryIntent,
    secondaryIntents: classification.secondaryIntents,
    actionability: classification.actionability,
    primaryOperator: classification.primaryOperator,
    supportingOperators: classification.supportingOperators,
    customerFacing: classification.customerFacing,
    commercialSignal: classification.commercialSignal,
    supportSignal: classification.supportSignal,
    operationsSignal: classification.operationsSignal,
    evidenceRefs: classification.evidenceRefs,
  };
}

/** Route only meaningful candidates. This never invokes an operator or action. */
export function routeSignalEvent(input: SignalEvent, now = new Date()): RoutedSignal {
  const event = normalizeSignalEvent(input);
  if (event.sourceType === "email") {
    let inbound: ReturnType<typeof classifyInboundSignalEvent>;
    try {
      inbound = classifyInboundSignalEvent(event);
    } catch {
      return {
        event,
        decision: {
          category: "internal_coordination",
          confidence: "low",
          priority: 0,
          priorityLevel: "low",
          urgency: "low",
          reasonCodes: ["classification_failed"],
          suppressed: true,
          primaryIntent: "UNKNOWN",
          secondaryIntents: [],
          actionability: "OBSERVE",
          primaryOperator: null,
          supportingOperators: [],
          classificationFailed: true,
        },
        candidates: [],
      };
    }
    const decision = decisionFromInbound(inbound.classification);
    if (decision.suppressed || !decision.primaryOperator) return { event, decision, candidates: [] };
    return {
      event,
      decision,
      candidates: [candidateFor(event, decision, decision.primaryOperator, inbound.classification, inbound.dedupeKey)],
    };
  }
  const decision = classifySignalEvent(event, now);
  if (decision.suppressed) return { event, decision, candidates: [] };
  const operatorKeys: string[] = [];
  if (["sales_opportunity", "commercial_intent"].includes(decision.category)) operatorKeys.push("revenue");
  if (["customer_request", "follow_up_needed", "unanswered_message", "escalation"].includes(decision.category)) operatorKeys.push("client_flow");
  if (["stalled_work", "overdue_work", "blocked_work", "delivery_risk", "support_risk", "internal_coordination"].includes(decision.category)) operatorKeys.push("operations");
  // A Drive change is retained as an awareness event, not turned into work by itself.
  return { event, decision, candidates: operatorKeys.map((operatorKey) => candidateFor(event, decision, operatorKey)) };
}

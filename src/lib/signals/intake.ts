import type { SafeGmailMessage } from "@/lib/connectors/gmail";
import type { SignalCandidate, SignalEvent } from "@/lib/signals/types";

const REVENUE_TERMS = [
  "pricing",
  "quote",
  "proposal",
  "demo",
  "interested",
  "availability",
  "can you help",
  "website",
  "automation",
  "ai",
  "follow up",
  "call",
  "meeting",
  "offer",
];

const NOISE_TERMS = [
  "unsubscribe",
  "newsletter",
  "receipt",
  "invoice paid",
  "security alert",
  "verification code",
  "password reset",
  "no-reply",
  "noreply",
];

function normalizeEmail(value?: string | null): string {
  const raw = (value || "").toLowerCase();
  const match = raw.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return match?.[0] ?? raw.trim();
}

function normalizeSubject(value?: string | null): string {
  return (value || "")
    .toLowerCase()
    .replace(/^(\s*(re|fw|fwd)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function stableSignalId(input: { workspaceId: string; source: string; sourceId: string }) {
  return `sig-${input.workspaceId}-${input.source}-${input.sourceId}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
}

export function normalizeEmailToSignalEvent(input: {
  workspaceId: string;
  message: SafeGmailMessage;
  rawRef?: string | null;
  metadata?: Record<string, unknown>;
}): SignalEvent {
  return {
    workspaceId: input.workspaceId,
    source: "gmail",
    sourceType: "email",
    eventType: "email.received",
    sourceId: input.message.id,
    threadId: input.message.threadId ?? null,
    from: normalizeEmail(input.message.fromEmail || input.message.from),
    subject: input.message.subject || null,
    snippet: input.message.snippet || input.message.bodyText?.slice(0, 240) || null,
    receivedAt: input.message.date || input.message.internalDate || null,
    rawRef: input.rawRef ?? null,
    metadata: {
      labelIds: input.message.labelIds,
      ...input.metadata,
    },
  };
}

export function classifySignalCandidateLightweight(event: SignalEvent): SignalCandidate {
  const text = `${event.from ?? ""} ${event.subject ?? ""} ${event.snippet ?? ""}`.toLowerCase();
  const matchedKeywords = REVENUE_TERMS.filter((term) => text.includes(term));
  const noiseMatches = NOISE_TERMS.filter((term) => text.includes(term));
  const normalizedFrom = normalizeEmail(event.from);
  const normalizedSubject = normalizeSubject(event.subject);
  const threadKey = event.threadId ? `revenue:gmail:thread:${event.threadId}` : "";
  const contactSubjectKey = normalizedFrom && normalizedSubject
    ? `revenue:contact_subject:${normalizedFrom}:${normalizedSubject}`
    : "";
  const dedupeKey = event.sourceId
    ? `revenue:gmail:message:${event.sourceId}`
    : threadKey || contactSubjectKey || `revenue:signal:${stableSignalId({ workspaceId: event.workspaceId, source: event.source, sourceId: event.sourceId || "unknown" })}`;
  const isRevenueCandidate = matchedKeywords.length >= 2 && noiseMatches.length === 0;

  return {
    id: stableSignalId({ workspaceId: event.workspaceId, source: event.source, sourceId: event.sourceId || dedupeKey }),
    dedupeKey,
    workspaceId: event.workspaceId,
    operatorKey: "revenue",
    signalType: isRevenueCandidate ? "revenue_opportunity" : "noise_or_low_confidence",
    confidence: isRevenueCandidate ? "high" : matchedKeywords.length > 0 ? "medium" : "low",
    source: event.source,
    sourceId: event.sourceId,
    routeReason: isRevenueCandidate
      ? `Matched revenue intent: ${matchedKeywords.join(", ")}`
      : noiseMatches.length > 0
        ? `Skipped noise: ${noiseMatches.join(", ")}`
        : "No high-confidence revenue intent.",
    status: isRevenueCandidate ? "candidate" : "ignored",
    metadata: {
      sourceType: event.sourceType,
      eventType: event.eventType,
      threadId: event.threadId ?? null,
      from: normalizedFrom,
      subject: event.subject ?? null,
      normalizedSubject,
      matchedKeywords,
      noiseMatches,
      rawRef: event.rawRef ?? null,
      ...event.metadata,
    },
  };
}

export function routeSignalCandidate(candidate: SignalCandidate): SignalCandidate {
  if (candidate.status === "ignored") return candidate;
  if (candidate.operatorKey === "revenue" && candidate.signalType === "revenue_opportunity" && candidate.confidence === "high") {
    return {
      ...candidate,
      status: "routed",
      routeReason: `${candidate.routeReason}. Routed to Revenue Operator.`,
    };
  }
  return {
    ...candidate,
    status: "ignored",
    routeReason: "No eligible operator route for this signal yet.",
  };
}

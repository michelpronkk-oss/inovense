// Microsoft Teams -> Auterim signal normalization and lightweight detection.
//
// Deliberately built on the SAME shape and approach as
// src/lib/signals/intake.ts (SignalEvent -> SignalCandidate, keyword scoring,
// noise suppression, stable dedupe keys). Teams is a new *source* for the
// existing signal-detection architecture, not a new architecture.
//
// Explicitly NOT a classifier of "every Teams message is client work". Most
// channel chatter is deliberately classified as noise: only messages with a
// clear operational blocker or an explicit request/follow-up phrase become
// candidates, and only then at medium/high confidence.

import type { SafeTeamsMessage } from "@/lib/connectors/microsoft-teams";
import type { SignalCandidate, SignalEvent } from "@/lib/signals/types";

/** Operational trouble: something is stuck, blocked, escalating or slipping. */
const OPERATIONS_TERMS = [
  "blocked",
  "blocker",
  "stuck",
  "waiting on",
  "on hold",
  "escalate",
  "escalation",
  "urgent",
  "delayed",
  "slipping",
  "missed deadline",
  "cannot proceed",
  "can't proceed",
  "broken",
  "outage",
  "incident",
];

/** Explicit asks and follow-up needs, i.e. client-flow shaped work. */
const CLIENT_FLOW_TERMS = [
  "can you",
  "could you",
  "please send",
  "please share",
  "follow up",
  "following up",
  "any update",
  "status update",
  "waiting for a reply",
  "needs a response",
  "chase",
  "reminder",
  "deadline",
  "client asked",
  "customer asked",
];

/** Chatter and automation noise that must never become a candidate. */
const TEAMS_NOISE_TERMS = [
  "joined the team",
  "left the team",
  "added to the channel",
  "removed from the channel",
  "renamed the channel",
  "scheduled a meeting",
  "meeting started",
  "meeting ended",
  "recording is available",
  "thanks",
  "thank you",
  "welcome aboard",
  "happy birthday",
  "good morning",
  "lunch",
];

function stableTeamsSignalId(input: { workspaceId: string; sourceId: string }): string {
  return `sig-${input.workspaceId}-microsoft_teams-${input.sourceId}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
}

/**
 * Normalize a safe Teams message into the shared SignalEvent shape.
 *
 * `snippet` is already sanitized, bounded plain text (see toSafeTeamsText):
 * no HTML, no full message body, and never the raw provider payload.
 */
export function normalizeTeamsMessageToSignalEvent(input: {
  workspaceId: string;
  message: SafeTeamsMessage;
  teamName?: string | null;
  channelName?: string | null;
  channelMembershipType?: string | null;
}): SignalEvent {
  return {
    workspaceId: input.workspaceId,
    source: "microsoft_teams",
    sourceType: "team_chat",
    eventType: "teams.message.received",
    sourceId: input.message.messageId,
    threadId: input.message.replyToId ?? null,
    from: input.message.senderName ?? null,
    subject: input.channelName ?? null,
    snippet: input.message.textPreview,
    receivedAt: input.message.occurredAt,
    rawRef: null,
    metadata: {
      teamId: input.message.teamId,
      teamName: input.teamName ?? null,
      channelId: input.message.channelId,
      channelName: input.channelName ?? null,
      channelMembershipType: input.channelMembershipType ?? null,
      webUrl: input.message.webUrl,
      isThreadReply: Boolean(input.message.replyToId),
    },
  };
}

export type TeamsSignalType = "teams_blocker" | "teams_follow_up_request" | "noise_or_low_confidence";

/**
 * Lightweight, deterministic Teams classification.
 *
 * Rules, in order:
 *   1. Any noise phrase -> ignored, always.
 *   2. Two or more operations terms -> operations blocker (high confidence).
 *   3. Two or more client-flow terms -> follow-up request (high confidence).
 *   4. Exactly one matching term -> medium confidence, still ignored, so it
 *      is visible in run logs without creating work.
 *   5. Otherwise -> ignored.
 *
 * Requiring two matches mirrors the existing email intake threshold and keeps
 * ordinary channel conversation out of the operator queue.
 */
export function classifyTeamsSignalCandidate(event: SignalEvent): SignalCandidate {
  const text = `${event.from ?? ""} ${event.subject ?? ""} ${event.snippet ?? ""}`.toLowerCase();
  const noiseMatches = TEAMS_NOISE_TERMS.filter((term) => text.includes(term));
  const operationsMatches = OPERATIONS_TERMS.filter((term) => text.includes(term));
  const clientFlowMatches = CLIENT_FLOW_TERMS.filter((term) => text.includes(term));

  const isBlocker = noiseMatches.length === 0 && operationsMatches.length >= 2;
  const isFollowUp = !isBlocker && noiseMatches.length === 0 && clientFlowMatches.length >= 2;
  const signalType: TeamsSignalType = isBlocker ? "teams_blocker" : isFollowUp ? "teams_follow_up_request" : "noise_or_low_confidence";
  const operatorKey = isBlocker ? "operations" : isFollowUp ? "client_flow" : "operations";
  const matched = isBlocker ? operationsMatches : isFollowUp ? clientFlowMatches : [...operationsMatches, ...clientFlowMatches];

  return {
    id: stableTeamsSignalId({ workspaceId: event.workspaceId, sourceId: event.sourceId }),
    // Provider message id is globally unique per channel, so one Teams
    // message can never create two approvals across repeated scans.
    dedupeKey: `${operatorKey}:microsoft_teams:message:${event.sourceId}`,
    workspaceId: event.workspaceId,
    operatorKey,
    signalType,
    confidence: isBlocker || isFollowUp ? "high" : matched.length > 0 ? "medium" : "low",
    source: "microsoft_teams",
    sourceId: event.sourceId,
    routeReason: isBlocker
      ? `Matched operational blocker language: ${operationsMatches.join(", ")}`
      : isFollowUp
        ? `Matched follow-up request language: ${clientFlowMatches.join(", ")}`
        : noiseMatches.length > 0
          ? `Skipped Teams chatter: ${noiseMatches.join(", ")}`
          : "No high-confidence Teams signal.",
    status: isBlocker || isFollowUp ? "candidate" : "ignored",
    metadata: {
      sourceType: event.sourceType,
      eventType: event.eventType,
      threadId: event.threadId ?? null,
      sender: event.from ?? null,
      matchedKeywords: matched,
      noiseMatches,
      ...event.metadata,
    },
  };
}

export type TeamsSignalSummary = {
  scanned: number;
  blockers: number;
  followUps: number;
  ignored: number;
  candidates: SignalCandidate[];
};

/** Batch helper used by operator scans. Pure - no IO, no provider calls. */
export function detectTeamsSignals(input: {
  workspaceId: string;
  messages: SafeTeamsMessage[];
  teamName?: string | null;
  channelName?: string | null;
  channelMembershipType?: string | null;
}): TeamsSignalSummary {
  const candidates: SignalCandidate[] = [];
  let blockers = 0;
  let followUps = 0;
  let ignored = 0;

  for (const message of input.messages) {
    const candidate = classifyTeamsSignalCandidate(normalizeTeamsMessageToSignalEvent({
      workspaceId: input.workspaceId,
      message,
      teamName: input.teamName,
      channelName: input.channelName,
      channelMembershipType: input.channelMembershipType,
    }));
    if (candidate.status !== "candidate") {
      ignored += 1;
      continue;
    }
    if (candidate.signalType === "teams_blocker") blockers += 1;
    else followUps += 1;
    candidates.push(candidate);
  }

  return { scanned: input.messages.length, blockers, followUps, ignored, candidates };
}

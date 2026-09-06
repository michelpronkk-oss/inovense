// Operations decision helper.
//
// Deterministic (no model call needed for v1). Given a detected operational
// signal it produces a calm, operational summary, a recommended next step, the
// Slack update text, and the Trello action plan. Tone: short, factual, not
// dramatic, no fake certainty, no giant reports.

import type { TrelloCardDetailed, TrelloCardLabel, TrelloList } from "@/lib/operators/executors/trello";

export type OperationsSignalType =
  | "stuck_card"
  | "overdue_card"
  | "due_soon"
  | "missing_next_step"
  | "review_needed"
  | "blocked_work"
  | "too_many_open_tasks"
  | "no_recent_activity"
  | "escalation_label"
  | "no_owner"
  | "checklist_stalled";

export type OperationsSeverity = "low" | "medium" | "high";
export type OperationsConfidence = "low" | "medium" | "high";

// bestNextAction is a deliberate decision, not an implicit fallthrough:
// - "trello_action": the default comment/move plan below is prepared.
// - "suggest_owner_assignment": still a Trello comment (no new mutating
//   action type), but the wording suggests assigning an owner instead of the
//   generic nudge.
// - "observe_low_severity": genuinely low severity. No Trello/Slack action is
//   prepared, but the observation is still logged (mirrors Revenue's
//   defer_low_priority), so it is a real, auditable outcome, not silence.
// - "wait_external_dependency": a blocker reason points at an external/client
//   dependency. Nothing internal to nudge - Auterim logs that it is watching.
export type OperationsNextAction =
  | "trello_action"
  | "suggest_owner_assignment"
  | "observe_low_severity"
  | "wait_external_dependency";

export type OperationsTrelloPlan =
  | { actionType: "add_task_comment"; cardId: string; text: string }
  | { actionType: "move_task"; cardId: string; listId: string; listName: string }
  | { actionType: "create_task"; boardId: string; listId: string; listName: string; name: string; description: string }
  | null;

export type OperationsDecision = {
  signalType: OperationsSignalType;
  severity: OperationsSeverity;
  confidence: OperationsConfidence;
  score: number;
  priorityReasons: string[];
  bestNextAction: OperationsNextAction;
  bestNextActionReason: string;
  blockerReason: string | null;
  plainEnglishSummary: string;
  recommendedAction: string;
  preparedSlackMessage: string;
  preparedTrelloPlan: OperationsTrelloPlan;
  reasoning: string;
  approvalTitle: string;
};

// Base severity floor per signal type. This alone used to be the entire
// severity model (a static lookup with no independent scoring). It now only
// contributes a small starting score - real scoring below (days overdue,
// missing owner, escalation labels, blocker comments, checklist staleness)
// does the rest.
const BASE_SEVERITY_SCORE: Record<OperationsSignalType, number> = {
  overdue_card: 2,
  blocked_work: 2,
  escalation_label: 2,
  due_soon: 1,
  stuck_card: 1,
  no_recent_activity: 1,
  checklist_stalled: 1,
  review_needed: 0,
  missing_next_step: 0,
  too_many_open_tasks: 0,
  no_owner: 0,
};

function signalPhrase(signalType: OperationsSignalType): string {
  return {
    stuck_card: "has not moved in a while",
    overdue_card: "is overdue",
    due_soon: "is due soon",
    missing_next_step: "has no clear next step",
    review_needed: "looks ready for a final review",
    blocked_work: "looks blocked",
    too_many_open_tasks: "has a lot of open cards",
    no_recent_activity: "has had no recent activity",
    escalation_label: "has an escalation/urgent label",
    no_owner: "has no owner assigned",
    checklist_stalled: "has an incomplete checklist and has stalled",
  }[signalType];
}

function approvalTitleFor(signalType: OperationsSignalType): string {
  if (signalType === "blocked_work") return "Blocked work needs review";
  if (signalType === "too_many_open_tasks") return "List needs triage";
  if (signalType === "overdue_card" || signalType === "due_soon") return "Trello card needs attention";
  if (signalType === "review_needed") return "Operations review needed";
  if (signalType === "escalation_label") return "Escalated card needs review";
  if (signalType === "no_owner") return "Card has no owner";
  if (signalType === "checklist_stalled") return "Checklist stalled";
  return "Operations review needed";
}

// Extends the original crude "blocked/blocker/stuck" keyword check with real
// phrase extraction, sourced from recent comments first (most current
// context) and falling back to name+description. Used to populate a genuine
// `blockerReason` distinct from the generic signal type (Phase 4/16).
const BLOCKER_PHRASE_PATTERNS = [
  /waiting on [^.?!\n]{3,90}/i,
  /waiting for [^.?!\n]{3,90}/i,
  /blocked by [^.?!\n]{3,90}/i,
  /pending [^.?!\n]{3,90}/i,
  /on hold(?: pending)?[^.?!\n]{0,90}/i,
  /can(?:'|no)t proceed(?: until)?[^.?!\n]{0,90}/i,
];

export function extractBlockerReason(texts: string[]): string | null {
  for (const text of texts) {
    if (!text) continue;
    for (const pattern of BLOCKER_PHRASE_PATTERNS) {
      const match = text.match(pattern);
      if (match) return match[0].trim().replace(/\s+/g, " ").slice(0, 140);
    }
  }
  return null;
}

// A blocker reason that names a client/vendor/external party is treated
// differently from an internal blocker: there is nothing for Auterim to nudge
// internally, so the best next action is to observe rather than ping someone
// who cannot resolve it.
const EXTERNAL_DEPENDENCY_PATTERN = /\b(client|customer|vendor|third[- ]party|external partner|external team)\b/i;

export function isExternalDependency(blockerReason: string | null): boolean {
  return Boolean(blockerReason && EXTERNAL_DEPENDENCY_PATTERN.test(blockerReason));
}

const ESCALATION_LABEL_WORDS = ["urgent", "escalate", "escalation", "blocked", "high priority", "critical", "asap"];

export function detectEscalationLabels(labels: TrelloCardLabel[]): string[] {
  return labels
    .map((label) => label.name)
    .filter((name): name is string => Boolean(name))
    .filter((name) => ESCALATION_LABEL_WORDS.some((word) => name.toLowerCase().includes(word)));
}

export type CardScoringInput = {
  signalType: OperationsSignalType;
  daysOverdue: number | null;
  hasOwner: boolean;
  escalationLabels: string[];
  checklistTotal: number;
  checklistChecked: number;
  unresolvedAgeDays: number | null;
  blockerReason: string | null;
};

export type CardScoringResult = {
  severity: OperationsSeverity;
  confidence: OperationsConfidence;
  score: number;
  priorityReasons: string[];
};

/**
 * Deterministic severity/priority scoring, replacing the previous static
 * SEVERITY lookup + binary confidence. Every input is data that is either
 * fetched directly from Trello (idMembers, labels, badges, due, dateLastActivity)
 * or trivially derived from it (days overdue, checklist completion, blocker
 * phrase found in comments) - nothing here is fabricated. `confidence` counts
 * how many independent evidence sources contributed, so it is a real signal
 * again, not merely a mirror of severity.
 */
export function scoreCardSignal(input: CardScoringInput): CardScoringResult {
  let score = BASE_SEVERITY_SCORE[input.signalType] ?? 0;
  let sources = 0;
  const reasons: string[] = [];

  if (input.daysOverdue !== null && input.daysOverdue > 0) {
    const band = Math.min(4, Math.ceil(input.daysOverdue / 7));
    score += band;
    sources += 1;
    reasons.push(`${Math.max(1, Math.floor(input.daysOverdue))} day(s) overdue.`);
  }
  if (!input.hasOwner) {
    score += 1;
    sources += 1;
    reasons.push("No member is assigned to this card.");
  }
  if (input.escalationLabels.length > 0) {
    score += 2;
    sources += 1;
    reasons.push(`Escalation label present: ${input.escalationLabels.join(", ")}.`);
  }
  if (input.blockerReason) {
    score += 1;
    sources += 1;
    reasons.push(`A comment or description indicates a blocker: "${input.blockerReason}".`);
  }
  const checklistIncomplete = input.checklistTotal > 0 && input.checklistChecked < input.checklistTotal;
  if (checklistIncomplete && input.unresolvedAgeDays !== null && input.unresolvedAgeDays > 14) {
    score += 1;
    sources += 1;
    reasons.push(`Checklist incomplete (${input.checklistChecked}/${input.checklistTotal}) and inactive for ${Math.floor(input.unresolvedAgeDays)} day(s).`);
  }
  if (!checklistIncomplete && input.unresolvedAgeDays !== null && input.unresolvedAgeDays > 30) {
    score += 1;
    sources += 1;
    reasons.push(`No activity for ${Math.floor(input.unresolvedAgeDays)} day(s).`);
  }

  const severity: OperationsSeverity = score >= 5 ? "high" : score >= 2 ? "medium" : "low";
  const confidence: OperationsConfidence = sources >= 2 ? "high" : sources === 1 ? "medium" : "low";
  if (reasons.length === 0) reasons.push(`Detected ${input.signalType.replace(/_/g, " ")} with no additional contributing factors.`);
  return { severity, confidence, score, priorityReasons: reasons };
}

function decideBestNextAction(input: {
  severity: OperationsSeverity;
  blockerReason: string | null;
  hasOwner: boolean;
}): { action: OperationsNextAction; reason: string } {
  if (input.blockerReason && isExternalDependency(input.blockerReason)) {
    return {
      action: "wait_external_dependency",
      reason: `The card is waiting on an external or client dependency ("${input.blockerReason}"). Observing until the situation changes instead of pinging the team internally.`,
    };
  }
  if (input.severity === "low") {
    return {
      action: "observe_low_severity",
      reason: "Signal severity is low. Observing without creating an approval or Slack/Trello action instead of nudging on something minor.",
    };
  }
  if (!input.hasOwner) {
    return {
      action: "suggest_owner_assignment",
      reason: "No owner is assigned and the signal is actionable. Suggesting an owner assignment in a Trello comment instead of a generic nudge.",
    };
  }
  return { action: "trello_action", reason: "Signal is actionable. Preparing the default Trello/Slack action." };
}

/**
 * Find a clear move target for a signal among the board lists. Returns null when
 * the target is ambiguous or already the current list (no move prepared).
 */
function resolveMoveTarget(input: {
  signalType: OperationsSignalType;
  currentListId: string | null;
  lists: TrelloList[];
}): { listId: string; listName: string } | null {
  const find = (names: string[]) => input.lists.find((list) =>
    !list.closed && names.some((name) => list.name.toLowerCase().trim() === name));
  let target: TrelloList | undefined;
  if (input.signalType === "blocked_work") target = find(["blocked"]);
  else if (input.signalType === "overdue_card" || input.signalType === "due_soon") target = find(["today", "in progress"]);
  else if (input.signalType === "review_needed") target = find(["review"]);
  if (!target || !target.id) return null;
  if (target.id === input.currentListId) return null;
  return { listId: target.id, listName: target.name };
}

export function decideOperationsCardSignal(input: {
  signalType: OperationsSignalType;
  card: TrelloCardDetailed;
  listName: string;
  boardName: string;
  boardId: string;
  lists: TrelloList[];
  daysOverdue: number | null;
  hasOwner: boolean;
  escalationLabels: string[];
  checklistTotal: number;
  checklistChecked: number;
  unresolvedAgeDays: number | null;
  blockerReason: string | null;
}): OperationsDecision {
  const scoring = scoreCardSignal({
    signalType: input.signalType,
    daysOverdue: input.daysOverdue,
    hasOwner: input.hasOwner,
    escalationLabels: input.escalationLabels,
    checklistTotal: input.checklistTotal,
    checklistChecked: input.checklistChecked,
    unresolvedAgeDays: input.unresolvedAgeDays,
    blockerReason: input.blockerReason,
  });
  const bestNext = decideBestNextAction({ severity: scoring.severity, blockerReason: input.blockerReason, hasOwner: input.hasOwner });

  const phrase = signalPhrase(input.signalType);
  const cardLabel = input.card.name;

  const recommendedAction = bestNext.action === "wait_external_dependency"
    ? "No internal action needed right now. Auterim is watching for a change."
    : bestNext.action === "observe_low_severity"
      ? "No action needed yet. Auterim is observing this card."
      : bestNext.action === "suggest_owner_assignment"
        ? "Assign an owner so the card has clear accountability."
        : input.signalType === "blocked_work"
          ? "Confirm what it is waiting on and unblock or reassign it."
          : input.signalType === "overdue_card"
            ? "Reschedule it or confirm the new delivery date."
            : input.signalType === "due_soon"
              ? "Confirm it is on track for the due date."
              : input.signalType === "missing_next_step"
                ? "Add a clear next step so the card is actionable."
                : input.signalType === "review_needed"
                  ? "Do a final review and close it out if it is done."
                  : input.signalType === "escalation_label"
                    ? "Review immediately given the escalation label and confirm ownership."
                    : input.signalType === "checklist_stalled"
                      ? "Resume the incomplete checklist or confirm it is no longer needed."
                      : "Review the card and confirm the next step.";

  const plainEnglishSummary = `${cardLabel} ${phrase} in ${input.listName}.`;

  let preparedTrelloPlan: OperationsTrelloPlan = null;
  let preparedSlackMessage = `Ops check: "${cardLabel}" ${phrase} in ${input.listName}. ${recommendedAction}`;

  if (bestNext.action === "trello_action") {
    const move = resolveMoveTarget({ signalType: input.signalType, currentListId: input.card.listId, lists: input.lists });
    const commentText = `Inovense flagged this card: it ${phrase}. ${recommendedAction}`;
    preparedTrelloPlan = move
      ? { actionType: "move_task", cardId: input.card.id, listId: move.listId, listName: move.listName }
      : { actionType: "add_task_comment", cardId: input.card.id, text: commentText };
    preparedSlackMessage = move
      ? `Ops check: "${cardLabel}" ${phrase}. Suggested move to ${move.listName}. ${recommendedAction}`
      : `Ops check: "${cardLabel}" ${phrase} in ${input.listName}. ${recommendedAction}`;
  } else if (bestNext.action === "suggest_owner_assignment") {
    const commentText = `Inovense flagged this card: it ${phrase} and has no owner assigned. Please assign someone to it.`;
    preparedTrelloPlan = { actionType: "add_task_comment", cardId: input.card.id, text: commentText };
    preparedSlackMessage = `Ops check: "${cardLabel}" ${phrase} in ${input.listName} and has no owner. ${recommendedAction}`;
  }
  // observe_low_severity / wait_external_dependency intentionally leave
  // preparedTrelloPlan null - no Trello write and no Slack ping is prepared
  // for these; scan.ts logs the observation instead of creating an approval.

  return {
    signalType: input.signalType,
    severity: scoring.severity,
    confidence: scoring.confidence,
    score: scoring.score,
    priorityReasons: scoring.priorityReasons,
    bestNextAction: bestNext.action,
    bestNextActionReason: bestNext.reason,
    blockerReason: input.blockerReason,
    plainEnglishSummary,
    recommendedAction,
    preparedSlackMessage,
    preparedTrelloPlan,
    reasoning: `Detected ${input.signalType.replace(/_/g, " ")} on card "${cardLabel}" in list "${input.listName}" on board "${input.boardName}". ${scoring.priorityReasons.join(" ")}`,
    approvalTitle: approvalTitleFor(input.signalType),
  };
}

export function decideOperationsListSignal(input: {
  signalType: "too_many_open_tasks";
  listName: string;
  listId: string;
  boardName: string;
  boardId: string;
  openCount: number;
}): OperationsDecision {
  const severity: OperationsSeverity = input.openCount >= 25 ? "medium" : "low";
  const plainEnglishSummary = `${input.listName} has ${input.openCount} open cards and may need triage.`;
  const recommendedAction = "Triage the list and move or close cards that are no longer active.";
  const priorityReasons = [`${input.listName} has ${input.openCount} open cards, above the ${severity === "medium" ? "25" : "12"}-card threshold.`];
  return {
    signalType: "too_many_open_tasks",
    severity,
    confidence: "medium",
    score: BASE_SEVERITY_SCORE.too_many_open_tasks + (severity === "medium" ? 2 : 1),
    priorityReasons,
    bestNextAction: "trello_action",
    bestNextActionReason: "List-level triage signal. Preparing a Slack update; no automatic Trello write is made for a whole list.",
    blockerReason: null,
    plainEnglishSummary,
    recommendedAction,
    preparedSlackMessage: `Ops check: "${input.listName}" has ${input.openCount} open cards. ${recommendedAction}`,
    preparedTrelloPlan: null,
    reasoning: `List "${input.listName}" on board "${input.boardName}" has ${input.openCount} open cards.`,
    approvalTitle: approvalTitleFor("too_many_open_tasks"),
  };
}

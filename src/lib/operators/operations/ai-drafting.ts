// Operations decision helper.
//
// Deterministic (no model call needed for v1). Given a detected operational
// signal it produces a calm, operational summary, a recommended next step, the
// Slack update text, and the Trello action plan. Tone: short, factual, not
// dramatic, no fake certainty, no giant reports.

import type { TrelloCardDetailed, TrelloList } from "@/lib/operators/executors/trello";

export type OperationsSignalType =
  | "stuck_card"
  | "overdue_card"
  | "due_soon"
  | "missing_next_step"
  | "review_needed"
  | "blocked_work"
  | "too_many_open_tasks"
  | "no_recent_activity";

export type OperationsSeverity = "low" | "medium" | "high";

export type OperationsTrelloPlan =
  | { actionType: "add_task_comment"; cardId: string; text: string }
  | { actionType: "move_task"; cardId: string; listId: string; listName: string }
  | { actionType: "create_task"; boardId: string; listId: string; listName: string; name: string; description: string }
  | null;

export type OperationsDecision = {
  signalType: OperationsSignalType;
  severity: OperationsSeverity;
  confidence: "low" | "medium" | "high";
  plainEnglishSummary: string;
  recommendedAction: string;
  preparedSlackMessage: string;
  preparedTrelloPlan: OperationsTrelloPlan;
  reasoning: string;
  approvalTitle: string;
};

const SEVERITY: Record<OperationsSignalType, OperationsSeverity> = {
  overdue_card: "high",
  blocked_work: "high",
  due_soon: "medium",
  stuck_card: "medium",
  no_recent_activity: "medium",
  review_needed: "low",
  missing_next_step: "low",
  too_many_open_tasks: "low",
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
  }[signalType];
}

function approvalTitleFor(signalType: OperationsSignalType): string {
  if (signalType === "blocked_work") return "Blocked work needs review";
  if (signalType === "too_many_open_tasks") return "List needs triage";
  if (signalType === "overdue_card" || signalType === "due_soon") return "Trello card needs attention";
  if (signalType === "review_needed") return "Operations review needed";
  return "Operations review needed";
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
}): OperationsDecision {
  const severity = SEVERITY[input.signalType];
  const phrase = signalPhrase(input.signalType);
  const cardLabel = input.card.name;

  const recommendedAction = input.signalType === "blocked_work"
    ? "Confirm what it is waiting on and unblock or reassign it."
    : input.signalType === "overdue_card"
      ? "Reschedule it or confirm the new delivery date."
      : input.signalType === "due_soon"
        ? "Confirm it is on track for the due date."
        : input.signalType === "missing_next_step"
          ? "Add a clear next step so the card is actionable."
          : input.signalType === "review_needed"
            ? "Do a final review and close it out if it is done."
            : "Review the card and confirm the next step.";

  const move = resolveMoveTarget({ signalType: input.signalType, currentListId: input.card.listId, lists: input.lists });
  const commentText = `Inovense flagged this card: it ${phrase}. ${recommendedAction}`;

  // Prefer a comment as the safe default Trello action. A move is only added
  // when a clear target list exists, and it replaces the comment plan.
  const preparedTrelloPlan: OperationsTrelloPlan = move
    ? { actionType: "move_task", cardId: input.card.id, listId: move.listId, listName: move.listName }
    : { actionType: "add_task_comment", cardId: input.card.id, text: commentText };

  const plainEnglishSummary = `${cardLabel} ${phrase} in ${input.listName}.`;
  const preparedSlackMessage = move
    ? `Ops check: "${cardLabel}" ${phrase}. Suggested move to ${move.listName}. ${recommendedAction}`
    : `Ops check: "${cardLabel}" ${phrase} in ${input.listName}. ${recommendedAction}`;

  return {
    signalType: input.signalType,
    severity,
    confidence: severity === "high" ? "high" : "medium",
    plainEnglishSummary,
    recommendedAction,
    preparedSlackMessage,
    preparedTrelloPlan,
    reasoning: `Detected ${input.signalType.replace(/_/g, " ")} on card "${cardLabel}" in list "${input.listName}" on board "${input.boardName}".`,
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
  const plainEnglishSummary = `${input.listName} has ${input.openCount} open cards and may need triage.`;
  const recommendedAction = "Triage the list and move or close cards that are no longer active.";
  return {
    signalType: "too_many_open_tasks",
    severity: SEVERITY.too_many_open_tasks,
    confidence: "medium",
    plainEnglishSummary,
    recommendedAction,
    preparedSlackMessage: `Ops check: "${input.listName}" has ${input.openCount} open cards. ${recommendedAction}`,
    preparedTrelloPlan: null,
    reasoning: `List "${input.listName}" on board "${input.boardName}" has ${input.openCount} open cards.`,
    approvalTitle: approvalTitleFor("too_many_open_tasks"),
  };
}

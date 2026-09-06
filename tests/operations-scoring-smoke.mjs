import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Runtime smoke test for Operations Operator's deterministic scoring/detection
// logic (src/lib/operators/operations/ai-drafting.ts). Unlike the source-
// contract smoke test (operations-operator-smoke.mjs), this actually executes
// the real module via esbuild.transformSync + dynamic import (same technique
// as tests/ai-drafting-runtime-smoke.mjs), proving real behavior rather than
// pattern-matching source text. ai-drafting.ts has no network/Supabase
// dependency, so no mocking is required here.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-operations-scoring-smoke");
fs.mkdirSync(tmpDir, { recursive: true });

function loadModule(relSourcePath) {
  const source = fs.readFileSync(path.join(root, relSourcePath), "utf8");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href + `?t=${Date.now()}`);
}

function baseCard(overrides = {}) {
  return {
    id: "card-1",
    name: "Ship the client dashboard",
    desc: "Build the dashboard for the client.",
    due: null,
    dueComplete: false,
    dateLastActivity: new Date().toISOString(),
    listId: "list-1",
    url: "https://trello.com/c/card-1",
    shortUrl: "https://trello.com/c/card-1",
    closed: false,
    idMembers: [],
    labels: [],
    badges: { checklistItems: 0, checklistItemsChecked: 0, comments: 0 },
    ...overrides,
  };
}

const lists = [
  { id: "list-1", name: "In Progress", closed: false },
  { id: "list-2", name: "Blocked", closed: false },
  { id: "list-3", name: "Review", closed: false },
];

async function main() {
  const {
    decideOperationsCardSignal,
    decideOperationsListSignal,
    scoreCardSignal,
    extractBlockerReason,
    isExternalDependency,
    detectEscalationLabels,
  } = await loadModule("src/lib/operators/operations/ai-drafting.ts");

  // 1. Graduated overdue severity - 1 day overdue must score lower than 30 days overdue.
  {
    const oneDay = scoreCardSignal({ signalType: "overdue_card", daysOverdue: 1, hasOwner: true, escalationLabels: [], checklistTotal: 0, checklistChecked: 0, unresolvedAgeDays: 1, blockerReason: null });
    const thirtyDays = scoreCardSignal({ signalType: "overdue_card", daysOverdue: 30, hasOwner: true, escalationLabels: [], checklistTotal: 0, checklistChecked: 0, unresolvedAgeDays: 30, blockerReason: null });
    assert.ok(thirtyDays.score > oneDay.score, "30 days overdue must score strictly higher than 1 day overdue");
    assert.equal(oneDay.severity, "medium", "1 day overdue with an owner and no other factors should not be high severity");
    assert.equal(thirtyDays.severity, "high", "30 days overdue must escalate to high severity");
  }

  // 2. Missing owner adds score and a real reason, independent of severity floor.
  {
    const withOwner = scoreCardSignal({ signalType: "stuck_card", daysOverdue: null, hasOwner: true, escalationLabels: [], checklistTotal: 0, checklistChecked: 0, unresolvedAgeDays: 15, blockerReason: null });
    const noOwner = scoreCardSignal({ signalType: "stuck_card", daysOverdue: null, hasOwner: false, escalationLabels: [], checklistTotal: 0, checklistChecked: 0, unresolvedAgeDays: 15, blockerReason: null });
    assert.ok(noOwner.score > withOwner.score, "missing owner must increase the score");
    assert.ok(noOwner.priorityReasons.some((r) => /no member is assigned/i.test(r)), "missing owner must produce a plain-language reason");
  }

  // 3. Escalation label detection is case-insensitive substring matching.
  {
    const labels = detectEscalationLabels([{ id: "l1", name: "URGENT", color: "red" }, { id: "l2", name: "Design", color: "blue" }]);
    assert.deepEqual(labels, ["URGENT"], "escalation label detection must match case-insensitively and ignore unrelated labels");
  }

  // 4. Blocker reason extraction from comment-like text, and external-dependency detection.
  {
    const reason = extractBlockerReason(["Still waiting on client approval before we can move forward."]);
    assert.match(reason ?? "", /waiting on client approval/i);
    assert.equal(isExternalDependency(reason), true, "a blocker reason naming the client must be treated as an external dependency");

    const internalReason = extractBlockerReason(["Blocked by the design review, should be quick."]);
    assert.match(internalReason ?? "", /blocked by the design review/i);
    assert.equal(isExternalDependency(internalReason), false, "an internal blocker reason must not be misclassified as external");
  }

  // 5. Genuinely low severity -> observe_low_severity, no Trello/Slack action prepared.
  {
    const decision = decideOperationsCardSignal({
      signalType: "missing_next_step",
      card: baseCard({ idMembers: ["member-1"] }),
      listName: "In Progress",
      boardName: "Board",
      boardId: "board-1",
      lists,
      daysOverdue: null,
      hasOwner: true,
      escalationLabels: [],
      checklistTotal: 0,
      checklistChecked: 0,
      unresolvedAgeDays: 1,
      blockerReason: null,
    });
    assert.equal(decision.severity, "low");
    assert.equal(decision.bestNextAction, "observe_low_severity");
    assert.equal(decision.preparedTrelloPlan, null, "a deliberate observe decision must not prepare a Trello write");
  }

  // 6. Blocker reason naming a client -> wait_external_dependency, no action prepared, even at higher severity.
  {
    const decision = decideOperationsCardSignal({
      signalType: "blocked_work",
      card: baseCard({ idMembers: ["member-1"] }),
      listName: "Blocked",
      boardName: "Board",
      boardId: "board-1",
      lists,
      daysOverdue: null,
      hasOwner: true,
      escalationLabels: [],
      checklistTotal: 0,
      checklistChecked: 0,
      unresolvedAgeDays: 20,
      blockerReason: "waiting on client sign-off",
    });
    assert.equal(decision.bestNextAction, "wait_external_dependency");
    assert.equal(decision.preparedTrelloPlan, null, "waiting on an external dependency must not prepare an internal nudge");
  }

  // 7. No owner + actionable severity -> suggest_owner_assignment via a Trello comment (no new action type).
  {
    const decision = decideOperationsCardSignal({
      signalType: "overdue_card",
      card: baseCard({ idMembers: [] }),
      listName: "In Progress",
      boardName: "Board",
      boardId: "board-1",
      lists,
      daysOverdue: 10,
      hasOwner: false,
      escalationLabels: [],
      checklistTotal: 0,
      checklistChecked: 0,
      unresolvedAgeDays: 10,
      blockerReason: null,
    });
    assert.equal(decision.bestNextAction, "suggest_owner_assignment");
    assert.ok(decision.preparedTrelloPlan, "an owner suggestion must still prepare an approval-gated Trello action");
    assert.equal(decision.preparedTrelloPlan.actionType, "add_task_comment", "owner suggestion must use the existing add_task_comment action type, not a new mutating action");
    assert.match(decision.preparedTrelloPlan.text, /owner/i);
  }

  // 8. Default actionable path still prepares a real Trello plan (move or comment).
  {
    const decision = decideOperationsCardSignal({
      signalType: "blocked_work",
      card: baseCard({ idMembers: ["member-1"], listId: "list-1" }),
      listName: "In Progress",
      boardName: "Board",
      boardId: "board-1",
      lists,
      daysOverdue: null,
      hasOwner: true,
      escalationLabels: [],
      checklistTotal: 0,
      checklistChecked: 0,
      unresolvedAgeDays: 5,
      blockerReason: null,
    });
    assert.equal(decision.bestNextAction, "trello_action");
    assert.ok(decision.preparedTrelloPlan, "a genuinely actionable signal must prepare a Trello plan");
  }

  // 9. List-level signal still returns a decision shape consumable the same way as card signals.
  {
    const decision = decideOperationsListSignal({ signalType: "too_many_open_tasks", listName: "In Progress", listId: "list-1", boardName: "Board", boardId: "board-1", openCount: 30 });
    assert.equal(decision.severity, "medium", "a list far above threshold should escalate past the base low severity");
  }

  console.log("Operations Operator scoring/detection smoke: severity scoring, blocker extraction, escalation labels, and best-next-action branches all verified.");
}

try {
  await main();
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

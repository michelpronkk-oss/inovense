import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-operations-context-smoke");
fs.mkdirSync(tmpDir, { recursive: true });

try {
  const source = fs.readFileSync(path.join(root, "src/lib/operators/operations/context.ts"), "utf8");
  const { code } = esbuild.transformSync(source.replace(/import type[^\n]+\n/g, ""), { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, "context.mjs");
  fs.writeFileSync(file, code, "utf8");
  const { buildOperationsContext } = await import(pathToFileURL(file).href + `?t=${Date.now()}`);

  const overdue = buildOperationsContext({
    provider: "trello",
    project: { id: "board-1", name: "Delivery", priority: "high", status: "active" },
    task: { id: "card-1", title: "Ship customer launch", status: "open", assignee: "owner-1", dueAt: "2026-09-01T00:00:00.000Z", labels: ["client"], blockerIndicators: ["blocked"], checklist: { total: 4, completed: 1 }, lastActivityAt: "2026-08-20T00:00:00.000Z" },
    signalType: "blocked_work",
    score: 7,
    priorityReasons: ["A blocker label is present."],
    blockerReason: "waiting on client sign-off",
    dependency: { blockedBy: "client approval", external: true, state: "waiting" },
    businessImpact: { customerCommitment: "Launch date", externalCollaborator: true },
  });

  assert.equal(overdue.provider, "trello");
  assert.equal(overdue.preparationState, "needs_dependency", "external blockers must remain waiting for dependency context");
  assert.ok(overdue.priority >= 65, "overdue customer-impacting work must be prioritized deterministically");
  assert.equal(overdue.businessContext.project.due_date_impact.value, "overdue");
  assert.equal(overdue.businessContext.task.external_collaborator.value, true);
  assert.equal(overdue.dependency.reliability, "observed");
  assert.ok(overdue.priorityReasons.some((reason) => /customer commitment/i.test(reason)));

  const unassigned = buildOperationsContext({
    provider: "jira",
    project: { id: "project-1", name: "Internal", status: "active" },
    task: { id: "OPS-1", title: "Repair deployment", status: "open", assignee: null, labels: [], blockerIndicators: [] },
    signalType: "stuck_card",
    score: 5,
  });
  assert.equal(unassigned.preparationState, "needs_owner");
  assert.equal(unassigned.project.reliability, "verified");
  assert.equal(unassigned.dependency.reliability, "missing");
  assert.equal(unassigned.businessContext.task.external_collaborator.reliability, "missing");

  console.log("Operations context smoke: provider-normalized context, deterministic priority, preparation states, and policy context verified.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

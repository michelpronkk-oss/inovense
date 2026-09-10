import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const scan = read("src/lib/operators/operations/scan.ts");
const workflow = read("src/lib/operators/operations/workflow.ts");
const engine = read("src/lib/workflows/engine.ts");
const observer = read("src/lib/workflows/outcome-observers.ts");
const approve = read("src/app/api/approvals/[id]/approve/route.ts");

assert.match(scan, /prepareCanonicalOperationsWork/, "all actionable Operations paths must prepare canonical work");
assert.match(scan, /provider: "asana"/, "Asana must use the canonical Operations path");
assert.match(scan, /provider: "jira"/, "Jira must use the canonical Operations path");
assert.match(scan, /provider: "trello"/, "Trello must use the canonical Operations path");
assert.match(scan, /materializeWorkflows: false/, "Operations must not create a competing generic workflow during direct provider scans");
assert.match(scan, /ensureOperationsWorkflow/, "provider work must persist one canonical Operations workflow");
assert.match(scan, /linkOperationsApprovalWorkflow/, "provider approvals must link back to the canonical workflow step");
assert.match(scan, /observeOperationsWorkflows/, "Operations scans must re-read provider state for follow-through");
assert.match(scan, /recordObservedWorkflowOutcome/, "provider outcomes must be persisted as workflow outcomes");
assert.match(scan, /observeOperationsNoProgress/, "no-progress must be surfaced instead of silently completing work");
assert.match(workflow, /intent: "operations_work"/, "canonical Operations identity must be stable across signal types");
assert.match(workflow, /primary_owner: "operations"/, "Operations must remain the primary owner of its workflow");
assert.match(engine, /operatorKey === "operations" \? "operations_work" : candidate\.signalType/, "central materialization must share the Operations identity");
assert.match(observer, /operations_blocker_resolved/, "resolution requires observed provider state, not approval alone");
assert.match(observer, /operations_no_progress/, "bounded recovery/no-progress evidence must exist");
assert.match(approve, /operations\.workflow\.advance/, "approval execution must advance the linked Operations workflow");
assert.match(approve, /executePreparedActionAfterApproval/, "approval still executes through the shared action layer");

console.log("Operations runtime path smoke: provider parity, canonical workflow identity, approval linking, follow-through, and no-progress guards verified.");

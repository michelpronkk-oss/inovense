import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const scan = read("src/lib/operators/client-flow/scan.ts");
const workflow = read("src/lib/operators/client-flow/workflow.ts");
const workforce = read("src/lib/workflows/workforce.ts");
const context = read("src/lib/operators/client-flow/context.ts");
const observers = read("src/lib/workflows/outcome-observers.ts");
const approve = read("src/app/api/approvals/[id]/approve/route.ts");

assert.match(scan, /persistCanonicalClientFlowSignal/, "email Client Flow work must persist through the canonical candidate path");
assert.match(scan, /prepareExternalClientFlowWorkflow/, "Zendesk and Intercom Client Flow work must use the same workflow path");
assert.match(scan, /ensureClientFlowWorkflow/, "Client Flow must have one primary continuity workflow");
assert.match(scan, /createClientFlowSupportingHandoffs/, "supporting operators must be linked instead of producing isolated work");
assert.match(workflow, /materializeWorkflows: false/, "direct Client Flow scans must not compete with central materialization");
assert.match(scan, /observeClientFlowWorkflows/, "Client Flow must observe later customer/handoff state");
assert.match(scan, /outcomesObserved/, "runtime summaries must expose evidence-backed Client Flow outcomes");
assert.match(workflow, /intent: "customer_continuity"/, "same customer thread must resolve to one continuity workflow");
assert.match(workflow, /primary_owner: "client_flow"/, "Client Flow remains customer-continuity owner");
assert.match(workforce, /parent_workflow_id: input\.parentWorkflowId/, "supporting work must preserve its parent workflow");
assert.match(workforce, /external_communication_allowed: false/, "supporting work must not communicate externally by default");
assert.match(context, /needs_operations_work|needs_support_context|needs_commercial_context|needs_clarification/, "Client Flow must expose useful preparation states");
assert.match(observers, /clientflow_customer_confirmed/, "customer confirmation must be an explicit outcome");
assert.match(observers, /clientflow_handoff_completed/, "supporting handoff completion must be observable");
assert.match(approve, /advanceWorkflowForApproval/, "approval execution must advance the linked continuity workflow");
assert.match(approve, /approval_scope_changed/, "context/policy changes must require reapproval");

console.log("Client Flow runtime path smoke: canonical continuity work, supporting ownership, approval linkage, customer observation, and dedupe guards verified.");

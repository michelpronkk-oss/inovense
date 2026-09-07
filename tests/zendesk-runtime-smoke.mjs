import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const actions = read("src/lib/actions/registry.ts");
const execute = read("src/lib/actions/execute.ts");
const preview = read("src/lib/actions/preview.ts");
const policy = read("src/lib/policies/evaluate.ts");
const defaults = read("src/lib/policies/defaults.ts");
const approval = read("src/app/api/approvals/[id]/approve/route.ts");
const truth = read("src/lib/connectors/truth.ts");
const clientFlow = read("src/lib/operators/client-flow/scan.ts");
const operations = read("src/lib/operators/operations/scan.ts");

for (const action of ["reply_zendesk_ticket", "add_zendesk_internal_note", "update_zendesk_ticket"]) {
  assert.match(actions, new RegExp(`${action}:[\\s\\S]*approvalDefault: true`));
  assert.match(execute, new RegExp(action));
  assert.match(preview, new RegExp(action));
  assert.match(approval, new RegExp(action));
}
assert.match(policy, /connectorKey === "zendesk"/);
assert.match(defaults, /reply_zendesk_ticket/);
assert.match(defaults, /case "reply_zendesk_ticket"[\s\S]*return "customer"/);
assert.match(approval, /zendesk_reply_sent/);
assert.match(approval, /zendesk_internal_note_added/);
assert.match(approval, /zendesk_ticket_updated/);
assert.match(truth, /connectorKey: "zendesk"/);
assert.match(truth, /verifyZendeskConnection/);
assert.match(clientFlow, /detectZendeskClientFlowSignal/);
assert.match(clientFlow, /createZendeskClientFlowApproval/);
assert.match(clientFlow, /reply_zendesk_ticket/);
assert.match(operations, /detectZendeskOperationsSignal/);
assert.match(operations, /syncCursor/);
assert.match(operations, /zendesk/);
console.log("Zendesk runtime smoke contracts passed.");

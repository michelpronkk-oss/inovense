import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const actions = read("src/lib/actions/registry.ts");
const execute = read("src/lib/actions/execute.ts");
const preview = read("src/lib/actions/preview.ts");
const policy = read("src/lib/policies/evaluate.ts");
const approval = read("src/app/api/approvals/[id]/approve/route.ts");
const truth = read("src/lib/connectors/truth.ts");
const clientFlow = read("src/lib/operators/client-flow/scan.ts");
const requirements = read("src/lib/operators/connector-requirements.ts");
const operations = read("src/lib/operators/operations/scan.ts");

for (const action of ["reply_intercom_conversation", "update_intercom_conversation"]) {
  assert.match(actions, new RegExp(`${action}:[\\s\\S]*approvalDefault: true`));
  assert.match(execute, new RegExp(action));
  assert.match(preview, new RegExp(action));
  assert.match(approval, new RegExp(action));
}
assert.match(policy, /connectorKey === "intercom"/);
assert.match(approval, /intercom_reply_sent/);
assert.match(approval, /intercom_conversation_updated/);
assert.match(truth, /connectorKey: "intercom"/);
assert.match(truth, /verifyIntercomConnection/);
assert.match(clientFlow, /detectIntercomClientFlowSignal/);
assert.match(clientFlow, /createIntercomClientFlowApproval/);
assert.match(clientFlow, /reply_intercom_conversation/);
assert.match(requirements, /support\.conversations\.read/);
assert.match(operations, /detectIntercomOperationsSignal/);
assert.match(operations, /intercomSupport/);
console.log("Intercom runtime smoke contracts passed.");

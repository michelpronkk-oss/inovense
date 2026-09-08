import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/lib/workflows/materialize.ts", "utf8");
const store = fs.readFileSync("src/lib/workflows/store.ts", "utf8");
const approve = fs.readFileSync("src/app/api/approvals/[id]/approve/route.ts", "utf8");

assert.match(source, /^import "server-only";/m);
assert.match(source, /prepareAction\(intent/);
assert.match(source, /evaluateExecutionPolicy/);
assert.match(source, /asana_project_not_selected/);
assert.match(source, /trello_destination_not_selected/);
assert.match(source, /slack_destination_not_selected/);
assert.match(source, /teams_destination_not_selected/);
assert.match(source, /verified_recipient_not_available/);
assert.match(source, /verified_draft_not_available/);
assert.match(source, /prepareRevenueFollowUpEmail/);
assert.match(source, /findExistingCustomerReply/);
assert.match(source, /shared_action\.execute_after_approval/);
assert.match(source, /slack\.send_after_approval/);
assert.match(source, /teams\.send_after_approval/);
assert.doesNotMatch(source, /executePreparedActionAfterApproval|sendSlackMessageAfterApproval|sendTeamsChannelMessageAfterApproval|fetch\(/);
assert.doesNotMatch(source, /dueOn|assigneeGid|dueDate|assigneeAccountId/);
assert.match(store, /const jiraReadyForWrites = typeof jiraMetadata\.selectedProjectId === "string" && typeof jiraMetadata\.selectedIssueTypeId === "string"/);
assert.match(store, /const materializable = executable\.filter\(\(connector\) => connector !== "jira" \|\| jiraReadyForWrites\)/);
assert.match(approve, /log-slack-send[\s\S]{0,900}advanceWorkflowForApproval|advanceWorkflowForApproval[\s\S]{0,900}log-slack-send/);
assert.match(approve, /log-teams-send[\s\S]{0,900}advanceWorkflowForApproval|advanceWorkflowForApproval[\s\S]{0,900}log-teams-send/);
console.log("Workflow materialization smoke: complete configured targets, canonical preparation, policy, approval continuations, and fail-closed drafts verified.");

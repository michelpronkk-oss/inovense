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

// A platform-internal recommendation (e.g. the Slack no-PM-connector
// fallback) must short-circuit before any connector readiness, policy
// evaluation, or os_approvals creation - it performs no external action.
const internalBranchMatch = source.match(/if \(stepResult\.data\.action_type === "prepare_internal_recommendation"\) \{[\s\S]*?\n {2}\}/);
assert.ok(internalBranchMatch, "materializeWorkflowStep must special-case the internal recommendation action type");
assert.match(internalBranchMatch[0], /completeInternalRecommendationStep/);
const fnStart = source.indexOf("async function completeInternalRecommendationStep");
const fnEnd = source.indexOf("\nasync function findExistingCustomerReply");
assert.ok(fnStart > 0 && fnEnd > fnStart, "completeInternalRecommendationStep must be located as a standalone function");
const fnBody = source.slice(fnStart, fnEnd);
assert.match(fnBody, /^async function completeInternalRecommendationStep/);
assert.doesNotMatch(fnBody, /evaluateExecutionPolicy|assertConnectorReady|prepareAction\(/, "recording an internal recommendation must never evaluate policy, check connector readiness, or prepare a provider action");
assert.doesNotMatch(fnBody, /\.from\("os_approvals"\)/, "an internal recommendation must never create an approval - there is nothing external to gate");
assert.match(source, /connectorKey: "auterim"/);
assert.match(source, /capability: "internal\.recommendation\.write"/);

// buildRevenueInternalRecommendation must be reused, not duplicated, and its
// null (insufficient-evidence) result must short-circuit to "blocked" before
// any persistence - completion is never marked on empty output.
assert.match(fnBody, /import { buildRevenueInternalRecommendation }|buildRevenueInternalRecommendation\(/);
assert.match(source, /import \{ buildRevenueInternalRecommendation \} from "@\/lib\/workflows\/recommendation"/);
const artifactCheckIdx = fnBody.indexOf("if (!artifact)");
const evidenceWriteIdx = fnBody.indexOf('.from("os_workflow_runs")\n    .update({ result_evidence');
const stepCompleteIdx = fnBody.indexOf('status: "completed"');
assert.ok(artifactCheckIdx > 0 && evidenceWriteIdx > artifactCheckIdx && stepCompleteIdx > evidenceWriteIdx, "order must be: build artifact -> fail closed if empty -> persist result_evidence -> only then mark the step completed");
assert.match(fnBody, /return missing\("recommendation_evidence_unavailable"/, "insufficient evidence must produce a truthful blocked state, never a false completion");

// The recommendation reuses the existing os_workflow_runs.result_evidence
// column (already used by workforce.ts's cross-operator handoff completion)
// and the existing os_workflow_outcomes table - no new migration/table.
assert.match(fnBody, /result_evidence: \{ \.\.\.existingEvidence, internalRecommendation: artifact \}/);
assert.match(fnBody, /\.from\("os_workflow_outcomes"\)\.upsert/, "an auditable outcome record must be written using the existing outcomes table");
assert.match(fnBody, /outcome_type: "revenue_internal_recommendation_prepared"/);

// The workflow must reach a real terminal status once its only step is
// durably done - it must never be left indefinitely "planned".
assert.match(fnBody, /\.from\("os_workflow_runs"\)\s*\.update\(\{ status: "completed" \}\)/, "the workflow itself must be finalized to a terminal status, not left planned");

// The Slack workflow engine template must reuse this same internal step,
// and must never resolve an ambiguous set of connected PM connectors by
// guessing via the fixed preference order used elsewhere.
const engineSource = fs.readFileSync("src/lib/workflows/engine.ts", "utf8");
assert.match(engineSource, /chooseUnambiguousProjectConnector/);
assert.match(engineSource, /prepare_internal_recommendation/);
assert.match(engineSource, /isInternalCapability/);

console.log("Workflow materialization smoke: complete configured targets, canonical preparation, policy, approval continuations, fail-closed drafts, and connector-independent internal recommendation isolation verified.");

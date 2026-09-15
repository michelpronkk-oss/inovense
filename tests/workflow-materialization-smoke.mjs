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
// materialize.ts itself only DISPATCHES generation (never calls a
// generator, never contacts OpenAI, never persists the artifact) - the
// dedicated slack-recommendation-generate Trigger task and
// recommendation-service.ts own that work, so a slow/unavailable model
// call can never block this synchronous materialization pass.
const internalBranchMatch = source.match(/if \(stepResult\.data\.action_type === "prepare_internal_recommendation"\) \{[\s\S]*?\n {2}\}/);
assert.ok(internalBranchMatch, "materializeWorkflowStep must special-case the internal recommendation action type");
assert.match(internalBranchMatch[0], /dispatchInternalRecommendationGeneration/);
const fnStart = source.indexOf("async function dispatchInternalRecommendationGeneration");
const fnEnd = source.indexOf("\n/** Links an exact, still-pending Client Flow draft");
assert.ok(fnStart > 0 && fnEnd > fnStart, "dispatchInternalRecommendationGeneration must be located as a standalone function");
const fnBody = source.slice(fnStart, fnEnd);
assert.match(fnBody, /^async function dispatchInternalRecommendationGeneration/);
assert.doesNotMatch(fnBody, /evaluateExecutionPolicy|assertConnectorReady|prepareAction\(/, "dispatching generation must never evaluate policy, check connector readiness, or prepare a provider action");
assert.doesNotMatch(fnBody, /\.from\("os_approvals"\)/, "an internal recommendation must never create an approval - there is nothing external to gate");
assert.doesNotMatch(fnBody, /openai|OpenAI|result_evidence|os_workflow_outcomes/i, "materialize.ts must never call a generator or persist the artifact directly - that is recommendation-service.ts's job");
assert.match(source, /import \{ idempotencyKeys \} from "@trigger\.dev\/sdk\/v3"/);
assert.match(fnBody, /await import\("@\/trigger\/slack-recommendation-generate"\)/, "the dedicated Trigger task must be dispatched, not run inline");
assert.match(fnBody, /idempotencyKeys\.create\(`slack-recommendation:\$\{input\.workflowId\}:\$\{input\.stepId\}`/);
assert.match(fnBody, /if \(input\.stepStatus === "completed"\) return missing\("recommendation_already_completed"/, "an already-completed step must never be re-dispatched");
assert.match(fnBody, /if \(input\.stepStatus !== "executing"\)/, "a step already dispatched (executing) must never be re-dispatched a second time");
assert.doesNotMatch(source, /connectorKey: "auterim"|capability: "internal\.recommendation\.write"/, "the PreparedAction/artifact shape for this step now lives in recommendation-service.ts, not materialize.ts");

// recommendation-service.ts owns the actual generation-to-persistence
// pipeline: reuse-existing-artifact check, generator orchestration, and
// only then persistence, in the correct order - completion is never
// marked on empty output, and result_evidence/outcomes are the same
// existing columns/table as before (no new migration).
const service = fs.readFileSync("src/lib/workflows/recommendation-service.ts", "utf8");
assert.match(service, /if \(stepResult\.data\.status === "completed"\) return \{ status: "already_completed" \}/, "a durable reuse-existing-artifact check must run before any generator call");
assert.match(service, /generateInternalRecommendation/);
assert.match(service, /if \(!generated\) return \{ status: "insufficient_evidence" \}/, "insufficient evidence must be a truthful non-completion, never a false completion");
const persistStart = service.indexOf("async function persistInternalRecommendation");
assert.ok(persistStart > 0);
const evidenceWriteIdx = service.indexOf("const persistEvidence =", persistStart);
const outcomeIdx = service.indexOf('outcome_type: "revenue_internal_recommendation_prepared"');
const stepCompleteIdx = service.indexOf('status: "completed", block_reason: null, result_ref:');
const workflowCompleteIdx = service.indexOf('.update({ status: "completed" })');
assert.ok(evidenceWriteIdx > 0 && outcomeIdx > evidenceWriteIdx && stepCompleteIdx > outcomeIdx && workflowCompleteIdx > stepCompleteIdx, "order must be: persist result_evidence -> record outcome -> mark step completed -> mark workflow completed");
assert.match(service, /generator: "openai" \| "deterministic_fallback"/);

// The dedicated Trigger task is thin: it delegates to recommendation-service.ts
// and, once done (or already done), dispatches the existing Slack lifecycle
// update mechanism rather than posting to Slack itself.
const recommendationTask = fs.readFileSync("src/trigger/slack-recommendation-generate.ts", "utf8");
assert.match(recommendationTask, /id: "slack-recommendation-generate"/);
assert.match(recommendationTask, /runInternalRecommendationGeneration/);
assert.match(recommendationTask, /triggerSlackLifecycleUpdate/);
assert.match(recommendationTask, /updateType: "acknowledgement"/, "the final recommendation reuses the single acknowledgement claim");
assert.doesNotMatch(recommendationTask, /chat\.postMessage|postSlackThreadReply/, "the generation task must never post to Slack directly - only the existing thread-update system does");

// The Slack workflow engine template must reuse this same internal step,
// and must never resolve an ambiguous set of connected PM connectors by
// guessing via the fixed preference order used elsewhere.
const engineSource = fs.readFileSync("src/lib/workflows/engine.ts", "utf8");
assert.match(engineSource, /chooseUnambiguousProjectConnector/);
assert.match(engineSource, /prepare_internal_recommendation/);
assert.match(engineSource, /isInternalCapability/);

console.log("Workflow materialization smoke: complete configured targets, canonical preparation, policy, approval continuations, fail-closed drafts, and connector-independent internal recommendation isolation verified.");

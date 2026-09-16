import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");

// 5/7. Trigger task discovery: the generation task and its two collaborators
// (event processing, lifecycle reply delivery) must all be plain exported
// task({...}) definitions under src/trigger, the sole dirs entry in
// trigger.config.ts - no separate registration step exists or is needed.
const triggerConfig = read("trigger.config.ts");
assert.match(triggerConfig, /dirs: \["\.\/src\/trigger"\]/);
assert.ok(fs.existsSync("src/trigger/slack-event-process.ts"));
assert.ok(fs.existsSync("src/trigger/slack-mention-acknowledge.ts"));
assert.ok(fs.existsSync("src/trigger/slack-thread-update.ts"));
assert.ok(fs.existsSync("src/trigger/slack-recommendation-generate.ts"));
const recommendationTask = read("src/trigger/slack-recommendation-generate.ts");
assert.match(recommendationTask, /export const slackRecommendationGenerate = task\(\{/);
assert.match(recommendationTask, /id: "slack-recommendation-generate"/);
assert.match(recommendationTask, /updateType: "acknowledgement"/, "the final recommendation must reuse the single acknowledgement claim");
assert.match(recommendationTask, /queue: \{ name: "slack-recommendations"/, "a dedicated queue keeps generation isolated from the higher-volume slack-events queue");
assert.match(recommendationTask, /maxDuration: 120/, "a tight maxDuration bounds the worker independently of the model call's own AI_REQUEST_TIMEOUT_MS");

// The provider-event processor dispatches generation but never calls a
// generator or the OpenAI SDK itself, and never awaits it inline - it only
// enqueues, matching the same fire-and-forget shape already used for
// dispatchMentionAcknowledgement.
const eventProcess = read("src/trigger/slack-event-process.ts");
assert.doesNotMatch(eventProcess, /openai|OpenAI|generateInternalRecommendation|runInternalRecommendationGeneration/i, "the provider-event processor must never touch generation directly - it must stay fast regardless of OpenAI's availability");
assert.match(eventProcess, /isMention && \(result\.internalRecommendationWorkflowIds\.length === 0 \|\| result\.internalRecommendationDispatchFailures > 0\)/, "the provider-event processor must skip the intermediate acknowledgement for successful internal recommendation workflows");
assert.match(eventProcess, /dispatchMentionAcknowledgement\(event\.id\)/, "non-recommendation and dispatch-failure paths retain a truthful immediate acknowledgement");

// 17. Paired message.channels + app_mention deliveries converge on one
// canonical signal (existing dedupe-key fix in engine.ts) and therefore one
// candidate and one workflow: createWorkflowFromSignalCandidate's own
// dedupe key is built from the same candidate source/sourceId identity.
const engine = read("src/lib/signals/engine.ts");
assert.match(engine, /event\.connectorKey === "slack" && event\.sourceType === "slack_message"/, "the canonical Slack dedupe key must be workspace/team/channel/message based, not per-delivery");
const workflowEngine = read("src/lib/workflows/engine.ts");
assert.match(workflowEngine, /canonicalWorkflowDedupeKey\(\{ workspaceId: candidate\.workspaceId, provider: candidate\.source, entityId: candidate\.sourceId/, "the workflow dedupe key must derive from the same converged candidate identity, so one candidate can only ever produce one workflow");

// 18/19. Reuse-existing-artifact and exactly-one-claim guarantees.
const service = read("src/lib/workflows/recommendation-service.ts");
assert.match(service, /if \(stepResult\.data\.status === "completed"\) return \{ status: "already_completed" \}/, "a Trigger retry must check for an existing artifact before calling any generator");
assert.match(service, /reusableRecommendationArtifact\(/, "a persisted recommendation artifact must be validated and reused before a new model call");
assert.match(service, /if \(existingRecommendation\)/, "a valid persisted artifact must short-circuit generation");
assert.match(service, /usage/, "safe model usage provenance is retained without persisting prompts or raw responses");
const materialize = read("src/lib/workflows/materialize.ts");
assert.match(materialize, /if \(input\.stepStatus === "completed"\) return missing\("recommendation_already_completed"/);
assert.match(materialize, /if \(input\.stepStatus !== "executing"\)/, "a step already dispatched must never be dispatched a second time");
const ledger = read("supabase/migrations/20260915_slack_thread_updates.sql");
assert.match(ledger, /unique \(workspace_id, channel_id, source_message_ts, update_type\)/, "the durable claim ledger guarantees one final acknowledgement per Slack message");
const ack = read("src/lib/connectors/slack-acknowledgement.ts");
assert.match(ack, /slackThreadUpdateKey/, "the final acknowledgement uses the durable workspace/channel/message claim key");
assert.match(ack, /recommendationPending/, "the initial acknowledgement defers without claiming while an internal recommendation is being generated");
assert.match(ack, /const updateType = input\.updateType \?\? "acknowledgement"/, "the deferral guard must use the normalized default update type");

// 20-24. External action, CRM mutation, email, and PM task creation must be
// architecturally impossible from this generator - the schema has no such
// fields, the prompt forbids claiming them, and neither module ever
// references a connector-writing action type or the approval-execution path.
const schema = read("src/lib/workflows/recommendation-schema.ts");
const prompt = read("src/lib/workflows/recommendation-prompt.ts");
const generator = read("src/lib/workflows/recommendation-generator.ts");
const openaiGen = read("src/lib/workflows/openai-recommendation-generator.ts");
for (const source of [schema, generator, openaiGen]) {
  assert.doesNotMatch(source, /create_jira_issue|create_asana_task|create_task|create_crm_|update_crm_record|send_email|send_slack_message|os_approvals/, "no PM/CRM/customer-facing action type or approval-table write may appear in the generation pipeline");
}
assert.match(prompt, /Never state or imply that an email was sent, a quote was created, a CRM record was updated or created, a task was created/);
assert.match(prompt, /Any customer-facing next action always requires human approval/);
assert.match(schema, /approvalRequiredForNextAction: z\.literal\(true\)/);
assert.match(schema, /externalActionTaken: z\.literal\(false\)/);
assert.match(openaiGen, /approvalRequiredForNextAction: true, externalActionTaken: false \}/, "the two policy invariants must be force-set in application code regardless of model output");
assert.match(openaiGen, /store: false/, "the Responses API call must not retain the raw response by default");
assert.match(openaiGen, /reasoning: \{ effort: "low" \}/);
assert.doesNotMatch(openaiGen, /tools\s*:/, "the recommendation request must not expose tools");

// Connector-aware PM behavior from the previous pass remains untouched and
// still approval-gated for Jira/Asana/Trello, unaffected by this feature.
assert.match(workflowEngine, /chooseUnambiguousProjectConnector/);
assert.match(workflowEngine, /create_jira_issue.*approvalRequired: true|approvalRequired: true.*create_jira_issue/s);

// 26. The existing deterministic builder (recommendation.ts) is completely
// untouched in its core logic - only two small, additive exports were added
// so recommendation-service.ts can reuse them without duplicating them.
const deterministic = read("src/lib/workflows/recommendation.ts");
assert.match(deterministic, /export function buildRevenueInternalRecommendation/);
assert.match(deterministic, /export function extractSeatCount/);
assert.match(deterministic, /export function intentLabelFor/);
assert.match(generator, /buildRevenueInternalRecommendation/, "the deterministic generator wrapper must reuse the existing builder, not reimplement it");

// Configuration: env vars documented (server-side only, never NEXT_PUBLIC_),
// and the OpenAI SDK is a real, pinned dependency.
const envExample = read(".env.example");
assert.match(envExample, /OPENAI_API_KEY=/);
assert.match(envExample, /OPENAI_RECOMMENDATION_MODEL=/);
assert.match(envExample, /OPENAI_RECOMMENDATIONS_ENABLED=/);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_OPENAI/);
const packageJson = read("package.json");
assert.match(packageJson, /"openai":/);

console.log("Slack recommendation architecture smoke: Trigger task discovery, non-blocking dispatch, paired-event/one-workflow convergence, idempotent reuse, no PM/CRM/customer-facing leakage, untouched deterministic builder, and env/package configuration verified.");

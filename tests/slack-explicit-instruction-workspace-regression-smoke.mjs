import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// End-to-end reproduction of the exact reported production workspace
// configuration: Gmail, Slack, and HubSpot connected; Jira, Asana, and
// Trello available product-wide but NOT connected to this workspace. A
// direct Slack app mention with an explicit internal-action instruction
// must still produce a single, bounded, connector-independent internal
// Auterim recommendation - never a faked external PM task, never a
// customer-facing message, never a CRM mutation.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-slack-workspace-regression");
fs.mkdirSync(tmpDir, { recursive: true });

async function loadSignalEngine() {
  const inbound = fs.readFileSync(path.join(root, "src/lib/signals/inbound.ts"), "utf8").replace('import type { SignalEvent } from "@/lib/signals/types";\n', "");
  const ownership = fs.readFileSync(path.join(root, "src/lib/workforce/ownership.ts"), "utf8")
    .replace('import type { SignalDecision } from "@/lib/signals/engine";\n', "")
    .replace('import type { SignalEvent } from "@/lib/signals/types";\n', "")
    .replace(/COMMERCIAL_TERMS/g, "WF_COMMERCIAL_TERMS")
    .replace(/textOf/g, "workforceTextOf");
  const identity = fs.readFileSync(path.join(root, "src/lib/workflows/identity.ts"), "utf8");
  const source = fs.readFileSync(path.join(root, "src/lib/signals/engine.ts"), "utf8")
    .replace('import { classifyInboundSignalEvent, type InboundActionability, type InboundClassification, type InboundOperatorKey, type RevenueIntentSignal } from "@/lib/signals/inbound";\n', () => `${inbound}\n`)
    .replace('import { arbitrateSignalOwnership } from "@/lib/workforce/ownership";\n', `${ownership}\n`)
    .replace('import { explicitBusinessProblemKey } from "@/lib/workflows/identity";\n', `${identity}\n`)
    .replace('import { stripSlackMentionMarkup } from "@/lib/connectors/slack-events";\n', 'const stripSlackMentionMarkup = (value) => value.replace(/<@[UW][A-Z0-9]+>/gi, " ").replace(/<!subteam\\^[A-Z0-9]+(?:\\|[^>]+)?>/gi, " ").replace(/<!(?:channel|everyone|here)>/gi, " ").replace(/\\s+/g, " ").trim();\n');
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, "signal-engine.mjs");
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href + `?t=${Date.now()}`);
}

async function loadWorkflowEngine() {
  let source = fs.readFileSync(path.join(root, "src/lib/workflows/engine.ts"), "utf8");
  source = source
    .replace(/import \{ getActionDefinition \}[^\n]+\n/, "const ACTION_DEFS = { prepare_internal_recommendation: { capability: \"internal.recommendation.write\" }, create_jira_issue: { capability: \"pm.tasks.create_after_approval\" }, create_asana_task: { capability: \"pm.tasks.create_after_approval\" }, create_task: { capability: \"pm.tasks.write_after_approval\" }, send_email: { capability: \"email.send_after_approval\" } };\nconst getActionDefinition = (actionType) => ACTION_DEFS[actionType] ?? { capability: \"stub.capability\" };\n")
    .replace(/import \{ connectorHasCapability, isInternalCapability \}[^\n]+\n/, "const connectorHasCapability = () => true;\nconst isInternalCapability = (capability) => capability === \"internal.recommendation.write\";\n")
    .replace(/import \{[^\n]+\} from \"@\/lib\/workflows\/identity\";\n/, "const canonicalWorkflowDedupeKey = (input) => `workflow:${[input.workspaceId, input.provider, input.entityId, input.intent, input.primaryOperator].join(\":\")}`;\nconst canonicalBusinessProblemWorkflowDedupeKey = (input) => canonicalWorkflowDedupeKey({ workspaceId: input.workspaceId, provider: \"business_problem\", entityId: input.problemKey, intent: input.intent, primaryOperator: input.primaryOperator });\nconst explicitBusinessProblemKey = () => null;\n");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, "workflow-engine.mjs");
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href + `?t=${Date.now()}`);
}

async function loadPureModule(relativePath, outName) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, outName);
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href + `?t=${Date.now()}`);
}

try {
  const { routeSignalEvent } = await loadSignalEngine();
  const { planCandidateWorkflow } = await loadWorkflowEngine();
  const { buildRevenueInternalRecommendation } = await loadPureModule("src/lib/workflows/recommendation.ts", "recommendation.mjs");
  const { composeSlackReply } = await loadPureModule("src/lib/connectors/slack-acknowledgement-copy.ts", "slack-acknowledgement-copy.mjs");

  // Exactly the reported production workspace connector state.
  const CONNECTED_CONNECTOR_KEYS = ["gmail", "slack", "hubspot"];
  const EXECUTABLE_CONNECTOR_KEYS = ["gmail", "slack", "hubspot"];
  assert.ok(!CONNECTED_CONNECTOR_KEYS.includes("jira") && !CONNECTED_CONNECTOR_KEYS.includes("asana") && !CONNECTED_CONNECTOR_KEYS.includes("trello"), "the regression must reproduce zero connected PM connectors");

  const mentionEvent = {
    workspaceId: "ws-auterim",
    source: "slack",
    connectorKey: "slack",
    sourceType: "slack_message",
    eventType: "slack.app_mentioned",
    sourceId: "1789489622.919069",
    subject: "Slack #sales",
    snippet: "We have a high-intent 50-seat prospect requesting pricing. Please prepare the recommended next step.",
    metadata: {
      slackInbound: true,
      slackAppMentioned: true,
      channelId: "C05LD12LR5H",
      messageTs: "1789489622.919069",
      teamId: "T-AUTERIM",
    },
  };

  // Exactly one canonical signal / one routed candidate.
  const routed = routeSignalEvent(mentionEvent);
  assert.equal(routed.candidates.length, 1, "exactly one Revenue candidate must be produced");
  const candidate = routed.candidates[0];
  assert.equal(candidate.operatorKey, "revenue");
  assert.equal(routed.decision.category, "sales_opportunity");
  assert.equal(routed.decision.priority, 65, "the explicit instruction must clear the workflow materialization threshold");
  assert.ok(routed.decision.reasonCodes.includes("slack:explicit_instruction"), "reason code slack:explicit_instruction must be present");
  assert.equal(candidate.priority, 65);
  assert.equal(candidate.source, "slack");

  // Chain the routed candidate straight into workflow planning with the
  // reproduced connector state.
  const plan = planCandidateWorkflow({
    candidate: { ...candidate, status: "routed" },
    signalId: "sig_ws-auterim:slack:slack_message:1789489622-919069",
    context: { activeOperatorKeys: ["revenue"], connectedConnectorKeys: CONNECTED_CONNECTOR_KEYS, executableConnectorKeys: EXECUTABLE_CONNECTOR_KEYS, executionEligible: true },
    now: "2026-09-15T16:30:00.000Z",
  });
  assert.ok(plan, "a workflow/recommendation must be materialized even with no PM connector connected");
  assert.equal(plan.steps.length, 1, "exactly one bounded step - the internal recommendation");
  const recommendationStep = plan.steps[0];
  assert.equal(recommendationStep.actionType, "prepare_internal_recommendation", "must be the genuine internal Auterim step, never a faked Jira/Asana/Trello/generic task");
  assert.equal(recommendationStep.connectorKey, "auterim");
  assert.equal(recommendationStep.approvalRequired, false, "the internal record itself performs no external action");

  // No external PM action, no customer-facing message, no CRM mutation.
  const forbiddenActionTypes = ["create_jira_issue", "create_asana_task", "create_task", "move_task", "add_task_comment", "send_email", "send_slack_message", "send_teams_message", "create_crm_contact", "create_crm_deal", "create_crm_note", "create_crm_task", "update_crm_record"];
  assert.equal(plan.steps.some((step) => forbiddenActionTypes.includes(step.actionType)), false, "no external PM action, customer-facing message, or CRM mutation may be planned");
  assert.equal(plan.steps.some((step) => step.connectorKey === "gmail" || step.connectorKey === "hubspot"), false, "the connected but unrelated Gmail/HubSpot connectors must not be pressed into service for this recommendation");

  // Chain straight through to the substantive recommendation artifact and
  // the final Slack reply, using exactly the persisted candidate evidence
  // routeSignalEvent produced (never re-derived or guessed).
  const artifact = buildRevenueInternalRecommendation({
    candidate: { operatorKey: candidate.operatorKey, signalType: candidate.signalType, confidence: candidate.confidence, reasonCodes: candidate.reasonCodes, evidence: candidate.evidence },
    signal: { contentPreview: mentionEvent.snippet },
    now: "2026-09-15T16:30:05.000Z",
  });
  assert.ok(artifact, "a substantive recommendation must be produced from the routed candidate's own evidence");
  assert.equal(artifact.recommendedNextStep.en, "Review the prospect's 50-seat scope, prepare the applicable pricing and onboarding options, and route any customer-facing response for approval.");
  assert.equal(artifact.approvalRequiredForNextAction, true);
  assert.equal(artifact.externalActionTaken, false);
  assert.deepEqual(artifact.source, { provider: "slack", channelId: "C05LD12LR5H", messageTs: "1789489622.919069", threadTs: null });

  const finalReply = composeSlackReply({ state: "recommendation_ready", language: "en", operatorName: "Revenue Operator", intentLabel: "pricing opportunity", confidence: "high", recommendedNextStepText: artifact.recommendedNextStep.en });
  assert.equal(finalReply, "Recommended next step: Review the prospect's 50-seat scope, prepare the applicable pricing and onboarding options, and route any customer-facing response for approval. No external action has been taken.");

  console.log("Slack explicit-instruction workspace regression smoke: ws-auterim connector configuration (Gmail/Slack/HubSpot only), explicit-instruction elevation, connector-independent internal recommendation, and the final substantive Slack reply verified end-to-end.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

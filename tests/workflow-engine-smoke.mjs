import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd(); const tmp = path.join(root, "tests", ".tmp-workflow-engine"); fs.mkdirSync(tmp, { recursive: true });
try {
  let source = fs.readFileSync("src/lib/workflows/engine.ts", "utf8");
  source = source.replace(/import \{ getActionDefinition \}[^\n]+\n/, "const ACTION_DEFS = { prepare_internal_recommendation: { capability: \"internal.recommendation.write\" } };\nconst getActionDefinition = (actionType) => ACTION_DEFS[actionType] ?? { capability: \"stub.capability\" };\n").replace(/import \{ connectorHasCapability, isInternalCapability \}[^\n]+\n/, "const connectorHasCapability = () => false;\nconst isInternalCapability = (capability) => capability === \"internal.recommendation.write\";\n").replace(/import \{[^\n]+\} from \"@\/lib\/workflows\/identity\";\n/, "const canonicalWorkflowDedupeKey = (input) => `workflow:${[input.workspaceId, input.provider, input.entityId, input.intent, input.primaryOperator].join(\":\")}`;\nconst canonicalBusinessProblemWorkflowDedupeKey = (input) => canonicalWorkflowDedupeKey({ workspaceId: input.workspaceId, provider: \"business_problem\", entityId: input.problemKey, intent: input.intent, primaryOperator: input.primaryOperator });\nconst explicitBusinessProblemKey = () => null;\n");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmp, "engine.mjs"); fs.writeFileSync(file, code);
  const { chooseProjectConnector, chooseUnambiguousProjectConnector, planCandidateWorkflow, conservativeAttribution } = await import(pathToFileURL(file).href);
  assert.equal(chooseProjectConnector(["trello", "asana", "jira"], ["trello", "asana", "jira"]), "jira", "project substitution is deterministic");
  assert.equal(chooseUnambiguousProjectConnector(["jira"], ["jira"]), "jira", "a single connected PM tool is unambiguous");
  assert.equal(chooseUnambiguousProjectConnector([], []), null, "zero connected PM tools is not a guess target");
  assert.equal(chooseUnambiguousProjectConnector(["jira", "asana"], ["jira", "asana"]), null, "multiple connected PM tools with no declared preference must never be guessed");
  const candidate = { id: "c1", dedupeKey: "support-1", workspaceId: "ws-1", operatorKey: "client_flow", signalType: "support_risk", confidence: "high", priority: 90, source: "zendesk", sourceId: "ticket-1", routeReason: "urgent", status: "routed", metadata: {} };
  const plan = planCandidateWorkflow({ candidate, signalId: "signal-1", context: { activeOperatorKeys: ["client_flow"], connectedConnectorKeys: ["jira", "microsoft_teams", "zendesk"], executableConnectorKeys: ["jira", "microsoft_teams", "zendesk"], executionEligible: true }, now: "2026-09-08T12:00:00.000Z" });
  assert.equal(plan?.objective, "Resolve customer escalation");
  assert.deepEqual(plan?.steps.map((step) => step.id), ["pm-follow-up", "internal-escalation", "customer-response"]);
  assert.deepEqual(plan?.steps[1].dependencyStepIds, ["pm-follow-up"]);
  assert.equal(planCandidateWorkflow({ candidate, signalId: "signal-1", context: { activeOperatorKeys: [], connectedConnectorKeys: ["jira"], executableConnectorKeys: ["jira"], executionEligible: true } }), null, "inactive operators cannot auto-start a workflow");
  assert.equal(conservativeAttribution({ hasObservedProviderState: false, hasLinkedAction: true, hasDeterministicProviderRelation: true }), null, "execution alone is not an outcome");
  assert.equal(conservativeAttribution({ hasObservedProviderState: true, hasLinkedAction: true, hasDeterministicProviderRelation: false }), "influenced");

  // A Slack-sourced revenue candidate must get its own bounded internal
  // recommendation template (an internal PM task), never the email
  // follow-up template - a Slack message timestamp is not an email target.
  const slackCandidate = { id: "c2", dedupeKey: "slack-1", workspaceId: "ws-1", operatorKey: "revenue", signalType: "sales_opportunity", confidence: "high", priority: 65, source: "slack", sourceId: "1789489622.919069", routeReason: "explicit instruction", status: "routed", metadata: {} };
  const slackPlanWithPm = planCandidateWorkflow({ candidate: slackCandidate, signalId: "signal-slack-1", context: { activeOperatorKeys: ["revenue"], connectedConnectorKeys: ["jira", "gmail"], executableConnectorKeys: ["jira", "gmail"], executionEligible: true }, now: "2026-09-15T16:30:00.000Z" });
  assert.equal(slackPlanWithPm?.objective, "Prepare recommended next step for Slack request");
  assert.equal(slackPlanWithPm?.steps.length, 1);
  assert.equal(slackPlanWithPm?.steps[0].actionType, "create_jira_issue", "the recommended next step is an internal PM task, not a customer-facing or CRM action");
  assert.equal(slackPlanWithPm?.steps[0].connectorKey, "jira");
  assert.equal(slackPlanWithPm?.steps[0].approvalRequired, true, "the internal task still requires approval before creation");

  // The exact production workspace configuration: Gmail, Slack, and HubSpot
  // connected, no Jira/Asana/Trello. The Slack template must never fall back
  // to emailing the Slack message timestamp as if it were an address, and
  // must still materialize a bounded, connector-independent internal
  // recommendation rather than proposing nothing.
  const slackPlanNoPm = planCandidateWorkflow({ candidate: slackCandidate, signalId: "signal-slack-1", context: { activeOperatorKeys: ["revenue"], connectedConnectorKeys: ["gmail", "slack", "hubspot"], executableConnectorKeys: ["gmail", "slack", "hubspot"], executionEligible: true } });
  assert.equal(slackPlanNoPm?.steps.length, 1, "no PM connector must still produce exactly one bounded internal recommendation step");
  assert.equal(slackPlanNoPm?.steps[0].actionType, "prepare_internal_recommendation", "the fallback must be a genuine internal Auterim step, never a faked Jira/Asana/Trello/generic external task");
  assert.equal(slackPlanNoPm?.steps[0].connectorKey, "auterim");
  assert.equal(slackPlanNoPm?.steps[0].approvalRequired, false, "recording an internal recommendation performs no external action and needs no approval gate");
  assert.equal((slackPlanNoPm?.steps ?? []).some((step) => step.actionType === "send_email"), false);
  assert.equal((slackPlanNoPm?.steps ?? []).some((step) => ["create_jira_issue", "create_asana_task", "create_task", "create_crm_task", "create_crm_note"].includes(step.actionType)), false, "no PM/CRM connector means no external task of any kind may be faked");

  // Ambiguous workspace configuration (two PM tools connected, no declared
  // preference) must also stay internal rather than guessing which one.
  const slackPlanAmbiguousPm = planCandidateWorkflow({ candidate: slackCandidate, signalId: "signal-slack-1", context: { activeOperatorKeys: ["revenue"], connectedConnectorKeys: ["jira", "asana"], executableConnectorKeys: ["jira", "asana"], executionEligible: true } });
  assert.equal(slackPlanAmbiguousPm?.steps.length, 1);
  assert.equal(slackPlanAmbiguousPm?.steps[0].actionType, "prepare_internal_recommendation", "an ambiguous set of connected PM tools must never be arbitrarily resolved by a hardcoded preference order");

  // A non-Slack revenue candidate must be unaffected and still get the
  // existing email follow-up template.
  const emailCandidate = { ...slackCandidate, id: "c3", dedupeKey: "gmail-1", source: "gmail", sourceId: "lead@example.com" };
  const emailPlan = planCandidateWorkflow({ candidate: emailCandidate, signalId: "signal-email-1", context: { activeOperatorKeys: ["revenue"], connectedConnectorKeys: ["gmail"], executableConnectorKeys: ["gmail"], executionEligible: true } });
  assert.equal(emailPlan?.steps[0].actionType, "send_email");
  assert.equal(emailPlan?.steps[0].targetRef, "lead@example.com");

  console.log("Workflow engine smoke: controlled templates, deterministic provider preference, activation, dependencies, conservative attribution, and Slack-native internal recommendation template verified.");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

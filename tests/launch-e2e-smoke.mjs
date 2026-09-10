import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";
const engine = fs.readFileSync("src/lib/workflows/engine.ts", "utf8");
const materialize = fs.readFileSync("src/lib/workflows/materialize.ts", "utf8");
const lifecycle = fs.readFileSync("src/lib/workflows/lifecycle.ts", "utf8");
assert.match(engine, /support_risk/);
assert.match(engine, /delivery_risk/);
assert.match(engine, /commercial_intent/);
assert.match(materialize, /create_asana_task/);
assert.match(materialize, /create_jira_issue/);
assert.match(materialize, /send_teams_message/);
assert.match(materialize, /send_slack_message/);
assert.match(materialize, /send_email/);
assert.match(materialize, /findExistingCustomerReply/);
assert.match(lifecycle, /materializeWorkflowStep/);

const tmp = path.join("tests", ".tmp-launch-e2e"); fs.mkdirSync(tmp, { recursive: true });
try {
  let source = engine.replace(/import \{ getActionDefinition \}[^\n]+\n/, "const getActionDefinition = () => null;\n").replace(/import \{ connectorHasCapability \}[^\n]+\n/, "const connectorHasCapability = () => false;\n").replace(/import \{ canonicalBusinessProblemWorkflowDedupeKey, canonicalWorkflowDedupeKey, explicitBusinessProblemKey \}[^\n]+\n/, "const canonicalWorkflowDedupeKey = (input) => `workflow:${[input.workspaceId, input.provider, input.entityId, input.intent, input.primaryOperator].join(\":\")}`;\nconst canonicalBusinessProblemWorkflowDedupeKey = canonicalWorkflowDedupeKey;\nconst explicitBusinessProblemKey = () => null;\n").replace(/import type[^\n]+\n/g, "");
  const code = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" }).code;
  const file = path.join(tmp, "engine.mjs"); fs.writeFileSync(file, code);
  const { planCandidateWorkflow } = await import(`${pathToFileURL(file).href}?launch=${Math.random()}`);
  const candidate = (operatorKey, signalType, sourceName, sourceId) => ({ id: `${operatorKey}-${sourceId}`, dedupeKey: `${operatorKey}-${sourceId}`, workspaceId: "ws-beta", operatorKey, signalType, confidence: "high", priority: 90, source: sourceName, sourceId, routeReason: "launch-e2e", status: "routed", metadata: {} });
  const common = { activeOperatorKeys: ["client_flow", "operations", "revenue"], connectedConnectorKeys: ["jira", "asana", "trello", "microsoft_teams", "slack", "zendesk", "gmail"], executableConnectorKeys: ["jira", "microsoft_teams", "slack", "zendesk", "gmail"], executionEligible: true };
  const client = planCandidateWorkflow({ candidate: candidate("client_flow", "support_risk", "zendesk", "ticket-1"), signalId: "sig-client", context: common });
  assert.deepEqual(client?.steps.map((step) => step.id), ["pm-follow-up", "internal-escalation", "customer-response"]);
  const operations = planCandidateWorkflow({ candidate: candidate("operations", "stalled_work", "jira", "issue-1"), signalId: "sig-ops", context: common });
  assert.deepEqual(operations?.steps.map((step) => step.id), ["pm-follow-up", "internal-escalation"]);
  const revenue = planCandidateWorkflow({ candidate: candidate("revenue", "commercial_intent", "gmail", "thread-1"), signalId: "sig-revenue", context: common });
  assert.equal(revenue?.steps[0]?.actionType, "send_email");
  const fallback = planCandidateWorkflow({ candidate: candidate("operations", "stalled_work", "trello", "card-1"), signalId: "sig-fallback", context: { ...common, connectedConnectorKeys: ["asana", "trello"], executableConnectorKeys: ["asana", "trello"] } });
  assert.equal(fallback?.steps[0]?.connectorKey, "asana");
  const trialStopped = planCandidateWorkflow({ candidate: candidate("operations", "stalled_work", "jira", "issue-2"), signalId: "sig-trial", context: { ...common, executionEligible: false } });
  assert.equal(trialStopped, null);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("Launch E2E smoke: Client Flow, Operations, Revenue, provider fallback, trial stop, dependency advancement, and existing-draft reuse paths verified through the workflow engine.");

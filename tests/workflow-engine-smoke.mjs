import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd(); const tmp = path.join(root, "tests", ".tmp-workflow-engine"); fs.mkdirSync(tmp, { recursive: true });
try {
  let source = fs.readFileSync("src/lib/workflows/engine.ts", "utf8");
  source = source.replace(/import \{ getActionDefinition \}[^\n]+\n/, "const getActionDefinition = () => null;\n").replace(/import \{ connectorHasCapability \}[^\n]+\n/, "const connectorHasCapability = () => false;\n").replace(/import \{[^\n]+\} from \"@\/lib\/workflows\/identity\";\n/, "const canonicalWorkflowDedupeKey = (input) => `workflow:${[input.workspaceId, input.provider, input.entityId, input.intent, input.primaryOperator].join(\":\")}`;\nconst canonicalBusinessProblemWorkflowDedupeKey = (input) => canonicalWorkflowDedupeKey({ workspaceId: input.workspaceId, provider: \"business_problem\", entityId: input.problemKey, intent: input.intent, primaryOperator: input.primaryOperator });\nconst explicitBusinessProblemKey = () => null;\n");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmp, "engine.mjs"); fs.writeFileSync(file, code);
  const { chooseProjectConnector, planCandidateWorkflow, conservativeAttribution } = await import(pathToFileURL(file).href);
  assert.equal(chooseProjectConnector(["trello", "asana", "jira"], ["trello", "asana", "jira"]), "jira", "project substitution is deterministic");
  const candidate = { id: "c1", dedupeKey: "support-1", workspaceId: "ws-1", operatorKey: "client_flow", signalType: "support_risk", confidence: "high", priority: 90, source: "zendesk", sourceId: "ticket-1", routeReason: "urgent", status: "routed", metadata: {} };
  const plan = planCandidateWorkflow({ candidate, signalId: "signal-1", context: { activeOperatorKeys: ["client_flow"], connectedConnectorKeys: ["jira", "microsoft_teams", "zendesk"], executableConnectorKeys: ["jira", "microsoft_teams", "zendesk"], executionEligible: true }, now: "2026-09-08T12:00:00.000Z" });
  assert.equal(plan?.objective, "Resolve customer escalation");
  assert.deepEqual(plan?.steps.map((step) => step.id), ["pm-follow-up", "internal-escalation", "customer-response"]);
  assert.deepEqual(plan?.steps[1].dependencyStepIds, ["pm-follow-up"]);
  assert.equal(planCandidateWorkflow({ candidate, signalId: "signal-1", context: { activeOperatorKeys: [], connectedConnectorKeys: ["jira"], executableConnectorKeys: ["jira"], executionEligible: true } }), null, "inactive operators cannot auto-start a workflow");
  assert.equal(conservativeAttribution({ hasObservedProviderState: false, hasLinkedAction: true, hasDeterministicProviderRelation: true }), null, "execution alone is not an outcome");
  assert.equal(conservativeAttribution({ hasObservedProviderState: true, hasLinkedAction: true, hasDeterministicProviderRelation: false }), "influenced");
  console.log("Workflow engine smoke: controlled templates, deterministic provider preference, activation, dependencies, and conservative attribution verified.");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

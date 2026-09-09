import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Smoke tests for the real workflow architecture. The Workflows page reads
// persisted workflow presentations from /api/workflows; it must never fall
// back to demo suggestions or the deleted mock recommendation engine.
// The real-workspace adapter is tested below as an additive unlock surface.

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function testPersistedWorkflowsSurface() {
  const workflowsPage = read("src/app/app/workflows/page.tsx");
  const workflowsRoute = read("src/app/api/workflows/route.ts");
  const presentation = read("src/lib/workflows/presentation.ts");

  assert.match(workflowsPage, /fetch\("\/api\/workflows"/, "Workflows page must load the real workflow API");
  assert.match(workflowsPage, /WorkflowPresentation/, "Workflows page must render persisted workflow presentations");
  assert.doesNotMatch(workflowsPage, /getSuggestedWorkflows|installWorkflowFromSuggestion/, "Workflows page must not use the deleted mock engine");
  assert.match(workflowsRoute, /requireWorkspaceMember/, "Workflow API must enforce workspace membership");
  assert.match(workflowsRoute, /getWorkflowPresentations/, "Workflow API must use the persisted workflow presentation adapter");
  assert.match(presentation, /from\("os_workflow_runs"\)/, "Workflow presentations must originate from persisted workflow runs");
  assert.match(presentation, /from\("os_workflow_steps"\)/, "Workflow presentations must include persisted steps");
  assert.match(presentation, /from\("os_workflow_outcomes"\)/, "Workflow presentations must include persisted outcome evidence");
  assert.doesNotMatch(presentation, /getSuggestedWorkflows|SuggestedWorkflow/, "Workflow presentation data must not be demo suggestions");
}

function testNoAspirationalConnectorsInRealDefinitions() {
  const source = read("src/lib/os/workflow-recommendations.ts");
  const startIdx = source.indexOf("const REAL_WORKFLOW_SUGGESTION_DEFINITIONS");
  const endIdx = source.indexOf("export type RealWorkflowSuggestion");
  const block = source.slice(startIdx, endIdx);
  assert.ok(startIdx > 0 && endIdx > startIdx);

  const ASPIRATIONAL = ["pipedrive", "airtable", "teams", "stripe", "shopify", "notion", "google-drive", "confluence", "google-calendar", "outlook-calendar", "calendly", "google_drive", "google_calendar"];
  for (const connector of ASPIRATIONAL) {
    assert.doesNotMatch(block, new RegExp(`["']${connector}["']`), `real workflow suggestion definitions must never reference the aspirational connector "${connector}"`);
  }
  const REAL = ["gmail", "microsoft", "hubspot", "salesforce", "trello", "slack", "zendesk", "intercom"];
  for (const connector of REAL) {
    assert.match(block, new RegExp(`["']${connector}["']`), `expected the real connector "${connector}" to be referenced somewhere in the real suggestion definitions`);
  }
}

async function loadRealAdapter() {
  const source = fs.readFileSync(path.join(root, "src/lib/os/workflow-recommendations.ts"), "utf8");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const tmpDir = path.join(root, "tests", ".tmp-workflow-recommendations-real-smoke");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `workflow-recommendations-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  try {
    return await import(pathToFileURL(tmpFile).href);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function testRealAdapterRuntime() {
  const mod = await loadRealAdapter();
  const getReal = mod.getRealWorkspaceSuggestedWorkflows;
  assert.equal(typeof getReal, "function");

  const allReady = [
    { operatorKey: "revenue", ready: true },
    { operatorKey: "client_flow", ready: true },
    { operatorKey: "operations", ready: true },
    { operatorKey: "support", ready: true },
  ];

  // 1. Microsoft/Gmail + CRM -> real Revenue suggestion.
  {
    const result = getReal({ connectedConnectorKeys: ["gmail", "hubspot"], operatorReadiness: allReady });
    assert.ok(result.some((s) => s.id === "real-inbound-revenue-followup"), "Gmail + HubSpot must produce the real Revenue follow-up suggestion");
  }
  {
    const result = getReal({ connectedConnectorKeys: ["microsoft", "salesforce"], operatorReadiness: allReady });
    assert.ok(result.some((s) => s.id === "real-inbound-revenue-followup"), "Microsoft 365 + Salesforce must also satisfy the Revenue follow-up suggestion");
  }

  // 2. Trello + Slack -> real Operations suggestion.
  {
    const result = getReal({ connectedConnectorKeys: ["trello", "slack"], operatorReadiness: allReady });
    const found = result.find((s) => s.id === "real-operations-trello-slack-escalation");
    assert.ok(found, "Trello + Slack must produce the real Operations escalation suggestion");
    assert.equal(found.operatorKey, "operations");
    assert.deepEqual(found.href, "/agents/operations");
  }

  // 3. Email + Trello -> real Client Flow suggestion.
  {
    const result = getReal({ connectedConnectorKeys: ["gmail", "trello"], operatorReadiness: allReady });
    const found = result.find((s) => s.id === "real-client-flow-email-trello-delivery");
    assert.ok(found, "Gmail + Trello must produce the real Client Flow delivery task suggestion");
    assert.equal(found.href, "/agents/client-flow");
  }

  // 4. Missing capability -> hidden (Trello alone, no Slack, for the escalation suggestion).
  {
    const result = getReal({ connectedConnectorKeys: ["trello"], operatorReadiness: allReady });
    assert.ok(!result.some((s) => s.id === "real-operations-trello-slack-escalation"), "missing Slack must hide the Operations escalation suggestion");
  }

  // 5. Unhealthy/disconnected connector -> removed (caller only ever passes healthy connectors,
  // so simulating a connector going unhealthy is just omitting it from connectedConnectorKeys).
  {
    const beforeBreak = getReal({ connectedConnectorKeys: ["gmail", "hubspot"], operatorReadiness: allReady });
    const afterBreak = getReal({ connectedConnectorKeys: ["gmail"], operatorReadiness: allReady });
    assert.ok(beforeBreak.some((s) => s.id === "real-inbound-revenue-followup"));
    assert.ok(!afterBreak.some((s) => s.id === "real-inbound-revenue-followup"), "HubSpot becoming unhealthy must remove the Revenue follow-up suggestion");
  }

  // 6. Operator not actually ready (real readiness false) -> hidden even with all connectors present.
  {
    const result = getReal({
      connectedConnectorKeys: ["trello", "slack"],
      operatorReadiness: [{ operatorKey: "operations", ready: false }],
    });
    assert.ok(!result.some((s) => s.id === "real-operations-trello-slack-escalation"), "an operator that is not really ready must hide its suggestion even if connectors are healthy");
  }

  // 7. Support can use any one of its real communication paths.
  {
    const result = getReal({ connectedConnectorKeys: ["zendesk"], operatorReadiness: allReady });
    const found = result.find((s) => s.id === "real-support-response-workflow");
    assert.ok(found, "Zendesk alone must produce the real Support response suggestion");
    assert.equal(found.operatorKey, "support");
    assert.equal(found.href, "/agents/support");
  }

  console.log("  getRealWorkspaceSuggestedWorkflows runtime checks passed: real combos, support path, missing-capability hiding, unhealthy-connector removal, and readiness gating verified.");
}

function testUnlockCopyMentionsNewWorkflow() {
  const source = read("src/lib/operators/unlock-copy.ts");
  assert.match(source, /import \{ getRealWorkspaceSuggestedWorkflows, type RealWorkflowSuggestion \} from "@\/lib\/os\/workflow-recommendations";/, "unlock-copy.ts must reuse the real workflow adapter, not invent its own");
  assert.match(source, /function getNewlyAvailableWorkflowSuggestion/, "unlock-copy.ts must compute a real before/after workflow-suggestion diff");
  assert.match(source, /Suggested workflow: \$\{newWorkflow\.title\}/, "unlockMessageForConnector must surface the real suggestion title when one newly became available");

  const connectors = read("src/app/app/connectors/page.tsx");
  assert.match(connectors, /operatorReadiness: operatorReadiness\.map/, "connectors page must pass real operatorReadiness into unlockMessageForConnector so the workflow mention can surface");
}

async function main() {
  testPersistedWorkflowsSurface();
  testNoAspirationalConnectorsInRealDefinitions();
  testUnlockCopyMentionsNewWorkflow();
  await testRealAdapterRuntime();
  console.log("workflow-recommendations-real-smoke: all checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

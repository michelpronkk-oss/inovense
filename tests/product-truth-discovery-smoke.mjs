import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-product-truth-discovery-smoke");
const results = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

async function check(number, name, fn) {
  await fn();
  results.push(number);
  console.log(`  ${number}. ${name}`);
}

async function loadModule(relSourcePath, replacements = []) {
  let source = read(relSourcePath);
  for (const [search, replace] of replacements) {
    assert.ok(source.includes(search), `expected import in ${relSourcePath}: ${search}`);
    source = source.replace(search, replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

function truth(connectorKey, status = "healthy") {
  return { connectorKey, status };
}

function labelText(result) {
  return result.labels.join(" ").toLowerCase();
}

async function main() {
  try {
    const registry = await loadModule("src/lib/connectors/registry.ts");
    globalThis.__truthRegistry = registry;
    const capabilities = await loadModule("src/lib/connectors/capabilities.ts", [[
      `import {
  CONNECTOR_CATALOG,
  getConnectorDefinition,
  listConnectors,
  type ConnectorDefinition,
  type ConnectorRiskLevel,
} from "@/lib/connectors/registry";`,
      `const { CONNECTOR_CATALOG, getConnectorDefinition, listConnectors } = globalThis.__truthRegistry;`,
    ], ['import type { OperatorKey } from "@/lib/operators/registry";', ""]]);
    globalThis.__truthCapabilities = capabilities;
    const requirements = await loadModule("src/lib/operators/connector-requirements.ts", [[
      `import {
  getCapabilitiesForConnectors,
  getConnectorsForCapability,
  type Capability,
} from "@/lib/connectors/capabilities";`,
      `const { getCapabilitiesForConnectors, getConnectorsForCapability } = globalThis.__truthCapabilities;`,
    ], [
      `import {
  getConnectorDefinition,
  listConnectors,
  type ConnectorDefinition,
} from "@/lib/connectors/registry";`,
      `const { getConnectorDefinition, listConnectors } = globalThis.__truthRegistry;`,
    ], ['import type { OperatorKey } from "@/lib/operators/registry";', ""]]);
    globalThis.__truthRequirements = requirements;
    const operatorRegistry = await loadModule("src/lib/operators/registry.ts");
    globalThis.__truthOperatorRegistry = operatorRegistry;
    const capabilityLabels = await loadModule("src/lib/operators/capability-labels.ts");
    globalThis.__truthCapabilityLabels = capabilityLabels;
    const actionLabels = await loadModule("src/lib/operators/action-labels.ts");
    globalThis.__truthActionLabels = actionLabels;
    const actions = await loadModule("src/lib/operators/available-business-actions.ts", [[
      'import { getCapabilitiesForConnectors, type Capability } from "@/lib/connectors/capabilities";',
      'const { getCapabilitiesForConnectors } = globalThis.__truthCapabilities;',
    ], [
      'import { getOperatorConnectorReadiness, OPERATOR_CONNECTOR_REQUIREMENTS } from "@/lib/operators/connector-requirements";',
      'const { getOperatorConnectorReadiness, OPERATOR_CONNECTOR_REQUIREMENTS } = globalThis.__truthRequirements;',
    ], [
      'import { humanizeCapabilities } from "@/lib/operators/capability-labels";',
      'const { humanizeCapabilities } = globalThis.__truthCapabilityLabels;',
    ], [
      'import { humanizeOperatorActions } from "@/lib/operators/action-labels";',
      'const { humanizeOperatorActions } = globalThis.__truthActionLabels;',
    ], [
      'import { getOperatorDefinition, type OperatorKey } from "@/lib/operators/registry";',
      'const { getOperatorDefinition } = globalThis.__truthOperatorRegistry;',
    ]]);
    const availability = actions.getWorkspaceAvailableBusinessActions;
    const decision = (await loadModule("src/lib/operators/activation-readiness.ts")).decideOperatorActivation;
    const discovery = await loadModule("src/lib/connectors/discovery.ts", [[
      'import { CONNECTOR_CATEGORY_LABELS, type ConnectorDefinition } from "@/lib/connectors/registry";',
      'const { CONNECTOR_CATEGORY_LABELS } = globalThis.__truthRegistry;',
    ]]);
    const live = capabilities.getAvailableConnectors();

    const gmailRevenue = availability({ operatorKey: "revenue", connectorTruth: [truth("gmail")] });
    const gmailClient = availability({ operatorKey: "client_flow", connectorTruth: [truth("gmail")] });
    const gmailOperations = availability({ operatorKey: "operations", connectorTruth: [truth("gmail")] });

    await check(1, "Gmail-only excludes HubSpot actions", () => assert.doesNotMatch(labelText(gmailRevenue), /hubspot/));
    await check(2, "Gmail-only excludes Trello actions", () => assert.doesNotMatch(labelText(gmailRevenue), /trello|task board/));
    await check(3, "Gmail-only excludes Slack actions", () => assert.doesNotMatch(labelText(gmailRevenue), /slack|team message/));
    await check(4, "Revenue exposes only implemented email work with Gmail", () => {
      assert.ok(gmailRevenue.actionIds.includes("gmail.createDraft"));
      assert.ok(gmailRevenue.labels.some((label) => /email|follow-up|inbound/i.test(label)));
      assert.ok(gmailRevenue.actionIds.every((id) => id.startsWith("gmail.")));
    });
    await check(5, "Client Flow exposes only implemented email work with Gmail", () => {
      assert.deepEqual(gmailClient.actionIds, ["gmail.createDraft"]);
      assert.doesNotMatch(labelText(gmailClient), /trello|slack|crm/);
    });
    await check(6, "Operations exposes no work with Gmail alone", () => assert.deepEqual(gmailOperations.labels, []));
    await check(7, "Salesforce adds read context without unsupported writes", () => {
      const result = availability({ operatorKey: "revenue", connectorTruth: [truth("gmail"), truth("salesforce")] });
      assert.match(labelText(result), /crm contact context|crm pipeline context/);
      assert.doesNotMatch(labelText(result), /crm contact updates|crm deal updates|hubspot/);
      assert.deepEqual(result.relevantConnectorKeys.sort(), ["gmail", "salesforce"]);
    });
    await check(8, "HubSpot adds implemented Revenue updates", () => {
      const result = availability({ operatorKey: "revenue", connectorTruth: [truth("gmail"), truth("hubspot")] });
      assert.ok(result.actionIds.includes("hubspot.createOrUpdateContact"));
      assert.ok(result.actionIds.includes("hubspot.createOrUpdateDeal"));
    });
    await check(9, "Trello adds implemented Operations work", () => {
      const result = availability({ operatorKey: "operations", connectorTruth: [truth("trello")] });
      assert.ok(result.actionIds.includes("trello.scanBoards"));
      assert.match(labelText(result), /task board|trello/);
    });
    await check(10, "Slack alone does not satisfy Operations minimum", () => {
      const result = availability({ operatorKey: "operations", connectorTruth: [truth("slack")] });
      assert.deepEqual(result.labels, []);
    });
    await check(11, "Unhealthy connectors contribute no current capability", () => {
      const result = availability({ operatorKey: "revenue", connectorTruth: [truth("gmail"), truth("salesforce", "reconnect_required")] });
      assert.doesNotMatch(labelText(result), /crm/);
    });
    await check(12, "Onboarding selections are absent from current-action inputs", () => {
      assert.doesNotMatch(read("src/lib/operators/available-business-actions.ts"), /onboardingSystems/);
      assert.deepEqual(availability({ operatorKey: "operations", connectorTruth: [] }).labels, []);
    });

    const eligible = { eligible: true, reason: "Eligible" };
    const blocked = { eligible: false, reason: "Choose a plan" };
    await check(13, "Missing hard requirement cannot activate", () => assert.equal(decision({ status: "missing_connector", canRunManual: false, nextSetupStep: "Connect Trello", executionEligibility: eligible }).allowed, false));
    await check(14, "Satisfied hard requirement can activate", () => assert.equal(decision({ status: "ready", canRunManual: true, nextSetupStep: "Ready", executionEligibility: eligible }).allowed, true));
    await check(15, "Activation route rechecks readiness before writing state", () => {
      const source = read("src/app/api/operators/[operatorKey]/activate/route.ts");
      const recheck = source.indexOf("getWorkspaceOperatorReadiness({ workspaceId: context.workspaceId })");
      const write = source.indexOf("setOperatorActivationState({");
      assert.ok(recheck > 0 && write > recheck);
      assert.match(source, /decideOperatorActivation\(readiness\)/);
    });
    await check(16, "Optional connector absence does not block draft-only activation", () => assert.equal(decision({ status: "draft_only", canRunManual: true, nextSetupStep: "Optional CRM", executionEligibility: eligible }).allowed, true));
    await check(17, "Unhealthy required connector blocks activation", () => assert.equal(decision({ status: "missing_connector", canRunManual: false, nextSetupStep: "Reconnect Gmail", executionEligibility: eligible }).allowed, false));
    await check(18, "Plan eligibility remains a separate gate", () => {
      const result = decision({ status: "ready", canRunManual: true, nextSetupStep: "Ready", executionEligibility: blocked });
      assert.equal(result.allowed, false);
      assert.equal(result.code, "execution_ineligible");
    });

    await check(19, "Search finds every real provider", () => {
      for (const [query, expected] of [["gma", "Gmail"], ["micro", "Microsoft 365"], ["hub", "HubSpot"], ["sales", "Salesforce"], ["tre", "Trello"], ["sla", "Slack"]]) {
        assert.deepEqual(discovery.filterConnectorDiscovery(live, { query }).map((item) => item.displayName), [expected]);
      }
    });
    await check(20, "Categories filter the real catalog", () => {
      assert.deepEqual(discovery.filterConnectorDiscovery(live, { category: "crm" }).map((item) => item.displayName).sort(), ["HubSpot", "Salesforce"]);
      assert.deepEqual(discovery.filterConnectorDiscovery(live, { category: "communication" }).map((item) => item.displayName), ["Slack"]);
    });
    await check(21, "Discovery cards use real connection-state truth", () => {
      const source = read("src/app/app/connectors/page.tsx");
      assert.match(source, /function connectorDiscoveryState/);
      assert.match(source, /connected && connector\.health !== "healthy"/);
      assert.match(source, /action: "Reconnect"/);
      assert.match(source, /action: "Manage"/);
    });
    await check(22, "Onboarding-used providers rank first without becoming connected", () => {
      const result = discovery.filterConnectorDiscovery(live, { onboardingSystems: ["salesforce"] });
      assert.equal(result[0].connectorKey, "salesforce");
      assert.equal(result[0].status, "available");
    });
    await check(23, "Finder contains exactly the six live providers", () => assert.deepEqual(live.map((item) => item.displayName).sort(), ["Gmail", "HubSpot", "Microsoft 365", "Salesforce", "Slack", "Trello"]));
    await check(24, "Dashboard uses one finder action instead of provider shortlist", () => {
      const source = read("src/components/dashboard/overview.tsx");
      const unlock = source.slice(source.indexOf("function UnlockMore"), source.indexOf("export function OSOverview"));
      assert.match(unlock, /\/connectors\?discover=1/);
      assert.doesNotMatch(unlock, /\.slice\(0, 3\)|missing\.map/);
    });

    const operators = read("src/app/app/agents/page.tsx");
    await check(25, "Revenue operator navigates to its detail route", () => assert.match(operators, /revenue: "\/agents\/revenue"/));
    await check(26, "Client Flow operator navigates to its detail route", () => assert.match(operators, /client_flow: "\/agents\/client-flow"/));
    await check(27, "Operations operator navigates to its detail route", () => assert.match(operators, /operations: "\/agents\/operations"/));
    await check(28, "No dead View details control remains", () => assert.doesNotMatch(operators, />View details</));
    await check(29, "Future cards expose an intentional non-interactive roadmap state", () => {
      assert.match(operators, /className="ag-roadmap-state"/);
      assert.doesNotMatch(operators, /<button[^>]*>[^<]*Planned for a future release/);
    });

    assert.deepEqual(results, Array.from({ length: 29 }, (_, index) => index + 1));
    console.log("product-truth-discovery-smoke: all 29 scenarios passed.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete globalThis.__truthRegistry;
    delete globalThis.__truthCapabilities;
    delete globalThis.__truthRequirements;
    delete globalThis.__truthOperatorRegistry;
    delete globalThis.__truthCapabilityLabels;
    delete globalThis.__truthActionLabels;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

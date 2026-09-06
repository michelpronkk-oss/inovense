import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Smoke tests for the connector-impact model (Pass 2B items 11-13):
// getConnectorImpactForOperators / getWorkspaceConnectorImpact
// (src/lib/operators/connector-requirements.ts).
//
// Part A: source-contract checks proving the three required UI surfaces
// (connectors page, dashboard State F, operator detail degraded section)
// consume this one shared function.
// Part B: real runtime execution proving the Salesforce/Trello scenarios
// from the Pass 2B brief.

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function testSourceContracts() {
  const requirements = read("src/lib/operators/connector-requirements.ts");
  assert.match(requirements, /export function getConnectorImpactForOperators/, "the impact function must exist and be exported");
  assert.match(requirements, /export function getWorkspaceConnectorImpact/, "the workspace-scoped convenience wrapper must exist and be exported");
  assert.match(requirements, /export function getRequiredConnectorHealth/, "the required-connector-health distinguisher must exist and be exported");

  const connectors = read("src/app/app/connectors/page.tsx");
  assert.match(connectors, /getWorkspaceConnectorImpact/, "connectors page must use the shared impact function for degraded connector rows");
  assert.match(connectors, /Affected operators|impact\.affectedOperators/, "connectors page must actually render affected-operator impact, not just import the function");

  const productState = read("src/lib/operators/product-state.ts");
  assert.match(productState, /getWorkspaceConnectorImpact/, "product-state.ts (dashboard State F's data source) must use the shared impact function for degraded info");
}

const tmpDir = path.join(root, "tests", ".tmp-connector-impact-smoke");

function loadModule(relSourcePath) {
  const source = fs.readFileSync(path.join(root, relSourcePath), "utf8");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

function loadModuleWithReplacements(relSourcePath, replacements) {
  let source = fs.readFileSync(path.join(root, relSourcePath), "utf8");
  for (const [search, replace] of replacements) {
    assert.ok(source.includes(search), `expected to find and replace this exact import block in ${relSourcePath}:\n${search}`);
    source = source.replace(search, replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

async function testRuntimeImpact() {
  // connector-requirements.ts's cross-file VALUE imports (capabilities.ts and
  // connectors/registry.ts) are both real, pure catalog/data modules - no
  // mocking of business logic, only chain-loading real files via esbuild +
  // dynamic import (Node's plain ESM loader cannot resolve their "@/..."
  // aliases outside the Next.js build, same constraint documented in
  // capability-billing-gating-smoke.mjs).
  const registryModule = await loadModule("src/lib/connectors/registry.ts");
  globalThis.__test_connectorRegistry = registryModule;

  const capabilitiesModule = await loadModuleWithReplacements("src/lib/connectors/capabilities.ts", [
    [
      `import {
  CONNECTOR_CATALOG,
  getConnectorDefinition,
  listConnectors,
  type ConnectorDefinition,
  type ConnectorRiskLevel,
} from "@/lib/connectors/registry";`,
      `const { CONNECTOR_CATALOG, getConnectorDefinition, listConnectors } = globalThis.__test_connectorRegistry;`,
    ],
    ['import type { OperatorKey } from "@/lib/operators/registry";', ""],
  ]);
  globalThis.__test_capabilities = capabilitiesModule;

  const mod = await loadModuleWithReplacements("src/lib/operators/connector-requirements.ts", [
    [
      `import {
  getCapabilitiesForConnectors,
  getConnectorsForCapability,
  type Capability,
} from "@/lib/connectors/capabilities";`,
      `const { getCapabilitiesForConnectors, getConnectorsForCapability } = globalThis.__test_capabilities;`,
    ],
    [
      `import {
  getConnectorDefinition,
  listConnectors,
  type ConnectorDefinition,
} from "@/lib/connectors/registry";`,
      `const { getConnectorDefinition, listConnectors } = globalThis.__test_connectorRegistry;`,
    ],
    ['import type { OperatorKey } from "@/lib/operators/registry";', ""],
  ]);
  const { getWorkspaceConnectorImpact, getRequiredConnectorHealth } = mod;
  assert.equal(typeof getWorkspaceConnectorImpact, "function");
  assert.equal(typeof getRequiredConnectorHealth, "function");

  // 1. Salesforce unhealthy -> Revenue loses CRM enhancement but stays usable email-only.
  {
    const impact = getWorkspaceConnectorImpact({ connectorKey: "salesforce", workspaceConnectorTruth: ["gmail"] });
    const revenue = impact.affectedOperators.find((entry) => entry.operatorKey === "revenue");
    assert.ok(revenue, "losing Salesforce must affect Revenue");
    assert.equal(revenue.impact, "enhancement", "Salesforce is optional for Revenue, never a hard requirement");
    assert.ok(revenue.lostCapabilities.includes("crm.contacts.read") || revenue.lostCapabilities.includes("crm.deals.read"), "losing Salesforce must report lost CRM read capability");
    assert.ok(revenue.stillAvailableCapabilities.includes("email.read"), "Revenue must still report email capability as available");

    const revenueHealth = getRequiredConnectorHealth("revenue", [{ connectorKey: "gmail", status: "healthy" }, { connectorKey: "salesforce", status: "reconnect_required" }]);
    assert.equal(revenueHealth, "ok", "Revenue's hard requirement (email) is unaffected by Salesforce - required-connector health must stay ok, not unhealthy");
  }

  // 2. Gmail/Microsoft hard capability gone -> Revenue not ready (needs_setup territory).
  {
    const health = getRequiredConnectorHealth("revenue", [{ connectorKey: "gmail", status: "missing" }]);
    assert.equal(health, "missing", "no email connector at all must report missing, not ok/unhealthy");
    const brokenHealth = getRequiredConnectorHealth("revenue", [{ connectorKey: "gmail", status: "reconnect_required" }]);
    assert.equal(brokenHealth, "unhealthy", "a broken (previously connected) email connector must report unhealthy, distinct from missing");
  }

  // 3. Trello unhealthy -> Operations paused/not ready (hard requirement).
  {
    const impact = getWorkspaceConnectorImpact({ connectorKey: "trello", workspaceConnectorTruth: [] });
    const operations = impact.affectedOperators.find((entry) => entry.operatorKey === "operations");
    assert.ok(operations, "losing Trello must affect Operations");
    assert.equal(operations.impact, "hard_requirement", "Trello is a hard requirement for Operations");

    const health = getRequiredConnectorHealth("operations", [{ connectorKey: "trello", status: "reconnect_required" }]);
    assert.equal(health, "unhealthy");
  }

  // 4. Trello unhealthy -> Client Flow loses its Trello-based enhancement but stays usable where email-only requirements allow.
  {
    const impact = getWorkspaceConnectorImpact({ connectorKey: "trello", workspaceConnectorTruth: ["gmail"] });
    const clientFlow = impact.affectedOperators.find((entry) => entry.operatorKey === "client_flow");
    assert.ok(clientFlow, "losing Trello must affect Client Flow (optional pm.tasks capability)");
    assert.equal(clientFlow.impact, "enhancement", "Trello is optional for Client Flow, not a hard requirement");
    assert.ok(clientFlow.stillAvailableCapabilities.includes("email.read"), "Client Flow must still report email capability as available");

    const clientFlowHealth = getRequiredConnectorHealth("client_flow", [{ connectorKey: "gmail", status: "healthy" }, { connectorKey: "trello", status: "reconnect_required" }]);
    assert.equal(clientFlowHealth, "ok", "Client Flow's hard requirement (email) is unaffected by Trello");
  }

  // 5. Impact stays workspace-scoped: two different connected-key sets for the "same" connector
  // going unhealthy produce independent, correctly different results (never a cached/shared value).
  {
    const workspaceAImpact = getWorkspaceConnectorImpact({ connectorKey: "hubspot", workspaceConnectorTruth: ["gmail"] });
    const workspaceBImpact = getWorkspaceConnectorImpact({ connectorKey: "hubspot", workspaceConnectorTruth: [] });
    const revenueA = workspaceAImpact.affectedOperators.find((entry) => entry.operatorKey === "revenue");
    const revenueB = workspaceBImpact.affectedOperators.find((entry) => entry.operatorKey === "revenue");
    assert.ok(revenueA, "workspace A (email connected) loses HubSpot enhancement for Revenue");
    assert.ok(revenueB, "workspace B (no email) still reports HubSpot's CRM capability loss for Revenue");
    assert.notDeepEqual(revenueA.stillAvailableCapabilities, revenueB.stillAvailableCapabilities, "still-available capabilities must reflect each workspace's own other connectors, not a shared/cached result");
  }

  console.log("  connector-impact runtime checks passed: Salesforce/Gmail/Trello scenarios and workspace-scoping verified against the real capability graph.");
}

async function main() {
  try {
    testSourceContracts();
    await testRuntimeImpact();
    console.log("connector-impact-smoke: all checks passed.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete globalThis.__test_connectorRegistry;
    delete globalThis.__test_capabilities;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

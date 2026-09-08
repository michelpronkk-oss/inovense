import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Smoke tests for the internal System Map (/admin/system-map):
// - Source-contract checks: nav entry, route location under the real admin
//   layout/auth gate, middleware allow-list, no secret-shaped strings.
// - Runtime checks: chain-loads the real data module (src/lib/admin/system-map.ts)
//   through esbuild + dynamic import (same pattern as connector-impact-smoke.mjs)
//   so the derivations below run against the actual operator/connector
//   registries, not a mock.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

// ── Part A: source contracts ─────────────────────────────────────────────

function testSourceContracts() {
  const nav = read("src/app/admin/_nav.tsx");
  assert.match(nav, /label: "System Map"/, "nav must have a System Map entry");
  assert.match(nav, /href: "\/system-map"/, "nav entry must point at /system-map");
  const navLines = nav.split("\n");
  const productIndex = navLines.findIndex((line) => line.includes('label: "Product"'));
  const systemMapIndex = navLines.findIndex((line) => line.includes('label: "System Map"'));
  const connectorsIndex = navLines.findIndex((line) => line.includes('label: "Connectors"'));
  assert.ok(productIndex > -1 && systemMapIndex > -1 && connectorsIndex > -1, "all three nav entries must exist");
  assert.ok(productIndex < systemMapIndex && systemMapIndex < connectorsIndex, "System Map must sit between Product and Connectors in the nav array");

  const middleware = read("src/middleware.ts");
  assert.match(middleware, /"\/system-map"/, "middleware's internal command allow-list must include /system-map or the route is unreachable on the real admin host");

  const layout = read("src/app/admin/layout.tsx");
  assert.match(layout, /requireInternalAdmin/, "the shared admin layout must still call requireInternalAdmin");

  assert.ok(fs.existsSync(path.join(root, "src/app/admin/system-map/page.tsx")), "route file must exist as a normal child of src/app/admin");
  const page = read("src/app/admin/system-map/page.tsx");
  assert.match(page, /export const metadata/, "page must export metadata");
  assert.match(page, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/, "page must be noindex like other admin pages");
  assert.doesNotMatch(page, /requireInternalAdmin/, "the page itself must not duplicate auth - it inherits the layout's gate");
  assert.match(page, /admin-command-center/, "page must use the shared admin visual shell classes");
  assert.match(page, /SystemMapCanvas/, "page must render the client canvas component");

  const styles = read("src/app/admin/system-map/system-map.css");
  assert.match(styles, /\.admin-system-map-page\s*\{[\s\S]*position:\s*fixed/, "System Map must bypass the shared content column on desktop");
  assert.match(styles, /left:\s*248px/, "full-screen System Map must start at the sidebar edge");
  assert.match(styles, /grid-template-rows:\s*auto minmax\(0, 1fr\)/, "System Map must reserve all remaining viewport height for its workspace");
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1fr\) 348px/, "System Map must keep a dedicated inspector without constraining the graph");

  const canvas = read("src/app/admin/system-map/SystemMapCanvas.tsx");
  assert.match(canvas, /^"use client";/, "the interactive canvas must be a client component");
  assert.match(canvas, /@xyflow\/react/, "must use @xyflow/react, not a hand-rolled canvas");
  assert.doesNotMatch(canvas, /from "reactflow"/, "must not use the deprecated 'reactflow' package name");
  assert.match(canvas, /Reset layout/, "a reset-layout control must exist");
  assert.match(canvas, /Fit view/, "a fit-view control must exist");
  assert.match(canvas, /localStorage/, "layout persistence must be localStorage only, no database");
  assert.doesNotMatch(canvas, /supabase|createSupabaseAdmin/i, "the client canvas must never talk to Supabase directly");
  assert.match(canvas, /onNodeClick/, "node click/selection handling must exist");
  assert.match(canvas, /sysmap-panel/, "a details-panel render path must exist");
  assert.match(canvas, /sysmap-workspace/, "canvas and inspector must use the dedicated workspace layout");
  assert.match(canvas, /Architecture inspector/, "the inspector must remain available before a node is selected");
  assert.match(canvas, /Escape/, "details panel must be closable with Escape");

  // Regression guard: custom @xyflow/react node types get NO default
  // connection points. Without an explicit <Handle> in the custom node
  // component, edges have nowhere to anchor and silently never render --
  // no matter how the edge itself is styled. This exact bug shipped once
  // (edges present in data, styled, but invisible in every screenshot)
  // because system-map.css already had a rule hiding ".react-flow__handle"
  // while no <Handle> was ever rendered to produce one.
  assert.match(canvas, /import\s*\{[^}]*\bHandle\b[^}]*\}\s*from\s*"@xyflow\/react"/, "must import Handle from @xyflow/react");
  assert.match(canvas, /<Handle\s+type="target"/, "the custom node must render a target Handle or edges cannot anchor to it");
  assert.match(canvas, /<Handle\s+type="source"/, "the custom node must render a source Handle or edges cannot anchor to it");

  const packageJson = JSON.parse(read("package.json"));
  assert.ok(packageJson.dependencies["@xyflow/react"], "@xyflow/react must be a real dependency");
  assert.ok(!packageJson.dependencies.reactflow && !packageJson.devDependencies?.reactflow, "the deprecated 'reactflow' package must not be installed");

  // Safety: no secret-shaped strings anywhere in the new data file.
  const dataSource = read("src/lib/admin/system-map.ts");
  const secretPatterns = [/sk-[a-zA-Z0-9]{10,}/, /AKIA[0-9A-Z]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /eyJhbGciOi[a-zA-Z0-9._-]{20,}/, /postgres(?:ql)?:\/\/[^\s"'`]+:[^\s"'`]+@/i];
  for (const pattern of secretPatterns) assert.doesNotMatch(dataSource, pattern, `system-map.ts must not contain secret-shaped strings matching ${pattern}`);
  assert.doesNotMatch(dataSource, /access_token|refresh_token|api_key\s*[:=]\s*["'][^"']+["']|process\.env\.[A-Z_]*(SECRET|TOKEN|KEY)[A-Z_]*(?!.*fallback)/i, "no credential-bearing fields");

  console.log("  source contracts passed: nav placement, route/layout inheritance, canvas client boundary, no secrets.");
}

// ── Part B: runtime derivation against the real registries ──────────────

const tmpDir = path.join(root, "tests", ".tmp-admin-system-map-smoke");

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
    assert.ok(source.includes(search), `expected to find and replace this exact import in ${relSourcePath}:\n${search}`);
    source = source.replace(search, replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

async function testRuntimeShape() {
  // Chain-load the real dependency graph: brand.ts (pure) -> urls.ts ->
  // public-user-state.ts -> pricing.ts, plus the two registries, exactly as
  // system-map.ts imports them, so this proves the real files, not a mock.
  const brandModule = await loadModule("src/lib/brand.ts");
  globalThis.__test_brand = brandModule;

  const urlsModule = await loadModuleWithReplacements("src/lib/urls.ts", [
    ['import { AUTERIM_APP_URL, AUTERIM_MARKETING_URL } from "@/lib/brand";', "const { AUTERIM_APP_URL, AUTERIM_MARKETING_URL } = globalThis.__test_brand;"],
  ]);
  globalThis.__test_urls = urlsModule;

  const publicUserStateModule = await loadModuleWithReplacements("src/lib/public-user-state.ts", [
    ['import { appHref } from "@/lib/urls";', "const { appHref } = globalThis.__test_urls;"],
  ]);
  globalThis.__test_publicUserState = publicUserStateModule;

  const pricingModule = await loadModuleWithReplacements("src/lib/pricing.ts", [
    [
      `import { getPublicSignInHref, getPublicWorkspaceCta, type PublicUserState } from "@/lib/public-user-state";`,
      `const { getPublicSignInHref, getPublicWorkspaceCta } = globalThis.__test_publicUserState;`,
    ],
    ['import { appHref } from "@/lib/urls";', "const { appHref } = globalThis.__test_urls;"],
  ]);
  globalThis.__test_pricing = pricingModule;

  const operatorsRegistryModule = await loadModule("src/lib/operators/registry.ts");
  globalThis.__test_operatorsRegistry = operatorsRegistryModule;

  const connectorsRegistryModule = await loadModule("src/lib/connectors/registry.ts");
  globalThis.__test_connectorsRegistry = connectorsRegistryModule;

  const systemMap = await loadModuleWithReplacements("src/lib/admin/system-map.ts", [
    ['import { OPERATOR_REGISTRY, type OperatorKey } from "@/lib/operators/registry";', "const { OPERATOR_REGISTRY } = globalThis.__test_operatorsRegistry;"],
    ['import { listConnectors } from "@/lib/connectors/registry";', "const { listConnectors } = globalThis.__test_connectorsRegistry;"],
    ['import { pricingPlans } from "@/lib/pricing";', "const { pricingPlans } = globalThis.__test_pricing;"],
  ]);

  const { systemMapNodes, systemMapEdges, SYSTEM_MAP_BRANCHES, getSystemMapCounts } = systemMap;
  assert.ok(Array.isArray(systemMapNodes) && systemMapNodes.length > 0, "systemMapNodes must be a non-empty array");
  assert.ok(Array.isArray(systemMapEdges) && systemMapEdges.length > 0, "systemMapEdges must be a non-empty array");
  assert.ok(Array.isArray(SYSTEM_MAP_BRANCHES) && SYSTEM_MAP_BRANCHES.length === 6, "there must be exactly 6 main branches");

  // Root structure.
  const michel = systemMapNodes.find((n) => n.id === "founder-michel");
  assert.ok(michel, "a Michel root node must exist");
  assert.equal(michel.subtitle, "Founder / Super Admin");
  assert.equal(michel.parentId, null, "Michel must be the true root (no parent)");
  const dataAsString = JSON.stringify(systemMapNodes);
  assert.doesNotMatch(dataAsString, /@/, "no email address may appear anywhere in the node data (no '@' character)");

  const auterim = systemMapNodes.find((n) => n.id === "platform-auterim");
  assert.ok(auterim, "an Auterim platform node must exist");
  assert.equal(auterim.parentId, "founder-michel", "Auterim must sit directly beneath Michel");

  // No other human/employee nodes.
  const humanNodes = systemMapNodes.filter((n) => n.kind === "human");
  assert.equal(humanNodes.length, 1, "Michel must be the only human node anywhere in the graph");

  // Exactly the 3 real live operators, never more.
  const operatorNodes = systemMapNodes.filter((n) => n.kind === "operator");
  assert.equal(operatorNodes.length, 3, "exactly 3 operator-kind nodes must exist");
  const liveOperatorKeys = operatorNodes.filter((n) => n.status === "live").map((n) => n.id).sort();
  assert.deepEqual(liveOperatorKeys, ["operator-client_flow", "operator-operations", "operator-revenue"], "exactly revenue/client_flow/operations may be Live operators");
  assert.ok(operatorNodes.every((n) => n.status === "live"), "no operator-kind node may be non-live (other registry operators must not leak in as operator-kind nodes)");
  assert.ok(operatorsRegistryModule.OPERATOR_REGISTRY.length > 3, "sanity: the real registry must contain more than the 3 live operators");
  const futureOperatorNode = systemMapNodes.find((n) => n.id === "operator-future");
  assert.ok(futureOperatorNode, "a future-operators rollup node must exist");
  assert.equal(futureOperatorNode.status, "planned", "future operators must be marked Planned, never Live");

  // All real connectors represented with truthful status.
  const connectorNodes = systemMapNodes.filter((n) => n.kind === "connector");
  assert.equal(connectorNodes.length, 12, "exactly 12 real connector nodes must be represented");
  const byId = Object.fromEntries(connectorNodes.map((n) => [n.id, n]));
  for (const id of ["connector-gmail", "connector-google_drive", "connector-microsoft", "connector-microsoft_teams", "connector-hubspot", "connector-salesforce", "connector-slack", "connector-trello", "connector-asana", "connector-jira", "connector-zendesk", "connector-intercom"]) {
    assert.ok(byId[id], `connector node ${id} must exist`);
  }
  assert.equal(byId["connector-intercom"].status, "planned", "Intercom must remain planned internally until provider review is complete");
  assert.equal(byId["connector-google_drive"].status, "live", "Google Drive is implemented read-only context and must be Live without advertising writes");
  assert.equal(byId["connector-salesforce"].status, "partial", "Salesforce must be Partial (read-only context), never Live");
  assert.match(byId["connector-salesforce"].responsibility, /read-only/i, "Salesforce's node must explicitly describe itself as read-only");
  const salesforceDefinition = connectorsRegistryModule.CONNECTOR_CATALOG.salesforce;
  assert.equal(salesforceDefinition.writeActions.length, 0, "the real connector registry must show zero Salesforce write actions - this is what the Partial status is derived from");
  assert.doesNotMatch(JSON.stringify(salesforceDefinition.capabilities), /\.write\b/, "Salesforce's real capabilities must never include a write capability");
  for (const id of ["connector-gmail", "connector-microsoft", "connector-microsoft_teams", "connector-hubspot", "connector-slack", "connector-trello", "connector-asana", "connector-jira", "connector-zendesk"]) {
    assert.equal(byId[id].status, "live", `${id} must be Live`);
  }
  // Microsoft Teams is a real, shipped connector: it must be Live (not
  // planned) and must declare a real approval-gated write action.
  const teamsDefinition = connectorsRegistryModule.CONNECTOR_CATALOG.microsoft_teams;
  assert.equal(teamsDefinition.status, "available", "Microsoft Teams must be an available connector in the real registry");
  assert.equal(teamsDefinition.authType, "direct_oauth", "Microsoft Teams must use the direct Microsoft OAuth flow, not a broker");
  assert.equal(teamsDefinition.writeActions.length, 1, "Microsoft Teams must advertise exactly its one implemented write action");
  assert.doesNotMatch(
    JSON.stringify([teamsDefinition.capabilities, teamsDefinition.readActions, teamsDefinition.writeActions, teamsDefinition.approvalRequiredActions]),
    /attachment|upload|download|direct message|1:1/i,
    "Microsoft Teams must not claim attachment, file transfer or direct-message capabilities it does not implement",
  );
  assert.doesNotMatch(JSON.stringify(teamsDefinition.capabilities), /chat\.alerts/, "Microsoft Teams must not claim capabilities it does not implement");
  const nextConnectorNode = systemMapNodes.find((n) => n.id === "connector-next");
  assert.ok(nextConnectorNode, "a next-connectors rollup node must exist");
  assert.equal(nextConnectorNode.status, "planned", "future connectors must be marked Planned, never Live");

  // Governance nodes are real, live systems (no fabricated "planned" governance).
  const governanceNodes = systemMapNodes.filter((n) => n.kind === "governance");
  assert.ok(governanceNodes.length >= 5, "governance branch must have several real concepts");
  assert.ok(governanceNodes.every((n) => n.status === "live"), "governance nodes must all be Live - there is no planned governance system to represent");

  // Counts are derived, not hardcoded, and self-consistent with the nodes.
  const counts = getSystemMapCounts();
  assert.equal(counts.liveOperators, 3);
  assert.equal(counts.liveConnectors, 10);
  assert.equal(counts.partialConnectors, 1);
  assert.ok(counts.plannedConnectors > 10, "plannedConnectors must reflect the real, larger catalog");
  assert.equal(counts.infrastructureServices, systemMapNodes.filter((n) => n.kind === "infrastructure").length);

  // Selection/click support and relatedRoute integrity.
  assert.ok(operatorNodes.every((n) => typeof n.description === "string" && n.description.length > 0), "every node needs a real description for the details panel");

  const navSource = read("src/app/admin/_nav.tsx");
  const realHrefs = new Set([...navSource.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]));
  for (const node of systemMapNodes) {
    if (!node.relatedRoute) continue;
    assert.ok(realHrefs.has(node.relatedRoute), `relatedRoute "${node.relatedRoute}" on node "${node.id}" must be a real admin nav href`);
  }

  // Dependency edges reference real node ids in both directions.
  const nodeIds = new Set(systemMapNodes.map((n) => n.id));
  for (const edge of systemMapEdges) {
    assert.ok(nodeIds.has(edge.source), `edge source "${edge.source}" must reference a real node`);
    assert.ok(nodeIds.has(edge.target), `edge target "${edge.target}" must reference a real node`);
  }
  const dependencyEdges = systemMapEdges.filter((e) => e.kind === "dependency");
  assert.ok(dependencyEdges.length > 0, "at least one dependency edge must exist");
  assert.ok(
    dependencyEdges.some((e) => e.source === "operator-revenue" && e.target === "connector-salesforce"),
    "Revenue -> Salesforce dependency edge must exist",
  );
  assert.ok(
    dependencyEdges.some((e) => e.source === "operator-operations" && e.target === "connector-slack"),
    "Operations -> Slack dependency edge must exist",
  );
  assert.ok(
    dependencyEdges.some((e) => e.source === "operator-operations" && e.target === "connector-microsoft_teams"),
    "Operations -> Microsoft Teams dependency edge must exist",
  );
  assert.ok(
    dependencyEdges.some((e) => e.source === "operator-client_flow" && e.target === "connector-microsoft_teams"),
    "Client Flow -> Microsoft Teams dependency edge must exist",
  );
  assert.ok(
    dependencyEdges.some((e) => e.source === "biz-billing" && e.target === "biz-dodo"),
    "Billing -> Dodo dependency edge must exist",
  );

  console.log("  runtime checks passed: root/operators/connectors/governance/counts/edges all verified against the real registries.");
}

async function main() {
  try {
    testSourceContracts();
    await testRuntimeShape();
    console.log("admin-system-map-smoke: all checks passed.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete globalThis.__test_brand;
    delete globalThis.__test_urls;
    delete globalThis.__test_publicUserState;
    delete globalThis.__test_pricing;
    delete globalThis.__test_operatorsRegistry;
    delete globalThis.__test_connectorsRegistry;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

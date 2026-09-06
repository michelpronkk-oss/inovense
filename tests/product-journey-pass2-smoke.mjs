import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Smoke tests for the Pass 2 product-journey UI work built on top of the
// Pass 1 backend (getWorkspaceExecutionEligibility, operator activation,
// capability-based readiness - see capability-billing-gating-smoke.mjs).
//
// Part A: source-contract checks proving the real wiring exists at the exact
// call sites claimed (same technique as revenue-operator-smoke.mjs).
// Part B: a runtime-execution check of the one new pure-logic module this
// pass added (action-labels.ts), actually executed via esbuild + dynamic
// import - not just asserted present in source.

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────
// Part A: source-contract checks
// ─────────────────────────────────────────────────────────────────────────

function testZeroConnectorFirstRunState() {
  const overview = read("src/components/dashboard/overview.tsx");
  // Must branch on healthyConnectors === 0 and return a distinct first-run
  // tree - never fall through to the KPI row / connector strip / activity
  // feed with zeros in it.
  const gateIndex = overview.indexOf("if (healthyConnectors === 0) {");
  assert.ok(gateIndex >= 0, "overview must branch on zero healthy connectors");
  const kpiRowIndex = overview.indexOf("{/* KPI row (real metrics, no fabricated trends) */}");
  assert.ok(kpiRowIndex > gateIndex, "the real KPI row must be declared after the zero-connector branch (i.e. not reachable from it)");
  const firstRunBlock = overview.slice(gateIndex, kpiRowIndex);
  assert.match(firstRunBlock, /dashboard-first-run/, "zero-connector branch must render a distinct first-run marker class");
  assert.match(firstRunBlock, /return \(/, "zero-connector branch must return its own tree, not continue into the populated dashboard");
  assert.doesNotMatch(firstRunBlock, /kpi-row/, "zero-connector branch must not render the KPI row");
  assert.doesNotMatch(firstRunBlock, /conn-strip/, "zero-connector branch must not render the connector health strip");
  // Must be driven by real onboarding_data.systems, not a hardcoded list.
  assert.match(firstRunBlock, /overview\.workspace\.onboardingSystems/, "first-run copy must read real onboarding systems, not fabricate them");
}

function testOnboardingPrioritizationOnConnectorsPage() {
  const connectors = read("src/app/app/connectors/page.tsx");
  assert.match(connectors, /import \{ getUnconnectedOnboardingSystems, unlockMessageForConnector \} from "@\/lib\/operators\/unlock-copy";/, "connectors page must use the shared onboarding-diff helper, not its own logic");
  assert.match(connectors, /onboardingSystems: state\.workspace\.onboardingSystems/, "connectors page must read the real onboarding systems selection");
  assert.match(connectors, /Systems you already use/, "connectors page must surface a distinct onboarding-prioritized section");
  // Central-hub title/copy per the product-journey brief.
  assert.match(connectors, /<h1>Connect your business<\/h1>/, "connectors page must use the 'Connect your business' hub title");
}

function testConnectedRequiresRealTruthNotOnboardingSelection() {
  const connectors = read("src/app/app/connectors/page.tsx");
  // "Connected tools" must be sourced from real OAuth/Nango truth
  // (isRealConnectedConnector), never from the onboarding selection.
  assert.match(connectors, /realConnectedConnectors = useMemo\(\s*\(\) => state\.connectors\.filter\(\(c\) => isRealConnectedConnector\(c\)\)/, "connected list must be derived from real connector truth");
  // The onboarding-highlight section must explicitly exclude anything already
  // really connected (via getUnconnectedOnboardingSystems), and the comment
  // must document the "never mark connected from onboarding alone" rule.
  assert.match(connectors, /never marked\s*\n?\s*"connected" from the onboarding selection alone/, "connectors page must document that onboarding selection alone never implies connected");

  const truth = read("src/lib/connectors/truth.ts");
  assert.doesNotMatch(truth, /onboarding/i, "connector truth resolution must never consult onboarding data");

  const osTypes = read("src/lib/os/types.ts");
  assert.match(osTypes, /onboardingSystems\?: string\[\]/, "Workspace type must carry onboardingSystems as a distinct, descriptive-only field");
  assert.match(osTypes, /Descriptive\s*\n?\s*\* only - never a substitute for real connector truth/, "onboardingSystems field must be documented as descriptive-only");
}

function testActivationToggleUsesRealRoutes() {
  const toggle = read("src/components/operators/activation-toggle.tsx");
  assert.match(toggle, /fetch\(`\/api\/operators\/\$\{operatorKey\}\/activate\?\$\{qs\.toString\(\)\}`/, "toggle must load real activation state from the real GET route");
  assert.match(toggle, /fetch\(`\/api\/operators\/\$\{operatorKey\}\/\$\{nextActivated \? "activate" : "deactivate"\}`/, "toggle must call the real activate/deactivate POST routes");
  assert.match(toggle, /if \(nextActivated && !executionEligibility\.eligible\) return;/, "toggle must refuse to call activate when execution eligibility is false (client-side UX guard, not the security boundary)");
}

function testActivationRoutesAreWorkspaceScoped() {
  const activateRoute = read("src/app/api/operators/[operatorKey]/activate/route.ts");
  const deactivateRoute = read("src/app/api/operators/[operatorKey]/deactivate/route.ts");
  for (const [name, source] of [["activate", activateRoute], ["deactivate", deactivateRoute]]) {
    assert.match(source, /resolveWorkspaceContext/, `${name} route must resolve workspace identity server-side, never trust a client-supplied identity`);
  }
}

function testPlanRequiredUxNotSilentlyBroken() {
  const toggle = read("src/components/operators/activation-toggle.tsx");
  assert.match(toggle, /"plan_required"/, "toggle must recognize plan_required status");
  assert.match(toggle, /"billing_attention"/, "toggle must recognize billing_attention status");
  assert.match(toggle, /"suspended"/, "toggle must recognize suspended status");
  assert.match(toggle, /Choose a plan to let this operator run unattended\./, "toggle must show a contextual plan-required message");
  assert.match(toggle, /disabled=\{loading \|\| saving \|\| !configured \|\| \(!activated && !executionEligibility\.eligible\)\}/, "toggle switch must be disabled (not silently failing) when ineligible");
  assert.match(toggle, /href="\/plans"/, "toggle must route the user to the real plans flow, not a dead end");
}

function testOperatorPagesActuallyRenderActivationToggle() {
  for (const [name, file, operatorKey] of [
    ["revenue", "src/app/app/agents/revenue/page.tsx", "revenue"],
    ["client-flow", "src/app/app/agents/client-flow/page.tsx", "client_flow"],
    ["operations", "src/app/app/agents/operations/page.tsx", "operations"],
  ]) {
    const source = read(file);
    assert.match(source, /import \{ OperatorActivationToggle, type ActivationEligibility \} from "@\/components\/operators\/activation-toggle";/, `${name} page must import the real activation toggle`);
    // Must be an actually-rendered JSX usage, not just an unused import -
    // this is the exact half-wired bug this pass had to fix.
    const jsxUsageRegex = new RegExp(`<OperatorActivationToggle[\\s\\S]{0,400}operatorKey="${operatorKey}"`);
    assert.match(source, jsxUsageRegex, `${name} page must actually render <OperatorActivationToggle operatorKey="${operatorKey}" .../> in its JSX tree, not just import it`);
    assert.match(source, /executionEligibility=\{eligibility\}/, `${name} page must pass real executionEligibility into the toggle`);
  }
}

function testOperatorPagesRouteConnectThroughCentralHub() {
  // Revenue previously launched Gmail OAuth directly from its own "connect
  // required system" CTA - it must now route through the central Connectors
  // hub, matching Client Flow and Operations (which already did).
  const revenue = read("src/app/app/agents/revenue/page.tsx");
  assert.match(revenue, /label: "Connect required system", onClick: \(\) => window\.location\.assign\("\/connectors"\)/, "revenue's primary connect CTA must route through /connectors, not call OAuth inline");

  for (const [name, file] of [
    ["client-flow", "src/app/app/agents/client-flow/page.tsx"],
    ["operations", "src/app/app/agents/operations/page.tsx"],
  ]) {
    const source = read(file);
    const connectActions = [...source.matchAll(/href: "\/app\/connectors"/g)];
    assert.ok(connectActions.length > 0, `${name} page must route setup actions to the central Connectors hub`);
  }
}

function testOperationsStatusRouteExposesReadinessAndEligibility() {
  const route = read("src/app/api/operators/operations/status/route.ts");
  assert.match(route, /import \{ getOperatorReadiness \} from "@\/lib\/operators\/readiness";/, "operations status route must reuse the single readiness source of truth");
  assert.match(route, /getOperatorReadiness\(\{ workspaceId: context\.workspaceId, operatorKey: "operations" \}\)/, "operations status route must actually call it");
  assert.match(route, /^\s*readiness,\s*$/m, "operations status route must return readiness (which carries executionEligibility) in its JSON response");
}

function testWhatAuterimCanDoNowIsCapabilityDerived() {
  const connectors = read("src/app/app/connectors/page.tsx");
  assert.match(connectors, /What Auterim can do now/, "connectors page must include the capability-derived outcomes section");
  assert.match(connectors, /r\.canRunManual && \(r\.status === "ready" \|\| r\.status === "draft_only"\)/, "the section must only source from operators that can actually run today, not a static list");
  assert.match(connectors, /humanizeOperatorActions/, "the section must reuse the shared action-label translator, not invent its own copy");
}

function testNoNewCapabilityLogicInvented() {
  // Guard rail: Pass 2 UI must consume readiness/eligibility, never
  // re-implement operator-readiness rules itself.
  for (const file of [
    "src/app/app/connectors/page.tsx",
    "src/app/app/agents/revenue/page.tsx",
    "src/app/app/agents/client-flow/page.tsx",
    "src/app/app/agents/operations/page.tsx",
    "src/app/app/agents/page.tsx",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /function getWorkspaceOperatorReadiness/, `${file} must not re-implement workspace readiness aggregation`);
    assert.doesNotMatch(source, /function getWorkspaceExecutionEligibility/, `${file} must not re-implement execution eligibility`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Part B: runtime-execution check of the new pure-logic module
// ─────────────────────────────────────────────────────────────────────────

async function testHumanizeOperatorActionsRuntime() {
  const source = fs.readFileSync(path.join(root, "src/lib/operators/action-labels.ts"), "utf8");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const tmpDir = path.join(root, "tests", ".tmp-product-journey-pass2-smoke");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `action-labels-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  const mod = await import(pathToFileURL(tmpFile).href);

  // Internal bookkeeping actions are dropped, never shown as a "capability".
  assert.deepEqual(mod.humanizeOperatorActions(["memory.read", "log.write"]), []);

  // Known real registry actions get real business-facing labels, not raw ids.
  assert.equal(mod.humanizeOperatorActions(["gmail.createDraft"])[0], "Draft follow-up emails");
  assert.equal(mod.humanizeOperatorActions(["hubspot.createOrUpdateContact"])[0], "Update HubSpot contacts");

  // Mixed input: internal actions filtered, real actions translated, order preserved.
  const mixed = mod.humanizeOperatorActions(["memory.read", "trello.scanBoards", "log.write", "slack.prepareMessage"]);
  assert.deepEqual(mixed, ["Read Trello boards", "Prepare Slack messages"]);

  // An unrecognized-but-real action id never throws and never exposes the
  // raw dotted id verbatim (still gets a readable fallback).
  const fallback = mod.humanizeOperatorActions(["website.publishChange"]);
  assert.equal(fallback.length, 1);
  assert.doesNotMatch(fallback[0], /\./);

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

async function main() {
  testZeroConnectorFirstRunState();
  testOnboardingPrioritizationOnConnectorsPage();
  testConnectedRequiresRealTruthNotOnboardingSelection();
  testActivationToggleUsesRealRoutes();
  testActivationRoutesAreWorkspaceScoped();
  testPlanRequiredUxNotSilentlyBroken();
  testOperatorPagesActuallyRenderActivationToggle();
  testOperatorPagesRouteConnectThroughCentralHub();
  testOperationsStatusRouteExposesReadinessAndEligibility();
  testWhatAuterimCanDoNowIsCapabilityDerived();
  testNoNewCapabilityLogicInvented();
  await testHumanizeOperatorActionsRuntime();
  console.log("product-journey-pass2-smoke: all checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

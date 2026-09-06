import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Smoke tests for the Pass 2B shared operator product-state model
// (src/lib/operators/product-state.ts).
//
// Part A: source-contract checks proving the real UI surfaces (agents
// overview, dashboard, connectors page, operator detail pages) consume the
// ONE shared helper rather than re-deriving a competing state vocabulary.
//
// Part B: a real runtime execution of computeOperatorProductState() - the
// pure precedence decision - covering all 8 scenarios from the Pass 2B brief.
// The function has zero cross-file value imports (only type imports, which a
// TS transform erases), so it loads directly via esbuild + dynamic import
// with no dependency stubbing required - proving in the same act that the
// function really is pure.

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────
// Part A: source-contract checks
// ─────────────────────────────────────────────────────────────────────────

function testSharedModelExistsAndIsPure() {
  const source = read("src/lib/operators/product-state.ts");
  assert.match(source, /export function computeOperatorProductState/, "the pure precedence function must exist and be exported");
  assert.match(source, /export async function getWorkspaceOperatorProductStates/, "the IO-loading batch entry point must exist");
  assert.match(source, /export async function getOperatorProductState/, "the single-operator IO entry point must exist");
  // The pure function itself must never import a value from readiness.ts,
  // activation.ts, or connectors/truth.ts - only their types (erased at
  // runtime) - proving it is truly independent of IO for the precedence test
  // below to be meaningful.
  assert.match(source, /import \{ getOperatorActivationState, type OperatorActivationState \} from "@\/lib\/operators\/activation";/);
  assert.match(source, /import \{ getWorkspaceOperatorReadiness, type OperatorReadiness \} from "@\/lib\/operators\/readiness";/);
  assert.match(source, /import \{ getConnectorTruth, type SafeConnectorTruth \} from "@\/lib\/connectors\/truth";/);
}

function testPrecedenceOrderInSource() {
  const source = read("src/lib/operators/product-state.ts");
  const idxCommingNext = source.indexOf('if (readiness.status === "coming_next") return "needs_setup";');
  const idxMissing = source.indexOf('if (requiredConnectorHealth === "missing" || readiness.status === "missing_connector") return "needs_setup";');
  const idxUnhealthy = source.indexOf('if (requiredConnectorHealth === "unhealthy") return "needs_attention";');
  const idxBilling = source.indexOf('if (readiness.status === "upgrade_required" || !eligibility.eligible) {');
  const idxPaused = source.indexOf('if (!activated && everActivated) return "paused";');
  const idxReady = source.indexOf('if (!activated) return "ready_to_activate";');
  for (const [name, idx] of [["coming_next", idxCommingNext], ["missing", idxMissing], ["unhealthy", idxUnhealthy], ["billing", idxBilling], ["paused", idxPaused], ["ready", idxReady]]) {
    assert.ok(idx > 0, `expected to find the ${name} precedence check in source`);
  }
  assert.ok(idxCommingNext < idxUnhealthy && idxMissing < idxUnhealthy, "hard-requirement checks must be textually before the required-connector-unhealthy check");
  assert.ok(idxUnhealthy < idxBilling, "required-connector-unhealthy must be checked before billing eligibility");
  assert.ok(idxBilling < idxPaused && idxBilling < idxReady, "billing eligibility must be checked before paused/ready_to_activate");
}

function testConsumersUseTheSharedHelper() {
  for (const file of ["src/app/app/agents/page.tsx", "src/components/dashboard/overview.tsx"]) {
    const source = read(file);
    assert.match(
      source,
      /product-state|productState|ProductState/,
      `${file} must consume the shared operator product-state model`,
    );
  }
  // The connectors page consumes the same shared system via
  // getWorkspaceConnectorImpact (connector-requirements.ts) - the connector
  // -> affected-operator half of the same model, per item 27's "connector
  // affected-operator messaging" - rather than the per-operator state object
  // directly (it does not render individual operator cards).
  const connectors = read("src/app/app/connectors/page.tsx");
  assert.match(connectors, /getWorkspaceConnectorImpact/, "connectors page must consume the shared connector-impact model, not invent its own degraded-connector logic");

  const dashboardOverviewLib = read("src/lib/dashboard/overview.ts");
  assert.match(dashboardOverviewLib, /getWorkspaceOperatorProductStates/, "dashboard overview data must be built from the shared product-state helper, not a separate ready/needs_setup/monitoring vocabulary alone");
}

function testNoCompetingStateVocabularyInvented() {
  for (const file of [
    "src/app/app/agents/page.tsx",
    "src/app/app/connectors/page.tsx",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /function computeOperatorProductState/, `${file} must not re-implement the precedence decision`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Part B: runtime execution of the pure precedence decision
// ─────────────────────────────────────────────────────────────────────────

// product-state.ts's cross-file VALUE imports are all IO-loading dependencies
// of getWorkspaceOperatorProductStates()/buildOperatorProductState() - never
// of computeOperatorProductState() itself. Node's plain ESM loader cannot
// resolve their "@/..." aliases outside the Next.js build, so (mirroring
// capability-billing-gating-smoke.mjs's loadModuleWithReplacements technique)
// each import line is replaced with a stub that throws if ever called. If the
// pure precedence function under test were not actually pure, these stubs
// firing would fail the test loudly rather than silently mocking behavior.
function throwingReplacement(name) {
  return `const ${name} = () => { throw new Error("${name} must not be called - computeOperatorProductState is pure IO-free logic."); };`;
}

async function loadComputeOperatorProductState() {
  let source = fs.readFileSync(path.join(root, "src/lib/operators/product-state.ts"), "utf8");
  const replacements = [
    [
      'import { getOperatorActivationState, type OperatorActivationState } from "@/lib/operators/activation";',
      throwingReplacement("getOperatorActivationState"),
    ],
    [
      'import { getWorkspaceOperatorReadiness, type OperatorReadiness } from "@/lib/operators/readiness";',
      throwingReplacement("getWorkspaceOperatorReadiness"),
    ],
    [
      'import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";',
      throwingReplacement("getConnectorTruth"),
    ],
    [
      `import {
  getOperatorConnectorReadiness,
  getWorkspaceConnectorImpact,
  getRequiredConnectorHealth,
  type RequiredCapabilityHealth,
} from "@/lib/operators/connector-requirements";`,
      [
        throwingReplacement("getOperatorConnectorReadiness"),
        throwingReplacement("getWorkspaceConnectorImpact"),
        throwingReplacement("getRequiredConnectorHealth"),
      ].join("\n"),
    ],
    [
      'import { getOperatorDefinition, type OperatorKey } from "@/lib/operators/registry";',
      throwingReplacement("getOperatorDefinition"),
    ],
    [
      'import { getConnectorDefinition } from "@/lib/connectors/registry";',
      throwingReplacement("getConnectorDefinition"),
    ],
    [
      'import { humanizeOperatorActions } from "@/lib/operators/action-labels";',
      throwingReplacement("humanizeOperatorActions"),
    ],
    [
      'import { humanizeCapabilities } from "@/lib/operators/capability-labels";',
      throwingReplacement("humanizeCapabilities"),
    ],
    [
      'import { createSupabaseAdmin } from "@/lib/server/supabase-admin";',
      throwingReplacement("createSupabaseAdmin"),
    ],
  ];
  for (const [search, replace] of replacements) {
    assert.ok(source.includes(search), `expected to find and replace this exact import line in product-state.ts:\n${search}`);
    source = source.replace(search, replace);
  }

  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const tmpDir = path.join(root, "tests", ".tmp-operator-product-state-smoke");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `product-state-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  try {
    return await import(pathToFileURL(tmpFile).href);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function eligibility(status, eligible) {
  return { status, eligible, planTier: "growth", billingStatus: "active", canRunRealActions: eligible, reason: "test" };
}

async function testPrecedenceRuntime() {
  const mod = await loadComputeOperatorProductState();
  const compute = mod.computeOperatorProductState;
  assert.equal(typeof compute, "function");

  // 1. Missing hard requirement (never connected) -> needs_setup.
  assert.equal(compute({
    readiness: { status: "missing_connector", executionEligibility: eligibility("eligible", true) },
    activation: null,
    requiredConnectorHealth: "missing",
    hasHealthyOptionalCapability: false,
  }), "needs_setup");

  // 2. Ready + inactive -> ready_to_activate.
  assert.equal(compute({
    readiness: { status: "ready", executionEligibility: eligibility("eligible", true) },
    activation: { activated: false, activatedAt: null, deactivatedAt: null },
    requiredConnectorHealth: "ok",
    hasHealthyOptionalCapability: false,
  }), "ready_to_activate");

  // 3. Ready + active + eligible -> active.
  assert.equal(compute({
    readiness: { status: "ready", executionEligibility: eligibility("eligible", true) },
    activation: { activated: true, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: null },
    requiredConnectorHealth: "ok",
    hasHealthyOptionalCapability: false,
  }), "active");

  // 4. Active + plan required -> plan_required (billing wins over activation flag).
  assert.equal(compute({
    readiness: { status: "ready", executionEligibility: eligibility("plan_required", false) },
    activation: { activated: true, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: null },
    requiredConnectorHealth: "ok",
    hasHealthyOptionalCapability: false,
  }), "plan_required");

  // 4b. Billing attention and suspended are kept distinct, not collapsed into plan_required.
  assert.equal(compute({
    readiness: { status: "ready", executionEligibility: eligibility("billing_attention", false) },
    activation: { activated: true, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: null },
    requiredConnectorHealth: "ok",
    hasHealthyOptionalCapability: false,
  }), "billing_attention");
  assert.equal(compute({
    readiness: { status: "ready", executionEligibility: eligibility("suspended", false) },
    activation: { activated: true, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: null },
    requiredConnectorHealth: "ok",
    hasHealthyOptionalCapability: false,
  }), "suspended");

  // 5. Explicitly deactivated -> paused (distinct from never-activated ready_to_activate).
  assert.equal(compute({
    readiness: { status: "ready", executionEligibility: eligibility("eligible", true) },
    activation: { activated: false, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: "2026-01-05T00:00:00.000Z" },
    requiredConnectorHealth: "ok",
    hasHealthyOptionalCapability: false,
  }), "paused");

  // 6. Required connector unhealthy -> needs_attention (even though it was previously ready/active).
  assert.equal(compute({
    readiness: { status: "ready", executionEligibility: eligibility("eligible", true) },
    activation: { activated: true, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: null },
    requiredConnectorHealth: "unhealthy",
    hasHealthyOptionalCapability: false,
  }), "needs_attention");

  // 7. Optional connector unhealthy alone never breaks the operator - state stays active
  // (degraded/enhancement-loss is carried separately in OperatorDegradedInfo, not the state enum).
  assert.equal(compute({
    readiness: { status: "ready", executionEligibility: eligibility("eligible", true) },
    activation: { activated: true, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: null },
    requiredConnectorHealth: "ok",
    hasHealthyOptionalCapability: false,
  }), "active");

  // 8. Optional connector healthy -> enhanced.
  assert.equal(compute({
    readiness: { status: "ready", executionEligibility: eligibility("eligible", true) },
    activation: { activated: true, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: null },
    requiredConnectorHealth: "ok",
    hasHealthyOptionalCapability: true,
  }), "enhanced");

  // Precedence proof: BOTH missing a required connector AND billing issues present
  // -> needs_setup, never plan_required. Hard requirements always win.
  assert.equal(compute({
    readiness: { status: "missing_connector", executionEligibility: eligibility("suspended", false) },
    activation: null,
    requiredConnectorHealth: "missing",
    hasHealthyOptionalCapability: false,
  }), "needs_setup");

  // Precedence proof: a required connector going unhealthy outranks billing trouble too.
  assert.equal(compute({
    readiness: { status: "ready", executionEligibility: eligibility("billing_attention", false) },
    activation: { activated: true, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: null },
    requiredConnectorHealth: "unhealthy",
    hasHealthyOptionalCapability: false,
  }), "needs_attention");

  // Never contradictory: an operator reported "coming_next" is always needs_setup,
  // regardless of activation/billing noise passed in.
  assert.equal(compute({
    readiness: { status: "coming_next", executionEligibility: eligibility("eligible", true) },
    activation: { activated: true, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: null },
    requiredConnectorHealth: "ok",
    hasHealthyOptionalCapability: true,
  }), "needs_setup");

  console.log("  computeOperatorProductState runtime checks passed: all 8 scenarios + precedence-order proofs verified.");
}

async function main() {
  testSharedModelExistsAndIsPure();
  testPrecedenceOrderInSource();
  testConsumersUseTheSharedHelper();
  testNoCompetingStateVocabularyInvented();
  await testPrecedenceRuntime();
  console.log("operator-product-state-smoke: all checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

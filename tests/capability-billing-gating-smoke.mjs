import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Smoke tests for the Pass 1 backend capability/billing/activation work:
//   - getWorkspaceExecutionEligibility (src/lib/os/execution-eligibility.ts)
//   - operator activation (src/lib/operators/activation.ts)
//   - the three operator scan paths and Trigger.dev fanouts actually
//     enforcing billing before running real scan work
//   - the readiness.ts / connector-requirements.ts capability unification
//
// Part A mirrors the source-contract technique used in
// tests/revenue-operator-smoke.mjs: static regex assertions against the real
// source files, proving the wiring exists at the exact call sites claimed.
//
// Part B mirrors the runtime-execution technique used in
// tests/ai-drafting-runtime-smoke.mjs (esbuild.transformSync + dynamic
// import) to actually execute the real eligibility-mapping and
// activation-state logic. Neither module under test in Part B has a
// bundler, so the one real cross-module runtime dependency each file has
// (createSupabaseAdmin, and execution-eligibility's use of the real
// getEntitlements()) is swapped out the same way ai-drafting-runtime-smoke
// swaps global.fetch: the real dependency module is loaded for real via this
// same technique first, then injected through a global, and the target
// module's import line for it is textually replaced with a read of that
// global. The actual decision logic under test (status mapping, entitlement
// resolution, activation defaulting) is never reimplemented or mocked - only
// the module-alias wiring Node's plain ESM loader cannot resolve outside the
// Next.js build is swapped. No live Supabase/Dodo credentials or network
// access are used anywhere in this file.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-capability-billing-gating-smoke");
fs.mkdirSync(tmpDir, { recursive: true });

function loadModule(relSourcePath) {
  const source = fs.readFileSync(path.join(root, relSourcePath), "utf8");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

function loadModuleWithReplacements(relSourcePath, replacements) {
  let source = fs.readFileSync(path.join(root, relSourcePath), "utf8");
  for (const [search, replace] of replacements) {
    assert.ok(source.includes(search), `expected to find and replace this exact import line in ${relSourcePath}:\n${search}`);
    source = source.replace(search, replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

// ─────────────────────────────────────────────────────────────────────────
// Part A: source-contract checks
// ─────────────────────────────────────────────────────────────────────────

function testSourceContracts() {
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

  const revenueScan = read("src/lib/operators/revenue/scan.ts");
  const clientFlowScan = read("src/lib/operators/client-flow/scan.ts");
  const operationsScan = read("src/lib/operators/operations/scan.ts");
  const revenueTrigger = read("src/trigger/revenue-operator-scan.ts");
  const operationsTrigger = read("src/trigger/operations-operator-scan.ts");
  const clientFlowTrigger = read("src/trigger/client-flow-operator-scan.ts");
  const readiness = read("src/lib/operators/readiness.ts");
  const connectorRequirements = read("src/lib/operators/connector-requirements.ts");
  const activationModule = read("src/lib/operators/activation.ts");
  const activateRoute = read("src/app/api/operators/[operatorKey]/activate/route.ts");
  const deactivateRoute = read("src/app/api/operators/[operatorKey]/deactivate/route.ts");

  // A1. All three scan paths import and actually call getWorkspaceExecutionEligibility.
  for (const [name, source] of [["revenue/scan.ts", revenueScan], ["client-flow/scan.ts", clientFlowScan], ["operations/scan.ts", operationsScan]]) {
    assert.match(source, /import \{ getWorkspaceExecutionEligibility \} from "@\/lib\/os\/execution-eligibility";/, `${name} must import the shared eligibility function`);
    assert.match(source, /const executionEligibility = await getWorkspaceExecutionEligibility\(workspaceId, supabase\);/, `${name} must actually call it before doing scan work`);
    assert.match(source, /if \(!executionEligibility\.eligible\) \{/, `${name} must branch on eligibility.eligible`);
    assert.match(source, /status: "plan_required"/, `${name} must return a status distinct from missing_connector/setup_incomplete`);
  }

  // A2. The billing gate in each scan runs after readiness/setup checks and before connector API calls.
  const revenueGateIndex = revenueScan.indexOf("getWorkspaceExecutionEligibility(workspaceId, supabase)");
  const revenueEmailConnectorIndex = revenueScan.indexOf("const emailConnector = resolveRevenueEmailConnector(readiness);");
  assert.ok(revenueGateIndex > 0 && revenueGateIndex < revenueEmailConnectorIndex, "revenue billing gate must run before connector resolution/API calls");

  const opsGateIndex = operationsScan.indexOf("getWorkspaceExecutionEligibility(workspaceId, supabase)");
  const opsTryIndex = operationsScan.indexOf("const lists = (await listTrelloLists");
  assert.ok(opsGateIndex > 0 && opsGateIndex < opsTryIndex, "operations billing gate must run before any Trello API call");

  // A3. Trigger.dev fanout: all three operators filter by readiness AND billing eligibility AND explicit activation.
  for (const [name, source] of [["revenue-operator-scan.ts", revenueTrigger], ["operations-operator-scan.ts", operationsTrigger], ["client-flow-operator-scan.ts", clientFlowTrigger]]) {
    assert.match(source, /import \{ getWorkspaceExecutionEligibility \} from "@\/lib\/os\/execution-eligibility";/, `${name} fanout must import the eligibility function`);
    assert.match(source, /import \{ getOperatorActivationState \} from "@\/lib\/operators\/activation";/, `${name} fanout must import the activation-state reader`);
    assert.match(source, /eligibility\.eligible && activation\?\.activated/, `${name} fanout must require both billing eligibility and explicit activation`);
  }
  // Client Flow specifically must no longer be single-workspace hardcoded with no fanout.
  assert.doesNotMatch(clientFlowTrigger, /TODO: Replace the single-workspace default with a workspace fanout/, "client-flow-operator-scan.ts's fanout TODO must be resolved");
  assert.match(clientFlowTrigger, /async function listEligibleClientFlowWorkspaceIds/, "client-flow-operator-scan.ts must have real workspace discovery, matching the other two operators");
  assert.match(clientFlowTrigger, /workspacesNeedingAttention/, "client-flow-operator-scan.ts fanout must surface failed workspaces explicitly");

  // A4. readiness.ts unification: capability graph is a real input to evaluateOperator, and execution eligibility backs canExecuteRealActions.
  assert.match(readiness, /import \{ getOperatorConnectorReadiness, type OperatorConnectorReadiness \} from "@\/lib\/operators\/connector-requirements";/, "readiness.ts must build on the shared capability-graph function");
  assert.match(readiness, /function getWorkspaceCapabilityReadiness/, "readiness.ts must have a named function computing the shared capability base");
  assert.match(readiness, /const capabilityReadiness = getWorkspaceCapabilityReadiness\(operator, truth\);/, "evaluateOperator must actually call the shared capability base once per operator");
  assert.match(readiness, /const hasEmail = capabilityReadiness\?\.ready \?\? emailConnectors\.length > 0;/, "revenue and client_flow branches must be gated by the shared capability system, not just the old ad hoc connector check");
  assert.match(readiness, /const missingCapability = capabilityReadiness \? !capabilityReadiness\.ready : false;/, "operations branch must also fold in the shared capability system");
  assert.match(readiness, /canExecuteRealActions: canRunManual && input\.executionEligibility\.eligible,/, "canExecuteRealActions must be backed by the same real execution-eligibility check the scan paths enforce");
  assert.match(readiness, /executionEligibility: WorkspaceExecutionEligibility;/, "OperatorReadiness must expose full eligibility detail for Pass 2's UI");

  // A5. connector-requirements.ts required-capability lists were corrected to match real gating behavior.
  assert.match(connectorRequirements, /required: \["email\.read", "email\.send_after_approval"\],[\s\S]{0,40}optional: \["docs\.read", "pm\.tasks\.write_after_approval"/, "client_flow's declared required capabilities must include send, matching what readiness.ts and scan.ts actually require");
  assert.match(connectorRequirements, /required: \["pm\.tasks\.read"\],/, "operations' declared required capabilities must no longer be an empty array now that Trello is a real hard requirement");

  // A6. Activation model: dedicated trigger_type, default-false, and workspace-scoped routes exist.
  assert.match(activationModule, /const ACTIVATION_TRIGGER_TYPE = "operator_activation";/, "activation must use its own dedicated trigger_type, separate from scheduled_monitoring telemetry");
  assert.match(activationModule, /export async function getOperatorActivationState/, "a real activation-state reader must exist");
  assert.match(activationModule, /export async function setOperatorActivationState/, "a real activation-state writer must exist");
  assert.match(activateRoute, /resolveWorkspaceContext/, "the activate route must resolve workspace identity from a verified session, never trust client-supplied ids directly");
  assert.match(activateRoute, /setOperatorActivationState\(\{[\s\S]{0,120}activated: true,/, "the activate route must set activated: true");
  assert.match(deactivateRoute, /resolveWorkspaceContext/, "the deactivate route must resolve workspace identity from a verified session, never trust client-supplied ids directly");
  assert.match(deactivateRoute, /setOperatorActivationState\(\{[\s\S]{0,120}activated: false,/, "the deactivate route must set activated: false");

  // A7. Approval boundary is untouched: capability/billing/activation code never itself executes a mutating external action.
  for (const file of ["src/lib/os/execution-eligibility.ts", "src/lib/operators/activation.ts"]) {
    const source = read(file);
    assert.doesNotMatch(source, /os_approvals/, `${file} must never itself touch os_approvals - it is a descriptive gate only, consumed by scan.ts/API routes which still go through the real approval flow`);
  }

  console.log("  Source-contract checks passed: billing enforcement, fanout gating, capability unification, and activation wiring all verified at the exact claimed call sites.");
}

// ─────────────────────────────────────────────────────────────────────────
// Part B: runtime execution of the real eligibility + activation logic
// ─────────────────────────────────────────────────────────────────────────

async function testExecutionEligibilityRuntime() {
  const entitlements = await loadModule("src/lib/os/entitlements.ts");
  globalThis.__test_getEntitlements = entitlements.getEntitlements;

  const eligibilityModule = await loadModuleWithReplacements("src/lib/os/execution-eligibility.ts", [
    [
      'import { getEntitlements, type BillingStatus, type PlanTier } from "@/lib/os/entitlements";',
      "const getEntitlements = globalThis.__test_getEntitlements;",
    ],
    ['import type { Workspace } from "@/lib/os/types";', ""],
    [
      'import { createSupabaseAdmin } from "@/lib/server/supabase-admin";',
      'const createSupabaseAdmin = () => { throw new Error("createSupabaseAdmin must not be called - this test always passes a mock supabase client explicitly."); };',
    ],
  ]);
  const { getWorkspaceExecutionEligibility, getWorkspaceExecutionEligibilityFromWorkspace } = eligibilityModule;

  function baseWorkspace(overrides = {}) {
    return { id: "ws-test", name: "Test", environment: "production", region: "us", plan: "starter", ...overrides };
  }

  // 1. A canceled workspace is not execution-eligible.
  {
    const result = getWorkspaceExecutionEligibilityFromWorkspace(baseWorkspace({ planTier: "starter", billingStatus: "canceled" }));
    assert.equal(result.eligible, false, "canceled must not be eligible");
    assert.equal(result.status, "suspended");
    assert.equal(result.canRunRealActions, false);
  }

  // 2. A trialing workspace IS eligible (preserves entitlements.ts's intentional trial allowance).
  {
    const result = getWorkspaceExecutionEligibilityFromWorkspace(baseWorkspace({ planTier: "starter", billingStatus: "trialing", trialEndsAt: "2099-01-01T00:00:00.000Z" }));
    assert.equal(result.eligible, true, "trialing must be eligible");
    assert.equal(result.status, "trial");
    assert.equal(result.canRunRealActions, true);
    assert.match(result.reason, /trial/i);
  }

  // 3. A past_due workspace is not eligible, and is labeled distinctly from "canceled"/"suspended".
  {
    const result = getWorkspaceExecutionEligibilityFromWorkspace(baseWorkspace({ planTier: "growth", billingStatus: "past_due" }));
    assert.equal(result.eligible, false, "past_due must not be eligible");
    assert.equal(result.status, "billing_attention");
  }

  // 4. A preview-tier workspace always maps to plan_required, regardless of billing_status.
  {
    const result = getWorkspaceExecutionEligibilityFromWorkspace(baseWorkspace({ planTier: "preview", billingStatus: "trialing" }));
    assert.equal(result.eligible, false);
    assert.equal(result.status, "plan_required");
  }

  // 5. An active paid workspace is fully eligible.
  {
    const result = getWorkspaceExecutionEligibilityFromWorkspace(baseWorkspace({ planTier: "operator", billingStatus: "active" }));
    assert.equal(result.eligible, true);
    assert.equal(result.status, "eligible");
  }

  // 6. getWorkspaceExecutionEligibility never trusts a client-supplied value - it always loads
  // the real workspace row through the supabase client it is given, and two different DB rows
  // for the same workspaceId produce two different, correctly-derived results.
  function mockWorkspaceSupabase(row, { error } = {}) {
    return {
      from(table) {
        assert.equal(table, "os_workspaces");
        return {
          select() {
            return {
              eq(col) {
                assert.equal(col, "id");
                return {
                  async single() {
                    if (error) return { data: null, error: { message: error } };
                    return { data: row, error: null };
                  },
                };
              },
            };
          },
        };
      },
    };
  }

  {
    const activeRow = { id: "ws-a", name: "A", environment: "production", region: "us", plan: "growth", plan_tier: "growth", billing_status: "active", trial_ends_at: null };
    const canceledRow = { ...activeRow, billing_status: "canceled" };
    const activeResult = await getWorkspaceExecutionEligibility("ws-a", mockWorkspaceSupabase(activeRow));
    const canceledResult = await getWorkspaceExecutionEligibility("ws-a", mockWorkspaceSupabase(canceledRow));
    assert.equal(activeResult.eligible, true, "an active row must resolve eligible");
    assert.equal(canceledResult.eligible, false, "a canceled row for the same workspace id must resolve not eligible - proving the result tracks the real row, not a cached/default value");
  }

  // 7. A Supabase lookup error (or missing workspace) fails closed - never defaults to eligible.
  {
    const result = await getWorkspaceExecutionEligibility("ws-missing", mockWorkspaceSupabase(null, { error: "not found" }));
    assert.equal(result.eligible, false, "a lookup error must fail closed, never default to eligible");
    assert.equal(result.status, "plan_required");
  }

  console.log("  getWorkspaceExecutionEligibility runtime checks passed: canceled/trialing/past_due/preview/active mapping, DB-driven (not client-trusted) resolution, and fail-closed error handling all verified.");
}

async function testOperatorActivationRuntime() {
  const registry = await loadModule("src/lib/operators/registry.ts");
  globalThis.__test_getOperatorDefinition = registry.getOperatorDefinition;

  const activationModule = await loadModuleWithReplacements("src/lib/operators/activation.ts", [
    [
      'import { getOperatorDefinition, type OperatorKey } from "@/lib/operators/registry";',
      "const getOperatorDefinition = globalThis.__test_getOperatorDefinition;",
    ],
    [
      'import { createSupabaseAdmin } from "@/lib/server/supabase-admin";',
      'const createSupabaseAdmin = () => { throw new Error("createSupabaseAdmin must not be called - this test always passes a mock supabase client explicitly."); };',
    ],
  ]);
  const { getOperatorActivationState, setOperatorActivationState } = activationModule;

  function mockTriggersSupabase(store) {
    return {
      from(table) {
        assert.equal(table, "os_operator_triggers");
        return {
          select() {
            const filters = {};
            const builder = {
              eq(col, val) {
                filters[col] = val;
                return builder;
              },
              async maybeSingle() {
                const row = store.find((r) => r.workspace_id === filters.workspace_id && r.operator_key === filters.operator_key && r.trigger_type === filters.trigger_type);
                return { data: row ?? null, error: null };
              },
            };
            return builder;
          },
          async upsert(row) {
            const idx = store.findIndex((r) => r.id === row.id);
            if (idx >= 0) store[idx] = { ...store[idx], ...row, updated_at: new Date().toISOString() };
            else store.push({ ...row, updated_at: new Date().toISOString() });
            return { error: null };
          },
        };
      },
    };
  }

  // 1. An operator with no os_operator_triggers row defaults to not-activated.
  {
    const store = [];
    const state = await getOperatorActivationState({ workspaceId: "ws-a", operatorKey: "revenue", supabase: mockTriggersSupabase(store) });
    assert.ok(state, "a valid operator key must resolve a state, not null");
    assert.equal(state.activated, false, "an operator never explicitly activated must default to not-activated");
    assert.equal(state.activatedAt, null);
  }

  // 2. Unknown operator key resolves to null (read) / ok:false (write), not a crash or a false "activated".
  {
    const store = [];
    const state = await getOperatorActivationState({ workspaceId: "ws-a", operatorKey: "not_a_real_operator", supabase: mockTriggersSupabase(store) });
    assert.equal(state, null);
    const write = await setOperatorActivationState({ workspaceId: "ws-a", operatorKey: "not_a_real_operator", activated: true, supabase: mockTriggersSupabase(store) });
    assert.equal(write.ok, false);
  }

  // 3. Activating then deactivating an operator round-trips correctly, and never touches a
  // "scheduled_monitoring" telemetry row (only ever reads/writes trigger_type "operator_activation").
  {
    const store = [];
    const supabase = mockTriggersSupabase(store);

    const activated = await setOperatorActivationState({ workspaceId: "ws-b", operatorKey: "operations", activated: true, actorEmail: "owner@example.com", supabase });
    assert.equal(activated.ok, true);
    assert.equal(activated.state.activated, true);
    assert.ok(activated.state.activatedAt, "activating must record an activatedAt timestamp");

    const readAfterActivate = await getOperatorActivationState({ workspaceId: "ws-b", operatorKey: "operations", supabase });
    assert.equal(readAfterActivate.activated, true);
    assert.equal(readAfterActivate.activatedBy, "owner@example.com");

    const deactivated = await setOperatorActivationState({ workspaceId: "ws-b", operatorKey: "operations", activated: false, supabase });
    assert.equal(deactivated.ok, true);
    assert.equal(deactivated.state.activated, false);

    const readAfterDeactivate = await getOperatorActivationState({ workspaceId: "ws-b", operatorKey: "operations", supabase });
    assert.equal(readAfterDeactivate.activated, false, "deactivation must round-trip back to not-activated");

    // Exactly one row for this workspace+operator, under the dedicated activation trigger_type -
    // proving activation never created or mutated a separate "scheduled_monitoring" row.
    const rowsForWorkspaceOperator = store.filter((r) => r.workspace_id === "ws-b" && r.operator_key === "operations");
    assert.equal(rowsForWorkspaceOperator.length, 1);
    assert.equal(rowsForWorkspaceOperator[0].trigger_type, "operator_activation");
  }

  // 4. Activation state for one workspace never affects another workspace's state for the same operator.
  {
    const store = [];
    const supabase = mockTriggersSupabase(store);
    await setOperatorActivationState({ workspaceId: "ws-c", operatorKey: "revenue", activated: true, supabase });
    const otherWorkspaceState = await getOperatorActivationState({ workspaceId: "ws-d", operatorKey: "revenue", supabase });
    assert.equal(otherWorkspaceState.activated, false, "activating ws-c must not activate the same operator for ws-d");
  }

  console.log("  Operator activation runtime checks passed: default-false, unknown-operator handling, activate/deactivate round trip, and workspace isolation all verified.");
}

try {
  testSourceContracts();
  await testExecutionEligibilityRuntime();
  await testOperatorActivationRuntime();
  console.log("capability-billing-gating-smoke: all checks passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete globalThis.__test_getEntitlements;
  delete globalThis.__test_getOperatorDefinition;
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Automatic stuck-workflow recovery.
//
// The real src/lib/workflows/recovery.ts runs here against an in-memory
// database, with only its connector-truth, billing, policy and Supabase
// boundaries replaced. The scheduler contract in src/trigger/workflow-recovery.ts
// is checked statically, because Trigger.dev's scheduler cannot be exercised
// in a plain Node process.
//
// No network call and no live database are used anywhere in this file.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-stuck-workflow-scheduler");
const results = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function check(number, name, fn) {
  return Promise.resolve(fn()).then(() => {
    results.push(number);
    console.log(`  ${number}. ${name}`);
  });
}

async function loadModule(relSourcePath, replacements = []) {
  let source = read(relSourcePath);
  for (const [search, replace] of replacements) {
    assert.ok(source.includes(search), `expected to find this exact snippet in ${relSourcePath}:\n${search}`);
    source = source.replace(search, replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

/** Minimal in-memory Supabase surface covering exactly what recovery.ts uses. */
function createFakeDatabase(tables) {
  const state = { tables, updates: [] };
  state.supabase = {
    from(table) {
      const rows = () => state.tables[table] ?? [];
      const filters = [];
      let mode = "select";
      let patch = null;
      let limit = Infinity;
      let orderColumn = null;
      const matches = (row) => filters.every((filter) => filter(row));
      const builder = {
        select() { return builder; },
        update(next) { mode = "update"; patch = next; return builder; },
        eq(column, value) { filters.push((row) => row[column] === value); return builder; },
        lt(column, value) { filters.push((row) => String(row[column]) < String(value)); return builder; },
        in(column, values) { filters.push((row) => values.includes(row[column])); return builder; },
        not(column, operator, value) {
          assert.equal(operator, "eq");
          filters.push((row) => row[column] !== value);
          return builder;
        },
        order(column) { orderColumn = column; return builder; },
        limit(value) { limit = value; return builder; },
        async maybeSingle() {
          const found = rows().filter(matches);
          if (mode === "update") {
            if (found.length === 0) return { data: null, error: null };
            Object.assign(found[0], patch);
            state.updates.push({ table, id: found[0].id, patch });
            return { data: { id: found[0].id }, error: null };
          }
          return { data: found[0] ?? null, error: null };
        },
        then(resolve, reject) {
          try {
            let found = rows().filter(matches);
            if (orderColumn) found = [...found].sort((a, b) => String(a[orderColumn]).localeCompare(String(b[orderColumn])));
            if (mode === "update") {
              for (const row of found) { Object.assign(row, patch); state.updates.push({ table, id: row.id, patch }); }
              return resolve({ data: found, error: null });
            }
            return resolve({ data: found.slice(0, limit), error: null });
          } catch (error) {
            return reject(error);
          }
        },
      };
      return builder;
    },
  };
  return state;
}

const RECOVERY_IMPORTS = `import "server-only";

import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";`;

const RECOVERY_FAKES = `const fixtures = () => globalThis.__recoveryFixtures ?? {};
const getConnectorTruth = async () => fixtures().truth ?? [];
const getWorkspaceExecutionEligibility = async () => fixtures().eligibility ?? { eligible: true };
const loadPolicyWorkspaceSettings = async () => fixtures().policy ?? { emergencyStopEnabled: false };
const createSupabaseAdmin = () => { throw new Error("no database in this test"); };`;

const healthyJira = [{ connectorKey: "jira", status: "connected", executable: true, reconnectRequired: false }];

function step(overrides = {}) {
  return {
    id: "wf-1:pm-follow-up",
    workflow_id: "wf-1",
    workspace_id: "ws-1",
    connector_key: "jira",
    status: "executing",
    execution_intent_id: null,
    approval_id: null,
    block_reason: null,
    updated_at: new Date(Date.now() - 90 * 60_000).toISOString(),
    ...overrides,
  };
}

async function main() {
  try {
    const recovery = await loadModule("src/lib/workflows/recovery.ts", [[RECOVERY_IMPORTS, RECOVERY_FAKES]]);
    const { classifyStuckWorkflowStep, recoverStuckWorkflowSteps, listWorkspacesWithStuckWorkflowSteps } = recovery;

    const facts = (overrides = {}) => ({
      stuckMinutes: 90,
      approvalStatus: "pending",
      intentStatus: "policy_evaluated",
      connectorReconnectRequired: false,
      connectorHealthy: true,
      executionEligible: true,
      emergencyStopEnabled: false,
      ...overrides,
    });

    // ── 1. Classification safety ─────────────────────────────────────────

    await check(1, "An unclaimed approval is the only safe-to-retry case", () => {
      const decision = classifyStuckWorkflowStep(facts());
      assert.equal(decision.disposition, "safe_to_retry");
      assert.equal(decision.nextStatus, "awaiting_approval", "recovery returns the step to its approval gate, it does not execute");
    });

    await check(2, "A claimed approval is execution unknown and is never retried", () => {
      const decision = classifyStuckWorkflowStep(facts({ approvalStatus: "executing" }));
      assert.equal(decision.disposition, "execution_unknown");
      assert.equal(decision.nextStatus, "blocked");
      assert.equal(decision.blockReason, "execution_unknown");
    });

    await check(3, "An authorized or executing intent is execution unknown", () => {
      for (const intentStatus of ["authorized", "executing"]) {
        const decision = classifyStuckWorkflowStep(facts({ intentStatus }));
        assert.equal(decision.disposition, "execution_unknown", `intent status ${intentStatus} must be treated as uncertain`);
      }
    });

    await check(4, "A step with no approval and no intent evidence is execution unknown", () => {
      const decision = classifyStuckWorkflowStep(facts({ approvalStatus: null, intentStatus: null }));
      assert.equal(decision.disposition, "execution_unknown", "absent evidence must never be read as absent execution");
    });

    await check(5, "Uncertain execution outranks age, policy, billing and connector health", () => {
      const decision = classifyStuckWorkflowStep(facts({
        approvalStatus: "executing", stuckMinutes: 10_000, emergencyStopEnabled: true,
        executionEligible: false, connectorReconnectRequired: true, connectorHealthy: false,
      }));
      assert.equal(decision.disposition, "execution_unknown", "nothing may downgrade an uncertain external write");
    });

    await check(6, "A known outcome that was never reconciled is blocked for a human", () => {
      for (const overrides of [{ approvalStatus: "approved", intentStatus: "succeeded" }, { approvalStatus: "failed", intentStatus: "failed" }, { approvalStatus: "rejected", intentStatus: "denied" }]) {
        const decision = classifyStuckWorkflowStep(facts(overrides));
        assert.equal(decision.disposition, "blocked");
        assert.equal(decision.blockReason, "execution_result_unreconciled");
      }
    });

    await check(7, "Recovery is bounded: a day-old stale step becomes a permanent failure", () => {
      const decision = classifyStuckWorkflowStep(facts({ stuckMinutes: 24 * 60 }));
      assert.equal(decision.disposition, "permanent_failure");
      assert.equal(decision.nextStatus, "failed");
      assert.equal(decision.blockReason, "recovery_exhausted");
    });

    await check(8, "Emergency stop blocks recovery from resuming anything", () => {
      const decision = classifyStuckWorkflowStep(facts({ emergencyStopEnabled: true }));
      assert.equal(decision.disposition, "blocked");
      assert.equal(decision.blockReason, "emergency_stop_active");
    });

    await check(9, "Billing ineligibility blocks recovery from resuming anything", () => {
      const decision = classifyStuckWorkflowStep(facts({ executionEligible: false }));
      assert.equal(decision.disposition, "blocked");
      assert.equal(decision.blockReason, "workspace_execution_ineligible");
    });

    await check(10, "Connector health is respected before anything resumes", () => {
      assert.equal(classifyStuckWorkflowStep(facts({ connectorReconnectRequired: true })).disposition, "reconnect_required");
      assert.equal(classifyStuckWorkflowStep(facts({ connectorHealthy: false })).blockReason, "connector_not_ready");
    });

    // ── 2. Runtime behavior ──────────────────────────────────────────────

    await check(11, "A healthy workspace resumes only the provably unexecuted step", async () => {
      globalThis.__recoveryFixtures = { truth: healthyJira, eligibility: { eligible: true }, policy: { emergencyStopEnabled: false } };
      const db = createFakeDatabase({
        os_workflow_steps: [
          step({ id: "step-safe", approval_id: "appr-safe", execution_intent_id: "intent-safe" }),
          step({ id: "step-unknown", workflow_id: "wf-2", approval_id: "appr-claimed", execution_intent_id: "intent-claimed" }),
        ],
        os_approvals: [{ id: "appr-safe", workspace_id: "ws-1", status: "pending" }, { id: "appr-claimed", workspace_id: "ws-1", status: "executing" }],
        os_execution_intents: [{ id: "intent-safe", workspace_id: "ws-1", status: "policy_evaluated" }, { id: "intent-claimed", workspace_id: "ws-1", status: "authorized" }],
        os_workflow_runs: [{ id: "wf-1", workspace_id: "ws-1", status: "executing" }, { id: "wf-2", workspace_id: "ws-1", status: "executing" }],
      });
      const summary = await recoverStuckWorkflowSteps({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(summary.scanned, 2);
      assert.equal(summary.reviewed, 2);
      assert.equal(summary.safeToRetry, 1);
      assert.equal(summary.executionUnknown, 1);
      assert.equal(db.tables.os_workflow_steps.find((row) => row.id === "step-safe").status, "awaiting_approval");
      assert.equal(db.tables.os_workflow_steps.find((row) => row.id === "step-unknown").status, "blocked");
      assert.equal(db.tables.os_workflow_steps.find((row) => row.id === "step-unknown").block_reason, "execution_unknown");
      assert.equal(db.tables.os_workflow_runs.find((row) => row.id === "wf-1").status, "executing", "a resumed step must not block its workflow");
      assert.equal(db.tables.os_workflow_runs.find((row) => row.id === "wf-2").status, "blocked");
      assert.ok(summary.oldestStuckAgeMinutes >= 89);
    });

    await check(12, "A recovery pass racing a live execution loses harmlessly", async () => {
      globalThis.__recoveryFixtures = { truth: healthyJira };
      const db = createFakeDatabase({
        os_workflow_steps: [step({ id: "step-live", approval_id: "appr-live", execution_intent_id: "intent-live" })],
        os_approvals: [{ id: "appr-live", workspace_id: "ws-1", status: "pending" }],
        os_execution_intents: [{ id: "intent-live", workspace_id: "ws-1", status: "policy_evaluated" }],
        os_workflow_runs: [{ id: "wf-1", workspace_id: "ws-1", status: "executing" }],
      });
      // The real worker completes the step between the scan and the write.
      db.tables.os_workflow_steps[0].status = "completed";
      const summary = await recoverStuckWorkflowSteps({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(summary.reviewed, 0, "a step no longer executing must not be rewritten");
      assert.equal(db.tables.os_workflow_steps[0].status, "completed", "live execution truth must win");
    });

    await check(13, "Emergency stop and billing loss keep recovery from resuming a pending approval", async () => {
      for (const [name, fixtures] of [
        ["emergency stop", { truth: healthyJira, policy: { emergencyStopEnabled: true } }],
        ["billing", { truth: healthyJira, eligibility: { eligible: false } }],
      ]) {
        globalThis.__recoveryFixtures = fixtures;
        const db = createFakeDatabase({
          os_workflow_steps: [step({ id: "step-gated", approval_id: "appr-gated", execution_intent_id: "intent-gated" })],
          os_approvals: [{ id: "appr-gated", workspace_id: "ws-1", status: "pending" }],
          os_execution_intents: [{ id: "intent-gated", workspace_id: "ws-1", status: "policy_evaluated" }],
          os_workflow_runs: [{ id: "wf-1", workspace_id: "ws-1", status: "executing" }],
        });
        const summary = await recoverStuckWorkflowSteps({ workspaceId: "ws-1", supabase: db.supabase });
        assert.equal(summary.safeToRetry, 0, `${name} must prevent any resumption`);
        assert.equal(summary.blocked, 1);
        assert.equal(db.tables.os_workflow_steps[0].status, "blocked");
      }
    });

    await check(14, "Batches are bounded and workspace isolated", async () => {
      globalThis.__recoveryFixtures = { truth: healthyJira };
      const steps = Array.from({ length: 12 }, (_, index) => step({ id: `own-${index}`, workflow_id: `wf-${index}` }));
      const foreign = Array.from({ length: 5 }, (_, index) => step({ id: `other-${index}`, workspace_id: "ws-other", workflow_id: `wfo-${index}` }));
      const db = createFakeDatabase({
        os_workflow_steps: [...steps, ...foreign],
        os_approvals: [],
        os_execution_intents: [],
        os_workflow_runs: [],
      });
      const summary = await recoverStuckWorkflowSteps({ workspaceId: "ws-1", limit: 4, supabase: db.supabase });
      assert.equal(summary.scanned, 4, "the batch ceiling must be respected");
      assert.ok(foreign.every((row) => row.status === "executing"), "another workspace's steps must never be touched");
      const oversized = await recoverStuckWorkflowSteps({ workspaceId: "ws-1", limit: 100_000, supabase: db.supabase });
      assert.ok(oversized.scanned <= 200, "the hard batch ceiling must not be bypassable by the caller");
    });

    await check(15, "Recovery is idempotent across repeated passes", async () => {
      globalThis.__recoveryFixtures = { truth: healthyJira };
      const db = createFakeDatabase({
        os_workflow_steps: [step({ id: "step-x", approval_id: "appr-x", execution_intent_id: "intent-x" })],
        os_approvals: [{ id: "appr-x", workspace_id: "ws-1", status: "executing" }],
        os_execution_intents: [{ id: "intent-x", workspace_id: "ws-1", status: "authorized" }],
        os_workflow_runs: [{ id: "wf-1", workspace_id: "ws-1", status: "executing" }],
      });
      const first = await recoverStuckWorkflowSteps({ workspaceId: "ws-1", supabase: db.supabase });
      const second = await recoverStuckWorkflowSteps({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(first.reviewed, 1);
      assert.equal(second.reviewed, 0, "a second pass must find nothing left to do");
      assert.equal(second.scanned, 0);
    });

    await check(16, "Workspace discovery is one bounded, de-duplicated query", async () => {
      const db = createFakeDatabase({
        os_workflow_steps: [
          step({ id: "a", workspace_id: "ws-1" }),
          step({ id: "b", workspace_id: "ws-1" }),
          step({ id: "c", workspace_id: "ws-2" }),
          step({ id: "d", workspace_id: "ws-3", status: "completed" }),
        ],
      });
      const workspaces = await listWorkspacesWithStuckWorkflowSteps({ supabase: db.supabase });
      assert.deepEqual(workspaces.sort(), ["ws-1", "ws-2"]);
    });

    await check(17, "Recovery never contacts a provider and never re-executes", () => {
      const source = read("src/lib/workflows/recovery.ts");
      assert.doesNotMatch(source, /executePreparedActionAfterApproval|fetch\(/, "recovery must never perform or replay a provider write");
      assert.doesNotMatch(source, /status: "completed"/, "recovery must never declare a step complete by fiat");
    });

    // ── 3. Scheduler contract ────────────────────────────────────────────

    await check(18, "The recovery scheduler is a real scheduled Trigger.dev task", () => {
      const source = read("src/trigger/workflow-recovery.ts");
      assert.match(source, /schedules\.task\(/, "recovery must be scheduled, not only callable");
      assert.match(source, /id: "workflow-recovery-scan"/);
      assert.match(source, /cron: \{ pattern: "\*\/15 \* \* \* \*", timezone: "UTC" \}/, "a conservative fixed cadence in UTC");
      assert.match(source, /queue: \{ name: "workflow-recovery", concurrencyLimit: 1 \}/, "recovery passes must not run concurrently with themselves");
      assert.match(source, /maxAttempts: 2/);
      assert.match(source, /maxDuration/);
      assert.match(source, /const STALE_AFTER_MINUTES = 30/, "steps only qualify well after a normal execution would finish");
      assert.match(source, /MAX_WORKSPACES_PER_RUN/, "one tenant must not consume a whole run");
      assert.match(source, /MAX_STEPS_PER_WORKSPACE/);
      assert.doesNotMatch(source, /fetch\(|encryptToken|decryptToken|access_token/, "the scheduler must never touch tokens or providers");
    });

    await check(19, "The scheduler is registered where Trigger.dev discovers tasks", () => {
      const config = read("trigger.config.ts");
      assert.match(config, /dirs: \["\.\/src\/trigger"\]/);
      assert.ok(fs.existsSync(path.join(root, "src/trigger/workflow-recovery.ts")), "the scheduled recovery task must live in the discovered directory");
    });

    await check(20, "One workspace failing never stops recovery for the others", () => {
      const source = read("src/trigger/workflow-recovery.ts");
      assert.match(source, /try \{[\s\S]{0,600}recoverStuckWorkflowSteps[\s\S]{0,400}\} catch/, "each workspace must be isolated in its own try/catch");
      assert.match(source, /deferredWorkspaces/, "work beyond the per-run ceiling must be reported, not silently dropped");
    });

    assert.deepEqual(results, Array.from({ length: 20 }, (_, index) => index + 1));
    console.log("stuck-workflow-scheduler-smoke: all 20 recovery and scheduling checks passed.");
  } finally {
    delete globalThis.__recoveryFixtures;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

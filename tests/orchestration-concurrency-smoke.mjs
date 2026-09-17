import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Behavioral / concurrency tests for the autonomous Website + Growth
// orchestration lifecycle. Unlike the other *-smoke.mjs files in this
// orchestration slice, this file does not assert on source text - it runs
// the real dispatch/claim/reconciliation code against an in-memory fake
// Postgres and asserts on the resulting database transitions, so it fails
// on genuine concurrency/liveness defects rather than just missing strings.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-orchestration-concurrency-smoke");
fs.mkdirSync(tmpDir, { recursive: true });

// ---------------------------------------------------------------------
// A minimal in-memory Postgres-ish query builder. It supports exactly the
// operations used by the dispatch/reconciliation modules under test.
// Critically, `update()` re-evaluates its WHERE filters against the row's
// CURRENT (possibly concurrently-mutated) state at the moment it executes,
// and the actual read-check-mutate happens synchronously inside the
// builder chain before the returned promise is even awaited - the same
// "second writer blocks, then re-evaluates WHERE against the committed
// state" semantics a real single-row UPDATE has in Postgres. This is what
// makes it possible to reproduce a TOCTOU claim race deterministically in
// single-threaded Node: two calls racing through `await select()` then
// `await update()` will have their updates serialize in call order, with
// the second update's WHERE clause seeing whatever the first update wrote.
// ---------------------------------------------------------------------
function makeFakeSupabase(tables, uniqueConstraints = {}) {
  function from(table) {
    if (!tables[table]) tables[table] = [];
    const filters = [];
    let mode = "select";
    let updateValues = null;
    let insertValues = null;
    let orderSpec = null;
    let limitN = null;

    function rowMatch(row) {
      return filters.every((f) => {
        const val = row[f.col];
        if (f.op === "eq") return val === f.val;
        if (f.op === "neq") return val !== f.val;
        if (f.op === "in") return f.val.includes(val);
        if (f.op === "is_null") return val === null || val === undefined;
        if (f.op === "not_is_null") return !(val === null || val === undefined);
        if (f.op === "gt") return val !== null && val !== undefined && val > f.val;
        if (f.op === "lte") return val !== null && val !== undefined && val <= f.val;
        return true;
      });
    }

    function checkUnique(row) {
      const keys = uniqueConstraints[table] ?? [];
      for (const keyCols of keys) {
        const clash = tables[table].some((existing) => keyCols.every((col) => existing[col] === row[col]));
        if (clash) { const error = new Error("duplicate key value violates unique constraint"); error.code = "23505"; throw error; }
      }
    }

    function execute() {
      if (mode === "insert") {
        const list = Array.isArray(insertValues) ? insertValues : [insertValues];
        const created = [];
        for (const val of list) {
          const row = { ...val };
          checkUnique(row);
          tables[table].push(row);
          created.push(row);
        }
        return created;
      }
      let rows = tables[table].filter(rowMatch);
      if (mode === "update") {
        for (const row of rows) Object.assign(row, updateValues);
        return rows;
      }
      if (mode === "delete") {
        tables[table] = tables[table].filter((r) => !rows.includes(r));
        return rows;
      }
      if (orderSpec) rows = [...rows].sort((a, b) => (a[orderSpec.col] > b[orderSpec.col] ? 1 : a[orderSpec.col] < b[orderSpec.col] ? -1 : 0) * (orderSpec.ascending ? 1 : -1));
      if (limitN != null) rows = rows.slice(0, limitN);
      return rows;
    }

    function run() {
      try { return { rows: execute(), error: null }; }
      catch (error) { return { rows: null, error: { message: error.message, code: error.code } }; }
    }

    const builder = {
      select() { return builder; },
      eq(col, val) { filters.push({ op: "eq", col, val }); return builder; },
      neq(col, val) { filters.push({ op: "neq", col, val }); return builder; },
      in(col, val) { filters.push({ op: "in", col, val }); return builder; },
      is(col, val) { filters.push({ op: val === null ? "is_null" : "eq", col, val }); return builder; },
      not(col, kind, val) { if (kind === "is" && val === null) filters.push({ op: "not_is_null", col }); return builder; },
      gt(col, val) { filters.push({ op: "gt", col, val }); return builder; },
      lte(col, val) { filters.push({ op: "lte", col, val }); return builder; },
      or() { return builder; },
      order(col, opts) { orderSpec = { col, ascending: opts?.ascending !== false }; return builder; },
      limit(n) { limitN = n; return builder; },
      update(values) { mode = "update"; updateValues = values; return builder; },
      insert(values) { mode = "insert"; insertValues = values; return builder; },
      delete() { mode = "delete"; return builder; },
      maybeSingle() {
        const { rows, error } = run();
        return Promise.resolve({ data: error ? null : (rows[0] ?? null), error });
      },
      single() {
        const { rows, error } = run();
        if (error) return Promise.resolve({ data: null, error });
        if (!rows || rows.length !== 1) return Promise.resolve({ data: null, error: { message: "not found" } });
        return Promise.resolve({ data: rows[0], error: null });
      },
      then(resolve) {
        const { rows, error } = run();
        resolve({ data: error ? null : rows, error, count: error ? null : rows.length });
      },
    };
    return builder;
  }
  return { from };
}

// ---------------------------------------------------------------------
// Bundle the real dispatch/runtime/reconciliation modules with only their
// external boundaries stubbed: the Trigger.dev task objects (so we control
// and observe every .trigger() call) and process-level concerns
// (server-only marker, supabase-admin default factory, operator logging).
// ---------------------------------------------------------------------
async function bundle(entry, outname) {
  const outfile = path.join(tmpDir, outname);
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    alias: { "@": path.join(root, "src") },
    logLevel: "silent",
    plugins: [{
      name: "orchestration-concurrency-stubs",
      setup(build) {
        build.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "orch-test" }));
        build.onLoad({ filter: /^server-only$/, namespace: "orch-test" }, () => ({ contents: "export {};", loader: "js" }));
        build.onResolve({ filter: /^@\/lib\/server\/supabase-admin$/ }, () => ({ path: "supabase-admin", namespace: "orch-test" }));
        build.onLoad({ filter: /^supabase-admin$/, namespace: "orch-test" }, () => ({ contents: "export function createSupabaseAdmin() { throw new Error('createSupabaseAdmin must not be called in this test - pass supabase explicitly'); } export function hasSupabaseAdminConfig() { return true; }", loader: "js" }));
        build.onResolve({ filter: /^@\/trigger\/website-sync-run$/ }, () => ({ path: "website-sync-run", namespace: "orch-test" }));
        build.onLoad({ filter: /^website-sync-run$/, namespace: "orch-test" }, () => ({ contents: "export const websiteSyncRun = { trigger: (...args) => globalThis.__websiteTrigger(...args) };", loader: "js" }));
        build.onResolve({ filter: /^@\/trigger\/growth-operator-scan$/ }, () => ({ path: "growth-operator-scan", namespace: "orch-test" }));
        build.onLoad({ filter: /^growth-operator-scan$/, namespace: "orch-test" }, () => ({ contents: "export const growthOperatorScan = { trigger: (...args) => globalThis.__growthTrigger(...args) };", loader: "js" }));
        build.onResolve({ filter: /^@\/lib\/operators\/logging$/ }, () => ({ path: "operators-logging", namespace: "orch-test" }));
        build.onLoad({ filter: /^operators-logging$/, namespace: "orch-test" }, () => ({ contents: "export async function logOperatorEvent() { return { error: null }; } let seq=0; export function operatorRuntimeId(prefix) { seq+=1; return `${prefix}-test-${seq}`; }", loader: "js" }));
      },
    }],
  });
  return import(pathToFileURL(outfile).href + `?t=${Date.now()}-${Math.random()}`);
}

const { dispatchWebsiteCrawlRun } = await bundle("./src/lib/connectors/website-dispatch.ts", "website-dispatch.mjs");
const { dispatchGrowthRun } = await bundle("./src/lib/operators/growth/dispatch.ts", "growth-dispatch.mjs");
const { runGrowthOperatorScan } = await bundle("./src/lib/operators/growth/runtime.ts", "growth-runtime.mjs");
const { reconcileStaleWebsiteRuns } = await bundle("./src/lib/connectors/website-sync.ts", "website-sync.mjs");

// ===================== 1. Concurrent Website dispatch =====================
// Two callers (e.g. a double-click, or manual dispatch racing the scheduler)
// race to dispatch the same "requested" website crawl run. Exactly one may
// reach Trigger.dev; the loser must observe the winner's claim, not
// re-claim a row already mid-dispatch. This is the exact bug class in
// website-dispatch.ts's original claim, which allowed "dispatching" itself
// into the claimable WHERE-list.
{
  let triggerCalls = 0;
  globalThis.__websiteTrigger = async () => { triggerCalls += 1; return { id: `provider-run-${triggerCalls}`, publicAccessToken: "x", taskIdentifier: "website-sync-run" }; };
  const tables = { os_website_crawl_runs: [{ id: "run-1", workspace_id: "ws-1", idempotency_key: "website:src-1:slot-1", dispatch_status: "requested", provider_run_id: null, dispatch_attempts: 0, next_retry_at: null }] };
  const supabase = makeFakeSupabase(tables);
  const [a, b] = await Promise.all([
    dispatchWebsiteCrawlRun({ runId: "run-1", supabase }),
    dispatchWebsiteCrawlRun({ runId: "run-1", supabase }),
  ]);
  assert.equal(triggerCalls, 1, "exactly one concurrent website dispatch call may reach Trigger.dev - two manual clicks (or manual racing the scheduler) must not double-dispatch");
  assert.equal([a.accepted, b.accepted].filter(Boolean).length >= 1, true, "at least one racer must still succeed");
  assert.equal(tables.os_website_crawl_runs[0].dispatch_status, "dispatched");
  assert.equal(tables.os_website_crawl_runs[0].dispatch_attempts, 1, "the loser must not also increment dispatch_attempts");
}
console.log("website dispatch: concurrent claim is exclusive - PASS");

// ===================== 2. Manual dispatch racing an in-flight dispatch =====================
// A row already mid-dispatch ("dispatching", not yet resolved with the
// provider) must not be re-claimed by a second dispatch call - this
// reproduces the crash window between "database row set to dispatching"
// and "Trigger.dev accepts + we persist dispatched_at/provider_run_id".
{
  let triggerCalls = 0;
  globalThis.__websiteTrigger = async () => { triggerCalls += 1; return { id: "provider-run-x" }; };
  const tables = { os_website_crawl_runs: [{ id: "run-2", workspace_id: "ws-1", idempotency_key: "website:src-1:slot-2", dispatch_status: "dispatching", dispatch_started_at: new Date().toISOString(), provider_run_id: null, dispatch_attempts: 1, next_retry_at: null }] };
  const supabase = makeFakeSupabase(tables);
  const result = await dispatchWebsiteCrawlRun({ runId: "run-2", supabase, force: true });
  assert.equal(triggerCalls, 0, "a run already mid-dispatch must not be re-dispatched by a concurrent/second caller");
  assert.equal(result.dispatchStatus, "dispatching");
  assert.equal(tables.os_website_crawl_runs[0].dispatch_status, "dispatching", "the in-flight claim must be left untouched, not clobbered");
}
console.log("website dispatch: in-flight claim is not re-entrant - PASS");

// ===================== 3. Idempotency key rotation on retry =====================
// The first dispatch attempt must reuse the row's stable idempotency key
// (crash-safe: a retry-of-attempt-1 must not double-execute on the
// provider). A stale-recovery retry (attempt > 1) must use a distinct
// provider key, because tasks.trigger() gives no signal that a reused key
// returned a cached reference to an already-terminal provider run - reusing
// the same key forever would strand the row in "dispatched" permanently.
{
  const seenKeys = [];
  globalThis.__websiteTrigger = async (_payload, opts) => { seenKeys.push(opts.idempotencyKey); return { id: `run-${seenKeys.length}` }; };
  const tables = { os_website_crawl_runs: [{ id: "run-3", workspace_id: "ws-1", idempotency_key: "website:src-1:slot-3", dispatch_status: "requested", dispatch_attempts: 0, next_retry_at: null }] };
  const supabase = makeFakeSupabase(tables);
  await dispatchWebsiteCrawlRun({ runId: "run-3", supabase });
  assert.equal(seenKeys[0], "website:src-1:slot-3", "attempt 1 must reuse the row's stable idempotency key");
  assert.equal(tables.os_website_crawl_runs[0].dispatch_status, "dispatched");

  // Simulate the crash window: the row is stuck in "dispatched" with no
  // worker ever having claimed it (no heartbeat, dispatch_started_at never
  // advances) - drive the REAL reconcileStaleWebsiteRuns to recover it,
  // exactly as the deployed reconciler would, then retry dispatch. "now" is
  // pinned 31 minutes past the real dispatch_started_at/dispatched_at
  // timestamps (both set moments ago by the dispatch call above) to clear
  // the 30-minute stale threshold regardless of wall-clock test timing.
  const wellPastStaleThreshold = new Date(Date.now() + 31 * 60 * 1_000);
  const recovered = await reconcileStaleWebsiteRuns({ supabase, now: wellPastStaleThreshold });
  assert.equal(recovered, 1, "reconcileStaleWebsiteRuns must recover a stale dispatched row with no worker heartbeat");
  assert.equal(tables.os_website_crawl_runs[0].dispatch_status, "recoverable");

  await dispatchWebsiteCrawlRun({ runId: "run-3", supabase, force: true });
  assert.equal(seenKeys[1], "website:src-1:slot-3:attempt-2", "a stale-recovery retry (attempt 2) must rotate the provider idempotency key so it cannot return a cached dead-run handle forever");
  assert.notEqual(seenKeys[0], seenKeys[1]);
}
console.log("website dispatch: idempotency key rotates on retry, stable on first attempt - PASS");

// ===================== 4. Same defects, Growth dispatch =====================
{
  let triggerCalls = 0;
  globalThis.__growthTrigger = async () => { triggerCalls += 1; return { id: `growth-provider-${triggerCalls}` }; };
  const tables = { os_operator_runs: [{ id: "grun-1", workspace_id: "ws-1", operator_key: "growth", input: {}, idempotency_key: "growth:manual:ws-1:1", dispatch_status: "requested", dispatch_attempts: 0, next_retry_at: null }] };
  const supabase = makeFakeSupabase(tables);
  await Promise.all([
    dispatchGrowthRun({ runId: "grun-1", supabase }),
    dispatchGrowthRun({ runId: "grun-1", supabase }),
  ]);
  assert.equal(triggerCalls, 1, "two concurrent Growth dispatch calls for the same run must not double-dispatch");
  assert.equal(tables.os_operator_runs[0].dispatch_status, "dispatched");
}
console.log("growth dispatch: concurrent claim is exclusive - PASS");

// ===================== 5. Growth worker atomic claim =====================
// Two Trigger.dev invocations of growth-operator-scan for the SAME run id
// (a genuinely duplicated provider dispatch, or a framework-level retry
// racing a stale-recovery retry) must not both execute the scan body. Only
// one may transition pending -> running; the loser must no-op.
{
  const tables = {
    os_operator_runs: [{ id: "grun-2", workspace_id: "ws-1", operator_key: "growth", status: "pending", dispatch_status: "dispatched", input: { sourceMode: "manual" }, output: {} }],
    os_website_observations: [],
    os_memory_entries: [],
    os_growth_opportunities: [],
    os_operator_run_logs: [],
  };
  const supabase = makeFakeSupabase(tables, { os_growth_opportunities: [["workspace_id", "fingerprint"]] });
  const [a, b] = await Promise.all([
    runGrowthOperatorScan({ workspaceId: "ws-1", runId: "grun-2", supabase }),
    runGrowthOperatorScan({ workspaceId: "ws-1", runId: "grun-2", supabase }),
  ]);
  const outcomes = [a, b].map((r) => r.status);
  assert.equal(outcomes.filter((s) => s === "already_claimed").length, 1, "exactly one concurrent worker invocation must be rejected as already claimed");
  assert.equal(outcomes.filter((s) => s === "completed").length, 1, "exactly one concurrent worker invocation must actually run the scan");
  assert.equal(tables.os_operator_runs[0].status, "completed");
}
console.log("growth worker: concurrent invocation for the same run id is exclusive - PASS");

// ===================== 6. Duplicate Website completion cannot duplicate the handoff =====================
// queueGrowthScanForWebsiteRun is invoked directly by runWebsiteSync AND
// discoverable by the reconciler from the completed-runs table - both paths
// must land on the same row via the website-run-id idempotency key.
{
  const { queueGrowthScanForWebsiteRun } = await bundle("./src/lib/operators/growth/runtime.ts", "growth-runtime-2.mjs");
  const tables = {
    os_operator_runs: [],
    os_operator_triggers: [{ workspace_id: "ws-1", operator_key: "growth", trigger_type: "operator_activation", enabled: true, config: {}, updated_at: new Date().toISOString() }],
  };
  const supabase = makeFakeSupabase(tables, { os_operator_runs: [["workspace_id", "operator_key", "idempotency_key"]] });
  const [a, b] = await Promise.all([
    queueGrowthScanForWebsiteRun({ workspaceId: "ws-1", sourceId: "src-1", websiteRunId: "website-run-9", observationCount: 3, supabase }),
    queueGrowthScanForWebsiteRun({ workspaceId: "ws-1", sourceId: "src-1", websiteRunId: "website-run-9", observationCount: 3, supabase }),
  ]);
  assert.equal(a.requested, true);
  assert.equal(b.requested, true);
  assert.equal(a.runId, b.runId, "two completion-triggered handoff attempts for the same website run must land on one growth run row");
  assert.equal(tables.os_operator_runs.length, 1, "no duplicate growth run row may be created");
}
console.log("website->growth handoff: duplicate completion is idempotent - PASS");

// ===================== 7. Cross-domain reconciliation isolation =====================
{
  const { runAutonomousReconciliation } = await bundle("./src/lib/runtime/autonomous-reconciliation.ts", "autonomous-reconciliation.mjs");
  const completedRun = { id: "wrun-1", workspace_id: "ws-2", source_id: "src-2", state: "completed", observation_count: 2, completed_at: new Date().toISOString() };
  const tables = {
    os_website_sources: { get length() { throw new Error("simulated database client outage for os_website_sources"); } },
    os_website_crawl_runs: [completedRun],
    os_operator_triggers: [{ workspace_id: "ws-2", operator_key: "growth", trigger_type: "operator_activation", enabled: true, config: {}, updated_at: new Date().toISOString() }],
    os_operator_runs: [],
  };
  // Force accessing os_website_sources to throw synchronously, simulating
  // an unexpected client-level exception (not a query .error) in the
  // Website domain, and prove Growth handoff discovery still runs.
  const baseFrom = makeFakeSupabase(tables).from;
  const supabase = { from(table) { if (table === "os_website_sources") throw new Error("simulated database client outage for os_website_sources"); return baseFrom(table); } };
  const result = await runAutonomousReconciliation({ supabase, now: new Date() });
  assert.ok(result.errors.some((e) => e.scope === "website-discovery"), "the Website-domain exception must be recorded");
  assert.equal(tables.os_operator_runs.length, 1, "Growth handoff discovery must still run and create the handoff despite the Website-domain exception");
  assert.equal(result.growthHandoffs, 1);
}
console.log("reconciliation: a Website-domain exception does not prevent Growth reconciliation - PASS");

console.log("orchestration-concurrency-smoke: PASS");

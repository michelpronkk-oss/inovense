import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Pipeline / queue lag metrics.
//
// The real src/lib/runtime/pipeline-metrics.ts runs against an in-memory
// database. The point of these checks is truthfulness: every number must come
// from persisted state, and anything that cannot be measured must come back as
// null rather than as a reassuring zero.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-queue-lag");
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
    source = source.split(search).join(replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

function createFakeDatabase(tables, brokenTables = []) {
  const state = { tables, queriedTables: [] };
  state.supabase = {
    from(table) {
      state.queriedTables.push(table);
      const filters = [];
      let head = false;
      let orderColumn = null;
      let limit = Infinity;
      const rows = () => {
        if (brokenTables.includes(table)) throw new Error(`relation ${table} does not exist`);
        return state.tables[table] ?? [];
      };
      const builder = {
        select(_columns, options) { head = options?.head === true; return builder; },
        match(criteria) { filters.push((row) => Object.entries(criteria).every(([column, value]) => row[column] === value)); return builder; },
        eq(column, value) { filters.push((row) => row[column] === value); return builder; },
        lt(column, value) { filters.push((row) => String(row[column]) < String(value)); return builder; },
        in(column, values) { filters.push((row) => values.includes(row[column])); return builder; },
        order(column) { orderColumn = column; return builder; },
        limit(value) { limit = value; return builder; },
        then(resolve, reject) {
          try {
            let found = rows().filter((row) => filters.every((filter) => filter(row)));
            if (orderColumn) found = [...found].sort((a, b) => String(a[orderColumn]).localeCompare(String(b[orderColumn])));
            if (head) return resolve({ data: null, count: found.length, error: null });
            return resolve({ data: found.slice(0, limit), count: found.length, error: null });
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

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

function fixtureTables() {
  return {
    os_signal_candidates: [
      { id: "c1", workspace_id: "ws-1", status: "new", created_at: minutesAgo(120) },
      { id: "c2", workspace_id: "ws-1", status: "routed", created_at: minutesAgo(20) },
      { id: "c3", workspace_id: "ws-1", status: "suppressed", created_at: minutesAgo(500) },
      { id: "c4", workspace_id: "ws-2", status: "new", created_at: minutesAgo(700) },
    ],
    os_signal_events: [
      { id: "e1", workspace_id: "ws-1", observed_at: minutesAgo(45) },
      { id: "e2", workspace_id: "ws-2", observed_at: minutesAgo(900) },
    ],
    os_workflow_steps: [
      { id: "s1", workspace_id: "ws-1", status: "awaiting_approval", block_reason: null, updated_at: minutesAgo(75) },
      { id: "s2", workspace_id: "ws-1", status: "proposed", block_reason: null, updated_at: minutesAgo(10) },
      { id: "s3", workspace_id: "ws-1", status: "executing", block_reason: null, updated_at: minutesAgo(200) },
      { id: "s4", workspace_id: "ws-1", status: "executing", block_reason: null, updated_at: minutesAgo(2) },
      { id: "s5", workspace_id: "ws-1", status: "blocked", block_reason: "execution_unknown", updated_at: minutesAgo(300) },
      { id: "s6", workspace_id: "ws-1", status: "blocked", block_reason: "connector_not_ready", updated_at: minutesAgo(310) },
      { id: "s7", workspace_id: "ws-1", status: "completed", block_reason: null, updated_at: minutesAgo(400) },
      { id: "s8", workspace_id: "ws-2", status: "executing", block_reason: null, updated_at: minutesAgo(999) },
    ],
    os_approvals: [
      { id: "a1", workspace_id: "ws-1", status: "pending", created_at: minutesAgo(180) },
      { id: "a2", workspace_id: "ws-1", status: "pending", created_at: minutesAgo(30) },
      { id: "a3", workspace_id: "ws-1", status: "approved", created_at: minutesAgo(600) },
      { id: "a4", workspace_id: "ws-2", status: "pending", created_at: minutesAgo(4_000) },
    ],
  };
}

async function main() {
  try {
    const metrics = await loadModule("src/lib/runtime/pipeline-metrics.ts", [
      ['import { createSupabaseAdmin } from "@/lib/server/supabase-admin";', "const createSupabaseAdmin = () => { throw new Error('no database in this test'); };"],
    ]);

    await check(1, "Signal lag comes from real unprocessed candidates", async () => {
      const db = createFakeDatabase(fixtureTables());
      const lag = await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(lag.available, true);
      assert.equal(lag.signals.pending, 2, "only new, routed and processing candidates are pending");
      assert.ok(lag.signals.oldestCandidateAgeMinutes >= 119 && lag.signals.oldestCandidateAgeMinutes <= 121);
      assert.ok(lag.signals.oldestAgeMinutes >= 44 && lag.signals.oldestAgeMinutes <= 46);
    });

    await check(2, "Workflow lag separates runnable, stuck, blocked and uncertain", async () => {
      const db = createFakeDatabase(fixtureTables());
      const lag = await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(lag.workflows.pending, 2, "proposed, awaiting_approval and approved are runnable");
      assert.ok(lag.workflows.oldestAgeMinutes >= 74);
      assert.equal(lag.workflows.stuck, 1, "only executing steps older than the threshold are stuck");
      assert.ok(lag.workflows.oldestStuckAgeMinutes >= 199);
      assert.equal(lag.workflows.blocked, 2);
      assert.equal(lag.workflows.executionUnknown, 1, "uncertain executions must be counted separately from ordinary blocks");
    });

    await check(3, "A recently started execution is never reported as stuck", async () => {
      const tables = fixtureTables();
      tables.os_workflow_steps = tables.os_workflow_steps.filter((row) => row.id !== "s3" && row.workspace_id === "ws-1");
      const db = createFakeDatabase(tables);
      const lag = await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(lag.workflows.stuck, 0);
      assert.equal(lag.workflows.oldestStuckAgeMinutes, null, "with nothing stuck, there is no stuck age to report");
    });

    await check(4, "Approval lag reports pending count and true oldest age", async () => {
      const db = createFakeDatabase(fixtureTables());
      const lag = await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(lag.approvals.pending, 2);
      assert.ok(lag.approvals.oldestAgeMinutes >= 179 && lag.approvals.oldestAgeMinutes <= 181);
    });

    await check(5, "Outcome observation reports real state and never invents a queue", async () => {
      const db = createFakeDatabase(fixtureTables());
      const lag = await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(lag.outcomeObservation.pending, 1, "completed steps old enough to have been observable");
      assert.ok(lag.outcomeObservation.oldestAgeMinutes >= 399);
      assert.equal(lag.outcomeObservation.exhausted, null, "there is no durable observer retry queue, so this must stay unmeasured");
    });

    await check(6, "Every metric is workspace isolated", async () => {
      const db = createFakeDatabase(fixtureTables());
      const one = await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase });
      const two = await metrics.getPipelineLagMetrics({ workspaceId: "ws-2", supabase: db.supabase });
      assert.equal(two.approvals.pending, 1);
      assert.ok(two.approvals.oldestAgeMinutes > one.approvals.oldestAgeMinutes);
      assert.equal(two.workflows.stuck, 1);
      assert.equal(one.signals.pending, 2);
      assert.equal(two.signals.pending, 1);
    });

    await check(7, "Omitting the workspace gives a truthful cross-workspace view", async () => {
      const db = createFakeDatabase(fixtureTables());
      const all = await metrics.getPipelineLagMetrics({ supabase: db.supabase });
      assert.equal(all.approvals.pending, 3, "every workspace's pending approvals");
      assert.equal(all.signals.pending, 3);
      assert.equal(all.workflows.stuck, 2);
    });

    await check(8, "An unavailable source reports null, never a reassuring zero", async () => {
      const db = createFakeDatabase(fixtureTables(), ["os_signal_candidates", "os_signal_events"]);
      const lag = await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(lag.signals.pending, null, "an unreadable table must not look like an empty one");
      assert.equal(lag.signals.oldestCandidateAgeMinutes, null);
      assert.equal(lag.approvals.pending, 2, "one broken source must not blank the rest");
      assert.equal(lag.available, true);
    });

    await check(9, "A completely unavailable database reports not-measured", async () => {
      const db = createFakeDatabase(fixtureTables(), ["os_signal_candidates", "os_signal_events", "os_workflow_steps", "os_approvals"]);
      const lag = await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(lag.available, false);
      assert.equal(lag.workflows.pending, null);
      assert.equal(lag.approvals.pending, null);
    });

    await check(10, "An empty workspace reports honest zeros and no ages", async () => {
      const db = createFakeDatabase({ os_signal_candidates: [], os_signal_events: [], os_workflow_steps: [], os_approvals: [] });
      const lag = await metrics.getPipelineLagMetrics({ workspaceId: "ws-new", supabase: db.supabase });
      assert.equal(lag.signals.pending, 0);
      assert.equal(lag.workflows.pending, 0);
      assert.equal(lag.approvals.pending, 0);
      assert.equal(lag.approvals.oldestAgeMinutes, null, "no rows means no age, not an age of zero");
    });

    await check(11, "The stuck threshold is bounded and matches the recovery scheduler", async () => {
      assert.equal(metrics.STUCK_STEP_THRESHOLD_MINUTES, 30);
      assert.match(read("src/trigger/workflow-recovery.ts"), /const STALE_AFTER_MINUTES = 30/, "lag reporting and recovery must agree on what stuck means");
      const db = createFakeDatabase(fixtureTables());
      const tiny = await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase, stuckThresholdMinutes: 0 });
      assert.equal(tiny.workflows.stuck, 1, "a caller cannot lower the threshold below the safe floor");
      const huge = await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase, stuckThresholdMinutes: 100_000 });
      assert.equal(huge.workflows.stuck, 0, "a caller cannot raise the threshold beyond a day");
    });

    await check(12, "Lag metrics only read state, and never read content columns", async () => {
      const source = read("src/lib/runtime/pipeline-metrics.ts");
      assert.doesNotMatch(source, /content_preview|subject|body|actor|provider_email|encrypted_/, "lag reporting must never touch customer content or credentials");
      assert.doesNotMatch(source, /\.update\(|\.insert\(|\.upsert\(|\.delete\(/, "lag reporting must be strictly read-only");
      const db = createFakeDatabase(fixtureTables());
      await metrics.getPipelineLagMetrics({ workspaceId: "ws-1", supabase: db.supabase });
      assert.deepEqual(
        [...new Set(db.queriedTables)].sort(),
        ["os_approvals", "os_signal_candidates", "os_signal_events", "os_workflow_steps"],
        "only the four durable pipeline tables may be read",
      );
    });

    await check(13, "The indexes backing these queries exist in the migration", () => {
      const sql = read("supabase/migrations/20260908_operational_hardening.sql");
      assert.match(sql, /os_approvals_workspace_pending_created_idx[\s\S]{0,140}where status = 'pending'/);
      assert.match(sql, /os_workflow_steps_executing_updated_idx[\s\S]{0,140}where status = 'executing'/);
      assert.match(sql, /os_signal_candidates_workspace_created_idx[\s\S]{0,160}where status in \('new', 'routed', 'processing'\)/);
    });

    await check(14, "Admin observability renders lag from this one source", () => {
      const admin = read("src/lib/admin/product.ts");
      assert.match(admin, /getPipelineLagMetrics/);
      assert.match(admin, /getProviderFailureSnapshot/);
      const page = read("src/app/admin/product/page.tsx");
      assert.match(page, /Pipeline lag/);
      assert.match(page, /Provider reliability/);
      assert.match(page, /Not measured/, "an unmeasured value must be shown as unmeasured, not as zero");
      assert.doesNotMatch(page, /content_preview|subject|body/, "admin must not render customer content");
    });

    assert.deepEqual(results, Array.from({ length: 14 }, (_, index) => index + 1));
    console.log("queue-lag-smoke: all 14 pipeline lag checks passed.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

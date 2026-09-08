import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Universal provider failure model.
//
// The real src/lib/runtime/provider-health.ts and provider-retry.ts run here.
// The Postgres functions they call are checked against the migration text,
// because their counter semantics (consecutive vs decaying recent counts) are
// implemented in SQL and cannot execute in a plain Node process.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-operational-metrics");
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

function buildModule(relSourcePath, replacements = []) {
  let source = read(relSourcePath);
  for (const [search, replace] of replacements) {
    assert.ok(source.includes(search), `expected to find this exact snippet in ${relSourcePath}:\n${search}`);
    source = source.split(search).join(replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return pathToFileURL(tmpFile).href;
}

function createFakeDatabase(rows = []) {
  const state = { rpcCalls: [], rows, failNextRpc: false };
  state.supabase = {
    async rpc(name, args) {
      state.rpcCalls.push({ name, args });
      if (state.failNextRpc) { state.failNextRpc = false; throw new Error("database unavailable"); }
      if (name === "prune_os_provider_operations") return { data: 4, error: null };
      return { data: null, error: null };
    },
    from(table) {
      assert.equal(table, "os_provider_operations");
      let scoped = state.rows;
      const builder = {
        select() { return builder; },
        order() { return builder; },
        limit() { return builder; },
        eq(column, value) { scoped = scoped.filter((row) => row[column] === value); return builder; },
        then(resolve) { return resolve({ data: scoped, error: null }); },
      };
      return builder;
    },
  };
  return state;
}

const migration = () => read("supabase/migrations/20260908_operational_hardening.sql");

async function main() {
  try {
    const retryUrl = buildModule("src/lib/runtime/provider-retry.ts");
    const { classifyProviderFailure, describeProviderFailure, parseRetryAfterMs, providerRetryDelayMs, shouldRetryProviderFailure } = await import(retryUrl);
    const health = await import(buildModule("src/lib/runtime/provider-health.ts", [
      ['import { describeProviderFailure, type ProviderFailureDescription } from "@/lib/runtime/provider-retry";', `import { describeProviderFailure } from "${retryUrl}";`],
      ['import { createSupabaseAdmin } from "@/lib/server/supabase-admin";', "const createSupabaseAdmin = () => { throw new Error('no database in this test'); };"],
    ]));

    // ── 1. One shared classifier ─────────────────────────────────────────

    await check(1, "Operation categories are a closed, normalized set", () => {
      assert.deepEqual([...health.PROVIDER_OPERATIONS], ["oauth_refresh", "read", "write", "sync", "webhook", "poll", "outcome_observation"]);
      assert.equal(health.isProviderOperation("write"), true);
      assert.equal(health.isProviderOperation("/tickets/12345.json"), false, "an endpoint path must never pass as an operation category");
      assert.match(migration(), /operation text not null check \(operation in \('oauth_refresh', 'read', 'write', 'sync', 'webhook', 'poll', 'outcome_observation'\)\)/);
    });

    await check(2, "Every status maps to exactly one kind and one health impact", () => {
      const cases = [
        [401, "reauth", "reconnect_required"],
        [403, "permission", "permission_required"],
        [404, "configuration", "configuration_required"],
        [409, "configuration", "configuration_required"],
        [429, "transient", "degraded"],
        [500, "transient", "degraded"],
        [502, "transient", "degraded"],
        [503, "transient", "degraded"],
        [504, "transient", "degraded"],
      ];
      for (const [status, kind, impact] of cases) {
        assert.equal(classifyProviderFailure({ status }), kind, `HTTP ${status}`);
        assert.equal(describeProviderFailure({ status }).connectorHealthImpact, impact, `HTTP ${status}`);
      }
    });

    await check(3, "Safe error codes never carry a URL, identifier, or payload", () => {
      assert.equal(describeProviderFailure({ status: 429 }).safeCode, "http_429");
      assert.equal(describeProviderFailure({ status: 400, code: "invalid_grant" }).safeCode, "invalid_grant");
      // Anything that is not already a short symbolic code is discarded, not
      // sanitized: provider "codes" are sometimes a URL or a message carrying a
      // ticket, message, or account id.
      for (const hostileCode of [
        "https://acme.zendesk.com/api/v2/tickets/98765.json?token=abc",
        "Ticket 4820193 could not be updated for person@example.com",
        "AADSTS700082 the refresh token has expired",
      ]) {
        const hostile = describeProviderFailure({ status: 404, code: hostileCode });
        assert.equal(hostile.safeCode, "http_404", `an unsafe provider code must fall back to the status: ${hostileCode}`);
      }
      assert.ok(describeProviderFailure({ status: 500 }).safeCode.length <= 64);
      assert.equal(describeProviderFailure({ code: "provider_unavailable" }).safeCode, "provider_unavailable");
    });

    await check(4, "Retry-After is honored, bounded, and never invented", () => {
      assert.equal(parseRetryAfterMs("30"), 30_000);
      assert.equal(parseRetryAfterMs("0"), 0);
      assert.equal(parseRetryAfterMs(""), null);
      assert.equal(parseRetryAfterMs(null), null);
      assert.equal(parseRetryAfterMs("soon"), null);
      assert.equal(parseRetryAfterMs("100000"), 300_000, "an absurd Retry-After must be capped");
      const date = parseRetryAfterMs(new Date(Date.now() + 20_000).toUTCString());
      assert.ok(date > 10_000 && date <= 21_000);
    });

    await check(5, "Backoff is exponential, jittered, capped, and never a tight loop", () => {
      const delays = [0, 1, 2, 3, 4].map((attempt) => providerRetryDelayMs(attempt, null, 8_000));
      assert.ok(delays.every((value) => value > 0), "there must never be a zero-delay retry loop");
      assert.ok(delays[1] > delays[0] && delays[2] > delays[1], "delay must grow with attempts");
      assert.ok(delays.every((value) => value <= 8_000), "delay must stay capped");
      const jitter = new Set(Array.from({ length: 12 }, () => providerRetryDelayMs(3, null, 8_000)));
      assert.ok(jitter.size > 1, "backoff must be jittered so workers do not synchronize");
    });

    await check(6, "Attempts are bounded and non-transient failures are never retried", () => {
      assert.equal(shouldRetryProviderFailure({ status: 500, attempt: 0 }), true);
      assert.equal(shouldRetryProviderFailure({ status: 500, attempt: 2 }), false, "the attempt ceiling must hold");
      for (const status of [400, 401, 403, 404, 409, 422]) {
        assert.equal(shouldRetryProviderFailure({ status, attempt: 0 }), false, `HTTP ${status} must never be retried`);
      }
    });

    // ── 2. Counter behavior ──────────────────────────────────────────────

    await check(7, "A failure records one row through the shared RPC, with no payload", async () => {
      const db = createFakeDatabase();
      const description = await health.recordProviderFailure({
        workspaceId: "ws-1", connectorKey: "zendesk", operation: "write",
        status: 429, retryAfter: "5", supabase: db.supabase,
      });
      assert.equal(description.rateLimited, true);
      assert.equal(db.rpcCalls.length, 1);
      const call = db.rpcCalls[0];
      assert.equal(call.name, "record_os_provider_failure");
      assert.equal(call.args.p_error_code, "http_429");
      assert.equal(call.args.p_failure_kind, "transient");
      assert.equal(call.args.p_rate_limited, true);
      assert.ok(call.args.p_next_retry_at, "a bounded next retry time must be recorded for a rate limit");
      assert.doesNotMatch(JSON.stringify(call.args), /token|Bearer|http(s)?:\/\//i, "no credential or URL may reach the counter");
    });

    await check(8, "A success clears failure state through the shared RPC", async () => {
      const db = createFakeDatabase();
      await health.recordProviderSuccess({ workspaceId: "ws-1", connectorKey: "zendesk", operation: "write", supabase: db.supabase });
      assert.deepEqual(db.rpcCalls[0], { name: "record_os_provider_success", args: { p_workspace_id: "ws-1", p_connector_key: "zendesk", p_operation: "write" } });
      assert.match(migration(), /consecutive_failures = 0,\s*\n\s*recent_failure_count = 0/, "a success must reset the failure counters in SQL");
    });

    await check(9, "Telemetry can never break a provider call", async () => {
      const db = createFakeDatabase();
      db.failNextRpc = true;
      const description = await health.recordProviderFailure({ workspaceId: "ws-1", connectorKey: "jira", operation: "write", status: 500, supabase: db.supabase });
      assert.equal(description.kind, "transient", "the classification must still be returned when recording fails");
      db.failNextRpc = true;
      await health.recordProviderSuccess({ workspaceId: "ws-1", connectorKey: "jira", operation: "write", supabase: db.supabase });
    });

    await check(10, "One transient failure never marks a connector degraded", async () => {
      const db = createFakeDatabase([
        { workspace_id: "ws-1", connector_key: "jira", operation: "write", consecutive_failures: 1, recent_failure_count: 1, last_failure_kind: "transient", last_429_at: null, updated_at: new Date().toISOString() },
      ]);
      const snapshot = await health.getProviderFailureSnapshot({ supabase: db.supabase });
      assert.equal(snapshot.available, true);
      assert.deepEqual(snapshot.degradedConnectors, [], "a single 500 is not a degraded connector");
      assert.equal(snapshot.recentFailureCount, 1);
    });

    await check(11, "Repeated transient failures do mark a connector degraded", async () => {
      const db = createFakeDatabase([
        { workspace_id: "ws-1", connector_key: "jira", operation: "write", consecutive_failures: health.DEGRADED_CONSECUTIVE_FAILURES, recent_failure_count: 5, last_failure_kind: "transient", last_429_at: null, updated_at: new Date().toISOString() },
      ]);
      const snapshot = await health.getProviderFailureSnapshot({ supabase: db.supabase });
      assert.deepEqual(snapshot.degradedConnectors, ["jira"]);
      assert.deepEqual(snapshot.reconnectRequiredConnectors, []);
    });

    await check(12, "Auth and permission failures are separated from degradation", async () => {
      const db = createFakeDatabase([
        { workspace_id: "ws-1", connector_key: "microsoft", operation: "oauth_refresh", consecutive_failures: 1, recent_failure_count: 1, last_failure_kind: "reauth", last_429_at: null, updated_at: new Date().toISOString() },
        { workspace_id: "ws-1", connector_key: "zendesk", operation: "write", consecutive_failures: 2, recent_failure_count: 2, last_failure_kind: "permission", last_429_at: null, updated_at: new Date().toISOString() },
      ]);
      const snapshot = await health.getProviderFailureSnapshot({ supabase: db.supabase });
      assert.deepEqual(snapshot.reconnectRequiredConnectors, ["microsoft"]);
      assert.deepEqual(snapshot.permissionRequiredConnectors, ["zendesk"]);
      assert.deepEqual(snapshot.degradedConnectors, []);
    });

    await check(13, "Rate limiting is reported only inside a recent window", async () => {
      const db = createFakeDatabase([
        { workspace_id: "ws-1", connector_key: "asana", operation: "read", consecutive_failures: 0, recent_failure_count: 0, last_failure_kind: null, last_429_at: new Date(Date.now() - 10 * 60_000).toISOString(), updated_at: new Date().toISOString() },
        { workspace_id: "ws-1", connector_key: "jira", operation: "read", consecutive_failures: 0, recent_failure_count: 0, last_failure_kind: null, last_429_at: new Date(Date.now() - 5 * 60 * 60_000).toISOString(), updated_at: new Date().toISOString() },
      ]);
      const snapshot = await health.getProviderFailureSnapshot({ supabase: db.supabase });
      assert.deepEqual(snapshot.rateLimitedConnectors, ["asana"], "yesterday's rate limit is not today's incident");
    });

    await check(14, "An unavailable table degrades to not-measured, never to healthy-looking zeros", async () => {
      const broken = { from() { throw new Error("relation does not exist"); } };
      const snapshot = await health.getProviderFailureSnapshot({ supabase: broken });
      assert.equal(snapshot.available, false);
      assert.deepEqual(snapshot.rows, []);
    });

    await check(15, "Snapshot reads are workspace scopeable and bounded", async () => {
      const db = createFakeDatabase([
        { workspace_id: "ws-1", connector_key: "jira", operation: "write", consecutive_failures: 0, recent_failure_count: 0, last_failure_kind: null, last_429_at: null, updated_at: new Date().toISOString() },
        { workspace_id: "ws-2", connector_key: "jira", operation: "write", consecutive_failures: 4, recent_failure_count: 4, last_failure_kind: "transient", last_429_at: null, updated_at: new Date().toISOString() },
      ]);
      const scoped = await health.getProviderFailureSnapshot({ workspaceId: "ws-1", supabase: db.supabase });
      assert.equal(scoped.rows.length, 1, "a workspace must only see its own operational rows");
      assert.deepEqual(scoped.degradedConnectors, []);
      assert.match(read("src/lib/runtime/provider-health.ts"), /Math\.min\(input\.limit \?\? 200, 500\)/, "snapshot reads must stay bounded");
    });

    // ── 3. Storage and retention contract ────────────────────────────────

    await check(16, "The operational table holds no token, URL, or content column", () => {
      const table = migration().match(/create table if not exists public\.os_provider_operations \(([\s\S]*?)\);/)[1];
      assert.doesNotMatch(table, /token|secret|url|endpoint|body|payload|content|email|subject/i, "operational telemetry must never store sensitive material");
      assert.match(table, /primary key \(workspace_id, connector_key, operation\)/, "exactly one row per workspace, connector and operation");
      for (const column of ["last_success_at", "last_failure_at", "last_error_code", "consecutive_failures", "recent_failure_count", "last_429_at", "retry_count", "next_retry_at"]) {
        assert.ok(table.includes(column), `${column} must exist`);
      }
    });

    await check(17, "The recent-failure window decays instead of accumulating forever", () => {
      assert.match(migration(), /recent_failure_count = case[\s\S]{0,240}then 1 else target\.recent_failure_count \+ 1 end/, "an old incident must not keep a connector looking degraded");
      assert.match(migration(), /consecutive_failures = target\.consecutive_failures \+ 1/, "consecutive failures must be incremented atomically in SQL");
    });

    await check(18, "Operational rows have a bounded retention path that spares audit data", async () => {
      assert.match(migration(), /create or replace function public\.prune_os_provider_operations/);
      assert.match(migration(), /where consecutive_failures = 0\s*\n\s*and updated_at < now\(\) - make_interval\(days/, "only healthy, stale rows may be pruned");
      const db = createFakeDatabase();
      assert.equal(await health.pruneProviderOperations({ supabase: db.supabase }), 4);
      assert.match(read("src/trigger/workflow-recovery.ts"), /pruneProviderOperations/, "retention must actually be scheduled");
      const scheduler = read("src/trigger/workflow-recovery.ts");
      assert.doesNotMatch(scheduler, /delete\(\)|os_approvals|os_execution_intents|os_workflow_outcomes|os_activity/, "retention must never touch approval, execution, outcome, or Activity records");
    });

    await check(19, "The operational table is workspace-isolated and server-write-only", () => {
      const sql = migration();
      assert.match(sql, /alter table public\.os_provider_operations enable row level security/);
      assert.match(sql, /create policy os_provider_operations_select_members on public\.os_provider_operations\s*\n\s*for select to authenticated using \(public\.is_workspace_member\(workspace_id\)\)/);
      assert.doesNotMatch(sql, /os_provider_operations[\s\S]{0,200}for (insert|update|delete) to authenticated/, "browsers must never be able to write operational telemetry");
      for (const fn of ["record_os_provider_failure", "record_os_provider_success", "prune_os_provider_operations", "claim_os_connector_refresh_lock", "release_os_connector_refresh_lock"]) {
        assert.match(sql, new RegExp(`revoke all on function public\\.${fn}`), `${fn} must be revoked from public`);
        assert.match(sql, new RegExp(`grant execute on function public\\.${fn}[\\s\\S]{0,120}to service_role`), `${fn} must be service-role only`);
      }
    });

    await check(20, "The refresh lease is time-bounded and cannot be held forever", () => {
      const sql = migration();
      assert.match(sql, /greatest\(5, least\(coalesce\(p_lock_seconds, 30\), 120\)\)/, "lease length must be capped server-side");
      assert.match(sql, /refresh_lock_until is null or refresh_lock_until < now\(\)/, "an expired lease must always be reclaimable");
      assert.match(sql, /add column if not exists credential_version integer not null default 1/);
      const lockSection = sql.slice(sql.indexOf("claim_os_connector_refresh_lock"), sql.indexOf("os_provider_operations"));
      assert.doesNotMatch(lockSection, /access_token|refresh_token/, "the lease must never touch token columns");
    });

    assert.deepEqual(results, Array.from({ length: 20 }, (_, index) => index + 1));
    console.log("operational-metrics-smoke: all 20 provider failure model checks passed.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

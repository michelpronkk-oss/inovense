import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Distributed OAuth refresh concurrency.
//
// The real src/lib/connectors/refresh-lock.ts is compiled and executed here,
// with only its crypto and Supabase boundaries replaced. The fake database
// reproduces the exact semantics of the two RPCs and the compare-and-swap
// UPDATE in supabase/migrations/20260908_operational_hardening.sql, so these
// are behavior tests of the shipped coordination logic, not a reimplementation.
//
// No network call and no live database are used anywhere in this file.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-distributed-oauth-refresh");
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

const LOCK_TABLE = "os_connector_credentials";

/** Mirrors the migration's lease + credential_version compare-and-swap exactly. */
function createFakeDatabase(overrides = {}) {
  const state = {
    row: {
      workspace_id: "ws-1",
      connector_key: "microsoft",
      credential_version: 1,
      encrypted_access_token: "enc:access-1",
      encrypted_refresh_token: "enc:refresh-1",
      token_expires_at: new Date(Date.now() - 60_000).toISOString(),
      scopes: ["Mail.Read"],
      status: "connected",
      refresh_lock_token: null,
      refresh_lock_until: null,
      ...overrides,
    },
    rpcArgs: [],
    calls: { claim: 0, release: 0, reads: 0, updates: 0, refusedUpdates: 0 },
  };

  state.supabase = {
    async rpc(name, args) {
      state.rpcArgs.push({ name, args });
      const now = Date.now();
      if (name === "claim_os_connector_refresh_lock") {
        state.calls.claim += 1;
        const free = !state.row.refresh_lock_until || new Date(state.row.refresh_lock_until).getTime() < now;
        if (!free) return { data: false, error: null };
        const seconds = Math.max(5, Math.min(args.p_lock_seconds ?? 30, 120));
        state.row.refresh_lock_token = args.p_lock_token;
        state.row.refresh_lock_until = new Date(now + seconds * 1000).toISOString();
        return { data: true, error: null };
      }
      if (name === "release_os_connector_refresh_lock") {
        state.calls.release += 1;
        if (state.row.refresh_lock_token !== args.p_lock_token) return { data: false, error: null };
        state.row.refresh_lock_token = null;
        state.row.refresh_lock_until = null;
        return { data: true, error: null };
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    },
    from(table) {
      assert.equal(table, LOCK_TABLE, "the refresh lock must only ever touch the credential table");
      const filters = {};
      let mode = "select";
      let patch = null;
      const builder = {
        select() { return builder; },
        update(next) { mode = "update"; patch = next; return builder; },
        eq(column, value) { filters[column] = value; return builder; },
        async maybeSingle() {
          const matches = Object.entries(filters).every(([column, value]) => state.row[column] === value);
          if (mode === "update") {
            state.calls.updates += 1;
            if (!matches) { state.calls.refusedUpdates += 1; return { data: null, error: null }; }
            Object.assign(state.row, patch);
            return { data: { credential_version: state.row.credential_version }, error: null };
          }
          state.calls.reads += 1;
          return { data: matches ? { ...state.row } : null, error: null };
        },
      };
      return builder;
    },
  };
  return state;
}

const CRYPTO_IMPORT = 'import { decryptToken, encryptToken } from "@/lib/connectors/crypto";';
const CRYPTO_FAKE = `const decryptToken = (value) => String(value).replace(/^enc:/, "");
const encryptToken = (value) => \`enc:\${value}\`;`;
const ADMIN_IMPORT = 'import { createSupabaseAdmin } from "@/lib/server/supabase-admin";';
const ADMIN_FAKE = "const createSupabaseAdmin = () => { throw new Error('no database in this test'); };";

const expired = () => new Date(Date.now() - 60_000).toISOString();
const future = () => new Date(Date.now() + 30 * 60_000).toISOString();

async function main() {
  try {
    const lock = await loadModule("src/lib/connectors/refresh-lock.ts", [
      [CRYPTO_IMPORT, CRYPTO_FAKE],
      [ADMIN_IMPORT, ADMIN_FAKE],
    ]);
    const { classifyProviderFailure, describeProviderFailure } = await loadModule("src/lib/runtime/provider-retry.ts");
    const isFresh = lock.accessTokenIsFresh;
    const noSleep = async () => {};

    // ── 1. Normal paths ──────────────────────────────────────────────────

    await check(1, "A still-valid token never touches the lock or the provider", async () => {
      const db = createFakeDatabase({ token_expires_at: future() });
      let refreshes = 0;
      const outcome = await lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: db.row, isFresh,
        refresh: async () => { refreshes += 1; return { accessToken: "never" }; },
      });
      assert.equal(outcome.accessToken, "access-1");
      assert.equal(outcome.refreshed, false);
      assert.equal(refreshes, 0);
      assert.equal(db.calls.claim, 0, "no lease may be taken for a healthy token");
    });

    await check(2, "A single expired refresh rotates, versions, and unlocks", async () => {
      const db = createFakeDatabase();
      const outcome = await lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh,
        refresh: async () => ({ accessToken: "access-2", refreshToken: "refresh-2", expiresAt: future(), status: "connected" }),
      });
      assert.equal(outcome.accessToken, "access-2");
      assert.equal(outcome.refreshed, true);
      assert.equal(db.row.credential_version, 2, "credential_version must advance on every persisted refresh");
      assert.equal(db.row.encrypted_access_token, "enc:access-2");
      assert.equal(db.row.encrypted_refresh_token, "enc:refresh-2", "a rotated refresh token must be persisted");
      assert.equal(db.row.refresh_lock_token, null, "the lease must not survive a successful refresh");
      assert.equal(db.row.refresh_lock_until, null);
    });

    await check(3, "A provider that returns no new refresh token keeps the existing one", async () => {
      const db = createFakeDatabase();
      await lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh,
        refresh: async () => ({ accessToken: "access-2", expiresAt: future() }),
      });
      assert.equal(db.row.encrypted_refresh_token, "enc:refresh-1", "valid credential state must never be deleted on refresh");
    });

    // ── 2. Concurrency ───────────────────────────────────────────────────

    await check(4, "Two concurrent callers cause exactly one provider refresh", async () => {
      const db = createFakeDatabase();
      let refreshes = 0;
      let releaseFirst;
      const firstRefreshStarted = new Promise((resolve) => { releaseFirst = resolve; });
      let allowFirstToFinish;
      const gate = new Promise((resolve) => { allowFirstToFinish = resolve; });

      const first = lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh, sleep: noSleep,
        refresh: async () => {
          refreshes += 1;
          releaseFirst();
          await gate;
          return { accessToken: "access-2", refreshToken: "refresh-2", expiresAt: future() };
        },
      });

      await firstRefreshStarted;
      // The second worker starts while the lease is genuinely held.
      const second = lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh, sleep: async () => { allowFirstToFinish(); },
        refresh: async () => { refreshes += 1; return { accessToken: "must-not-happen" }; },
      });

      const [firstResult, secondResult] = await Promise.all([first, second]);
      assert.equal(refreshes, 1, "only one worker may call the provider token endpoint");
      assert.equal(firstResult.accessToken, "access-2");
      assert.equal(firstResult.refreshed, true);
      assert.equal(secondResult.accessToken, "access-2", "the second caller must use the newly persisted token");
      assert.equal(secondResult.reusedNewerToken, true);
      assert.equal(db.row.credential_version, 2, "a coordinated refresh advances the version exactly once");
    });

    await check(5, "A stale worker can never overwrite a newer rotated refresh token", async () => {
      const db = createFakeDatabase();
      const outcome = await lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh, sleep: noSleep,
        refresh: async () => {
          // Another worker wins the race and persists first, exactly as it
          // would in production between this refresh and its own write.
          db.row.credential_version = 7;
          db.row.encrypted_access_token = "enc:winner-access";
          db.row.encrypted_refresh_token = "enc:winner-refresh";
          db.row.token_expires_at = future();
          db.row.refresh_lock_token = null;
          db.row.refresh_lock_until = null;
          return { accessToken: "loser-access", refreshToken: "loser-refresh", expiresAt: future() };
        },
      });
      assert.ok(db.calls.refusedUpdates >= 1, "the compare-and-swap must refuse the stale write");
      assert.equal(db.row.encrypted_refresh_token, "enc:winner-refresh", "the newer rotated refresh token must survive");
      assert.equal(db.row.credential_version, 7, "a refused write must not advance the version");
      assert.equal(outcome.accessToken, "winner-access", "the loser must fall back to the newest persisted token");
      assert.equal(outcome.reusedNewerToken, true);
      assert.equal(outcome.refreshed, false);
    });

    await check(6, "A refused stale write with no usable newer token fails safely, not destructively", async () => {
      const db = createFakeDatabase();
      await assert.rejects(
        lock.resolveAccessTokenWithRefreshLock({
          workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh, sleep: noSleep,
          refresh: async () => {
            db.row.credential_version = 9;
            db.row.refresh_lock_token = null;
            return { accessToken: "loser", refreshToken: "loser-refresh" };
          },
        }),
        (error) => error.name === "StaleCredentialWriteError",
      );
      assert.equal(db.row.encrypted_refresh_token, "enc:refresh-1", "a refused write must leave credential state untouched");
      const failure = describeProviderFailure({ code: "stale_credential_write" });
      assert.equal(failure.kind, "transient", "a lost refresh race is transient, never a reconnect");
      assert.equal(failure.connectorHealthImpact, "degraded");
    });

    // ── 3. Crash and failure recovery ────────────────────────────────────

    await check(7, "An expired lease is reclaimable, so a dead worker cannot hold a credential", async () => {
      const db = createFakeDatabase({ refresh_lock_token: "dead-worker", refresh_lock_until: new Date(Date.now() - 5_000).toISOString() });
      const outcome = await lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh, sleep: noSleep,
        refresh: async () => ({ accessToken: "access-2", refreshToken: "refresh-2", expiresAt: future() }),
      });
      assert.equal(outcome.refreshed, true);
      assert.equal(db.row.refresh_lock_token, null);
    });

    await check(8, "A worker exception releases the lease instead of stranding it", async () => {
      const db = createFakeDatabase();
      await assert.rejects(lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh, sleep: noSleep,
        refresh: async () => { throw new Error("worker died"); },
      }), /worker died/);
      assert.equal(db.row.refresh_lock_token, null, "the lease must be released when the refresh throws");
      assert.equal(db.row.credential_version, 1, "a failed refresh must not advance the version");
      assert.equal(db.row.encrypted_access_token, "enc:access-1", "a failed refresh must not damage the credential");
    });

    await check(9, "A provider 500 does not permanently lock the credential", async () => {
      const db = createFakeDatabase();
      const boom = Object.assign(new Error("provider down"), { code: "http_500" });
      await assert.rejects(lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh, sleep: noSleep,
        refresh: async () => { throw boom; },
      }));
      assert.equal(db.row.refresh_lock_token, null);
      // The very next attempt must be able to proceed normally.
      const recovered = await lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh, sleep: noSleep,
        refresh: async () => ({ accessToken: "access-3", refreshToken: "refresh-3", expiresAt: future() }),
      });
      assert.equal(recovered.accessToken, "access-3");
      assert.equal(classifyProviderFailure({ status: 500 }), "transient", "a 5xx at the token endpoint stays transient");
    });

    await check(10, "A permanently held lease times out as transient, never as a reconnect", async () => {
      const db = createFakeDatabase({ refresh_lock_token: "other-worker", refresh_lock_until: future() });
      await assert.rejects(
        lock.resolveAccessTokenWithRefreshLock({
          workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh,
          waitBudgetMs: 0, sleep: noSleep,
          refresh: async () => ({ accessToken: "never" }),
        }),
        (error) => error.name === "RefreshLockUnavailableError",
      );
      assert.equal(classifyProviderFailure({ code: "refresh_lock_unavailable" }), "transient");
      assert.equal(db.row.encrypted_access_token, "enc:access-1", "a busy lease must never damage the credential");
    });

    await check(11, "A waiting caller uses a token another worker persisted while it waited", async () => {
      const db = createFakeDatabase({ refresh_lock_token: "other-worker", refresh_lock_until: future() });
      const outcome = await lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh,
        waitBudgetMs: 500,
        sleep: async () => {
          db.row.encrypted_access_token = "enc:other-worker-access";
          db.row.token_expires_at = future();
        },
        refresh: async () => { throw new Error("must not refresh"); },
      });
      assert.equal(outcome.accessToken, "other-worker-access");
      assert.equal(outcome.reusedNewerToken, true);
    });

    // ── 4. Secrets discipline ────────────────────────────────────────────

    await check(12, "Lease metadata and lease RPCs never carry token material", async () => {
      const db = createFakeDatabase();
      await lock.resolveAccessTokenWithRefreshLock({
        workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh, sleep: noSleep,
        refresh: async () => ({ accessToken: "super-secret-access", refreshToken: "super-secret-refresh", expiresAt: future() }),
      });
      const serialized = JSON.stringify(db.rpcArgs);
      assert.doesNotMatch(serialized, /super-secret|access-1|refresh-1|enc:/, "no token or ciphertext may reach the lease RPCs");
      for (const call of db.rpcArgs) {
        assert.match(String(call.args.p_lock_token), /^[0-9a-f-]{36}$/, "the lease token must be an opaque random id");
      }
    });

    await check(13, "Nothing in the refresh path writes tokens to the console", async () => {
      const db = createFakeDatabase();
      const captured = [];
      const originals = { log: console.log, warn: console.warn, error: console.error, info: console.info };
      for (const level of Object.keys(originals)) {
        console[level] = (...args) => { captured.push(args.map((item) => String(item)).join(" ")); };
      }
      try {
        await lock.resolveAccessTokenWithRefreshLock({
          workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row }, isFresh, sleep: noSleep,
          refresh: async () => ({ accessToken: "leak-check-access", refreshToken: "leak-check-refresh", expiresAt: future() }),
        });
        await lock.resolveAccessTokenWithRefreshLock({
          workspaceId: "ws-1", connectorKey: "microsoft", supabase: db.supabase, credential: { ...db.row, token_expires_at: expired() }, isFresh, sleep: noSleep,
          refresh: async () => { throw new Error("token endpoint failed"); },
        }).catch(() => undefined);
      } finally {
        Object.assign(console, originals);
      }
      assert.doesNotMatch(captured.join("\n"), /leak-check|enc:/, "no token or ciphertext may be logged");
    });

    // ── 5. Provider wiring and error semantics ───────────────────────────

    await check(14, "Every credential-writing connector refreshes through the shared lock", () => {
      for (const [file, connectorKeyPattern] of [
        ["src/lib/connectors/gmail.ts", "gmail"],
        ["src/lib/connectors/microsoft.ts", "microsoft"],
        ["src/lib/connectors/jira.ts", "jira"],
        ["src/lib/connectors/asana.ts", "asana"],
        ["src/lib/connectors/zendesk.ts", "zendesk"],
        ["src/lib/connectors/salesforce.ts", "salesforce"],
        ["src/lib/connectors/slack.ts", "SLACK_CONNECTOR_KEY"],
        ["src/lib/connectors/hubspot.ts", "HUBSPOT_CONNECTOR_KEY"],
      ]) {
        const source = read(file);
        assert.match(source, /resolveAccessTokenWithRefreshLock/, `${file} must refresh under the distributed lock`);
        assert.match(source, new RegExp(`connectorKey:\\s*(?:"${connectorKeyPattern}"|${connectorKeyPattern})`), `${file} must scope the lock to its own connector`);
        assert.match(source, /recordProviderFailure|recordProviderSuccess/, `${file} must record provider operation outcomes`);
      }
    });

    await check(15, "invalid_grant is the only refresh failure that forces a reconnect", () => {
      assert.equal(describeProviderFailure({ status: 401, code: "invalid_grant" }).connectorHealthImpact, "reconnect_required");
      assert.equal(describeProviderFailure({ status: 403, code: "insufficient_scope" }).connectorHealthImpact, "permission_required");
      for (const status of [429, 500, 502, 503, 504]) {
        assert.equal(describeProviderFailure({ status }).connectorHealthImpact, "degraded", `HTTP ${status} must stay degraded, never a reconnect`);
      }
      // Each connector must gate its needs_attention write on that decision.
      for (const file of ["src/lib/connectors/jira.ts", "src/lib/connectors/asana.ts", "src/lib/connectors/zendesk.ts", "src/lib/connectors/salesforce.ts"]) {
        assert.match(read(file), /connectorHealthImpact === "reconnect_required"/, `${file} must only downgrade the connector on a genuine reauth failure`);
      }
      assert.match(read("src/lib/connectors/microsoft.ts"), /isMicrosoftReauthRequiredError\(error\)[\s\S]{0,400}needs_attention/, "Microsoft must only downgrade on a genuine reauth failure");
    });

    await check(16, "429 handling respects a provider Retry-After and stays bounded", () => {
      const seconds = describeProviderFailure({ status: 429, retryAfter: "30" });
      assert.equal(seconds.rateLimited, true);
      assert.equal(seconds.retryable, true);
      assert.equal(seconds.retryAfterMs, 30_000);
      const httpDate = describeProviderFailure({ status: 429, retryAfter: new Date(Date.now() + 12_000).toUTCString() });
      assert.ok(httpDate.retryAfterMs > 5_000 && httpDate.retryAfterMs <= 13_000, "HTTP-date Retry-After must be honored");
      assert.equal(describeProviderFailure({ status: 429, retryAfter: "not-a-delay" }).retryAfterMs, null, "an unparseable Retry-After must not invent a delay");
      assert.ok(describeProviderFailure({ status: 429, retryAfter: "99999" }).retryAfterMs <= 300_000, "Retry-After must stay capped");
    });

    await check(17, "A request that may already have been accepted is never retryable", () => {
      const uncertain = describeProviderFailure({ status: 504, timedOutAfterSend: true });
      assert.equal(uncertain.kind, "transient");
      assert.equal(uncertain.retryable, false, "an uncertain write must never be retried automatically");
    });

    assert.deepEqual(results, Array.from({ length: 17 }, (_, index) => index + 1));
    console.log("distributed-oauth-refresh-smoke: all 17 refresh concurrency checks passed.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

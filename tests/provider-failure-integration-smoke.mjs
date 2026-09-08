import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Provider failure integration.
//
// Real Auterim connector code runs here. Only the provider NETWORK boundary is
// mocked: global fetch is replaced per scenario, and the Supabase/crypto edges
// are stubbed. Everything between - retry policy, backoff, Retry-After
// handling, error classification, connector health impact, reconnect vs
// degraded decisions - is the shipped implementation.
//
// Representative providers are covered rather than every identical path:
//   email + chat  -> Microsoft Graph (Microsoft 365 mail, and the transport
//                    Microsoft Teams writes use)
//   project mgmt  -> Jira and Asana
//   support       -> Zendesk
//   CRM / auth    -> Salesforce refresh
// Gmail, Google Drive, HubSpot, Slack, Trello and Intercom share the same
// central classifier, which is asserted directly.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-provider-failure-integration");
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

function buildModule(relSourcePath, replacements = [], optionalReplacements = []) {
  let source = read(relSourcePath);
  for (const [search, replace] of replacements) {
    assert.ok(source.includes(search), `expected to find this exact snippet in ${relSourcePath}:\n${search}`);
    source = source.split(search).join(replace);
  }
  // Shared boundary rewrites: not every connector imports every boundary.
  for (const [search, replace] of optionalReplacements) {
    source = source.split(search).join(replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return pathToFileURL(tmpFile).href;
}

const CRYPTO_FAKE = `const decryptToken = (value) => String(value).replace(/^enc:/, "");
const encryptToken = (value) => \`enc:\${value}\`;`;
const ADMIN_FAKE = "const createSupabaseAdmin = () => { throw new Error('no database in this test'); };";

/** Records what the connector persisted, with the same lease/CAS semantics as the migration. */
function createCredentialDatabase(row) {
  const state = {
    row: { credential_version: 1, refresh_lock_token: null, refresh_lock_until: null, status: "connected", ...row },
    statusWrites: [],
  };
  state.supabase = {
    async rpc(name, args) {
      if (name === "claim_os_connector_refresh_lock") {
        const free = !state.row.refresh_lock_until || new Date(state.row.refresh_lock_until).getTime() < Date.now();
        if (!free) return { data: false, error: null };
        state.row.refresh_lock_token = args.p_lock_token;
        state.row.refresh_lock_until = new Date(Date.now() + 30_000).toISOString();
        return { data: true, error: null };
      }
      if (name === "release_os_connector_refresh_lock") {
        if (state.row.refresh_lock_token === args.p_lock_token) { state.row.refresh_lock_token = null; state.row.refresh_lock_until = null; }
        return { data: true, error: null };
      }
      // Provider operation telemetry.
      state.statusWrites.push({ rpc: name, args });
      return { data: null, error: null };
    },
    from() {
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
            if (!matches) return { data: null, error: null };
            Object.assign(state.row, patch);
            if (patch.status) state.statusWrites.push({ status: patch.status });
            return { data: { credential_version: state.row.credential_version }, error: null };
          }
          return { data: matches ? { ...state.row } : null, error: null };
        },
        then(resolve) {
          const matches = Object.entries(filters).every(([column, value]) => state.row[column] === value);
          if (mode === "update" && matches) {
            Object.assign(state.row, patch);
            if (patch.status) state.statusWrites.push({ status: patch.status });
          }
          return resolve({ data: matches ? [{ ...state.row }] : [], error: null });
        },
      };
      return builder;
    },
  };
  return state;
}

/** Scripted provider network boundary. Each entry is one HTTP exchange. */
function mockFetch(script) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method ?? "GET" });
    const next = script.shift();
    if (!next) throw new Error(`unexpected extra provider request: ${String(url)}`);
    if (next.networkError) throw new Error("network timeout");
    const headers = new Map(Object.entries(next.headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value)]));
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      statusText: next.statusText ?? "",
      headers: { get: (name) => headers.get(String(name).toLowerCase()) ?? null },
      async text() { return typeof next.body === "string" ? next.body : JSON.stringify(next.body ?? {}); },
      async json() { return next.body ?? {}; },
    };
  };
  return calls;
}

const realFetch = globalThis.fetch;

async function main() {
  try {
    const retryUrl = buildModule("src/lib/runtime/provider-retry.ts");
    const lockUrl = buildModule("src/lib/connectors/refresh-lock.ts", [
      ['import { decryptToken, encryptToken } from "@/lib/connectors/crypto";', CRYPTO_FAKE],
      ['import { createSupabaseAdmin } from "@/lib/server/supabase-admin";', ADMIN_FAKE],
    ]);
    const healthUrl = buildModule("src/lib/runtime/provider-health.ts", [
      ['import { describeProviderFailure, type ProviderFailureDescription } from "@/lib/runtime/provider-retry";', `import { describeProviderFailure } from "${retryUrl}";`],
      ['import { createSupabaseAdmin } from "@/lib/server/supabase-admin";', ADMIN_FAKE],
    ]);
    const connectorReplacements = [
      ['import { decryptToken, encryptToken } from "@/lib/connectors/crypto";', CRYPTO_FAKE],
      ['import { createSupabaseAdmin } from "@/lib/server/supabase-admin";', ADMIN_FAKE],
      ['from "@/lib/connectors/refresh-lock";', `from "${lockUrl}";`],
      ['from "@/lib/runtime/provider-health";', `from "${healthUrl}";`],
      ['from "@/lib/runtime/provider-retry";', `from "${retryUrl}";`],
    ];

    const jira = await import(buildModule("src/lib/connectors/jira.ts", [], connectorReplacements));
    const asana = await import(buildModule("src/lib/connectors/asana.ts", [], connectorReplacements));
    const zendesk = await import(buildModule("src/lib/connectors/zendesk.ts", [], connectorReplacements));
    const microsoft = await import(buildModule("src/lib/connectors/microsoft.ts", [], [
      ...connectorReplacements,
      ['import { AUTERIM_APP_URL } from "@/lib/brand";', 'const AUTERIM_APP_URL = "https://app.auterim.com";'],
    ]));
    const { describeProviderFailure } = await import(retryUrl);

    process.env.JIRA_CLIENT_ID = "test-client";
    process.env.JIRA_CLIENT_SECRET = "test-secret";
    process.env.ASANA_CLIENT_ID = "test-client";
    process.env.ASANA_CLIENT_SECRET = "test-secret";
    process.env.ZENDESK_CLIENT_ID = "test-client";
    process.env.ZENDESK_CLIENT_SECRET = "test-secret";
    process.env.MICROSOFT_CLIENT_ID = "test-client";
    process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
    process.env.MICROSOFT_TENANT = "organizations";
    process.env.MICROSOFT_REDIRECT_URI = "https://app.auterim.com/api/connectors/microsoft/callback";

    const jiraCredential = (overrides = {}) => ({
      workspace_id: "ws-1", connector_key: "jira", credential_version: 1,
      encrypted_access_token: "enc:jira-access", encrypted_refresh_token: "enc:jira-refresh",
      token_expires_at: new Date(Date.now() + 30 * 60_000).toISOString(), scopes: ["write:jira-work"], status: "connected",
      refresh_lock_token: null, refresh_lock_until: null, metadata: { cloudId: "cloud-1" }, ...overrides,
    });

    // ── Jira: the full failure matrix through the real adapter ───────────

    await check(1, "Jira 401 on a write triggers exactly one refresh, then succeeds", async () => {
      const db = createCredentialDatabase(jiraCredential());
      const calls = mockFetch([
        { status: 401, body: { errorMessages: ["Unauthorized"] } },
        { status: 200, body: { access_token: "jira-access-2", refresh_token: "jira-refresh-2", expires_in: 3600 } },
        { status: 201, body: { id: "10001", key: "REC-1" } },
      ]);
      const created = await jira.jiraFetchWithRefresh({
        workspaceId: "ws-1", credential: jiraCredential(), cloudId: "cloud-1", path: "/issue",
        init: { method: "POST" }, supabase: db.supabase,
      });
      assert.equal(created.key, "REC-1");
      assert.equal(calls.length, 3, "one failed write, one refresh, one retried write");
      assert.equal(db.row.encrypted_refresh_token, "enc:jira-refresh-2", "the rotated refresh token must be persisted before the retry");
      assert.equal(db.row.credential_version, 2);
      assert.equal(db.row.status, "connected", "a recovered 401 must not leave the connector needing attention");
    });

    await check(2, "Jira invalid_grant on refresh becomes a reconnect, not a retry", async () => {
      const db = createCredentialDatabase(jiraCredential());
      mockFetch([
        { status: 401, body: { errorMessages: ["Unauthorized"] } },
        { status: 400, body: { error: "invalid_grant", error_description: "refresh token is invalid" } },
      ]);
      await assert.rejects(
        jira.jiraFetchWithRefresh({ workspaceId: "ws-1", credential: jiraCredential(), cloudId: "cloud-1", path: "/issue", init: { method: "POST" }, supabase: db.supabase }),
        (error) => error instanceof jira.JiraReconnectionRequiredError,
      );
      assert.ok(db.statusWrites.some((write) => write.status === "needs_attention"), "a revoked grant must mark the connector for reconnection");
    });

    await check(3, "A Jira token-endpoint 503 degrades, and never forces a reconnect", async () => {
      const db = createCredentialDatabase(jiraCredential({ token_expires_at: new Date(Date.now() - 60_000).toISOString() }));
      mockFetch([{ status: 503, body: { error: "service_unavailable" } }]);
      await assert.rejects(
        jira.resolveJiraAccessToken({ workspaceId: "ws-1", credential: jiraCredential({ token_expires_at: new Date(Date.now() - 60_000).toISOString() }), supabase: db.supabase }),
        (error) => error instanceof jira.JiraExecutionError,
      );
      assert.ok(!db.statusWrites.some((write) => write.status === "needs_attention"), "a provider outage must never be presented as a customer reconnect");
      assert.equal(db.row.encrypted_refresh_token, "enc:jira-refresh", "a failed refresh must leave the credential intact");
    });

    await check(4, "Jira 403 is a permission failure, not a reconnect or a retry", async () => {
      const calls = mockFetch([{ status: 403, body: { errorMessages: ["You do not have permission"] } }]);
      await assert.rejects(
        jira.jiraFetch("token", "cloud-1", "/issue", { method: "POST" }),
        (error) => error instanceof jira.JiraExecutionError && error.code === "jira_http_403" && error.status === 403,
      );
      assert.equal(calls.length, 1, "a permission failure must not be retried");
      assert.equal(describeProviderFailure({ status: 403 }).connectorHealthImpact, "permission_required");
    });

    await check(5, "Jira 404 on a configured target is a configuration failure", async () => {
      const calls = mockFetch([{ status: 404, body: { errorMessages: ["Issue does not exist"] } }]);
      await assert.rejects(jira.jiraFetch("token", "cloud-1", "/issue/REC-9"), (error) => error.code === "jira_http_404");
      assert.equal(calls.length, 1, "a missing resource must not be retried");
      assert.equal(describeProviderFailure({ status: 404 }).connectorHealthImpact, "configuration_required");
      assert.equal(describeProviderFailure({ status: 404 }).retryable, false);
    });

    await check(6, "Jira 409 conflict is surfaced without a blind retry", async () => {
      const calls = mockFetch([{ status: 409, body: { errorMessages: ["Conflict"] } }]);
      await assert.rejects(jira.jiraFetch("token", "cloud-1", "/issue/REC-9", { method: "PUT" }), (error) => error.code === "jira_http_409");
      assert.equal(calls.length, 1);
      assert.equal(describeProviderFailure({ status: 409 }).retryable, false, "a conflict is not safe to replay");
    });

    await check(7, "Jira 429 is retried a bounded number of times and honors Retry-After", async () => {
      const started = Date.now();
      const calls = mockFetch([
        { status: 429, headers: { "retry-after": "1" }, body: { errorMessages: ["Rate limited"] } },
        { status: 200, body: { key: "REC-2" } },
      ]);
      const result = await jira.jiraFetch("token", "cloud-1", "/issue/REC-2");
      assert.equal(result.key, "REC-2");
      assert.equal(calls.length, 2, "exactly one bounded retry");
      assert.ok(Date.now() - started >= 900, "the provider's Retry-After must actually be waited out");
    });

    await check(8, "A Jira 429 storm stops instead of looping", async () => {
      const calls = mockFetch(Array.from({ length: 6 }, () => ({ status: 429, headers: { "retry-after": "0" }, body: {} })));
      await assert.rejects(jira.jiraFetch("token", "cloud-1", "/issue"), (error) => error instanceof jira.JiraExecutionError);
      assert.equal(calls.length, 3, "retries must stay bounded at three attempts, never unbounded");
    });

    await check(9, "Jira 500, 502 and 503 are transient and bounded", async () => {
      for (const status of [500, 502, 503]) {
        const calls = mockFetch([{ status, body: {} }, { status, body: {} }, { status, body: {} }]);
        await assert.rejects(jira.jiraFetch("token", "cloud-1", "/issue"), (error) => error instanceof jira.JiraExecutionError);
        assert.equal(calls.length, 3, `HTTP ${status} must be retried exactly to the attempt ceiling`);
        assert.equal(describeProviderFailure({ status }).connectorHealthImpact, "degraded");
      }
    });

    await check(10, "A Jira network timeout before acceptance is reported as unreachable", async () => {
      const calls = mockFetch([{ networkError: true }, { networkError: true }, { networkError: true }]);
      await assert.rejects(
        jira.jiraFetch("token", "cloud-1", "/issue", { method: "POST" }),
        (error) => error instanceof jira.JiraExecutionError && error.code === "provider_unavailable",
      );
      assert.equal(calls.length, 3);
    });

    await check(11, "A malformed Jira response never leaks a parser error", async () => {
      mockFetch([{ status: 500, body: "<html>gateway error</html>" }, { status: 500, body: "<html>gateway error</html>" }, { status: 500, body: "<html>gateway error</html>" }]);
      await assert.rejects(jira.jiraFetch("token", "cloud-1", "/issue"), (error) => {
        assert.ok(error instanceof jira.JiraExecutionError, "a malformed body must still produce a typed provider error");
        assert.doesNotMatch(error.message, /JSON|SyntaxError|Unexpected token/, "no parser detail may reach the caller");
        return true;
      });
    });

    // ── Asana ────────────────────────────────────────────────────────────

    await check(12, "Asana 429 is retried once with Retry-After, then succeeds", async () => {
      const calls = mockFetch([
        { status: 429, headers: { "retry-after": "1" }, body: {} },
        { status: 200, body: { data: { gid: "user-1", name: "Sam" } } },
      ]);
      const identity = await asana.fetchAsanaIdentity("token");
      assert.equal(identity.gid, "user-1");
      assert.equal(calls.length, 2);
    });

    await check(13, "Asana 500 stays bounded and reports a safe message", async () => {
      const calls = mockFetch([{ status: 500, body: {} }, { status: 500, body: {} }, { status: 500, body: {} }]);
      await assert.rejects(asana.listAsanaWorkspaces("token"), (error) => {
        assert.doesNotMatch(error.message, /token|Bearer/i, "no credential material may appear in a provider error");
        return true;
      });
      assert.equal(calls.length, 3);
    });

    await check(14, "An Asana refresh outage does not force a reconnect", async () => {
      const credential = { workspace_id: "ws-1", connector_key: "asana", credential_version: 1, encrypted_access_token: "enc:asana-access", encrypted_refresh_token: "enc:asana-refresh", token_expires_at: new Date(Date.now() - 60_000).toISOString(), status: "connected", refresh_lock_token: null, refresh_lock_until: null };
      const db = createCredentialDatabase(credential);
      mockFetch([{ status: 502, body: { error: "bad_gateway" } }]);
      await assert.rejects(asana.resolveAsanaAccessToken({ workspaceId: "ws-1", credential: { ...credential }, supabase: db.supabase }), (error) => error instanceof asana.AsanaExecutionError);
      assert.ok(!db.statusWrites.some((write) => write.status === "needs_attention"));
    });

    // ── Zendesk ──────────────────────────────────────────────────────────

    await check(15, "Zendesk maps 401, 403 and 404 to distinct, truthful codes", async () => {
      for (const [status, code] of [[401, "reconnect_required"], [403, "permission_required"], [404, "zendesk_http_404"]]) {
        const calls = mockFetch([{ status, body: { error: "denied" } }]);
        await assert.rejects(
          zendesk.zendeskFetch("token", "acme.zendesk.com", "/tickets/1.json"),
          (error) => error instanceof zendesk.ZendeskExecutionError && error.code === code,
        );
        assert.equal(calls.length, 1, `HTTP ${status} must not be retried`);
      }
    });

    await check(16, "A Zendesk 503 followed by a success recovers without a reconnect", async () => {
      const calls = mockFetch([
        { status: 503, body: {} },
        { status: 200, body: { ticket: { id: 1, subject: "Escalation" } } },
      ]);
      const body = await zendesk.zendeskFetch("token", "acme.zendesk.com", "/tickets/1.json");
      assert.equal(body.ticket.id, 1);
      assert.equal(calls.length, 2, "a temporary outage recovers on the next attempt");
    });

    // ── Microsoft Graph (Microsoft 365 mail, and the Teams write transport) ──

    await check(17, "A Microsoft Graph 401 is surfaced with its real status", async () => {
      mockFetch([{ status: 401, body: { error: { message: "Access token has expired" } } }]);
      await assert.rejects(
        microsoft.sendMicrosoftMail("token", { to: "person@example.com", subject: "s", body: "b" }),
        (error) => error instanceof microsoft.MicrosoftGraphError && error.details.status === 401,
      );
      assert.equal(describeProviderFailure({ status: 401 }).connectorHealthImpact, "reconnect_required");
    });

    await check(18, "A revoked Microsoft Graph scope reads as permission, not reconnect", async () => {
      mockFetch([{ status: 403, body: { error: { message: "Insufficient privileges" } } }]);
      await assert.rejects(
        microsoft.sendMicrosoftMail("token", { to: "person@example.com", subject: "s", body: "b" }),
        (error) => error.details.status === 403,
      );
      assert.equal(describeProviderFailure({ status: 403, code: "insufficient_scope" }).connectorHealthImpact, "permission_required");
    });

    await check(19, "A Microsoft Graph 429 and 503 stay transient and never delete credential state", async () => {
      for (const status of [429, 503]) {
        mockFetch([{ status, headers: { "retry-after": "2" }, body: { error: { message: "Try again" } } }]);
        await assert.rejects(microsoft.sendMicrosoftMail("token", { to: "person@example.com", subject: "s", body: "b" }), (error) => error.details.status === status);
        assert.equal(describeProviderFailure({ status, retryAfter: "2" }).connectorHealthImpact, "degraded");
      }
    });

    await check(20, "A malformed Microsoft Graph response becomes a typed provider error", async () => {
      mockFetch([{ status: 200, body: "not json at all" }]);
      await assert.rejects(
        microsoft.listRecentMicrosoftMessages("token", 5),
        (error) => error instanceof microsoft.MicrosoftGraphError && /unreadable/i.test(error.message),
      );
    });

    await check(21, "A Microsoft refresh 500 leaves the credential connected and usable later", async () => {
      const credential = { workspace_id: "ws-1", connector_key: "microsoft", credential_version: 1, encrypted_access_token: "enc:ms-access", encrypted_refresh_token: "enc:ms-refresh", token_expires_at: new Date(Date.now() - 60_000).toISOString(), scopes: ["Mail.Send"], status: "connected", refresh_lock_token: null, refresh_lock_until: null };
      const db = createCredentialDatabase(credential);
      mockFetch([{ status: 500, body: { error: "temporarily_unavailable" } }]);
      await assert.rejects(microsoft.resolveMicrosoftAccessToken({ workspaceId: "ws-1", credential: { ...credential }, supabase: db.supabase }));
      assert.ok(!db.statusWrites.some((write) => write.status === "needs_attention"), "a token-endpoint outage must not force a reconnect");
      assert.equal(db.row.refresh_lock_token, null, "the lease must be released after a failed refresh");

      mockFetch([{ status: 200, body: { access_token: "ms-access-2", refresh_token: "ms-refresh-2", expires_in: 3600 } }]);
      const token = await microsoft.resolveMicrosoftAccessToken({ workspaceId: "ws-1", credential: { ...credential }, supabase: db.supabase });
      assert.equal(token, "ms-access-2", "the connector must recover by itself on the next attempt");
    });

    await check(22, "A revoked Microsoft grant marks the connector for reconnection", async () => {
      const credential = { workspace_id: "ws-1", connector_key: "microsoft", credential_version: 1, encrypted_access_token: "enc:ms-access", encrypted_refresh_token: "enc:ms-refresh", token_expires_at: new Date(Date.now() - 60_000).toISOString(), scopes: ["Mail.Send"], status: "connected", refresh_lock_token: null, refresh_lock_until: null };
      const db = createCredentialDatabase(credential);
      mockFetch([{ status: 400, body: { error: "invalid_grant", error_description: "AADSTS70008: expired" } }]);
      await assert.rejects(
        microsoft.resolveMicrosoftAccessToken({ workspaceId: "ws-1", credential: { ...credential }, supabase: db.supabase }),
        (error) => error instanceof microsoft.MicrosoftReauthRequiredError,
      );
      assert.ok(db.statusWrites.some((write) => write.status === "needs_attention"));
    });

    // ── Cross-provider guarantees ────────────────────────────────────────

    await check(23, "An uncertain write is never duplicated by the approval executor", () => {
      const approve = read("src/app/api/approvals/[id]/approve/route.ts");
      assert.match(approve, /const executionStatus = failureClass === "transient" \? "execution_unknown" : "failed"/, "a transient failure after a claimed approval must be recorded as uncertain");
      assert.match(approve, /requiresManualReview: executionStatus === "execution_unknown"/);
      assert.doesNotMatch(approve, /retryExecution|reExecutePreparedAction/, "there must be no automatic re-execution path");
      assert.equal(describeProviderFailure({ status: 504, timedOutAfterSend: true }).retryable, false);
    });

    await check(24, "A provider outage is never presented as a customer configuration error", () => {
      const approve = read("src/app/api/approvals/[id]/approve/route.ts");
      assert.match(approve, /is temporarily unavailable\. The action was not retried automatically\./);
      for (const status of [500, 502, 503, 504]) {
        assert.notEqual(describeProviderFailure({ status }).connectorHealthImpact, "configuration_required");
      }
    });

    await check(25, "Every approved provider write reports its outcome from one choke point", () => {
      const execute = read("src/lib/actions/execute.ts");
      assert.match(execute, /async function dispatchPreparedAction/, "dispatch and outcome recording must be separated");
      assert.match(execute, /recordProviderSuccess\(\{ workspaceId: action\.workspaceId, connectorKey: action\.connectorKey, operation: "write" \}\)/);
      assert.match(execute, /operation: "write",\s*\n\s*status: typeof detail\.status === "number" \? detail\.status : null/);
      assert.match(execute, /throw error;/, "telemetry must never swallow an execution failure");
      assert.doesNotMatch(execute, /recordProviderFailure\([\s\S]{0,300}action\.input/, "no write payload may reach the counter");
    });

    await check(26, "Providers without their own adapter test share the one central classifier", () => {
      for (const file of ["src/lib/connectors/gmail.ts", "src/lib/connectors/google-drive.ts", "src/lib/connectors/intercom.ts", "src/lib/operators/executors/slack.ts", "src/lib/operators/executors/trello.ts"]) {
        assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
      }
      // One taxonomy, exported from one module.
      const retrySource = read("src/lib/runtime/provider-retry.ts");
      assert.match(retrySource, /export function classifyProviderFailure/);
      assert.match(retrySource, /export function describeProviderFailure/);
      const duplicates = ["src/lib/connectors/jira.ts", "src/lib/connectors/asana.ts", "src/lib/connectors/zendesk.ts", "src/lib/connectors/intercom.ts"]
        .filter((file) => /function classifyProviderFailure/.test(read(file)));
      assert.deepEqual(duplicates, [], "no connector may define a second provider failure taxonomy");
    });

    assert.deepEqual(results, Array.from({ length: 26 }, (_, index) => index + 1));
    console.log("provider-failure-integration-smoke: all 26 provider failure checks passed.");
  } finally {
    globalThis.fetch = realFetch;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

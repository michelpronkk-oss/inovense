import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-website-verification-route-smoke");
fs.mkdirSync(tmpDir, { recursive: true });
process.env.WEBSITE_SYNC_VERIFICATION_SECRET = "website-verification-test-secret";

async function bundleRoute() {
  const outfile = path.join(tmpDir, "verification-route.mjs");
  await esbuild.build({
    entryPoints: [path.join(root, "src/app/api/connectors/website/verification/route.ts")],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    plugins: [{
      name: "website-verification-test-stubs",
      setup(build) {
        build.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "website-test" }));
        build.onLoad({ filter: /^server-only$/, namespace: "website-test" }, () => ({ contents: "", loader: "js" }));
        build.onResolve({ filter: /^next\/server$/ }, () => ({ path: "next/server", namespace: "website-test" }));
        build.onLoad({ filter: /^next\/server$/, namespace: "website-test" }, () => ({ contents: "export const NextResponse = { json: (body, init) => Response.json(body, init) };", loader: "js" }));
        build.onResolve({ filter: /^node:dns\/promises$/ }, () => ({ path: "node:dns/promises", namespace: "website-test" }));
        build.onLoad({ filter: /^node:dns\/promises$/, namespace: "website-test" }, () => ({ contents: "export async function resolveTxt(hostname) { return globalThis.__websiteResolveTxt(hostname); } export default { resolveTxt };", loader: "js" }));
        build.onResolve({ filter: /^@\/lib\/connectors\/website-route-auth$/ }, () => ({ path: "website-route-auth", namespace: "website-test" }));
        build.onLoad({ filter: /^website-route-auth$/, namespace: "website-test" }, () => ({ contents: `
          export async function websiteAccess() {
            return { workspaceId: globalThis.__websiteWorkspaceId, supabase: globalThis.__websiteSupabase };
          }
          export async function readWebsiteJson(request) { return request.json(); }
          export function websiteErrorResponse(error) {
            const status = Number.isInteger(error?.status) ? error.status : 400;
            return Response.json({ error: error?.message ?? String(error), ...(error?.code ? { code: error.code } : {}) }, { status });
          }
        `, loader: "js" }));
        build.onResolve({ filter: /^@\/lib\/server\/supabase-admin$/ }, () => ({ path: "supabase-admin", namespace: "website-test" }));
        build.onLoad({ filter: /^supabase-admin$/, namespace: "website-test" }, () => ({ contents: "export function createSupabaseAdmin() { return globalThis.__websiteSupabase; }", loader: "js" }));
        build.onResolve({ filter: /^@\/lib\/memory\/materialize$/ }, () => ({ path: "memory-materialize", namespace: "website-test" }));
        build.onLoad({ filter: /^memory-materialize$/, namespace: "website-test" }, () => ({ contents: "export async function appendMemoryVersion() { return { id: 'memory-test' }; }", loader: "js" }));
        build.onResolve({ filter: /^@\// }, (args) => ({ path: `${path.join(root, "src", args.path.slice(2))}.ts` }));
      },
    }],
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
}

function sourceRow(overrides = {}) {
  return {
    id: "source-a",
    workspace_id: "workspace-a",
    canonical_origin: "https://example.com",
    hostname: "example.com",
    allowed_subdomains: [],
    sync_enabled: true,
    cadence: "weekly",
    include_paths: [],
    exclude_paths: [],
    max_pages: 50,
    verification_status: "pending",
    verification_method: null,
    verified_at: null,
    verification_expires_at: null,
    robots_status: "unknown",
    robots_rules: null,
    robots_sitemaps: [],
    robots_fetched_at: null,
    robots_expires_at: null,
    health_status: "verification_pending",
    last_run_id: null,
    last_successful_sync_at: null,
    next_sync_at: null,
    pages_discovered: 0,
    pages_checked: 0,
    pages_changed: 0,
    pages_skipped: 0,
    pages_failed: 0,
    observations_pending: 0,
    conflicts_pending: 0,
    disconnected_at: null,
    retain_observations_on_disconnect: true,
    created_at: "2026-09-16T00:00:00.000Z",
    updated_at: "2026-09-16T00:00:00.000Z",
    ...overrides,
  };
}

function makeSupabase() {
  const state = {
    sources: [sourceRow()],
    challenges: [],
    nextChallenge: 1,
    failChallengeSelect: false,
  };

  function matches(row, filters) {
    return filters.every((filter) => filter.op === "eq" ? row[filter.key] === filter.value : filter.op === "is" ? row[filter.key] === filter.value : filter.op === "in" ? filter.value.includes(row[filter.key]) : true);
  }

  function builder(table, operation, payload) {
    const filters = [];
    let selected = false;
    let singleMode = null;
    let limit = null;
    const query = {
      _payload: payload,
      select() { selected = true; return query; },
      update(next) { query._payload = next; return query; },
      upsert(next) { query._payload = next; return query; },
      eq(key, value) { filters.push({ op: "eq", key, value }); return query; },
      is(key, value) { filters.push({ op: "is", key, value }); return query; },
      in(key, value) { filters.push({ op: "in", key, value }); return query; },
      order() { return query; },
      limit(next) { limit = next; return query; },
      maybeSingle() { singleMode = "maybe"; return query.execute(); },
      single() { singleMode = "single"; return query.execute(); },
      async execute() {
        if (table === "os_website_verification_challenges" && operation === "select" && state.failChallengeSelect) return { data: null, error: { code: "PGRST_TEST_LOOKUP" } };
        const rows = table === "os_website_sources" ? state.sources : state.challenges;
        if (operation === "insert") {
          const row = { ...payload, id: `challenge-${state.nextChallenge++}`, status: "pending", verified_at: null, created_at: new Date().toISOString() };
          state.challenges.push(row);
          return { data: selected ? { id: row.id } : null, error: null };
        }
        if (operation === "update") {
          const changed = rows.filter((row) => matches(row, filters));
          for (const row of changed) Object.assign(row, query._payload, { updated_at: new Date().toISOString() });
          if (!selected) return { data: null, error: null };
          const selectedRows = changed.slice(0, limit ?? changed.length).map((row) => ({ ...row }));
          if (singleMode === "single") return { data: selectedRows[0] ?? null, error: selectedRows.length === 1 ? null : { code: "PGRST116" } };
          return { data: selectedRows, error: null };
        }
        let result = rows.filter((row) => matches(row, filters));
        if (limit !== null) result = result.slice(0, limit);
        const data = result.map((row) => ({ ...row }));
        if (singleMode === "single") return { data: data[0] ?? null, error: data.length === 1 ? null : { code: "PGRST116" } };
        if (singleMode === "maybe") return { data: data[0] ?? null, error: data.length > 1 ? { code: "PGRST116" } : null };
        return { data, error: null };
      },
      then(resolve, reject) { return query.execute().then(resolve, reject); },
    };
    return query;
  }

  return {
    state,
    from(table) {
      return {
        select() { return builder(table, "select"); },
        insert(payload) { return builder(table, "insert", payload); },
        update(payload) { return builder(table, "update", payload); },
        upsert(payload) { return builder(table, "upsert", payload); },
      };
    },
  };
}

const { POST } = await bundleRoute();

async function post(body) {
  const response = await POST(new Request("http://test.local/api/connectors/website/verification", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { response, json: await response.json() };
}

function setup() {
  const supabase = makeSupabase();
  globalThis.__websiteSupabase = supabase;
  globalThis.__websiteWorkspaceId = "workspace-a";
  globalThis.__websiteResolveTxt = async () => [];
  return supabase;
}

function challengeBody(challenge) {
  return { workspaceId: globalThis.__websiteWorkspaceId, action: "verify", sourceId: "source-a", challengeId: challenge.challengeId, token: challenge.token };
}

const warnings = [];
const originalWarn = console.warn;
console.warn = (...args) => warnings.push(args);
try {
  {
    const supabase = setup();
    const created = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    assert.equal(created.response.status, 200);
    assert.equal(supabase.state.sources[0].verification_status, "pending");
    globalThis.__websiteResolveTxt = async () => [[created.json.dnsRecord]];
    const verified = await post(challengeBody(created.json));
    assert.equal(verified.response.status, 200);
    assert.equal(verified.json.source.verificationStatus, "verified");
    assert.equal(supabase.state.challenges[0].status, "verified");
  }

  {
    const supabase = setup();
    const created = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    const reloadedClientState = { challengeId: created.json.challengeId, token: created.json.token };
    globalThis.__websiteResolveTxt = async () => [[created.json.dnsRecord]];
    const verified = await post({ workspaceId: "workspace-a", action: "verify", sourceId: "source-a", ...reloadedClientState });
    assert.equal(verified.response.status, 200, "a reload must not make the persisted challenge unavailable");
    assert.equal(supabase.state.sources[0].verification_status, "verified");
  }

  {
    const supabase = setup();
    const created = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    globalThis.__websiteResolveTxt = async () => [];
    const failedLookup = await post(challengeBody(created.json));
    assert.equal(failedLookup.response.status, 409);
    assert.equal(failedLookup.json.code, "DNS_NOT_FOUND");
    assert.equal(supabase.state.challenges[0].status, "pending", "DNS mismatch must preserve the active challenge");
    assert.equal(supabase.state.sources[0].verification_status, "pending");
    globalThis.__websiteResolveTxt = async () => [[created.json.dnsRecord]];
    const retried = await post(challengeBody(created.json));
    assert.equal(retried.response.status, 200, "the same active challenge must be retryable");
  }

  {
    const supabase = setup();
    const first = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    supabase.state.sources[0].verification_status = "failed";
    const replacement = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    assert.equal(supabase.state.sources[0].verification_status, "pending");
    assert.equal(supabase.state.challenges.find((row) => row.id === first.json.challengeId).status, "superseded");
    assert.equal(supabase.state.challenges.find((row) => row.id === replacement.json.challengeId).status, "pending");
    globalThis.__websiteResolveTxt = async () => [[replacement.json.dnsRecord]];
    const verified = await post(challengeBody(replacement.json));
    assert.equal(verified.response.status, 200);
  }

  {
    const supabase = setup();
    const created = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    supabase.state.challenges[0].expires_at = "2020-01-01T00:00:00.000Z";
    const expired = await post(challengeBody(created.json));
    assert.equal(expired.response.status, 409);
    assert.equal(expired.json.code, "CHALLENGE_EXPIRED");
    assert.equal(supabase.state.challenges[0].status, "expired");
  }

  {
    const supabase = setup();
    const created = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    supabase.state.challenges[0].status = "expired";
    const expired = await post(challengeBody(created.json));
    assert.equal(expired.response.status, 409);
    assert.equal(expired.json.code, "CHALLENGE_EXPIRED", "an explicitly expired row must never be treated as pending");
  }

  {
    const supabase = setup();
    const first = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    const second = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    const superseded = await post(challengeBody(first.json));
    assert.equal(superseded.response.status, 409);
    assert.equal(superseded.json.code, "CHALLENGE_SUPERSEDED");
    assert.equal(supabase.state.challenges.find((row) => row.id === second.json.challengeId).status, "pending");
  }

  {
    const supabase = setup();
    const created = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    globalThis.__websiteWorkspaceId = "workspace-b";
    const denied = await post(challengeBody(created.json));
    assert.equal(denied.response.status, 404);
    assert.equal(denied.json.code, "SOURCE_NOT_FOUND");
    assert.equal(supabase.state.challenges[0].status, "pending");
    globalThis.__websiteWorkspaceId = "workspace-a";
  }

  {
    const supabase = setup();
    const created = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    globalThis.__websiteResolveTxt = async () => [[created.json.dnsRecord]];
    const first = await post(challengeBody(created.json));
    const second = await post(challengeBody(created.json));
    assert.equal(first.response.status, 200);
    assert.equal(second.response.status, 200, "repeated verification must be idempotent");
    assert.equal(second.json.source.verificationStatus, "verified");
    assert.equal(supabase.state.challenges[0].status, "verified");
  }

  {
    const supabase = setup();
    const created = await post({ workspaceId: "workspace-a", action: "challenge", sourceId: "source-a", method: "dns_txt" });
    supabase.state.failChallengeSelect = true;
    const failedDbLookup = await post(challengeBody(created.json));
    assert.equal(failedDbLookup.response.status, 500);
    assert.equal(failedDbLookup.json.code, "INTERNAL_ERROR");
    assert.equal(failedDbLookup.json.error.includes("not available"), false, "database errors must not be reported as missing challenges");
  }
} finally {
  console.warn = originalWarn;
}

const warningText = JSON.stringify(warnings);
assert.ok(warnings.length > 0, "verification diagnostics should be emitted");
assert.doesNotMatch(warningText, /website-verification-test-secret/);
assert.doesNotMatch(warningText, /auterim-site-verification=/);
assert.match(warningText, /challenge_loaded/);
assert.match(warningText, /workspace-a/);
assert.match(warningText, /status/);
assert.match(warningText, /expiresAt/);
assert.match(warningText, /PGRST_TEST_LOOKUP/);

console.log("Website verification route state-machine contracts passed: persisted challenge lookup, retry, replacement, expiry, workspace isolation, idempotency, and safe diagnostics.");

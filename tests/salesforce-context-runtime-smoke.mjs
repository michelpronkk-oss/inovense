import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Runtime smoke test for the Salesforce read-context REST client
// (src/lib/connectors/salesforce-rest.ts + src/lib/connectors/salesforce.ts).
// Unlike the source-contract smoke test (salesforce-connector-smoke.mjs),
// this actually executes the real modules via esbuild.build (bundled, with
// the "@" path alias resolved to src/) + dynamic import, with global.fetch
// fully mocked. No live Salesforce credentials or network access are used.
// This proves, not just pattern-matches:
//   1. SOQL email escaping actually escapes a single quote
//   2. Contact-found-by-email
//   3. No-Contact falls through to Lead
//   4. No person match is a safe "no_match", never an error
//   5. Ambiguous (2+ matches) is an explicit distinct result, not a guess
//   6. Account resolves from a Contact's AccountId; amount/closeDate stay
//      null when Salesforce doesn't return them
//   7. Lead's plain Company string is used (no invented Account)
//   8. Open opportunities are requested deterministically (IsClosed=false,
//      ORDER BY LastModifiedDate DESC) and normalized in the order returned
//   9. A 401/expired-session response triggers exactly one refresh-and-retry
//  10. A genuine refresh failure marks the credential needs_attention

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-salesforce-context-runtime-smoke");
fs.mkdirSync(tmpDir, { recursive: true });

process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY = "a".repeat(32);
process.env.SALESFORCE_CLIENT_ID = "test-client-id";
process.env.SALESFORCE_CLIENT_SECRET = "test-client-secret";

async function bundleModule(relSourcePath) {
  const entry = path.join(root, relSourcePath);
  const outfile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}.mjs`);
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    alias: { "@": path.join(root, "src") },
    external: ["@supabase/supabase-js", "@anthropic-ai/sdk", "@nangohq/node", "@nangohq/frontend"],
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
}

function makeMockSupabase() {
  const updates = [];
  return {
    updates,
    from(table) {
      return {
        update(fields) {
          return {
            eq(col1, val1) {
              return {
                eq(col2, val2) {
                  updates.push({ table, fields, col1, val1, col2, val2 });
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function decodeQuery(url) {
  return decodeURIComponent(new URL(url).searchParams.get("q") ?? "");
}

function isTokenEndpoint(url) {
  return url.includes("/services/oauth2/token");
}

function isQueryEndpoint(url) {
  return url.includes("/services/data/") && url.includes("/query");
}

async function main() {
  const { encryptToken } = await bundleModule("src/lib/connectors/crypto.ts");
  const { escapeSoqlString, findSalesforcePersonByEmail, getSalesforceAccountById, getOpenSalesforceOpportunitiesForAccount, SALESFORCE_API_VERSION } = await bundleModule("src/lib/connectors/salesforce-rest.ts");

  assert.equal(typeof SALESFORCE_API_VERSION, "string");

  function buildCredential(overrides = {}) {
    return {
      workspace_id: "ws-1",
      connector_key: "salesforce",
      encrypted_access_token: encryptToken("initial-access-token"),
      encrypted_refresh_token: encryptToken("refresh-token-1"),
      status: "connected",
      metadata: { instanceUrl: "https://mycompany.my.salesforce.com" },
      ...overrides,
    };
  }

  function mockFetch(handler) {
    const calls = [];
    const original = global.fetch;
    global.fetch = async (url, opts) => {
      calls.push({ url: String(url), opts });
      return handler(String(url), opts, calls);
    };
    return { calls, restore: () => { global.fetch = original; } };
  }

  // 1. escapeSoqlString actually escapes a single quote (and backslash-first).
  {
    assert.equal(escapeSoqlString("o'brien"), "o\\'brien", "a single quote must become backslash-quote");
    assert.equal(escapeSoqlString("a\\b'c"), "a\\\\b\\'c", "a backslash must be escaped before the quote pass runs");
  }

  // 2. Contact found by email - normalized correctly, no fabricated fields.
  {
    const { restore, calls } = mockFetch((url) => {
      if (isQueryEndpoint(url) && decodeQuery(url).includes("FROM Contact")) {
        return jsonResponse({ totalSize: 1, records: [{ Id: "003AAA", FirstName: "Jane", LastName: "Doe", Email: "jane@example.com", Title: "CTO", AccountId: "001AAA", OwnerId: "005AAA", Owner: { Name: "Rep One" } }] });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    try {
      const result = await findSalesforcePersonByEmail({ workspaceId: "ws-1", credential: buildCredential(), email: "jane@example.com", supabase: makeMockSupabase() });
      assert.equal(result.status, "matched");
      assert.equal(result.person.type, "contact");
      assert.equal(result.person.accountId, "001AAA");
      assert.equal(result.person.ownerName, "Rep One");
      assert.equal(calls.length, 1, "a Contact match must not also query Lead");
    } finally {
      restore();
    }
  }

  // 3. No Contact -> falls through to Lead; Lead uses plain Company string, no AccountId.
  {
    const { restore, calls } = mockFetch((url) => {
      const q = isQueryEndpoint(url) ? decodeQuery(url) : "";
      if (q.includes("FROM Contact")) return jsonResponse({ totalSize: 0, records: [] });
      if (q.includes("FROM Lead")) return jsonResponse({ totalSize: 1, records: [{ Id: "00QAAA", FirstName: "Sam", LastName: "Lee", Email: "sam@example.com", Title: null, Company: "Acme Co", OwnerId: "005BBB", Status: "Open - Not Contacted", Owner: { Name: "Rep Two" } }] });
      throw new Error(`Unexpected fetch: ${url}`);
    });
    try {
      const result = await findSalesforcePersonByEmail({ workspaceId: "ws-1", credential: buildCredential(), email: "sam@example.com", supabase: makeMockSupabase() });
      assert.equal(result.status, "matched");
      assert.equal(result.person.type, "lead");
      assert.equal(result.person.companyName, "Acme Co");
      assert.equal(result.person.accountId, null, "a Lead must never be given a fabricated AccountId");
      assert.equal(calls.length, 2, "Contact miss must fall through to exactly one Lead query");
    } finally {
      restore();
    }
  }

  // 4. No match at all is a safe no_match, never an error.
  {
    const { restore } = mockFetch(() => jsonResponse({ totalSize: 0, records: [] }));
    try {
      const result = await findSalesforcePersonByEmail({ workspaceId: "ws-1", credential: buildCredential(), email: "nobody@example.com", supabase: makeMockSupabase() });
      assert.equal(result.status, "no_match");
    } finally {
      restore();
    }
  }

  // 5. Ambiguous match (2+ Contacts) is an explicit result, never a silent pick.
  {
    const { restore, calls } = mockFetch((url) => {
      const q = decodeQuery(url);
      if (q.includes("FROM Contact")) return jsonResponse({ totalSize: 2, records: [{ Id: "003A" }, { Id: "003B" }] });
      throw new Error(`Unexpected fetch: ${url}`);
    });
    try {
      const result = await findSalesforcePersonByEmail({ workspaceId: "ws-1", credential: buildCredential(), email: "dupe@example.com", supabase: makeMockSupabase() });
      assert.equal(result.status, "ambiguous");
      assert.equal(result.type, "contact");
      assert.equal(result.count, 2);
      assert.equal(calls.length, 1, "an ambiguous Contact match must not also query Lead");
    } finally {
      restore();
    }
  }

  // 6. escapeSoqlString is actually wired into the outgoing request (a raw quote never reaches the query string).
  {
    let capturedQuery = "";
    const { restore } = mockFetch((url) => {
      capturedQuery = decodeQuery(url);
      return jsonResponse({ totalSize: 0, records: [] });
    });
    try {
      await findSalesforcePersonByEmail({ workspaceId: "ws-1", credential: buildCredential(), email: "o'brien@example.com", supabase: makeMockSupabase() });
      assert.match(capturedQuery, /o\\'brien@example\.com/, "the raw email must be escaped before reaching the SOQL query string");
      assert.doesNotMatch(capturedQuery, /'o'brien@example\.com'/, "an unescaped quote must never reach the query string");
    } finally {
      restore();
    }
  }

  // 7. Account resolves from a Contact's AccountId; missing fields stay null, never fabricated.
  {
    const { restore } = mockFetch((url) => {
      const q = decodeQuery(url);
      if (q.includes("FROM Account")) return jsonResponse({ totalSize: 1, records: [{ Id: "001AAA", Name: "Acme Inc", Website: null, Industry: "Software", OwnerId: "005AAA", Owner: { Name: "Rep One" } }] });
      throw new Error(`Unexpected fetch: ${url}`);
    });
    try {
      const result = await getSalesforceAccountById({ workspaceId: "ws-1", credential: buildCredential(), accountId: "001AAA", supabase: makeMockSupabase() });
      assert.equal(result.status, "matched");
      assert.equal(result.account.name, "Acme Inc");
      assert.equal(result.account.website, null, "a missing Website must stay null, never fabricated");
    } finally {
      restore();
    }
  }

  // 8. Open opportunities: deterministic query (IsClosed=false, ORDER BY LastModifiedDate DESC),
  // normalized order preserved, amount/closeDate null when absent.
  {
    let capturedQuery = "";
    const { restore } = mockFetch((url) => {
      capturedQuery = decodeQuery(url);
      return jsonResponse({
        totalSize: 2,
        records: [
          { Id: "006A", Name: "Deal A", StageName: "Proposal", IsClosed: false, Amount: 5000, CloseDate: "2026-01-01", OwnerId: "005AAA", AccountId: "001AAA", LastModifiedDate: "2026-01-05", Owner: { Name: "Rep One" } },
          { Id: "006B", Name: "Deal B", StageName: "Discovery", IsClosed: false, Amount: null, CloseDate: null, OwnerId: "005AAA", AccountId: "001AAA", LastModifiedDate: "2026-01-02", Owner: { Name: "Rep One" } },
        ],
      });
    });
    try {
      const result = await getOpenSalesforceOpportunitiesForAccount({ workspaceId: "ws-1", credential: buildCredential(), accountId: "001AAA", supabase: makeMockSupabase() });
      assert.equal(result.status, "matched");
      assert.equal(result.opportunities.length, 2);
      assert.equal(result.opportunities[0].id, "006A", "the first (most recently modified) opportunity must be first");
      assert.equal(result.opportunities[1].amount, null, "a missing Amount must stay null, never fabricated");
      assert.equal(result.opportunities[1].closeDate, null, "a missing CloseDate must stay null, never fabricated");
      assert.match(capturedQuery, /IsClosed = false/, "open opportunities must be filtered server-side, never client-guessed");
      assert.match(capturedQuery, /ORDER BY LastModifiedDate DESC/, "opportunity ordering must be deterministic");
    } finally {
      restore();
    }
  }

  // 9. A 401/expired-session response triggers exactly one refresh-and-retry, then succeeds.
  {
    const supabase = makeMockSupabase();
    let queryCalls = 0;
    let tokenCalls = 0;
    const { restore } = mockFetch((url) => {
      if (isTokenEndpoint(url)) {
        tokenCalls += 1;
        return jsonResponse({ access_token: "refreshed-access-token", token_type: "Bearer" });
      }
      if (isQueryEndpoint(url)) {
        queryCalls += 1;
        if (queryCalls === 1) return jsonResponse([{ message: "Session expired or invalid", errorCode: "INVALID_SESSION_ID" }], 401);
        return jsonResponse({ totalSize: 1, records: [{ Id: "003AAA", FirstName: "Jane", LastName: "Doe", Email: "jane@example.com", Title: null, AccountId: null, OwnerId: null }] });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    try {
      const result = await findSalesforcePersonByEmail({ workspaceId: "ws-1", credential: buildCredential(), email: "jane@example.com", supabase });
      assert.equal(result.status, "matched", "a single retry after refresh must succeed");
      assert.equal(queryCalls, 2, "exactly one retry - not zero, not more");
      assert.equal(tokenCalls, 1, "exactly one refresh call");
      assert.ok(supabase.updates.some((u) => u.fields.status === "connected"), "a successful refresh must persist the new access token and clear needs_attention");
    } finally {
      restore();
    }
  }

  // 10. A genuine refresh failure marks the credential needs_attention.
  {
    const supabase = makeMockSupabase();
    const { restore } = mockFetch((url) => {
      if (isTokenEndpoint(url)) return jsonResponse({ error: "invalid_grant", error_description: "expired access/refresh token" }, 400);
      if (isQueryEndpoint(url)) return jsonResponse([{ message: "Session expired or invalid", errorCode: "INVALID_SESSION_ID" }], 401);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    try {
      const result = await findSalesforcePersonByEmail({ workspaceId: "ws-1", credential: buildCredential(), email: "jane@example.com", supabase });
      assert.equal(result.status, "error", "a genuine refresh failure must be a safe error result, not a thrown exception out of the adapter boundary");
      assert.ok(supabase.updates.some((u) => u.fields.status === "needs_attention"), "a genuine refresh failure must mark the credential needs_attention");
    } finally {
      restore();
    }
  }

  console.log("Salesforce read-context runtime smoke: SOQL escaping, person/account/opportunity lookups, and 401 retry-once/needs_attention behavior all verified.");
}

try {
  await main();
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Behavioral regression coverage for the Growth activation bug: "Activate
// operator" navigated without persisting activation. Covers both the
// client-side mutate-then-navigate sequencing (activation-client.ts) and the
// server-side authorization/idempotency guarantees of the real activate /
// deactivate routes. Mocks are used only at external boundaries (fetch,
// Supabase, workspace/session resolution) - the actual dispatch/route/
// activation-persistence code under test is real.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-operator-activation-flow-smoke");
fs.mkdirSync(tmpDir, { recursive: true });

async function bundle(entry, outname, plugin) {
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
    plugins: plugin ? [plugin] : [],
  });
  return import(pathToFileURL(outfile).href + `?t=${Date.now()}-${Math.random()}`);
}

// ===================== 1. activation-client.ts: mutate-then-navigate =====================
{
  const { activateOperatorAndNavigate, requestOperatorActivation } = await bundle("./src/lib/operators/activation-client.ts", "activation-client.mjs");
  const identity = { workspaceId: "ws-1", userId: "user-1", userEmail: "owner@example.com" };

  // Success: exactly one POST to the growth activate endpoint, correct
  // method/body, and navigate is called only after the mutation resolves ok.
  {
    const calls = [];
    const navigated = [];
    const fetchImpl = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify({ ok: true, state: { activated: true, activatedAt: "2026-09-17T00:00:00.000Z", updatedAt: "2026-09-17T00:00:00.000Z" } }), { status: 200 }); };
    const result = await activateOperatorAndNavigate({ operatorKey: "growth", identity, href: "/agents/growth", navigate: (href) => navigated.push(href), fetchImpl });
    assert.equal(result.ok, true);
    assert.equal(calls.length, 1, "exactly one mutation request");
    assert.equal(calls[0].url, "/api/operators/growth/activate");
    assert.equal(calls[0].init.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].init.body), identity);
    assert.deepEqual(navigated, ["/agents/growth"], "navigation happens exactly once, after confirmed success");
  }

  // Failure: navigate must never be called, and the sanitized server error is surfaced.
  {
    const navigated = [];
    const fetchImpl = async () => new Response(JSON.stringify({ error: "Only the workspace owner or an admin can change scheduled monitoring." }), { status: 403 });
    const result = await activateOperatorAndNavigate({ operatorKey: "growth", identity, href: "/agents/growth", navigate: (href) => navigated.push(href), fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(result.error, "Only the workspace owner or an admin can change scheduled monitoring.");
    assert.deepEqual(navigated, [], "a failed activation must not navigate");
  }

  // Network failure: still no navigation, generic sanitized error.
  {
    const navigated = [];
    const fetchImpl = async () => { throw new Error("network down"); };
    const result = await activateOperatorAndNavigate({ operatorKey: "growth", identity, href: "/agents/growth", navigate: (href) => navigated.push(href), fetchImpl });
    assert.equal(result.ok, false);
    assert.doesNotMatch(result.error, /network down/, "raw error internals must not leak to the client");
    assert.deepEqual(navigated, []);
  }

  // Deactivate uses the deactivate endpoint.
  {
    const calls = [];
    const fetchImpl = async (url) => { calls.push(url); return new Response(JSON.stringify({ ok: true, state: { activated: false, activatedAt: null, updatedAt: null } }), { status: 200 }); };
    await requestOperatorActivation("growth", false, identity, fetchImpl);
    assert.equal(calls[0], "/api/operators/growth/deactivate");
  }
}
console.log("activation-client: mutate-then-navigate sequencing - PASS");

// ===================== 2. run-state-labels.ts: readable state mapping =====================
{
  const { dispatchStateLabel, isActiveDispatchState } = await bundle("./src/lib/operators/run-state-labels.ts", "run-state-labels.mjs");
  assert.equal(dispatchStateLabel("requested"), "Requested");
  assert.equal(dispatchStateLabel("dispatching"), "Dispatching");
  assert.equal(dispatchStateLabel("dispatched"), "Queued");
  assert.equal(dispatchStateLabel("running"), "Running");
  assert.equal(dispatchStateLabel("completed"), "Completed");
  assert.equal(dispatchStateLabel("partial"), "Partially completed");
  assert.equal(dispatchStateLabel("failed"), "Failed");
  assert.equal(dispatchStateLabel("dispatch_failed"), "Failed");
  assert.equal(dispatchStateLabel("recoverable"), "Recovering");
  assert.equal(dispatchStateLabel(null, "blocked"), "Attention required");
  assert.equal(dispatchStateLabel(undefined, "pending"), "Requested");
  assert.equal(isActiveDispatchState("running"), true);
  assert.equal(isActiveDispatchState("completed"), false);
  assert.equal(isActiveDispatchState(null, "running"), true);
  assert.equal(isActiveDispatchState(null, "completed"), false);
}
console.log("run-state-labels: readable lifecycle mapping - PASS");

// ===================== 3. Real activate/deactivate routes: authorization + idempotent persistence =====================
{
  // A minimal in-memory fake for the one table activation.ts touches
  // (os_operator_triggers) plus the read-only os_operator_runs lookup it
  // joins for attention-required/next-eligible derivation.
  function makeFakeSupabase(tables) {
    function from(table) {
      if (!tables[table]) tables[table] = [];
      const filters = [];
      let orderSpec = null; let limitN = null; let upsertValue = null;
      const builder = {
        select() { return builder; },
        eq(col, val) { filters.push([col, val]); return builder; },
        order(col, opts) { orderSpec = { col, ascending: opts?.ascending !== false }; return builder; },
        limit(n) { limitN = n; return builder; },
        upsert(value) { upsertValue = value; return builder; },
        then(resolve) {
          if (upsertValue) {
            const idx = tables[table].findIndex((row) => row.id === upsertValue.id);
            if (idx >= 0) tables[table][idx] = { ...tables[table][idx], ...upsertValue };
            else tables[table].push({ ...upsertValue });
            resolve({ data: null, error: null });
            return;
          }
          let rows = tables[table].filter((row) => filters.every(([col, val]) => row[col] === val));
          if (orderSpec) rows = [...rows].sort((a, b) => (a[orderSpec.col] > b[orderSpec.col] ? -1 : 1) * (orderSpec.ascending ? -1 : 1));
          if (limitN != null) rows = rows.slice(0, limitN);
          resolve({ data: rows, error: null });
        },
        maybeSingle() {
          return new Promise((resolve) => {
            let rows = tables[table].filter((row) => filters.every(([col, val]) => row[col] === val));
            if (orderSpec) rows = [...rows].sort((a, b) => (a[orderSpec.col] > b[orderSpec.col] ? -1 : 1) * (orderSpec.ascending ? -1 : 1));
            if (limitN != null) rows = rows.slice(0, limitN);
            resolve({ data: rows[0] ?? null, error: null });
          });
        },
      };
      return builder;
    }
    return { from };
  }

  let tables; // per-test-case fake table state; auth/readiness outcomes are set directly on globalThis for the stubbed modules

  const plugin = {
    name: "activation-route-stubs",
    setup(build) {
      build.onResolve({ filter: /^next\/server$/ }, () => ({ path: "next/server", namespace: "act-test" }));
      build.onLoad({ filter: /^next\/server$/, namespace: "act-test" }, () => ({ contents: "export const NextResponse = { json: (body, init) => Response.json(body, init) };", loader: "js" }));
      build.onResolve({ filter: /^@\/lib\/os\/workspace$/ }, () => ({ path: "ws-context", namespace: "act-test" }));
      build.onLoad({ filter: /^ws-context$/, namespace: "act-test" }, () => ({ contents: "export async function resolveWorkspaceContext() { return globalThis.__contextResult; }", loader: "js" }));
      build.onResolve({ filter: /^@\/lib\/server\/workspace-access$/ }, () => ({ path: "ws-access", namespace: "act-test" }));
      build.onLoad({ filter: /^ws-access$/, namespace: "act-test" }, () => ({
        contents: `
          export class AuthorizationError extends Error { constructor(code, message, status) { super(message); this.code = code; this.status = status; } }
          export async function requireWorkspaceRoleForIdentity() { if (globalThis.__roleCheckShouldThrow) throw new AuthorizationError("forbidden", "Only the workspace owner or an admin can change scheduled monitoring.", 403); }
        `, loader: "js",
      }));
      build.onResolve({ filter: /^@\/lib\/operators\/readiness$/ }, () => ({ path: "readiness", namespace: "act-test" }));
      build.onLoad({ filter: /^readiness$/, namespace: "act-test" }, () => ({ contents: "export async function getWorkspaceOperatorReadiness() { return globalThis.__readinessResult; }", loader: "js" }));
      build.onResolve({ filter: /^@\/lib\/server\/supabase-admin$/ }, () => ({ path: "supabase-admin", namespace: "act-test" }));
      build.onLoad({ filter: /^supabase-admin$/, namespace: "act-test" }, () => ({ contents: "export function createSupabaseAdmin() { return globalThis.__supabase; } export function hasSupabaseAdminConfig() { return true; }", loader: "js" }));
      build.onResolve({ filter: /^@\/lib\/operators\/logging$/ }, () => ({ path: "operators-logging", namespace: "act-test" }));
      build.onLoad({ filter: /^operators-logging$/, namespace: "act-test" }, () => ({ contents: "export async function recordOperatorUsage() { return { error: null }; }", loader: "js" }));
    },
  };

  const { POST: activatePost } = await bundle("./src/app/api/operators/[operatorKey]/activate/route.ts", "activate-route.mjs", plugin);
  const { POST: deactivatePost } = await bundle("./src/app/api/operators/[operatorKey]/deactivate/route.ts", "deactivate-route.mjs", plugin);

  function setup() {
    tables = { os_operator_triggers: [], os_operator_runs: [] };
    globalThis.__supabase = makeFakeSupabase(tables);
    globalThis.__contextResult = { ok: true, workspaceId: "ws-1", userId: "user-1", userEmail: "owner@example.com", memberEmail: "owner@example.com" };
    globalThis.__roleCheckShouldThrow = false;
    globalThis.__readinessResult = [{ operatorKey: "growth", status: "ready", canRunManual: true, executionEligibility: { eligible: true, status: "eligible", reason: "" } }];
  }

  async function post(handler, body) {
    const response = await handler(new Request("http://test.local/api/operators/growth/activate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ operatorKey: "growth" }) });
    return { response, json: await response.json() };
  }

  // (a) Owner/admin activating a ready operator persists a real row.
  setup();
  {
    const { response, json } = await post(activatePost, { workspaceId: "ws-1", userId: "user-1", userEmail: "owner@example.com" });
    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.state.activated, true);
    assert.equal(tables.os_operator_triggers.length, 1);
    assert.equal(tables.os_operator_triggers[0].enabled, true);
    assert.equal(tables.os_operator_triggers[0].operator_key, "growth");
  }

  // (b) Member cannot activate.
  setup();
  globalThis.__roleCheckShouldThrow = true;
  {
    const { response, json } = await post(activatePost, { workspaceId: "ws-1", userId: "member-1", userEmail: "member@example.com" });
    assert.equal(response.status, 403);
    assert.match(json.error, /owner or an admin/);
    assert.equal(tables.os_operator_triggers.length, 0, "a denied activation must not persist anything");
  }

  // (c) Cross-workspace activation is denied.
  setup();
  globalThis.__contextResult = { ok: false, error: "You do not have access to this workspace.", code: "workspace_forbidden", status: 403 };
  {
    const { response } = await post(activatePost, { workspaceId: "someone-elses-workspace", userId: "user-1", userEmail: "owner@example.com" });
    assert.equal(response.status, 403);
    assert.equal(tables.os_operator_triggers.length, 0);
  }

  // (d) Missing capability cannot activate.
  setup();
  globalThis.__readinessResult = [{ operatorKey: "growth", status: "missing_connector", canRunManual: false, nextSetupStep: "Verify a website before activating Growth.", executionEligibility: { eligible: true, status: "eligible", reason: "" } }];
  {
    const { response, json } = await post(activatePost, { workspaceId: "ws-1", userId: "user-1", userEmail: "owner@example.com" });
    assert.equal(response.status, 409);
    assert.match(json.error, /Verify a website/);
    assert.equal(tables.os_operator_triggers.length, 0);
  }

  // (e) Idempotent double-activate: two successful activations persist exactly one row (upsert, not duplicate insert).
  setup();
  {
    await post(activatePost, { workspaceId: "ws-1", userId: "user-1", userEmail: "owner@example.com" });
    const second = await post(activatePost, { workspaceId: "ws-1", userId: "user-1", userEmail: "owner@example.com" });
    assert.equal(second.response.status, 200);
    assert.equal(tables.os_operator_triggers.length, 1, "activating twice must not create a second row");
  }

  // (f) Deactivate as owner flips the row and is reflected by a subsequent read.
  setup();
  await post(activatePost, { workspaceId: "ws-1", userId: "user-1", userEmail: "owner@example.com" });
  {
    const response = await deactivatePost(new Request("http://test.local/api/operators/growth/deactivate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId: "ws-1", userId: "user-1", userEmail: "owner@example.com" }) }), { params: Promise.resolve({ operatorKey: "growth" }) });
    const json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.state.activated, false);
    assert.equal(tables.os_operator_triggers[0].enabled, false);
  }
}
console.log("activate/deactivate routes: authorization, cross-workspace denial, missing-capability denial, idempotent persistence - PASS");

// ===================== 4. Regression guard: the overview card's activate action must not be a bare Link =====================
{
  const source = fs.readFileSync(path.join(root, "src/app/app/agents/page.tsx"), "utf8");
  const activateBranch = source.match(/action\.kind === "activate" \? \(([\s\S]*?)\) : \(/)?.[1] ?? "";
  assert.match(activateBranch, /onClick=\{\(\) => void onActivate\(\)\}/, "the activate action must call the real mutation handler");
  assert.doesNotMatch(activateBranch, /<Link\b/, "the activate action must not be a bare navigation Link (the original bug: navigating without persisting activation)");
  assert.match(source, /activateOperatorAndNavigate/, "the card must use the shared mutate-then-navigate helper");
}
console.log("agents overview: activate action is a real mutation, not a navigation link - PASS");

console.log("operator-activation-flow-smoke: PASS");

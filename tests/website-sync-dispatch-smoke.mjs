import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-website-sync-dispatch-smoke");
fs.mkdirSync(tmpDir, { recursive: true });

async function bundleRoute() {
  const outfile = path.join(tmpDir, "sync-route.mjs");
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: ["./src/app/api/connectors/website/sync/route.ts"],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    plugins: [{
      name: "website-sync-route-test-stubs",
      setup(build) {
        build.onResolve({ filter: /^next\/server$/ }, () => ({ path: "next/server", namespace: "website-test" }));
        build.onLoad({ filter: /^next\/server$/, namespace: "website-test" }, () => ({ contents: "export const NextResponse = { json: (body, init) => Response.json(body, init) };", loader: "js" }));
        build.onResolve({ filter: /^@\/lib\/connectors\/website-route-auth$/ }, () => ({ path: "website-route-auth", namespace: "website-test" }));
        build.onLoad({ filter: /^website-route-auth$/, namespace: "website-test" }, () => ({ contents: `
          export async function websiteAccess(input) {
            globalThis.__websiteAuthCalls.push(input);
            return { workspaceId: globalThis.__websiteWorkspaceId, supabase: globalThis.__websiteSupabase };
          }
          export async function readWebsiteJson(request) { return request.json(); }
          export function websiteErrorResponse(error) { return Response.json({ error: error?.message ?? String(error) }, { status: error?.status ?? 400 }); }
        `, loader: "js" }));
        build.onResolve({ filter: /^@\/lib\/connectors\/website-sync$/ }, () => ({ path: "website-sync", namespace: "website-test" }));
        build.onLoad({ filter: /^website-sync$/, namespace: "website-test" }, () => ({ contents: `
          export async function getWebsiteSource(input) {
            globalThis.__websiteSourceLookups.push(input);
            return globalThis.__websiteSource;
          }
          export async function createWebsiteCrawlRun(input) {
            globalThis.__websiteRunCalls.push(input);
            if (globalThis.__websiteSource.verification_status !== "verified") throw new Error("Verify the website domain before synchronizing it.");
            return globalThis.__websiteRun;
          }
        `, loader: "js" }));
        build.onResolve({ filter: /^@\/lib\/connectors\/website-dispatch$/ }, () => ({ path: "website-dispatch", namespace: "website-test" }));
        build.onLoad({ filter: /^website-dispatch$/, namespace: "website-test" }, () => ({ contents: `
          export async function dispatchWebsiteCrawlRun(input) {
            globalThis.__websiteDispatchCalls.push(input);
            return { runId: input.runId, accepted: true, reused: Boolean(globalThis.__websiteRun.reused), dispatchStatus: "dispatched", providerRunId: "provider-1" };
          }
        `, loader: "js" }));
        build.onResolve({ filter: /^@\/trigger\/website-sync-run$/ }, () => ({ path: "website-sync-run", namespace: "website-test" }));
        build.onLoad({ filter: /^website-sync-run$/, namespace: "website-test" }, () => ({ contents: "export const websiteSyncRun = { trigger: async (...args) => { globalThis.__websiteTriggerCalls.push(args); } };", loader: "js" }));
        build.onResolve({ filter: /^@\/lib\/server\/request-guards$/ }, () => ({ path: "request-guards", namespace: "website-test" }));
        build.onLoad({ filter: /^request-guards$/, namespace: "website-test" }, () => ({ contents: "export function allowRateLimit() { return true; } export function clientAddress() { return 'test-client'; }", loader: "js" }));
      },
    }],
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
}

async function bundleClientHelper() {
  const outfile = path.join(tmpDir, "website-setup.mjs");
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: ["./src/components/connectors/website-setup.tsx"],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    alias: { "@": path.join(root, "src") },
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
}

const { POST } = await bundleRoute();

function setup(source = { id: "source-1", verification_status: "verified" }, run = { runId: "run-1", reused: false }) {
  globalThis.__websiteWorkspaceId = "workspace-1";
  globalThis.__websiteSource = source;
  globalThis.__websiteRun = run;
  globalThis.__websiteSupabase = {};
  globalThis.__websiteAuthCalls = [];
  globalThis.__websiteSourceLookups = [];
  globalThis.__websiteRunCalls = [];
  globalThis.__websiteDispatchCalls = [];
  globalThis.__websiteTriggerCalls = [];
}

async function post(body) {
  const response = await POST(new Request("http://test.local/api/connectors/website/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { response, json: await response.json() };
}

setup();
const first = await post({ workspaceId: "workspace-1", sourceId: "source-1" });
assert.equal(first.response.status, 202);
assert.equal(first.json.state, "dispatched");
assert.equal(globalThis.__websiteAuthCalls.length, 1);
assert.equal(globalThis.__websiteAuthCalls[0].admin, true);
assert.equal(globalThis.__websiteRunCalls.length, 1);
assert.deepEqual(globalThis.__websiteRunCalls[0], { workspaceId: "workspace-1", sourceId: "source-1", triggerType: "manual", supabase: globalThis.__websiteSupabase });
assert.equal(globalThis.__websiteDispatchCalls.length, 1);
assert.deepEqual(globalThis.__websiteDispatchCalls[0], { runId: "run-1", force: true, supabase: globalThis.__websiteSupabase });

setup();
const fetchCalls = [];
const syncModuleSource = fs.readFileSync(path.join(root, "src/components/connectors/website-setup.tsx"), "utf8");
assert.match(syncModuleSource, /export async function requestWebsiteSync/);
assert.match(syncModuleSource, /fetchImpl\("\/api\/connectors\/website\/sync"/);
assert.match(syncModuleSource, /sourceId: input\.sourceId/);
assert.match(syncModuleSource, /credentials: "same-origin"/);
assert.match(syncModuleSource, /type="button" className=\"btn btn-primary btn-sm\" onClick=\{\(\) => void sync\(\)\}/);
assert.match(syncModuleSource, /disabled=\{working \|\| syncPending\}/);
assert.doesNotMatch(syncModuleSource, /body: JSON\.stringify\(\{ workspaceId, action: "sync" \}\)/);
assert.match(syncModuleSource, /Sync website now/);
assert.match(syncModuleSource, /Starting sync…/);
assert.match(syncModuleSource, /Sync accepted by the worker queue\./);
assert.match(syncModuleSource, /role="status"/);
assert.match(syncModuleSource, /source\.verificationStatus === "verified"/);
assert.doesNotMatch(syncModuleSource, /disabled=\{working \|\| !source\.syncEnabled\}/, "manual sync must not depend on the periodic sync toggle");
assert.match(syncModuleSource, /type="button" className=\"btn btn-danger btn-sm\"/);
assert.doesNotMatch(syncModuleSource, /<form/);
const syncBlock = syncModuleSource.match(/const sync = async \(\) => \{([\s\S]*?)\n  \};/)?.[1] ?? "";
assert.doesNotMatch(syncBlock, /window\.location\.reload|router\.(refresh|replace)|setOpen\(false\)/, "successful sync must not reload the page or close the connector modal");
const { requestWebsiteSync } = await bundleClientHelper();
const success = await requestWebsiteSync({ workspaceId: "workspace-1", sourceId: "source-1", fetchImpl: async (url, init) => {
  fetchCalls.push({ url, init });
  return new Response(JSON.stringify({ ok: true, runId: "run-1", reused: false, state: "queued" }), { status: 202, headers: { "content-type": "application/json" } });
} });
assert.equal(success.state, "queued");
assert.equal(fetchCalls.length, 1, "one sync click must produce one POST");
assert.equal(fetchCalls[0].url, "/api/connectors/website/sync");
assert.equal(fetchCalls[0].init.method, "POST");
assert.equal(fetchCalls[0].init.credentials, "same-origin");
assert.deepEqual(JSON.parse(fetchCalls[0].init.body), { workspaceId: "workspace-1", sourceId: "source-1" });
await assert.rejects(() => requestWebsiteSync({ workspaceId: "workspace-1", sourceId: "source-1", fetchImpl: async () => new Response(JSON.stringify({ error: "safe server message", code: "RUN_NOT_READY" }), { status: 409, headers: { "content-type": "application/json" } }) }), /RUN_NOT_READY: safe server message/);

setup({ id: "source-1", verification_status: "pending" });
const blocked = await post({ workspaceId: "workspace-1", sourceId: "source-1" });
assert.equal(blocked.response.status, 400);
assert.equal(globalThis.__websiteTriggerCalls.length, 0, "an unverified source must not dispatch a task");

setup({ id: "source-1", verification_status: "verified" }, { runId: "run-2", reused: true });
const reused = await post({ workspaceId: "workspace-1", sourceId: "source-1" });
assert.equal(reused.response.status, 202);
assert.equal(reused.json.state, "dispatched");

console.log("Website sync dispatch contracts passed: canonical source-scoped route, admin authorization, run reuse, Trigger dispatch, and client wiring safeguards.");

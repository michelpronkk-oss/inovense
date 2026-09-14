import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";

const root = process.cwd();
const adminId = "11111111-1111-4111-8111-111111111111";
const historicalId = "44444444-4444-4444-8444-444444444444";
const workspaceId = "workspace-demo";
const reviewerId = "22222222-2222-4222-8222-222222222222";
const inviteId = "33333333-3333-4333-8333-333333333333";
let inviteRecord = null;
const screenshotDirectory = process.env.ADMIN_EA_SCREENSHOT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), "auterim-admin-review-"));
fs.mkdirSync(screenshotDirectory, { recursive: true });

const applicant = {
  id: adminId, created_at: "2026-09-12T10:20:00.000Z", updated_at: "2026-09-12T10:20:00.000Z",
  name: "Maya Chen", email: "maya@northstar.example", company: "Northstar Studio", role: "COO",
  team_size: "21–50", use_case: "Coordinate client onboarding, follow up on open deals, and give our small operations team a reliable view of work across customer projects.",
  status: "requested", source: "homepage", source_path: "/", referrer: "https://x.com/founder",
  utm_source: "x", utm_medium: "founder", utm_campaign: "early_access", utm_content: "founder_post_1", utm_term: "operations",
  interested_plan: "workforce", confirmation_sent_at: "2026-09-12T10:21:00.000Z", confirmation_attempted_at: "2026-09-12T10:21:00.000Z",
  reviewed_at: null, reviewed_by: null, notes: null,
};
let requestRecord = applicant;
let cascadeDeletedInviteCount = 0;
const deleteTables = [];
const workspace = { id: workspaceId, name: "Northstar Studio", plan: "workforce", plan_tier: "workforce", billing_status: "trialing", trial_ends_at: "2030-01-01T00:00:00.000Z", created_at: "2026-08-20T12:00:00.000Z", updated_at: "2026-09-12T10:00:00.000Z" };
const trial = { workspace_id: workspaceId, trial_status: "active", trial_ends_at: workspace.trial_ends_at };
const connector = { id: "connector-demo", workspace_id: workspaceId, connector_key: "google_drive", name: "Google Drive", connected: true, status: "healthy" };
const operatorRun = { id: "run-demo", workspace_id: workspaceId, operator_key: "operations", status: "completed", created_at: "2026-09-12T10:00:00.000Z" };
const admin = { user_id: reviewerId, email: "founder@auterim.com", role: "super_admin", is_active: true };
const authUser = { id: reviewerId, email: "founder@auterim.com", aud: "authenticated", role: "authenticated", created_at: "2026-01-01T00:00:00.000Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {} };

function parseSimpleFilter(value) {
  if (!value) return null;
  if (value.startsWith("eq.")) return ["eq", value.slice(3)];
  if (value.startsWith("neq.")) return ["neq", value.slice(4)];
  if (value.startsWith("is.")) return ["is", value.slice(3)];
  if (value.startsWith("not.is.")) return ["not.is", value.slice(7)];
  if (value.startsWith("gte.")) return ["gte", value.slice(4)];
  if (value.startsWith("gt.")) return ["gt", value.slice(3)];
  if (value.startsWith("lte.")) return ["lte", value.slice(4)];
  if (value.startsWith("lt.")) return ["lt", value.slice(3)];
  if (value.startsWith("ilike.")) return ["ilike", value.slice(6).replace(/^%|%$/g, "").toLowerCase()];
  if (value.startsWith("in.(") && value.endsWith(")")) return ["in", value.slice(4, -1).split(",")];
  return null;
}

function rowsFor(table) {
  if (table === "os_internal_admins") return [admin];
  if (table === "os_early_access_requests") return requestRecord ? [requestRecord] : [];
  if (table === "os_early_access_invites") return inviteRecord ? [inviteRecord] : [];
  if (table === "os_workspaces") return [workspace];
  if (table === "os_trial_entitlements") return [trial];
  if (table === "os_operator_triggers") return [{ workspace_id: workspaceId, operator_key: "operations", enabled: true, trigger_type: "operator_activation" }];
  if (table === "os_connectors") return [connector];
  if (table === "os_operator_runs") return [operatorRun];
  if (table === "os_workspace_members") return [{ workspace_id: workspaceId, email: "owner@northstar.example", full_name: "Maya Chen", role_key: "owner", active: true, status: "online" }];
  if (table === "os_billing_subscriptions" || table === "os_billing_events" || table === "os_approvals" || table === "activity_events" || table === "traffic_sessions") return [];
  return [];
}

function filterRows(table, url) {
  let items = rowsFor(table);
  for (const [key, filterValue] of url.searchParams.entries()) {
    if (["select", "or", "order", "offset", "limit"].includes(key)) continue;
    const parsed = parseSimpleFilter(filterValue);
    if (!parsed) continue;
    const [operation, filter] = parsed;
    if (operation === "eq") items = items.filter((item) => String(item[key] ?? "") === filter);
    if (operation === "neq") items = items.filter((item) => String(item[key] ?? "") !== filter);
    if (operation === "is") items = items.filter((item) => filter === "null" ? item[key] === null || item[key] === undefined : String(item[key]) === filter);
    if (operation === "not.is") items = items.filter((item) => filter === "null" ? item[key] !== null && item[key] !== undefined : String(item[key]) !== filter);
    if (operation === "gte") items = items.filter((item) => String(item[key] ?? "") >= filter);
    if (operation === "gt") items = items.filter((item) => String(item[key] ?? "") > filter);
    if (operation === "lte") items = items.filter((item) => String(item[key] ?? "") <= filter);
    if (operation === "lt") items = items.filter((item) => String(item[key] ?? "") < filter);
    if (operation === "ilike") items = items.filter((item) => String(item[key] ?? "").toLowerCase().includes(filter));
    if (operation === "in") items = items.filter((item) => filter.includes(String(item[key] ?? "")));
  }
  return items;
}

const mockSupabase = createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  response.setHeader("content-type", "application/json; charset=utf-8");
  if (url.pathname === "/auth/v1/user") {
    if (request.headers.authorization !== "Bearer local-browser-smoke-token") {
      response.writeHead(401);
      response.end(JSON.stringify({ message: "Invalid local test session" }));
    } else {
      response.writeHead(200);
      response.end(JSON.stringify(authUser));
    }
    return;
  }
  if (!url.pathname.startsWith("/rest/v1/")) {
    response.writeHead(404);
    response.end(JSON.stringify({ message: "mock route not found" }));
    return;
  }
  const table = url.pathname.slice("/rest/v1/".length);
  const rows = filterRows(table, url);
  const range = request.headers.range;
  const bounds = range?.match(/^(\d+)-(\d+)$/);
  const pageRows = bounds ? rows.slice(Number(bounds[1]), Number(bounds[2]) + 1) : rows;
  response.setHeader("content-range", rows.length ? `0-${rows.length - 1}/${rows.length}` : "*/0");
  if (request.method === "HEAD") {
    response.writeHead(200);
    response.end();
    return;
  }
  const objectResponse = String(request.headers.accept || "").includes("vnd.pgrst.object+json");
  if (request.method === "DELETE") {
    deleteTables.push(table);
    if (table === "os_early_access_requests" && rows[0]) {
      requestRecord = null;
      if (inviteRecord?.request_id === adminId) {
        inviteRecord = null;
        cascadeDeletedInviteCount += 1;
      }
    }
    const deleted = rows[0] ?? null;
    response.writeHead(200);
    response.end(JSON.stringify(objectResponse ? deleted : deleted ? [deleted] : []));
    return;
  }
  response.writeHead(200);
  response.end(JSON.stringify(objectResponse ? pageRows[0] ?? null : pageRows));
});

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function base64url(value) { return Buffer.from(value).toString("base64url"); }

async function waitForServer(url, processOutput) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { headers: { "x-forwarded-host": "admin.auterim.com" } });
      if (response.status > 0) return;
    } catch { /* Wait for Next.js to bind and compile the route. */ }
    if (processOutput.child.exitCode !== null) throw new Error(`Local Next server exited early.\n${processOutput.logs.join("")}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Local Next server did not become ready.\n${processOutput.logs.join("")}`);
}

let appProcess;
let browser;
try {
  await new Promise((resolve, reject) => mockSupabase.listen(0, "127.0.0.1", (error) => error ? reject(error) : resolve()));
  const mockPort = mockSupabase.address().port;
  const appPort = await freePort();
  const appUrl = `http://127.0.0.1:${appPort}`;
  const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const logs = [];
  appProcess = spawn(process.execPath, [nextCli, "dev", "--hostname", "127.0.0.1", "--port", String(appPort)], {
    cwd: root,
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mockPort}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-browser-smoke-anon", SUPABASE_SERVICE_ROLE_KEY: "local-browser-smoke-service" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  appProcess.stdout.on("data", (chunk) => logs.push(String(chunk)));
  appProcess.stderr.on("data", (chunk) => logs.push(String(chunk)));
  await waitForServer(appUrl, { child: appProcess, logs });

  browser = await chromium.launch({ headless: true });
  const anonymousContext = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-host": "admin.auterim.com" } });
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto(`${appUrl}/early-access`, { waitUntil: "networkidle" });
  assert.equal(new URL(anonymousPage.url()).pathname, "/login", "admin routes redirect unauthenticated visitors to the internal login page");
  await anonymousContext.close();

  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-host": "admin.auterim.com" } });
  const session = { access_token: "local-browser-smoke-token", refresh_token: "local-browser-smoke-refresh", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 };
  await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${base64url(JSON.stringify(session))}`, url: appUrl, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push(message.text()); });
  const screenshot = (file) => page.screenshot({ path: path.join(screenshotDirectory, file), fullPage: true, style: "nextjs-portal { display: none !important; }" });
  const viewports = [[1440, 900], [1024, 1366], [768, 1024], [430, 932]];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto(`${appUrl}/`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Founder command center." }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overview has no page overflow at ${width}`);
    await screenshot(`admin-${width}x${height}.png`);

    await page.goto(`${appUrl}/early-access`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Applicant review." }).waitFor();
    await page.getByRole("link", { name: /Maya Chen/ }).first().waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Early Access list has no page overflow at ${width}`);
    assert.equal(await page.locator(".ea-mobile-list").evaluate((element) => getComputedStyle(element).display === "grid"), width <= 820, `Early Access layout adapts at ${width}`);
    await screenshot(`early-access-${width}x${height}.png`);

    await page.goto(`${appUrl}/early-access/${adminId}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Maya Chen" }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Early Access detail has no page overflow at ${width}`);
    await screenshot(`early-access-detail-${width}x${height}.png`);

    await page.goto(`${appUrl}/customers`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Workspace state." }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `workspace view has no page overflow at ${width}`);
    assert.equal(await page.locator(".workspace-mobile-list").evaluate((element) => getComputedStyle(element).display === "grid"), width <= 820, `workspace layout adapts at ${width}`);
    await screenshot(`workspaces-${width}x${height}.png`);
  }
  applicant.status = "reviewing";
  await page.goto(`${appUrl}/early-access/${adminId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Approve & send invite" }).waitFor();
  await screenshot("early-access-detail-reviewing.png");

  applicant.status = "invited";
  inviteRecord = { id: inviteId, request_id: adminId, delivery_state: "sent", created_at: "2026-09-13T10:00:00.000Z", expires_at: "2026-09-20T10:00:00.000Z", last_attempted_at: "2026-09-13T10:00:00.000Z", last_sent_at: "2026-09-13T10:01:00.000Z", error_code: null, accepted_at: null, revoked_at: null, accepted_user_id: null, accepted_workspace_id: null };
  await page.goto(`${appUrl}/early-access/${adminId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Resend invite" }).waitFor();
  await page.getByRole("button", { name: "Revoke invite" }).waitFor();
  await screenshot("early-access-detail-invited.png");

  applicant.status = "accepted";
  inviteRecord.accepted_at = "2026-09-14T10:00:00.000Z";
  inviteRecord.accepted_user_id = reviewerId;
  inviteRecord.accepted_workspace_id = workspaceId;
  await page.goto(`${appUrl}/early-access/${adminId}`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Open workspace in admin ↗" }).waitFor();
  assert.match(await page.locator(".ea-invite-control").innerText(), /verified at acceptance/);
  await screenshot("early-access-detail-accepted.png");
  await page.getByRole("button", { name: "Delete request" }).click();
  const deleteDialog = page.getByRole("dialog");
  await deleteDialog.getByRole("heading", { name: "Delete maya@northstar.example?" }).waitFor();
  assert.match(await deleteDialog.innerText(), /accounts, workspaces, memberships, billing, and trials are not deleted/i);
  assert.match(await page.locator(".ea-danger-note").innerText(), /workspace.*membership untouched/i);
  await screenshot("early-access-delete-confirmation.png");
  await deleteDialog.getByRole("button", { name: "Cancel" }).click();
  assert.equal(deleteTables.length, 0, "opening and cancelling the confirmation never deletes a request");

  await page.getByRole("button", { name: "Delete request" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
  await page.waitForURL((url) => url.pathname === "/early-access" && url.searchParams.get("result") === "deleted");
  await page.getByRole("status").getByText(/request and invite history deleted/i).waitFor();
  assert.deepEqual(deleteTables, ["os_early_access_requests"], "the delete action removes only the request; the database cascade clears its invite");
  assert.equal(cascadeDeletedInviteCount, 1, "request deletion cascades its invite history");
  assert.equal(requestRecord, null);
  assert.equal(inviteRecord, null);
  await page.goto(`${appUrl}/customers`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Workspace state." }).waitFor();
  assert.equal((await page.locator(".workspace-mobile-card, .workspace-table tbody tr").count()) > 0, true, "the existing workspace remains after request deletion");
  assert.equal((await page.getByText("Maya Chen", { exact: true }).count()) > 0, true, "the existing workspace owner membership remains after request deletion");

  requestRecord = { ...applicant, id: historicalId, name: "Legacy Applicant", email: "legacy@example.com", status: "accepted" };
  await page.goto(`${appUrl}/early-access/${historicalId}`, { waitUntil: "networkidle" });
  await page.getByText("This historical record was marked accepted before verified invite acceptance was implemented. No accepted user or workspace is recorded.").waitFor();
  await page.getByRole("button", { name: "Delete request" }).click();
  await page.getByRole("dialog").getByRole("heading", { name: "Delete legacy@example.com?" }).waitFor();
  await page.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
  await page.waitForURL((url) => url.pathname === "/early-access" && url.searchParams.get("result") === "deleted");
  assert.deepEqual(deleteTables, ["os_early_access_requests", "os_early_access_requests"], "historical accepted requests are deletable through the same admin-only parent-row action");
  assert.equal(cascadeDeletedInviteCount, 1, "the verified accepted request's invite was cascaded; the historical row had no fabricated invite");
  assert.equal(requestRecord, null);
  await page.goto(`${appUrl}/customers`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Workspace state." }).waitFor();
  assert.equal((await page.locator(".workspace-mobile-card, .workspace-table tbody tr").count()) > 0, true, "historical-record deletion also leaves existing workspaces intact");
  assert.match(await page.locator("body").innerText(), /Trial active/);
  assert.match(await page.locator("body").innerText(), /subscription\s+none/i);
  assert.deepEqual(pageErrors, [], `browser console errors: ${pageErrors.join(" | ")}`);
  const serverIssueLines = logs.filter((line) => /\b(error|issue)\b/i.test(line));
  console.log(JSON.stringify({ viewports, routes: ["/", "/early-access", "/early-access/[id]", "/customers"], detailStates: ["reviewing", "invited", "accepted", "accepted-legacy"], deleteTables, cascadedInvites: cascadeDeletedInviteCount, screenshotDirectory, browserErrors: pageErrors, serverIssueLines, result: "anonymous access redirected; accepted and historical accepted records can be deleted with confirmation; invite history cascades and workspace data remains intact" }, null, 2));
} catch (error) {
  console.error(error);
  throw error;
} finally {
  await browser?.close().catch(() => {});
  if (appProcess && appProcess.exitCode === null) {
    appProcess.kill();
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  await new Promise((resolve) => mockSupabase.close(resolve));
}

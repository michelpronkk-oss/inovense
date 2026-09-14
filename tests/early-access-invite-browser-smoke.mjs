import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";
import esbuild from "esbuild";

const root = process.cwd();
const screenshotDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-ea-invite-browser-"));
const requestId = "33333333-3333-4333-8333-333333333333";
const inviteId = "44444444-4444-4444-8444-444444444444";
const workspaceId = "workspace-accepted-demo";
const tokenValues = { valid: "A".repeat(43), expired: "B".repeat(43), revoked: "C".repeat(43), accepted: "D".repeat(43) };
const hashes = Object.fromEntries(Object.entries(tokenValues).map(([key, value]) => [key, crypto.createHash("sha256").update(value).digest("hex")]));
const mockRequests = [];
let acceptedByMock = false;
let acceptanceRpcCount = 0;
let provisionCallsWithinAcceptance = 0;
const applicants = {
  valid: { id: inviteId, request_id: requestId, email_normalized: "maya@northstar.example", delivery_state: "sent", expires_at: "2036-09-20T12:00:00.000Z", last_sent_at: "2036-09-13T12:00:00.000Z", accepted_at: null, revoked_at: null, accepted_user_id: null, accepted_workspace_id: null },
  expired: { id: inviteId, request_id: requestId, email_normalized: "maya@northstar.example", delivery_state: "sent", expires_at: "2020-01-01T00:00:00.000Z", last_sent_at: "2019-12-25T00:00:00.000Z", accepted_at: null, revoked_at: null, accepted_user_id: null, accepted_workspace_id: null },
  revoked: { id: inviteId, request_id: requestId, email_normalized: "maya@northstar.example", delivery_state: "sent", expires_at: "2036-09-20T12:00:00.000Z", last_sent_at: "2036-09-13T12:00:00.000Z", accepted_at: null, revoked_at: "2036-09-14T12:00:00.000Z", accepted_user_id: null, accepted_workspace_id: null },
  accepted: { id: inviteId, request_id: requestId, email_normalized: "maya@northstar.example", delivery_state: "sent", expires_at: "2036-09-20T12:00:00.000Z", last_sent_at: "2036-09-13T12:00:00.000Z", accepted_at: "2036-09-14T12:00:00.000Z", revoked_at: null, accepted_user_id: "66666666-6666-4666-8666-666666666666", accepted_workspace_id: workspaceId },
};

function responseJson(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

function readBody(request) {
  return new Promise((resolve) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function responseRows(request, response, rows) {
  response.setHeader("content-range", rows.length ? `0-${rows.length - 1}/${rows.length}` : "*/0");
  if (request.method === "HEAD") { response.writeHead(200); return response.end(); }
  const objectResponse = String(request.headers.accept || "").includes("vnd.pgrst.object+json");
  return responseJson(response, 200, objectResponse ? rows[0] ?? null : rows);
}

const mockSupabase = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  if (url.pathname === "/auth/v1/user") {
    const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!bearer || bearer === "local-invalid-token") return responseJson(response, 401, { message: "Invalid session" });
    const email = bearer === "local-other-token" ? "other@example.com" : "maya@northstar.example";
    return responseJson(response, 200, { id: "55555555-5555-4555-8555-555555555555", email, email_confirmed_at: bearer === "local-unverified-token" ? null : "2036-01-01T00:00:00.000Z", aud: "authenticated", role: "authenticated", user_metadata: { full_name: "Maya Chen" } });
  }
  if (!url.pathname.startsWith("/rest/v1/")) return responseJson(response, 404, { message: "Unknown mock route" });
  const table = url.pathname.slice("/rest/v1/".length);
  mockRequests.push({ table, query: Object.fromEntries(url.searchParams.entries()) });
  if (table === "rpc/accept_early_access_invite") {
    const payload = JSON.parse(await readBody(request) || "{}");
    const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (bearer !== "local-maya-token" || payload.p_token !== tokenValues.valid) return responseJson(response, 400, { message: "Invite is not valid for this test session" });
    if (!acceptedByMock) provisionCallsWithinAcceptance += 1;
    acceptedByMock = true;
    acceptanceRpcCount += 1;
    return responseJson(response, 200, [{ workspace_id: workspaceId, workspace_name: "Northstar Studio", created: provisionCallsWithinAcceptance === 1, already_accepted: acceptanceRpcCount > 1 }]);
  }
  if (table === "rpc/provision_initial_workspace") {
    return responseJson(response, 200, [{ workspace_id: workspaceId, workspace_name: "Northstar Studio", role_key: "owner", onboarding_completed_at: null, created: false }]);
  }
  const hash = url.searchParams.get("token_hash")?.replace(/^eq\./, "");
  if (table === "os_early_access_invites") {
    const acceptedUserId = url.searchParams.get("accepted_user_id")?.replace(/^eq\./, "");
    if (acceptedByMock && acceptedUserId === "55555555-5555-4555-8555-555555555555") return responseRows(request, response, [{ id: inviteId }]);
    const state = Object.entries(hashes).find(([, value]) => value === hash)?.[0];
    const invite = state === "valid" && acceptedByMock
      ? { ...applicants.valid, accepted_at: "2036-09-14T12:00:00.000Z", accepted_user_id: "55555555-5555-4555-8555-555555555555", accepted_workspace_id: workspaceId }
      : state ? applicants[state] : null;
    if (!invite) return responseRows(request, response, []);
    return responseRows(request, response, [invite]);
  }
  if (table === "os_early_access_requests") {
    const matchedId = url.searchParams.get("id")?.replace(/^eq\./, "");
    const matched = matchedId === requestId;
    const row = { id: requestId, name: "Maya Chen", company: "Northstar Studio", status: acceptedByMock ? "accepted" : "invited", email_normalized: "maya@northstar.example" };
    return responseRows(request, response, matched ? [row] : []);
  }
  if (table === "os_workspace_members") {
    const userId = url.searchParams.get("user_id")?.replace(/^eq\./, "");
    const rows = acceptedByMock && userId === "55555555-5555-4555-8555-555555555555"
      ? [{ workspace_id: workspaceId, role_key: "owner", role: "owner", status: "active", active: true, created_at: "2036-09-14T12:00:00.000Z" }]
      : [];
    return responseRows(request, response, rows);
  }
  if (table === "os_workspaces") {
    const matched = url.searchParams.get("id")?.replace(/^eq\./, "") === workspaceId;
    return responseRows(request, response, matched ? [{ id: workspaceId, name: "Northstar Studio", onboarding_completed_at: null, onboarding_data: {} }] : []);
  }
  if (table === "os_user_profiles") {
    const userId = url.searchParams.get("user_id")?.replace(/^eq\./, "");
    const rows = acceptedByMock && userId === "55555555-5555-4555-8555-555555555555"
      ? [{ full_name: "Maya Chen", last_active_workspace_id: workspaceId }]
      : [];
    return responseRows(request, response, rows);
  }
  return responseRows(request, response, []);
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
async function waitForServer(url, child, logs) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { headers: { "x-forwarded-host": "app.auterim.com" } });
      if (child.exitCode !== null) throw new Error(`Next.js exited early:\n${logs.join("")}`);
      return;
    } catch {
      if (child.exitCode !== null) throw new Error(`Next.js exited early:\n${logs.join("")}`);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw new Error(`Next.js did not start:\n${logs.join("")}`);
}

let appProcess;
let browser;
try {
  await new Promise((resolve, reject) => mockSupabase.listen(0, "127.0.0.1", (error) => error ? reject(error) : resolve()));
  const mockPort = mockSupabase.address().port;
  const appPort = await freePort();
  // Keep the hostname identical across the token URL and its clean redirect
  // so the host-only invite cookie is actually sent to the acceptance page.
  const appUrl = `http://localhost:${appPort}`;
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
  await waitForServer(appUrl, appProcess, logs);
  browser = await chromium.launch({ headless: true });

  const cases = [
    { width: 1440, height: 900, state: "valid", token: tokenValues.valid, session: null, heading: "You’re invited to Auterim.", text: /Create an account/, label: "signed-out" },
    { width: 430, height: 932, state: "valid", token: tokenValues.valid, session: "local-maya-token", heading: "You’re invited to Auterim.", text: /Set up your workspace/, label: "matching-verified" },
    { width: 390, height: 844, state: "valid", token: tokenValues.valid, session: "local-other-token", heading: "You’re invited to Auterim.", text: /This invite was issued to a different email address\./, label: "wrong-email" },
    { width: 430, height: 932, state: "valid", token: tokenValues.valid, session: "local-unverified-token", heading: "You’re invited to Auterim.", text: /Verify your email address before accepting this invite\./, label: "unverified-email" },
    { width: 390, height: 844, state: "expired", token: tokenValues.expired, session: null, heading: "You’re invited to Auterim.", text: /This invite has expired\./, label: "expired" },
    { width: 430, height: 932, state: "revoked", token: tokenValues.revoked, session: null, heading: "You’re invited to Auterim.", text: /This invite is no longer active\./, label: "revoked" },
    { width: 390, height: 844, state: "accepted", token: tokenValues.accepted, session: "local-other-token", heading: "You’re invited to Auterim.", text: /This invite has already been accepted\./, label: "already-accepted" },
  ];
  const screenshots = [];
  const browserRequests = [];
  for (const item of cases) {
    const context = await browser.newContext({ viewport: { width: item.width, height: item.height }, extraHTTPHeaders: { "x-forwarded-host": "app.auterim.com" } });
    await context.addInitScript(() => localStorage.setItem("auterim_cookie_consent", "accepted"));
    if (item.session) {
      const session = { access_token: item.session, refresh_token: "local-refresh-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 };
      await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${base64url(JSON.stringify(session))}`, url: appUrl, httpOnly: true, sameSite: "Lax" }]);
    }
    const page = await context.newPage();
    const errors = [];
    const analyticsUrls = [];
    page.on("request", (request) => { if (/early-access\/accept/.test(request.url())) browserRequests.push({ url: request.url(), method: request.method() }); });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (/google-analytics|googletagmanager|gtag|\/api\/traffic\/hit/i.test(request.url())) analyticsUrls.push(request.url());
    });
    await page.goto(`${appUrl}/early-access/accept?token=${item.token}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: item.heading }).waitFor();
    const bodyText = await page.locator("body").innerText();
    assert.match(bodyText, item.text, `${item.label} acceptance view content; url=${page.url()}; cookies=${JSON.stringify((await context.cookies()).map(({ name, path }) => ({ name, path })))}; routes=${JSON.stringify(browserRequests)}; logs=${logs.slice(-25).join("")}`);
    assert.equal(new URL(page.url()).searchParams.has("token"), false, `${item.label} URL has no bearer token after redirect`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${item.label} has no horizontal overflow at ${item.width}px`);
    assert.deepEqual(analyticsUrls, [], `${item.label} route sends no third-party analytics or attribution request`);
    assert.deepEqual(errors, [], `${item.label} browser errors`);
    if (item.label === "matching-verified") assert.equal(await page.getByRole("button", { name: "Set up your workspace" }).count(), 1);
    if (item.label === "wrong-email") {
      assert.equal(await page.getByRole("button", { name: "Set up your workspace" }).count(), 0);
      assert.equal(await page.getByRole("button", { name: "Switch account" }).count(), 1, "wrong-email applicants can sign out and resume the same invite");
    }
    if (item.label === "signed-out") {
      const inviteCookie = (await context.cookies()).find((cookie) => cookie.name === "auterim_ea_invite");
      assert.ok(inviteCookie?.httpOnly, "invite bearer is held only in an HttpOnly cookie after redirect");
      assert.equal(inviteCookie?.path, "/early-access/accept");
      assert.equal(await page.evaluate(() => document.referrer), "", "the token URL is not forwarded as a referrer");
      await page.getByRole("link", { name: "Sign in" }).click();
      await page.getByRole("heading", { name: "Sign in" }).waitFor();
      assert.equal(new URL(page.url()).searchParams.has("token"), false, "login scrubs the invite token from browser history");
      const registerLink = await page.getByRole("link", { name: "Create one" }).getAttribute("href");
      assert.equal(new URL(registerLink, page.url()).searchParams.get("from"), `/early-access/accept?token=${tokenValues.valid}`, "login keeps the invite destination for registration");
      await page.getByRole("link", { name: "Create one" }).click();
      await page.getByRole("heading", { name: "Create your account" }).waitFor();
      assert.equal(new URL(page.url()).searchParams.has("token"), false, "registration scrubs the invite token from browser history");
      const signInLink = await page.getByRole("link", { name: "Sign in" }).getAttribute("href");
      assert.equal(new URL(signInLink, page.url()).searchParams.get("from"), `/early-access/accept?token=${tokenValues.valid}`, "registration keeps the invite destination for sign-in and email verification");
    }
    const screenshot = path.join(screenshotDirectory, `${item.label}-${item.width}x${item.height}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    screenshots.push(screenshot);
    await context.close();
  }
  assert.equal(mockRequests.some((entry) => entry.table === "rpc/provision_initial_workspace"), false, "opening or previewing an invitation never provisions a workspace");
  assert.equal(mockRequests.some((entry) => entry.table.startsWith("rpc/") && entry.table !== "rpc/provision_initial_workspace"), false, "rendering the public acceptance states never mutates database state");

  const acceptanceContext = await browser.newContext({ viewport: { width: 430, height: 932 }, extraHTTPHeaders: { "x-forwarded-host": "app.auterim.com" } });
  await acceptanceContext.addCookies([{ name: "sb-127-auth-token", value: `base64-${base64url(JSON.stringify({ access_token: "local-maya-token", refresh_token: "local-refresh-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 }))}`, url: appUrl, httpOnly: true, sameSite: "Lax" }]);
  const acceptancePage = await acceptanceContext.newPage();
  const trialStartCalls = [];
  acceptancePage.on("request", (request) => { if (/\/api\/billing\/trial\/start/.test(request.url())) trialStartCalls.push(request.url()); });
  await acceptancePage.goto(`${appUrl}/early-access/accept?token=${tokenValues.valid}`, { waitUntil: "networkidle" });
  await acceptancePage.getByRole("button", { name: "Set up your workspace" }).click();
  await acceptancePage.waitForURL((url) => url.pathname === "/onboarding", { timeout: 30_000 });
  await acceptancePage.getByRole("heading", { name: "Welcome to Auterim." }).waitFor({ timeout: 30_000 });
  assert.equal(acceptanceRpcCount, 1, "the accept action submits once to the atomic acceptance RPC");
  assert.equal(provisionCallsWithinAcceptance, 1, "acceptance provisions through the canonical workspace function exactly once");
  assert.equal(mockRequests.some((entry) => entry.table === "rpc/provision_initial_workspace"), false, "the app gateway finds the owner workspace created by acceptance instead of provisioning again");
  assert.deepEqual(trialStartCalls, [], "acceptance and onboarding never start a trial");
  assert.equal((await acceptanceContext.cookies()).some((cookie) => cookie.name === "auterim_ea_invite"), false, "successful acceptance clears the invite cookie");
  assert.equal(await acceptancePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "post-accept onboarding fits the mobile viewport");
  const onboardingScreenshot = path.join(screenshotDirectory, "post-accept-onboarding-430x932.png");
  await acceptancePage.screenshot({ path: onboardingScreenshot, fullPage: true });
  screenshots.push(onboardingScreenshot);
  await acceptancePage.goto(`${appUrl}/early-access/accept?token=${tokenValues.valid}`, { waitUntil: "networkidle" });
  await acceptancePage.getByRole("button", { name: "Continue to your workspace" }).click();
  await acceptancePage.waitForURL((url) => url.pathname === "/onboarding", { timeout: 30_000 });
  await acceptancePage.getByRole("heading", { name: "Welcome to Auterim." }).waitFor({ timeout: 30_000 });
  assert.equal(acceptanceRpcCount, 2, "replaying an already-accepted invite performs the idempotent acceptance check");
  assert.equal(provisionCallsWithinAcceptance, 1, "same-user replay reuses the accepted workspace without provisioning twice");
  assert.equal(mockRequests.some((entry) => entry.table === "rpc/provision_initial_workspace"), false, "the app gateway does not provision again on idempotent replay");
  assert.deepEqual(trialStartCalls, [], "same-user replay does not start a trial");
  assert.equal((await acceptanceContext.cookies()).some((cookie) => cookie.name === "auterim_ea_invite"), false, "same-user replay clears the bearer cookie");
  await acceptanceContext.close();

  const emailLayoutFile = path.join(screenshotDirectory, "auterim-email-layout.mjs");
  const emailLayoutSource = esbuild.transformSync(fs.readFileSync(path.join(root, "src/lib/email/auterim-email-layout.ts"), "utf8"), { loader: "ts", format: "esm", target: "node18" }).code;
  fs.writeFileSync(emailLayoutFile, emailLayoutSource, "utf8");
  const emailRendererSource = fs.readFileSync(path.join(root, "src/lib/email/auth-emails.ts"), "utf8")
    .replace('import { getMarketingUrl } from "@/lib/urls";', 'const getMarketingUrl = () => "https://auterim.com";')
    .replace('from "./auterim-email-layout";', 'from "./auterim-email-layout.mjs";');
  const emailRendererCode = esbuild.transformSync(emailRendererSource, { loader: "ts", format: "esm", target: "node18" }).code;
  const emailModule = path.join(screenshotDirectory, "auterim-email-renderer.mjs");
  fs.writeFileSync(emailModule, emailRendererCode, "utf8");
  const { renderEarlyAccessInviteEmail } = await import(pathToFileURL(emailModule).href);
  const inviteEmail = renderEarlyAccessInviteEmail({ firstName: "Maya Chen", acceptUrl: `https://app.auterim.com/early-access/accept?token=${tokenValues.valid}` });
  assert.equal(inviteEmail.subject, "Your Auterim Early Access invite");
  assert.match(inviteEmail.text, /Hi Maya,/);
  assert.match(inviteEmail.text, /Your trial will not start automatically/);
  assert.doesNotMatch(inviteEmail.text, /[—–]/, "Early Access email copy follows the no-em-dash copy rule");
  assert.doesNotMatch(inviteEmail.html, /—|&mdash;/, "the rendered Early Access email contains no em dash in its shared footer");
  const emailPage = await browser.newPage({ viewport: { width: 680, height: 880 } });
  await emailPage.route("**/auterim-icon-32.png", (route) => route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmN8AAAAASUVORK5CYII=", "base64") }));
  await emailPage.setContent(inviteEmail.html, { waitUntil: "domcontentloaded" });
  await emailPage.getByRole("heading", { name: "You’re invited to Auterim." }).waitFor();
  const emailScreenshot = path.join(screenshotDirectory, "invite-email-680x880.png");
  await emailPage.screenshot({ path: emailScreenshot, fullPage: true });
  screenshots.push(emailScreenshot);
  await emailPage.close();
  console.log(JSON.stringify({ cases: [...cases.map(({ label, width, height }) => ({ label, viewport: `${width}x${height}` })), { label: "post-accept-onboarding", viewport: "430x932" }, { label: "invite-email", viewport: "680x880" }], screenshotDirectory, screenshots, result: "invite URL scrubbed; login and registration preserve it; matching, mismatched, unverified, expired, revoked, accepted, successful acceptance, onboarding, and invite email rendered without analytics leakage or trial start" }, null, 2));
} catch (error) {
  console.error("Early Access browser smoke diagnostics:", JSON.stringify({ mockRequests }, null, 2));
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

// Optional isolated browser regression. Uses installed Playwright + Chromium;
// set PLAYWRIGHT_MODULE and POLISH_BROWSER_EXECUTABLE if not on the normal path.
// All workspace/API data is synthetic. This is NOT authenticated live QA.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const out = await fs.mkdtemp(path.join(os.tmpdir(), "auterim-polish-"));
const playwright = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "@playwright/test");
await esbuild.build({ entryPoints: [path.join(root, "tests/fixtures/product-polish.jsx")], outfile: path.join(out, "fixture.js"), bundle: true, platform: "browser", jsx: "automatic", define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' }, plugins: [{
  name: "isolated-product-fixtures",
  setup(build) {
    build.onResolve({ filter: /^node:/ }, (args) => ({ path: args.path, namespace: "fixture-node" }));
    build.onLoad({ filter: /.*/, namespace: "fixture-node" }, () => ({ contents: "export default {};", loader: "js" }));
    build.onResolve({ filter: /^(next\/|@\/lib\/os\/app-provider$|@\/app\/app\/profile\/actions$)/ }, (args) => ({ path: args.path, namespace: "fixture" }));
    build.onResolve({ filter: /^\.\/actions$/ }, (args) => args.importer.includes("settings") ? { path: "actions", namespace: "fixture" } : null);
    build.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: module }) => {
      if (module === "next/link") return { contents: 'import React from "react"; export default function Link(props) { return React.createElement("a", props); }', resolveDir: root };
      if (module === "next/image") return { contents: 'import React from "react"; export default function Image({priority,fill,unoptimized,...props}) { return React.createElement("img", props); }', resolveDir: root };
      if (module === "next/navigation") return { contents: 'const params = new URLSearchParams(location.search); const surface = params.get("surface") || "dashboard"; const pathname = surface === "dashboard" ? "/" : ["revenue","client-flow","operations"].includes(surface) ? "/agents/"+surface : "/"+surface; const router = {push(){},replace(){},refresh(){}}; export const usePathname=()=>pathname; export const useSearchParams=()=>params; export const useRouter=()=>router;' };
      if (module === "next/headers") return { contents: 'export const cookies=()=>({get(){return undefined},set(){},delete(){}});' };
      if (module === "next/cache") return { contents: 'export const revalidatePath=()=>{};' };
      if (module.includes("app-provider")) return { contents: 'export const useOS=()=>window.fixtureContext;' };
      return { contents: 'export const saveWorkspaceSettings=()=>{throw Error("Fixture mutation blocked")}; export const saveProfileSettings=saveWorkspaceSettings;' };
    });
  },
}] });
const css = await fs.readFile(path.join(root, "src/app/app/dashboard.css"), "utf8");
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/fixture.js") { res.setHeader("Content-Type", "text/javascript"); res.end(await fs.readFile(path.join(out, "fixture.js"))); }
  else if (/^\/(brand|operators)\/[\w.-]+$/.test(url.pathname)) { try { res.setHeader("Content-Type", url.pathname.endsWith(".svg") ? "image/svg+xml" : "image/png"); res.end(await fs.readFile(path.join(root, "public", url.pathname))); } catch { res.writeHead(404).end(); } }
  else res.end(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#06070a}h1,h2,h3,p{margin:0}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}${css}</style></head><body><div id="fixture"></div><script src="/fixture.js"></script></body></html>`);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await playwright.chromium.launch({ headless: true, executablePath: process.env.POLISH_BROWSER_EXECUTABLE });
const page = await browser.newPage();
await page.emulateMedia({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (error) => errors.push(error.stack || error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
});
const base = `http://127.0.0.1:${server.address().port}`;
const findings = [];
try {
  const sizes = [[390,844],[1440,900]];
  for (const [width,height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const surface of ["dashboard","connectors","agents","revenue","client-flow","operations","approvals","policies","settings","plans"]) {
      await page.goto(`${base}/?surface=${surface}`);
      try { await page.locator("h1").waitFor({ timeout: 10000 }); }
      catch (error) { console.log({ width, surface, errors, body: await page.locator("body").innerText() }); throw error; }
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const overflow = await page.evaluate(() => [...document.querySelectorAll(".os-page *")].filter((el) => {
        const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(el).position !== "fixed";
      }).slice(0, 8).map((el) => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0,80) })));
      if (overflow.length) findings.push({ width, surface, overflow });
      if ([390,768,1440].includes(width)) await page.screenshot({ path: path.join(out, `${surface}-${width}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/?surface=activity`);
  await page.getByRole("button", { name: /^Filter/ }).click();
  const filterMenu = page.getByRole("menu", { name: "Filter activity" });
  await filterMenu.waitFor();
  await filterMenu.getByRole("menuitemcheckbox", { name: "Workflows" }).click();
  assert.equal(await filterMenu.getByRole("menuitemcheckbox", { name: "Workflows" }).getAttribute("aria-checked"), "true");
  await filterMenu.getByRole("button", { name: "Clear" }).click();
  assert.equal(await filterMenu.getByRole("menuitemcheckbox", { name: "Workflows" }).getAttribute("aria-checked"), "false");
  await page.goto(`${base}/?surface=connectors`);
  await page.getByRole("button", { name: "Add connector", exact: true }).first().click();
  await page.getByRole("heading", { name: "Find a connector" }).waitFor();
  await page.getByRole("combobox", { name: "Connector category" }).selectOption("crm");
  await page.getByRole("button", { name: "Close connector finder" }).click();
  await page.goto(`${base}/?surface=memory`);
  const memoryRow = page.locator(".memory-index .memory-index-trigger").first();
  if (await memoryRow.count()) { await memoryRow.click(); assert.equal(await memoryRow.getAttribute("aria-expanded"), "true"); await memoryRow.click(); assert.equal(await memoryRow.getAttribute("aria-expanded"), "false"); }
  await page.goto(`${base}/?surface=revenue`);
  assert.equal(await page.locator('img[alt="Revenue Operator profile"]').count(), 1, "Revenue runtime uses its canonical avatar");
  await page.setViewportSize({ width: 390, height: 844 });
  const approvalSizes = [[1440,900],[1024,1366],[768,1024],[430,932],[390,844]];
  for (const [width,height] of approvalSizes) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/?surface=approvals&approval=pending`);
    const queueRow = page.locator(".approval-queue-row").first();
    await queueRow.waitFor();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.locator(".approval-review").count(), 0, "expanded review content stays unmounted in the queue state");
    assert.equal(await queueRow.getAttribute("aria-expanded"), "false");
    const queueRowHeight = (await queueRow.boundingBox()).height;
    if (width >= 921) assert.ok(queueRowHeight >= 72 && queueRowHeight <= 88, `Collapsed row should be 72–88px at ${width}px; received ${queueRowHeight}px`);
    assert.match((await queueRow.innerText()).toLowerCase(), /re: team pricing/);
    if (width <= 390) {
      const metadataFits = await queueRow.locator(".approval-queue-meta > span").evaluateAll((items) => items.every((item) => item.scrollWidth <= item.clientWidth));
      assert.equal(metadataFits, true, "Narrow mobile queue keeps operator, source, and relative time readable beside approval status");
    }
    const collapsedPageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(collapsedPageWidth <= width, `Collapsed approvals page overflows at ${width}px: document width ${collapsedPageWidth}px`);
    await page.screenshot({ path: path.join(out, `approval-queue-${width}x${height}.png`) });
    await queueRow.click();
    await page.locator(".approval-review").waitFor();
    assert.equal(await page.getByRole("heading", { name: "Re: Team pricing" }).count(), 1);
    assert.equal(await page.getByRole("button", { name: "Approve & send", exact: true }).count(), 1);
    assert.equal(await page.locator(".approval-details").evaluate((details) => details.open), false, "Policy evidence starts collapsed on expansion");
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(pageWidth <= width, `Approval page overflows at ${width}px: document width ${pageWidth}px`);
    await page.screenshot({ path: path.join(out, `approval-expanded-${width}x${height}.png`), fullPage: true });
    await queueRow.click();
    assert.equal(await page.locator(".approval-review").count(), 0, "collapsing unmounts the expanded review");
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/?surface=approvals&approval=queue`);
  const queueRows = page.locator(".approval-queue-row");
  assert.equal(await queueRows.count(), 8, "queue fixture provides a realistic scan of eight approvals");
  assert.equal(await page.locator(".approval-review").count(), 0, "multi-item queue renders no expanded reviews by default");
  const queueHeight = await page.locator(".approval-queue-item").evaluateAll((items) => items.reduce((height, item) => height + item.getBoundingClientRect().height, 0));
  assert.ok(queueHeight < 900, `Eight compact approvals should fit within a normal desktop viewport; queue height was ${queueHeight}px`);
  await page.screenshot({ path: path.join(out, "approval-queue-eight.png"), fullPage: true });
  await queueRows.nth(0).click();
  await page.locator(".approval-review").waitFor();
  await queueRows.nth(1).click();
  assert.equal(await page.locator(".approval-review").count(), 1, "only one approval review remains mounted at a time");
  assert.equal(await page.getByRole("heading", { name: "Re: Team pricing 2" }).count(), 1, "opening a second row switches the expanded review");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/?surface=approvals&approval=pending`);
  await page.locator(".approval-queue-row").click();
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  await page.getByLabel("Subject").waitFor();
  assert.equal(await page.getByRole("button", { name: "Save", exact: true }).count(), 1);
  assert.equal(await page.getByRole("button", { name: "Approve & send", exact: true }).isDisabled(), true, "Unsaved draft edits cannot be approved");
  assert.equal(await page.getByRole("button", { name: /Approve all/ }).isDisabled(), true, "Bulk approval is unavailable while a draft is being edited");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.getByLabel("Subject").count(), 0, "Cancel returns to the prepared email preview");
  assert.equal(await page.getByRole("button", { name: "Approve & send", exact: true }).isDisabled(), false, "Cancel restores the decision action");
  assert.equal(await page.getByRole("button", { name: /Approve all/ }).isDisabled(), false, "Cancel restores bulk approval availability");

  // Reject reveal: the reason picker is not a permanently-visible control -
  // it appears only after clicking Reject, and Cancel dismisses it without
  // sending anything (the fixture does not mock /reject, so this only
  // exercises the presentation-layer reveal/cancel, never a real submit).
  assert.equal(await page.getByLabel("Reason for rejection").count(), 0, "Reject reason is not shown until Reject is clicked");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.getByLabel("Reason for rejection").waitFor();
  assert.equal(await page.getByRole("button", { name: "Confirm reject", exact: true }).count(), 1);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.getByLabel("Reason for rejection").count(), 0, "Cancel dismisses the reject reason panel");
  assert.equal(await page.getByRole("button", { name: "Reject", exact: true }).count(), 1, "Reject affordance returns after cancelling");

  await page.goto(`${base}/?surface=approvals&approval=pending&approvalAction=slow`);
  await page.locator(".approval-queue-row").click();
  await page.getByRole("button", { name: "Approve & send", exact: true }).click();
  const sendingButton = page.getByRole("button", { name: "Sending…", exact: true });
  await sendingButton.waitFor();
  assert.equal(await sendingButton.isDisabled(), true, "Submission state prevents duplicate approval clicks");
  await sendingButton.waitFor({ state: "detached" });
  assert.equal(await page.locator(".approval-queue-row").getAttribute("aria-expanded"), "false", "the review collapses after a successful decision request");

  await page.goto(`${base}/?surface=approvals&approval=pending&approvalError=scope_changed`);
  await page.locator(".approval-queue-row").click();
  await page.getByRole("button", { name: "Approve & send", exact: true }).click();
  const approvalScopeAlert = page.getByRole("alert");
  await approvalScopeAlert.getByText("Approval needs another review").waitFor();
  assert.equal(await page.getByRole("button", { name: "Approve & send", exact: true }).isDisabled(), true, "Approval is blocked until the changed scope is reviewed");
  assert.equal(await page.getByText("approval_scope_changed", { exact: true }).isVisible(), false, "Raw scope error is not shown by default");
  await approvalScopeAlert.getByText("Technical details").click();
  assert.equal(await approvalScopeAlert.getByText("approval_scope_changed", { exact: true }).isVisible(), true, "Raw scope error remains available on demand");
  await page.screenshot({ path: path.join(out, "approval-scope-changed-390x844.png") });
  await approvalScopeAlert.getByRole("button", { name: "Review updated approval" }).click();
  await page.getByLabel("Subject").waitFor();
  assert.equal(await page.getByRole("button", { name: "Approve & send", exact: true }).isDisabled(), true, "the scope warning remains until the current message is explicitly saved");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await approvalScopeAlert.waitFor({ state: "detached" });
  assert.equal(await page.getByRole("button", { name: "Approve & send", exact: true }).isDisabled(), false, "saving the reviewed message refreshes its approval binding");
  await page.locator(".approval-details > summary").click();
  const approvalEvidence = page.locator(".approval-details-body");
  const approvalEvidenceText = (await approvalEvidence.innerText()).toLowerCase();
  assert.match(approvalEvidenceText, /matched policy/);
  assert.match(approvalEvidenceText, /exact action/);
  assert.match(approvalEvidenceText, /matched rule: customer_email_requires_approval/);
  assert.match(approvalEvidenceText, /runs automatically after this email is approved/);
  await page.getByRole("button", { name: "Approve & send", exact: true }).click();
  await page.locator(".approval-queue-row").waitFor();
  assert.equal(await page.evaluate(() => window.fixtureApprovalSavedDraft?.draftSubject), "Re: Team pricing", "the exact reviewed subject is saved before retrying approval");
  assert.equal(await page.evaluate(() => window.fixtureApprovalCompleted), true, "approval can complete after the reviewed draft is rebound");
  await fs.writeFile(path.join(out, "layout-findings.json"), JSON.stringify(findings, null, 2));
  console.log(`Layout findings: ${findings.length}. Screenshots: ${out}`);
  // Lifecycle variants are covered by the runtime/domain smoke suites; this
  // browser gate keeps one representative desktop and mobile render bounded.
  assert.deepEqual(errors, [], "Fixture pages must render without client errors");
  console.log(JSON.stringify({ output: out, checks: "desktop/mobile route renders; activity filter; connector finder; memory expander; operator avatar; approvals at five viewports; draft edit/cancel; approval loading state; scope-changed presentation and recovery", findings }, null, 2));
  await fs.writeFile(path.join(out, "results.json"), JSON.stringify({ findings, errors }, null, 2));
  assert.deepEqual(findings, [], "Responsive content must remain inside the viewport");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

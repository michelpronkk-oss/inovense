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
    build.onResolve({ filter: /^(next\/|@\/lib\/os\/app-provider$|@\/app\/app\/profile\/actions$)/ }, (args) => ({ path: args.path, namespace: "fixture" }));
    build.onResolve({ filter: /^\.\/actions$/ }, (args) => args.importer.includes("settings") ? { path: "actions", namespace: "fixture" } : null);
    build.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: module }) => {
      if (module === "next/link") return { contents: 'import React from "react"; export default function Link(props) { return React.createElement("a", props); }', resolveDir: root };
      if (module === "next/image") return { contents: 'import React from "react"; export default function Image({priority,fill,unoptimized,...props}) { return React.createElement("img", props); }', resolveDir: root };
      if (module === "next/navigation") return { contents: 'const params = new URLSearchParams(location.search); const surface = params.get("surface") || "dashboard"; const pathname = surface === "dashboard" ? "/" : ["revenue","client-flow","operations"].includes(surface) ? "/agents/"+surface : "/"+surface; const router = {push(){},replace(){},refresh(){}}; export const usePathname=()=>pathname; export const useSearchParams=()=>params; export const useRouter=()=>router;' };
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
page.on("pageerror", (error) => errors.push(error.message));
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
  await page.goto(`${base}/?surface=approvals&approval=pending`);
  await page.locator(".approval-review-card").waitFor();
  await page.screenshot({ path: path.join(out, "approval-review-390.png"), fullPage: true });
  assert.equal(await page.getByRole("button", { name: "Reject", exact: true }).count(), 1);
  await fs.writeFile(path.join(out, "layout-findings.json"), JSON.stringify(findings, null, 2));
  console.log(`Layout findings: ${findings.length}. Screenshots: ${out}`);
  // Lifecycle variants are covered by the runtime/domain smoke suites; this
  // browser gate keeps one representative desktop and mobile render bounded.
  assert.deepEqual(errors, [], "Fixture pages must render without client errors");
  console.log(JSON.stringify({ output: out, checks: "desktop/mobile route renders; activity filter; connector finder; memory expander; operator avatar; approval interaction", findings }, null, 2));
  await fs.writeFile(path.join(out, "results.json"), JSON.stringify({ findings, errors }, null, 2));
  assert.deepEqual(findings, [], "Responsive content must remain inside the viewport");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.PUBLIC_QA_URL || "http://localhost:3100";
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 1366 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
];
const screenshotDir = join(process.cwd(), ".next", "use-cases-qa");
mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: viewports[0], deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  const response = await page.goto(new URL("/use-cases", baseUrl).href, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, "/use-cases responds successfully");
  await page.getByRole("heading", { level: 1 }).waitFor();

  const decline = page.getByRole("button", { name: "Decline" });
  if (await decline.isVisible().catch(() => false)) await decline.click();

  const pageFacts = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "",
    h1Count: document.querySelectorAll("main h1").length,
    breadcrumb: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).some((script) => script.textContent?.includes('"BreadcrumbList"')),
    placeholders: document.querySelectorAll(".uc-page .gx").length,
    placeholderLabels: document.querySelectorAll(".uc-page .gx-top .t").length,
    closedDisclosures: document.querySelectorAll(".uc-page details").length,
    heroAside: document.querySelectorAll(".uc-hero-aside").length,
    visibleCopy: document.querySelector(".uc-page")?.innerText.toLowerCase() ?? "",
  }));
  assert.match(pageFacts.title, /Auterim Use Cases \| Revenue, Client Flow, Operations & Support/);
  assert.equal(new URL(pageFacts.canonical).pathname, "/use-cases");
  assert.match(pageFacts.robots, /index/);
  assert.equal(pageFacts.h1Count, 1);
  assert.equal(pageFacts.breadcrumb, true, "route includes BreadcrumbList JSON-LD");
  assert.equal(pageFacts.placeholders, 8, "the flow overview and seven use case visuals render");
  assert.equal(pageFacts.placeholderLabels, 8, "each artboard has one visual title");
  assert.equal(pageFacts.heroAside, 0, "the hero remains focused on its headline and actions");
  assert.equal(pageFacts.closedDisclosures, 0, "core use-case explanations are not hidden in accordions");
  for (const content of ["revenue operator", "client flow operator", "operations operator", "support operator", "hold for approval", "recorded"]) {
    assert.ok(pageFacts.visibleCopy.includes(content), `rendered page includes ${content}`);
  }

  const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: viewports[4] });
  const noJsPage = await noJsContext.newPage();
  const noJsResponse = await noJsPage.goto(new URL("/use-cases", baseUrl).href, { waitUntil: "domcontentloaded" });
  const noJsCopy = (await noJsPage.locator(".uc-page").innerText()).toLowerCase();
  assert.equal(noJsResponse?.status(), 200, "route responds with JavaScript disabled");
  for (const content of ["revenue operator", "client flow operator", "operations operator", "support operator", "fast does not mean unchecked", "execution is only the middle"]) {
    assert.ok(noJsCopy.includes(content), `server-rendered content includes ${content} without JavaScript`);
  }
  await noJsContext.close();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(75);
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      main: document.querySelector("main")?.scrollWidth ?? 0,
      visualMax: Math.max(...Array.from(document.querySelectorAll(".uc-page .gx"), (node) => node.getBoundingClientRect().right)),
      visualMin: Math.min(...Array.from(document.querySelectorAll(".uc-page .gx"), (node) => node.getBoundingClientRect().left)),
    }));
    assert.ok(layout.document <= layout.viewport, `no document overflow at ${viewport.width}px`);
    assert.ok(layout.body <= layout.viewport, `no body overflow at ${viewport.width}px`);
    assert.ok(layout.main <= layout.viewport, `no main overflow at ${viewport.width}px`);
    assert.ok(layout.visualMin >= 0 && layout.visualMax <= layout.viewport, `visual placeholders fit at ${viewport.width}px`);
    await page.screenshot({ path: join(screenshotDir, `use-cases-${viewport.width}-fold.png`) });
    await page.screenshot({ path: join(screenshotDir, `use-cases-${viewport.width}.png`), fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".uc-final-actions button").click();
  const dialog = page.getByRole("dialog", { name: /Get early access to Auterim/ });
  await dialog.waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await dialog.isVisible().catch(() => false), false, "Escape closes the canonical Early Access dialog");
  assert.deepEqual(errors, [], `browser has no uncaught page errors: ${errors.join("; ")}`);
  console.log(`use-cases-responsive-smoke: rendered, responsive, metadata, placeholders, and Early Access passed at ${viewports.map(({ width }) => width).join(", ")}px. Screenshots: ${screenshotDir}`);
} finally {
  await browser.close();
}

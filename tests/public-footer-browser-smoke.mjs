import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.PUBLIC_QA_URL || "http://localhost:3000";
const routes = [
  "/", "/how-it-works", "/operators", "/control", "/connectors", "/pricing", "/use-cases",
  "/getting-started", "/security", "/docs", "/changelog", "/about", "/contact", "/privacy", "/terms", "/cookies",
];
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 1366 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ deviceScaleFactor: 1 });
const page = await context.newPage();
const screenshotDir = join(process.cwd(), ".next", "public-qa");
mkdirSync(screenshotDir, { recursive: true });
const emDash = String.fromCharCode(0x2014);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const titles = new Map();
const dashPages = [];
const internalPaths = new Set();

try {
  await page.setViewportSize(viewports[0]);
  await page.goto(new URL("/", baseUrl).href, { waitUntil: "networkidle" });
  const decline = page.getByRole("button", { name: "Decline" });
  if (await decline.isVisible().catch(() => false)) await decline.click();

  for (const route of routes) {
    await page.setViewportSize(viewports[0]);
    const response = await page.goto(new URL(route, baseUrl).href, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `${route} responds successfully`);
    await page.waitForSelector("main h1");
    const metadata = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "",
      twitterTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ?? "",
      h1Count: document.querySelectorAll("main h1").length,
      headerCount: document.querySelectorAll("header").length,
      footerCount: document.querySelectorAll("footer").length,
      visibleText: document.body.innerText,
      links: Array.from(document.querySelectorAll("a[href]"), (link) => link.getAttribute("href") ?? ""),
    }));
    assert.ok(metadata.description.length > 35, `${route} has a useful description`);
    assert.equal(metadata.h1Count, 1, `${route} has one main heading`);
    assert.equal(metadata.headerCount, 1, `${route} has one shared public header`);
    assert.equal(metadata.footerCount, 1, `${route} has one shared public footer`);
    assert.ok(metadata.ogTitle, `${route} has an Open Graph title`);
    assert.ok(metadata.twitterTitle, `${route} has a Twitter title`);
    const finalPath = new URL(page.url()).pathname;
    assert.equal(new URL(metadata.canonical).pathname, finalPath, `${route} canonical matches the resolved route`);
    if (route !== "/") titles.set(metadata.title, route);
    if (metadata.visibleText.includes(emDash)) dashPages.push(route);
    for (const href of metadata.links) if (href.startsWith("/")) internalPaths.add(href);
    await page.screenshot({ path: join(screenshotDir, `${route.slice(1).replaceAll("/", "-") || "home"}-1440.png`) });

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(40);
      const layout = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        footerWidth: document.querySelector("footer")?.scrollWidth ?? 0,
        footerClientWidth: document.querySelector("footer")?.clientWidth ?? 0,
      }));
      assert.ok(layout.documentWidth <= layout.viewportWidth, `${route} has no horizontal document overflow at ${viewport.width}px`);
      assert.ok(layout.bodyWidth <= layout.viewportWidth, `${route} body has no horizontal overflow at ${viewport.width}px`);
      assert.ok(layout.footerWidth <= layout.footerClientWidth, `${route} footer has no horizontal overflow at ${viewport.width}px`);
      await page.screenshot({ path: join(screenshotDir, `${route.slice(1).replaceAll("/", "-") || "home"}-${viewport.width}.png`) });
    }

    for (const viewport of [viewports[0], viewports[4]]) {
      await page.setViewportSize(viewport);
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(screenshotDir, `${route.slice(1).replaceAll("/", "-") || "home"}-footer-${viewport.width}.png`) });
    }
  }

  assert.equal(new Set([...titles.keys()]).size, titles.size, "footer pages have unique document titles");
  assert.deepEqual(dashPages, [], `visible public copy does not use em dashes: ${dashPages.join(", ")}`);

  const brokenPaths = [];
  for (const path of internalPaths) {
    const response = await context.request.get(new URL(path, baseUrl).href, { timeout: 10000 });
    if (response.status() >= 400) brokenPaths.push(`${path} (${response.status()})`);
  }
  assert.deepEqual(brokenPaths, [], `public-page internal links resolve: ${brokenPaths.join(", ")}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL("/pricing", baseUrl).href, { waitUntil: "networkidle" });
  const workforce = page.locator(".public-plan:nth-child(2) button");
  await workforce.click();
  const dialog = page.getByRole("dialog", { name: /Get early access to Auterim/ });
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /Plan interest\s+Workforce/);
  const dialogMetrics = await dialog.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const input = node.querySelector("input[name=name]");
    return { left: rect.left, right: rect.right, width: rect.width, fontSize: input ? Number.parseFloat(getComputedStyle(input).fontSize) : 0, activeTag: document.activeElement?.tagName };
  });
  assert.ok(dialogMetrics.left >= 0 && dialogMetrics.right <= 390, "Early Access sheet fits the mobile viewport");
  assert.ok(dialogMetrics.fontSize >= 16, "mobile form inputs use a non-zooming font size");
  assert.notEqual(dialogMetrics.activeTag, "INPUT", "mobile modal opens without forcing the keyboard");

  assert.deepEqual(errors, [], `browser has no uncaught page errors: ${errors.join("; ")}`);
  console.log(`public-footer-browser-smoke: ${routes.length} routes passed at ${viewports.length} viewport sizes. Screenshots: ${screenshotDir}`);
} finally {
  await browser.close();
}

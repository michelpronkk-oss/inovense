import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.EARLY_ACCESS_BASE_URL || "http://127.0.0.1:3100";
const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "auterim-early-access-"));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let apiRequests = 0;
let postedBody = null;

await page.route("**/api/early-access", async (route) => {
  apiRequests += 1;
  postedBody = route.request().postDataJSON();
  await new Promise((resolve) => setTimeout(resolve, 450));
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
});

try {
  await page.addInitScript(() => localStorage.setItem("auterim_cookie_consent", "declined"));
  await page.goto(`${baseUrl}/?utm_source=x&utm_medium=founder&utm_campaign=early_access&utm_content=founder_post`);
  await page.locator(".hero-cta button").click();
  const dialog = page.getByRole("dialog", { name: "Get early access to Auterim." });
  await dialog.waitFor();

  await dialog.getByRole("button", { name: "Request early access" }).click();
  assert.match(await dialog.innerText(), /Add your name\./);
  await page.screenshot({ path: path.join(outputDirectory, "early-access-validation.png") });
  await dialog.locator('[name="name"]').fill("Maya Chen");
  await dialog.locator('[name="email"]').fill("invalid-email");
  await dialog.locator('[name="company"]').fill("Northstar Studio");
  await dialog.locator('[name="teamSize"]').selectOption("21–50");
  await dialog.locator('[name="useCase"]').fill("Following up on open deals and coordinating client onboarding.");
  await dialog.getByRole("button", { name: "Request early access" }).click();
  assert.match(await dialog.innerText(), /Enter a valid email address\./);
  assert.equal(apiRequests, 0, "invalid data is rejected before the network request");

  await dialog.locator('[name="email"]').fill("MAYA.CHEN@Example.com");
  await dialog.getByRole("button", { name: "Close early access dialog" }).click();
  await page.locator(".ea-dialog").waitFor({ state: "detached" });
  assert.equal(await page.locator(".ea-dialog").count(), 0, "close button dismisses the dialog");
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("btn-a")), true, "focus returns to the opening CTA");

  for (const [slug, label] of [["foundation", "Foundation"], ["workforce", "Workforce"], ["scale", "Scale"]]) {
    const planTrigger = page.locator(`.homepage-plan-teaser article[data-plan="${slug}"] button`);
    await planTrigger.click();
    const planDialog = page.locator(".ea-dialog");
    await planDialog.getByText(label, { exact: true }).waitFor();
    await planDialog.locator('[name="name"]').fill("Maya Chen");
    await planDialog.locator('[name="email"]').fill("MAYA.CHEN@Example.com");
    await planDialog.locator('[name="company"]').fill("Northstar Studio");
    await planDialog.locator('[name="teamSize"]').selectOption("21–50");
    await planDialog.locator('[name="useCase"]').fill("Following up on open deals and coordinating client onboarding.");
    const submit = planDialog.getByRole("button", { name: "Request early access" });
    await submit.click();
    const sending = planDialog.getByRole("button", { name: "Sending request…" });
    await sending.waitFor();
    if (slug === "workforce") assert.equal(await sending.isDisabled(), true, "the loading state prevents duplicate submissions");
    await sending.waitFor({ state: "detached" });
    assert.equal(apiRequests, ["foundation", "workforce", "scale"].indexOf(slug) + 1);
    assert.equal(postedBody.email, "maya.chen@example.com", "the request email is normalized before submission");
    assert.equal(postedBody.interestedPlan, slug, `${label} request preserves canonical plan interest`);
    assert.equal(postedBody.utmSource, "x");
    assert.equal(postedBody.utmMedium, "founder");
    assert.equal(postedBody.utmCampaign, "early_access");
    assert.equal(postedBody.utmContent, "founder_post");
    assert.equal(postedBody.sourcePath, "/");
    await planDialog.getByRole("heading", { name: "You’re on the early access list." }).waitFor();
    assert.match(await planDialog.innerText(), /Request submitted as\s+maya\.chen@example\.com/i);
    if (slug === "workforce") await page.screenshot({ path: path.join(outputDirectory, "early-access-success.png") });
    await planDialog.getByRole("button", { name: "Done" }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes("Request early access")), true, "Done restores focus to the selected-plan CTA");
  }

  const headerTrigger = page.locator("header .cta > button");
  await headerTrigger.click();
  const headerDialog = page.getByRole("dialog", { name: "Get early access to Auterim." });
  await headerDialog.waitFor();
  assert.equal(await headerDialog.getByText("Plan interest").count(), 0, "non-plan entry points do not carry plan context");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("ea-submit")), true, "the focus trap wraps from the first control to the final action");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("ea-close")), true, "the focus trap wraps from the final action to the close control");
  await page.keyboard.press("Escape");
  await page.locator(".ea-dialog").waitFor({ state: "detached" });
  assert.equal(await page.locator(".ea-dialog").count(), 0, "Escape dismisses the dialog");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes("Request early access")), true, "Escape restores focus to the header CTA");

  await page.locator(".homepage-final-cta button").scrollIntoViewIfNeeded();
  await page.locator(".homepage-final-cta button").click();
  await page.getByRole("dialog", { name: "Get early access to Auterim." }).waitFor();
  await page.locator(".ea-close").click();
  await page.locator(".ea-dialog").waitFor({ state: "detached" });

  const sizes = [[1440, 900], [1024, 1366], [768, 1024], [430, 932], [390, 844]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto(`${baseUrl}/`);
    const mobileMenu = page.locator(".mobile-menu");
    if (width <= 820) {
      await mobileMenu.locator("summary").click();
      await mobileMenu.locator(".mobile-menu-cta").click();
    } else {
      await page.locator(".hero-cta button").click();
    }
    const currentDialog = page.locator(".ea-dialog");
    await currentDialog.waitFor();
    const rect = await currentDialog.boundingBox();
    assert.ok(rect, `dialog is rendered at ${width}x${height}`);
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width + 1 && rect.y + rect.height <= height + 1, `dialog fits within ${width}x${height}`);
    if (width <= 600) {
      assert.ok(Math.abs(rect.y + rect.height - height) <= 2, `mobile sheet is anchored to the bottom at ${width}px`);
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("ea-dialog")), true, "mobile opens without summoning the keyboard");
    }
    if (width === 390) {
      const helper = await currentDialog.locator(".ea-form-footer > span").boundingBox();
      assert.ok(helper && helper.y + helper.height <= height, "the complete mobile form footer fits without scrolling at 390x844");
    }
    await page.screenshot({ path: path.join(outputDirectory, `early-access-${width}x${height}.png`) });
    await currentDialog.getByRole("button", { name: "Close early access dialog" }).click();
    await currentDialog.waitFor({ state: "detached" });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/`);
  await page.locator(".mobile-menu > summary").click();
  const mobileMenuTrigger = page.locator(".mobile-menu-cta");
  await mobileMenuTrigger.click();
  await page.locator(".ea-dialog").waitFor();
  await page.locator(".ea-dialog").locator('[name="name"]').focus();
  await page.setViewportSize({ width: 390, height: 500 });
  const keyboardDialog = await page.locator(".ea-dialog").boundingBox();
  assert.ok(keyboardDialog && keyboardDialog.y + keyboardDialog.height <= 501, "the sheet remains within the reduced visual viewport while the mobile keyboard is present");
  await page.locator(".ea-dialog").locator('[name="useCase"]').scrollIntoViewIfNeeded();
  const keyboardField = await page.locator(".ea-dialog").locator('[name="useCase"]').boundingBox();
  assert.ok(keyboardField && keyboardField.y + keyboardField.height <= 501, "the focused textarea can scroll above the keyboard");
  await page.keyboard.press("Escape");
  await page.locator(".mobile-menu > summary").waitFor();
  assert.equal(await page.evaluate(() => document.activeElement?.closest(".mobile-menu")?.querySelector("summary") === document.activeElement), true, "mobile navigation trigger receives focus after closing the sheet");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/privacy`);
  await page.locator("header .cta > button").click();
  await page.locator(".ea-dialog").waitFor();
  await page.locator(".ea-close").click();
  await page.locator(".ea-dialog").waitFor({ state: "detached" });

  console.log(JSON.stringify({ viewports: sizes, apiRequests, screenshots: outputDirectory, checks: "hero CTA; validation; loading; duplicate submit prevention; plan attribution; UTM persistence; success; close/reopen; Escape; desktop/mobile sizing; mobile keyboard-safe opening; mobile nav focus return; standalone public header provider" }, null, 2));
} finally {
  await browser.close();
}

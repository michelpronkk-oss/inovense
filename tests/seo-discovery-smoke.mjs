import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");
const requireText = (source, text, label) => assert.ok(source.includes(text), `${label}: expected ${text}`);

const layout = read("src/app/layout.tsx");
requireText(layout, "metadataBase: new URL(AUTERIM_URL)", "production metadata base");
requireText(layout, 'template: "%s | Auterim"', "public title template");
requireText(layout, "const isPrivateHost", "private-host metadata guard");
requireText(layout, "if (isPrivateHost)", "private-host noindex branch");
const homepage = read("src/app/page.tsx");
assert.ok(!homepage.includes("foundingDate:"), "organization schema does not state an unverified founding date");
assert.ok(!/aggregateRating|ratingValue|reviewCount/.test(homepage), "organization schema does not fabricate ratings");

const appLayout = read("src/app/app/layout.tsx");
requireText(appLayout, "index: false", "app metadata noindex");
requireText(appLayout, "follow: false", "app metadata nofollow");

const sitemap = read("src/app/sitemap.ts");
for (const path of [
  "\"/agents\"", "\"/operators\"", "\"/pricing\"", "\"/status\"", "\"/press\"", "\"/careers\"",
  "\"/solutions/revenue-teams\"", "\"/solutions/client-services\"", "\"/solutions/operations\"",
]) requireText(sitemap, path, "public sitemap route");
for (const privatePath of ["\"/app\"", "\"/login\"", "\"/register\"", "\"/onboarding\"", "\"/api\""]) {
  assert.ok(!sitemap.includes(privatePath), `sitemap excludes ${privatePath}`);
}
requireText(sitemap, 'const BASE = "https://auterim.com"', "apex sitemap host");

const robots = read("src/app/robots.ts");
requireText(robots, 'sitemap: "https://auterim.com/sitemap.xml"', "robots sitemap declaration");
requireText(robots, "host === getAppHost()", "app-host robots rule");
requireText(robots, 'disallow: "/"', "private-host crawl block");
requireText(sitemap, "host === getAppHost()", "app-host empty sitemap guard");

const middleware = read("src/middleware.ts");
requireText(middleware, "isPublicAliasHost(requestHost)", "www-to-apex redirect guard");
requireText(middleware, "robots.txt", "metadata routes bypass app rewrite");
requireText(middleware, "x-auterim-surface", "private host rewrite marker");
const hostRouting = read("src/lib/host-routing.ts");
requireText(hostRouting, "AUTERIM_PUBLIC_WWW_HOST", "recognized www public alias");

for (const [page, canonical] of [
  ["src/app/page.tsx", "https://auterim.com"],
  ["src/app/pricing/page.tsx", "https://auterim.com/pricing"],
  ["src/app/workflows/page.tsx", "https://auterim.com/workflows"],
  ["src/app/use-cases/page.tsx", "https://auterim.com/use-cases"],
  ["src/app/solutions/revenue-teams/page.tsx", "https://auterim.com/solutions/revenue-teams"],
  ["src/app/security/page.tsx", "https://auterim.com/security"],
]) {
  requireText(read(page), canonical, `canonical metadata for ${page}`);
}

for (const route of [
  "src/app/ai-automation/opengraph-image.tsx",
  "src/app/api-reference/opengraph-image.tsx",
  "src/app/careers/opengraph-image.tsx",
  "src/app/changelog/opengraph-image.tsx",
  "src/app/docs/opengraph-image.tsx",
  "src/app/status/opengraph-image.tsx",
]) {
  assert.ok(existsSync(resolve(root, route)), `existing OG image route remains: ${route}`);
}

requireText(homepage, "summary_large_image", "homepage Twitter large image metadata");
requireText(homepage, '"@type": "Organization"', "homepage organization structured data");
requireText(homepage, '"@type": "SoftwareApplication"', "homepage software structured data");
for (const route of [
  "src/app/solutions/revenue-teams/page.tsx",
  "src/app/solutions/client-services/page.tsx",
  "src/app/solutions/operations/page.tsx",
  "src/app/solutions/marketing/page.tsx",
  "src/app/solutions/founders-ops/page.tsx",
]) requireText(read(route), "BreadcrumbJsonLd", `solution breadcrumb schema for ${route}`);

console.log("seo-discovery-smoke: all SEO discovery checks passed.");

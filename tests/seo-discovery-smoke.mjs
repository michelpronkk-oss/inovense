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
requireText(layout, "GOOGLE_SITE_VERIFICATION", "optional Google verification support");
requireText(layout, "BING_SITE_VERIFICATION", "optional Bing verification support");

const homepage = read("src/app/page.tsx");
assert.ok(!homepage.includes("foundingDate:"), "organization schema does not state an unverified founding date");
assert.ok(!/aggregateRating|ratingValue|reviewCount/.test(homepage), "organization schema does not fabricate ratings");
requireText(homepage, '"@type": "Organization"', "homepage organization structured data");
requireText(homepage, '"@type": "WebSite"', "homepage website structured data");
requireText(homepage, '"@type": "SoftwareApplication"', "homepage software structured data");
requireText(homepage, "pricingPlans.map", "software offers use canonical pricing plans");
requireText(homepage, '"@type": "FAQPage"', "homepage FAQ structured data");

const appLayout = read("src/app/app/layout.tsx");
requireText(appLayout, "index: false", "app metadata noindex");
requireText(appLayout, "follow: false", "app metadata nofollow");
const statusPage = read("src/app/status/page.tsx");
requireText(statusPage, "index: false", "unmonitored status page is not indexed");
requireText(statusPage, "Live public monitoring is not published yet.", "status page accurately describes the current feed");
assert.ok(!/All services running normally|No incidents in the last 30 days|Operational/.test(statusPage), "status page does not invent service health or incident data");

const sitemap = read("src/app/sitemap.ts");
for (const path of [
  'path: "/how-it-works"', 'path: "/operators"', 'path: "/pricing"',
  'path: "/connectors"', 'path: "/docs"', 'path: "/changelog"',
  'path: "/solutions/revenue-teams"', 'path: "/solutions/client-services"',
  'path: "/solutions/operations"', 'path: "/privacy"', 'path: "/terms"', 'path: "/cookies"',
]) requireText(sitemap, path, "valuable canonical sitemap route");
for (const excluded of [
  'path: "/agents"', 'path: "/integrations"', 'path: "/app"', 'path: "/login"',
  'path: "/register"', 'path: "/onboarding"', 'path: "/api"', 'path: "/press"',
  'path: "/careers"', 'path: "/status"',
]) assert.ok(!sitemap.includes(excluded), `sitemap excludes ${excluded}`);
requireText(sitemap, "lastModified: \"2026-09-03\"", "changelog uses its verified release date");
requireText(sitemap, 'AUTERIM_URL}${path}', "canonical apex sitemap host");
requireText(sitemap, 'surface === "app"', "private-host empty sitemap guard");

const robots = read("src/app/robots.ts");
requireText(robots, '"OAI-SearchBot"', "OpenAI search crawler access");
requireText(robots, '"Claude-SearchBot"', "Claude search crawler access");
requireText(robots, '"PerplexityBot"', "Perplexity search crawler access");
requireText(robots, 'sitemap: "https://auterim.com/sitemap.xml"', "robots sitemap declaration");
requireText(robots, 'disallow: "/"', "private-host crawl block");
for (const privatePath of ['"/app"', '"/admin"', '"/api"', '"/invite"', '"/auth"', '"/proposal"']) {
  requireText(robots, privatePath, `crawler private-route block ${privatePath}`);
}
requireText(robots, "DISCOVERY_CRAWLERS.map", "private exclusions repeated for specific bot groups");
assert.ok(!/userAgent:\s*\[?\s*["'](?:GPTBot|ClaudeBot|Google-Extended)["']/.test(robots), "training-crawler policy remains inherited from the prior wildcard policy");

const middleware = read("src/proxy.ts");
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
]) requireText(read(page), canonical, `canonical metadata for ${page}`);

for (const route of [
  "src/app/ai-automation/opengraph-image.tsx",
  "src/app/api-reference/opengraph-image.tsx",
  "src/app/careers/opengraph-image.tsx",
  "src/app/changelog/opengraph-image.tsx",
  "src/app/docs/opengraph-image.tsx",
  "src/app/status/opengraph-image.tsx",
]) assert.ok(existsSync(resolve(root, route)), `existing OG image route remains: ${route}`);

requireText(homepage, "summary_large_image", "homepage Twitter large image metadata");
requireText(read("src/app/agents/page.tsx"), 'permanentRedirect("/operators")', "old agents page consolidates to Operators");
requireText(read("src/app/integrations/page.tsx"), 'permanentRedirect("/connectors")', "integrations alias permanently redirects");
requireText(read("src/app/indexnow-key/route.ts"), '"Content-Type": "text/plain; charset=utf-8"', "IndexNow ownership verification endpoint");
requireText(read("src/lib/indexnow.ts"), "https://api.indexnow.org/indexnow", "IndexNow submission utility");
requireText(read(".env.example"), "INDEXNOW_KEY=", "optional IndexNow environment key");
requireText(read("public/llms.txt"), "Auterim is the operating layer", "factual llms.txt orientation");

console.log("seo-discovery-smoke: static SEO and crawler checks passed.");

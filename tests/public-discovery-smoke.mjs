import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = (process.env.PUBLIC_DISCOVERY_BASE_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const requiredRoutes = new Set([
  "/", "/how-it-works", "/operators", "/control", "/use-cases", "/connectors",
  "/pricing", "/getting-started", "/security", "/docs", "/approvals", "/workflows",
  "/architecture", "/memory", "/trust", "/about", "/contact", "/changelog",
  "/solutions/revenue-teams", "/solutions/client-services", "/solutions/operations",
  "/solutions/marketing", "/solutions/founders-ops", "/privacy", "/terms", "/cookies",
]);
const privatePaths = [
  "/app", "/app/dashboard", "/app-preview", "/admin", "/admin/login", "/api/health",
  "/auth/callback", "/invite/accept/secret", "/early-access/accept/session", "/onboarding/token",
  "/proposal/secret", "/client/secret", "/login", "/register", "/activate",
];

function parseRobots(content) {
  const groups = [];
  let group = null;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const userAgent = line.match(/^user-agent:\s*(.+)$/i);
    if (userAgent) {
      if (!group || group.directives.length > 0) {
        group = { agents: [], directives: [] };
        groups.push(group);
      }
      group.agents.push(userAgent[1].trim().toLowerCase());
      continue;
    }
    const directive = line.match(/^(allow|disallow):\s*(.*)$/i);
    if (directive && group) group.directives.push({ name: directive[1].toLowerCase(), path: directive[2].trim() });
  }
  return groups;
}

function canCrawl(groups, userAgent, pathname) {
  const token = userAgent.toLowerCase();
  const specific = groups.filter((candidate) => candidate.agents.includes(token));
  const matching = specific.length ? specific : groups.filter((candidate) => candidate.agents.includes("*"));
  const directives = matching.flatMap((candidate) => candidate.directives)
    .filter(({ path }) => path && pathname.startsWith(path))
    .sort((a, b) => b.path.length - a.path.length);
  return directives[0]?.name !== "disallow";
}

function tags(html, matcher) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => tag).filter((tag) => matcher.test(tag));
}

function attr(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tag.match(new RegExp(`\\b${escaped}=["']([^"']*)["']`, "i"))?.[1] ?? null;
}

async function get(path, options) {
  return fetch(`${baseUrl}${path}`, options);
}

let robotsResponse;
try {
  robotsResponse = await get("/robots.txt");
} catch {
  throw new Error(`Could not reach ${baseUrl}. Build the app and start pnpm start -- -p 3100 before running this harness.`);
}
assert.equal(robotsResponse.status, 200, "public robots.txt returns 200");
const robotsText = await robotsResponse.text();
assert.match(robotsText, /sitemap:\s*https:\/\/auterim\.com\/sitemap\.xml/i, "robots points at canonical sitemap");
const rules = parseRobots(robotsText);
for (const crawler of ["OAI-SearchBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Googlebot", "Bingbot"]) {
  assert.equal(canCrawl(rules, crawler, "/how-it-works"), true, `${crawler} can crawl public product content`);
  for (const path of privatePaths) {
    assert.equal(canCrawl(rules, crawler, path), false, `${crawler} is excluded from ${path}`);
  }
}
// Search/discovery access must not silently make a new training-data decision.
for (const crawler of ["GPTBot", "ClaudeBot", "Google-Extended"]) {
  assert.equal(canCrawl(rules, crawler, "/how-it-works"), true, `${crawler} keeps the current wildcard access policy`);
}

for (const host of ["app.auterim.com", "admin.auterim.com", "portal.auterim.com"]) {
  const privateRobots = await get("/robots.txt", { headers: { "x-forwarded-host": host } });
  assert.equal(privateRobots.status, 200, `${host} robots.txt is available`);
  assert.match(await privateRobots.text(), /Disallow:\s*\//i, `${host} blocks crawling across its entire host`);
  const privateSitemap = await get("/sitemap.xml", { headers: { "x-forwarded-host": host } });
  assert.equal(privateSitemap.status, 200, `${host} sitemap route is safe`);
  assert.doesNotMatch(await privateSitemap.text(), /<loc>/i, `${host} does not publish marketing URLs`);
}

const sitemapResponse = await get("/sitemap.xml");
assert.equal(sitemapResponse.status, 200, "sitemap.xml returns 200");
const sitemapXml = await sitemapResponse.text();
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(([, location]) => new URL(location));
const sitemapPaths = new Set(sitemapUrls.map(({ pathname }) => pathname));
for (const path of requiredRoutes) assert.ok(sitemapPaths.has(path), `sitemap includes ${path}`);
for (const url of sitemapUrls) {
  assert.equal(url.origin, "https://auterim.com", `${url.pathname} uses the canonical host`);
  assert.equal(url.search, "", `${url.pathname} has no query string`);
  assert.ok(url.pathname === "/" || !url.pathname.endsWith("/"), `${url.pathname} has no trailing slash`);
  const response = await get(url.pathname);
  assert.equal(response.status, 200, `${url.pathname} is a live public page`);
  const html = await response.text();

  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  assert.ok(title && title.length > 5, `${url.pathname} has a useful title`);
  const descriptions = tags(html, /\bname=["']description["']/i);
  assert.equal(descriptions.length, 1, `${url.pathname} has one meta description`);
  const description = attr(descriptions[0], "content");
  assert.ok(description && description.length >= 40, `${url.pathname} has a substantive description`);

  const canonicals = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag).filter((tag) => /\brel=["']canonical["']/i.test(tag));
  assert.equal(canonicals.length, 1, `${url.pathname} has one canonical link`);
  assert.equal(attr(canonicals[0], "href"), url.href.replace(/\/$/, ""), `${url.pathname} canonical is exact`);

  const robotsMetas = tags(html, /\bname=["'](?:robots|googlebot)["']/i);
  assert.ok(!robotsMetas.some((tag) => /noindex/i.test(attr(tag, "content") ?? "")), `${url.pathname} is indexable`);
  assert.equal([...html.matchAll(/<h1\b/gi)].length, 1, `${url.pathname} has one semantic h1`);
  assert.ok(tags(html, /\bproperty=["']og:title["']/i).length > 0, `${url.pathname} has Open Graph title metadata`);
  assert.ok(tags(html, /\bproperty=["']og:description["']/i).length > 0, `${url.pathname} has Open Graph description metadata`);
  const ogUrls = tags(html, /\bproperty=["']og:url["']/i);
  assert.equal(ogUrls.length, 1, `${url.pathname} has one Open Graph URL`);
  assert.equal(attr(ogUrls[0], "content"), url.href.replace(/\/$/, ""), `${url.pathname} Open Graph URL is canonical`);
  assert.ok(tags(html, /\bname=["']twitter:card["']/i).length > 0, `${url.pathname} has a Twitter card`);

  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, payload] of jsonLd) {
    const parsed = JSON.parse(payload);
    assert.equal(parsed["@context"], "https://schema.org", `${url.pathname} emits Schema.org JSON-LD`);
  }
}

for (const path of ["/agents", "/integrations"]) {
  const alias = await get(path, { redirect: "manual" });
  assert.equal(alias.status, 308, `${path} permanently redirects`);
  const target = new URL(alias.headers.get("location"), baseUrl);
  assert.equal(target.pathname, path === "/agents" ? "/operators" : "/connectors", `${path} redirects to its canonical destination`);
}

for (const path of ["/status", "/customers", "/api-reference", "/app-preview"]) {
  const response = await get(path);
  assert.equal(response.status, 200, `${path} remains available as a public route`);
  const html = await response.text();
  const robotsMeta = tags(html, /\bname=["']robots["']/i);
  assert.ok(robotsMeta.some((tag) => /noindex/i.test(attr(tag, "content") ?? "")), `${path} is noindex`);
}

const trailingSlashAlias = await get("/pricing/", { redirect: "manual" });
assert.equal(trailingSlashAlias.status, 308, "trailing-slash paths permanently canonicalize");
assert.equal(new URL(trailingSlashAlias.headers.get("location"), baseUrl).pathname, "/pricing", "trailing slash redirects to the clean path");
const wwwAlias = await get("/", { headers: { "x-forwarded-host": "www.auterim.com" }, redirect: "manual" });
assert.equal(wwwAlias.status, 308, "www permanently redirects to the apex host");
assert.equal(new URL(wwwAlias.headers.get("location")).hostname, "auterim.com", "www redirects to the canonical apex host");

const queryPage = await get("/pricing?utm_source=chatgpt.com");
assert.equal(queryPage.status, 200, "UTM attribution parameters keep the page usable");
const queryHtml = await queryPage.text();
assert.match(queryHtml, /href=["']https:\/\/auterim\.com\/pricing["']/, "UTM URLs retain a clean canonical");
const home = await get("/");
const homeHtml = await home.text();
const visibleHtml = homeHtml.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
for (const fact of [
  "finds the work", "operating layer between a business", "Revenue Operator", "Client Flow Operator",
  "Operations Operator", "Support Operator", "$99", "$299", "$799", "approval",
]) assert.ok(visibleHtml.toLowerCase().includes(fact.toLowerCase()), `initial HTML contains ${fact}`);
assert.match(readSource("src/components/home-v3/auterim-v3-refinement.css"), /:not\(\.motion-ready\)\s+\.rv\s*\{[^}]*opacity:\s*1/s, "server-rendered reveal content stays visible before hydration");

const homeSchemas = [...homeHtml.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .map(([, payload]) => JSON.parse(payload));
const organization = homeSchemas.find((schema) => schema["@type"] === "Organization");
assert.equal(organization?.name, "Auterim", "homepage organization schema names the canonical entity");
assert.equal(organization?.url, "https://auterim.com", "homepage organization schema uses the canonical domain");
const software = homeSchemas.find((schema) => schema["@type"] === "SoftwareApplication");
assert.deepEqual(software?.offers?.map((offer) => offer.price), [99, 299, 799], "software schema matches live monthly prices");
assert.ok(software.offers.every((offer) => offer.priceCurrency === "USD" && offer.priceSpecification.billingDuration === "P1M"), "software offers declare USD monthly pricing");
const faq = homeSchemas.find((schema) => schema["@type"] === "FAQPage");
assert.ok(faq?.mainEntity?.length >= 5, "homepage FAQ schema reflects the visible FAQ section");

const llms = await get("/llms.txt");
assert.equal(llms.status, 200, "llms.txt is served publicly");
assert.match(llms.headers.get("content-type") ?? "", /text\/plain/i, "llms.txt is plain text");
const llmsText = await llms.text();
for (const path of ["/how-it-works", "/operators", "/connectors", "/pricing", "/security", "/changelog", "/contact"]) {
  assert.ok(llmsText.includes(`https://auterim.com${path}`), `llms.txt links to ${path}`);
}
assert.ok(!/https:\/\/app\.auterim\.com|https:\/\/admin\.auterim\.com|\/api\//i.test(llmsText), "llms.txt does not expose private endpoints");

const missing = await get("/__discovery_harness_missing_route__");
assert.equal(missing.status, 404, "unknown routes return a real 404");

const attributionProvider = readSource("src/components/early-access/early-access-provider.tsx");
assert.match(attributionProvider, /params\.get\(["']utm_source["']\)\s*\|\|\s*stored\?\.utmSource/, "Early Access retains chatgpt.com UTM source values");
const indexNowVerification = await get("/indexnow-key");
if (process.env.INDEXNOW_KEY?.trim()) {
  assert.equal(indexNowVerification.status, 200, "configured IndexNow key is publicly verifiable");
  assert.equal(await indexNowVerification.text(), process.env.INDEXNOW_KEY.trim(), "IndexNow verification response matches the configured key");
} else {
  assert.equal(indexNowVerification.status, 404, "unset IndexNow key is not exposed");
}

console.log(`public-discovery-smoke: verified ${sitemapPaths.size} sitemap pages, crawler policy, canonical metadata, structured data, attribution, and private-host exclusions.`);

function readSource(path) {
  // Read lazily so the runtime suite does not require any TS execution layer.
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

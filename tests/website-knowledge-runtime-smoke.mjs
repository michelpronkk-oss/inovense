import assert from "node:assert/strict";
import fs from "node:fs";
import { transform } from "esbuild";

async function load(entry) {
  let source = fs.readFileSync(entry, "utf8");
  if (entry.endsWith("website-url.ts") || entry.endsWith("website-extraction.ts")) {
    const limits = fs.readFileSync("src/lib/connectors/website-limits.ts", "utf8").replace(/\bexport\s+/g, "");
    source = source.replace('import { WEBSITE_LIMITS } from "./website-limits";', limits);
  }
  const result = await transform(source, { loader: "ts", format: "esm", target: "node22" });
  return import(`data:text/javascript,${encodeURIComponent(result.code)}`);
}

const { normalizeWebsiteOrigin, canonicalizeWebsiteUrl, websiteUrlAllowed } = await load("src/lib/connectors/website-url.ts");
const { parseRobotsTxt, isWebsitePathAllowed } = await load("src/lib/connectors/website-robots.ts");
const { extractWebsitePage, observationsFromWebsitePage } = await load("src/lib/connectors/website-extraction.ts");

assert.equal(normalizeWebsiteOrigin("https://Bücher.example/").origin, "https://xn--bcher-kva.example");
assert.throws(() => normalizeWebsiteOrigin("http://example.com"), /HTTPS/);
assert.throws(() => normalizeWebsiteOrigin("https://user:pass@example.com"), /credentials/);
assert.throws(() => normalizeWebsiteOrigin("https://example.com/company"), /without a path/);
assert.throws(() => normalizeWebsiteOrigin("https://127.0.0.1"), /IP-literal/);
assert.throws(() => normalizeWebsiteOrigin("https://example.com:8443"), /443/);

const origin = normalizeWebsiteOrigin("https://example.com");
assert.equal(canonicalizeWebsiteUrl("https://example.com/products/?utm_source=ad&b=2", origin), "https://example.com/products?b=2");
assert.equal(canonicalizeWebsiteUrl("https://evil.example/products", origin), null);
assert.equal(canonicalizeWebsiteUrl("https://docs.example.com/guide", origin, { allowedSubdomains: ["docs.example.com"] }), "https://docs.example.com/guide");
assert.equal(canonicalizeWebsiteUrl("https://example.com/?session=secret", origin), null);
assert.equal(websiteUrlAllowed({ url: "https://example.com/products/a", origin, includePaths: ["/products/*"], excludePaths: ["/products/private/*"] }), true);
assert.equal(websiteUrlAllowed({ url: "https://example.com/products/private/a", origin, includePaths: ["/products/*"], excludePaths: ["/products/private/*"] }), false);

const robots = parseRobotsTxt(`User-agent: *\nDisallow: /private\nAllow: /private/public\n\nUser-agent: AuterimBot\nDisallow: /internal\nSitemap: https://example.com/sitemap.xml\nCrawl-delay: 2`);
assert.equal(isWebsitePathAllowed(robots, "/private", "OtherBot"), false);
assert.equal(isWebsitePathAllowed(robots, "/private/public", "OtherBot"), true);
assert.equal(isWebsitePathAllowed(robots, "/internal", "AuterimBot"), false);
assert.equal(robots.crawlDelayMs, 2_000);
assert.deepEqual(robots.sitemaps, ["https://example.com/sitemap.xml"]);

const page = extractWebsitePage(`<!doctype html><html lang="en"><head><title>Auterim</title><meta name="description" content="AI workforce"> <meta name="robots" content="noindex, noarchive"></head><body><script>fetch('/danger')</script><main><h1>Auterim</h1><p>Contact hello@auterim.com in Europe.</p></main></body></html>`);
assert.equal(page.language, "en");
assert.equal(page.noindex, true);
assert.equal(page.noarchive, true);
assert.doesNotMatch(page.readableText, /fetch\('\/danger'\)/);
const observations = observationsFromWebsitePage(page);
assert.ok(observations.some((item) => item.observationKey === "website.company.title"));
assert.ok(observations.some((item) => item.observationKey === "website.contact.email.hello@auterim.com"));
assert.ok(observations.every((item) => item.evidenceExcerpt.length <= 500));

console.log("Website URL, robots, extraction, canonicalization, and governance runtime contracts passed.");

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const footer = read("src/components/home-v3/v3-footer.tsx");
const routes = [
  ["/how-it-works", "src/app/how-it-works/page.tsx"],
  ["/operators", "src/app/operators/page.tsx"],
  ["/control", "src/app/control/page.tsx"],
  ["/connectors", "src/app/connectors/page.tsx"],
  ["/pricing", "src/app/pricing/page.tsx"],
  ["/use-cases", "src/app/use-cases/page.tsx"],
  ["/getting-started", "src/app/getting-started/page.tsx"],
  ["/security", "src/app/security/page.tsx"],
  ["/docs", "src/app/docs/page.tsx"],
  ["/changelog", "src/app/changelog/page.tsx"],
  ["/about", "src/app/about/page.tsx"],
  ["/contact", "src/app/contact/page.tsx"],
  ["/privacy", "src/app/privacy/page.tsx"],
  ["/terms", "src/app/terms/page.tsx"],
  ["/cookies", "src/app/cookies/page.tsx"],
];

for (const [href, page] of routes) {
  assert.ok(footer.includes(`href="${href}"`), `footer links to ${href}`);
  assert.ok(existsSync(resolve(process.cwd(), page)), `${href} route exists`);
  const source = read(page);
  if (href !== "/changelog") assert.ok(source.includes(`https://auterim.com${href}`), `${href} declares its canonical URL`);
  assert.match(source, /openGraph:/, `${href} has Open Graph metadata`);
  assert.match(source, /twitter:/, `${href} has Twitter metadata`);
  assert.match(source, /robots: \{ index: true, follow: true \}/, `${href} explicitly remains indexable`);
}

for (const href of ["/#how", "/#operators", "/#control", "/#connectors", "/#pricing"]) {
  assert.ok(!footer.includes(`href="${href}"`), `footer does not send ${href} back to the homepage`);
}

const sitemap = read("src/app/sitemap.ts");
for (const [href] of routes) assert.ok(sitemap.includes(`"${href}"`), `sitemap includes ${href}`);
for (const privatePath of ["/app", "/admin", "/api", "/onboarding"]) assert.ok(!sitemap.includes(`"${privatePath}"`), `sitemap excludes ${privatePath}`);

const pricing = read("src/app/pricing/page.tsx");
const pricingComponents = read("src/components/home-v3/public-page-components.tsx");
const pricingCatalog = read("src/lib/pricing.ts");
for (const slug of ["foundation", "workforce", "scale"]) assert.ok(pricingCatalog.includes(`plan_tier: "${slug}"`), `canonical plan ${slug} remains in billing catalog`);
assert.match(pricing, /PublicPricing plans=\{pricingPlans\}/, "public prices use the canonical billing catalog");
assert.match(pricingComponents, /plan=\{plan\.plan_tier\}/, "pricing CTA passes plan context to Early Access");
assert.doesNotMatch(`${pricing}\n${pricingComponents}`, /Starter|Growth/);
assert.match(read("src/components/home-v3/request-early-access-button.tsx"), /openEarlyAccess\(\{ plan, trigger:/, "public CTA opens the canonical Early Access modal");

const integrationAlias = read("src/app/integrations/page.tsx");
assert.match(integrationAlias, /redirect\("\/connectors"\)/, "legacy integrations URL redirects to its canonical connector route");

for (const path of ["src/app/privacy/page.tsx", "src/app/terms/page.tsx", "src/app/cookies/page.tsx"]) {
  const content = read(path);
  assert.ok(!content.includes("legal-notice"), `${path} has no warning banner`);
  assert.ok(!content.toLowerCase().includes("reviewed with counsel"), `${path} does not imply legal review`);
  assert.ok(!content.includes("May 2026"), `${path} has an updated legal date`);
}
assert.match(read("src/components/home-v3/public-page-components.tsx"), /Last updated: September 2026/);

const contactApi = read("src/app/api/contact/route.ts");
assert.match(contactApi, /new Resend\(apiKey\)\.emails\.send/, "contact endpoint delivers the validated message");
assert.match(contactApi, /ALLOWED_REASONS/, "contact endpoint validates the selected reason");
assert.match(contactApi, /escapeHtml\(message\)/, "contact message is escaped before HTML email rendering");

const connectors = read("src/app/connectors/page.tsx");
assert.match(connectors, /CONNECTOR_CATALOG\.values|Object\.values\(CONNECTOR_CATALOG\)/, "connector page reads the product registry");
assert.match(connectors, /status === "available"/, "only available connectors are shown");
const operators = read("src/app/operators/page.tsx");
for (const current of ["Revenue Operator", "Client Flow Operator", "Operations Operator", "Support Operator"]) assert.ok(operators.includes(current), `current role ${current} is shown`);
for (const future of ["Finance", "Marketing", "Recruiting", "Procurement", "Compliance", "Data"]) assert.ok(operators.includes(future), `roadmap role ${future} is labeled separately`);

const docs = read("src/app/docs/page.tsx");
assert.match(docs, /Documentation is expanding during Early Access/);
assert.doesNotMatch(docs, /href="\/app\//);
console.log("public-footer-pages-smoke: all route, footer, metadata, and product-truth checks passed.");

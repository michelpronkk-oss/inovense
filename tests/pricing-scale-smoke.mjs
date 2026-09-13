import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const planIdentitySource = read("src/lib/plan-identity.ts");
const pricingSource = read("src/lib/pricing.ts");
const entitlementsSource = read("src/lib/os/entitlements.ts");
const dodoProductsSource = read("src/lib/billing/dodo-products.ts");
const dodoSource = read("src/lib/billing/dodo.ts");
const checkout = read("src/app/api/billing/dodo/checkout/route.ts");
const webhook = read("src/app/api/billing/dodo/webhook/route.ts");
const publicPricing = read("src/components/pricing/pricing-plans.tsx");
const pricingPage = read("src/app/pricing/page.tsx");
const pricingFinalCta = read("src/components/pricing/pricing-page-final-cta.tsx");
const publicHome = read("src/components/home-v3/v3-page.tsx");
const appPricing = read("src/app/app/plans/page.tsx");
const legacyHomePricing = read("src/components/home/claude-home.jsx");
const legacyHomeRoute = read("src/app/home-v2/page.tsx");
const dormantHomePricing = read("src/components/home-v3/pricing.tsx");
const planLimits = read("src/lib/os/plans.ts");
const operatorRegistry = read("src/lib/operators/registry.ts");
const adminSection = read("src/app/admin/[section]/page.tsx");
const adminRevenue = read("src/app/admin/revenue/page.tsx");
const migration = read("supabase/migrations/20260907_add_scale_plan_tier.sql");
const canonicalMigration = read("supabase/migrations/20260913_canonical_plan_slugs.sql");
const earlyAccessMigration = read("supabase/migrations/20260913_early_access_requests.sql");
const envExample = read(".env.example");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-pricing-scale-"));

async function loadModule(source, filename, replacements = []) {
  let transformedSource = source;
  for (const [from, to] of replacements) transformedSource = transformedSource.replace(from, to);
  const { code } = esbuild.transformSync(transformedSource, { loader: "ts", format: "esm", target: "node18" });
  const target = path.join(tmpDir, filename);
  fs.writeFileSync(target, code);
  return import(`${pathToFileURL(target).href}?v=${Math.random()}`);
}

try {
  const identity = await loadModule(planIdentitySource, "plan-identity.mjs");
  globalThis.__canonicalPlanIdentity = identity;
  const pricing = await loadModule(pricingSource, "pricing.mjs", [
    [/import \{ getPublicSignInHref, getPublicWorkspaceCta, type PublicUserState \} from "@\/lib\/public-user-state";\r?\n/, "const getPublicSignInHref = () => \"/login\"; const getPublicWorkspaceCta = () => ({ href: \"/onboarding\" });\n"],
    [/import \{ appHref \} from "@\/lib\/urls";\r?\n/, "const appHref = (value) => value;\n"],
    [/import \{ PLAN_LABELS, PLAN_SLUGS, type PlanSlug \} from "@\/lib\/plan-identity";\r?\n/, "const { PLAN_LABELS, PLAN_SLUGS } = globalThis.__canonicalPlanIdentity;\n"],
  ]);
  const entitlements = await loadModule(entitlementsSource, "entitlements.mjs", [
    [/import \{ normalizeWorkspacePlanTier, type WorkspacePlanTier \} from "@\/lib\/plan-identity";\r?\n/, "const { normalizeWorkspacePlanTier } = globalThis.__canonicalPlanIdentity;\n"],
  ]);
  const dodoProducts = await loadModule(dodoProductsSource, "dodo-products.mjs", [
    [/import "server-only";\r?\n/, ""],
    [/import \{ isPlanSlug, PLAN_SLUGS, type PlanSlug \} from "@\/lib\/plan-identity";\r?\n/, "const { isPlanSlug, PLAN_SLUGS } = globalThis.__canonicalPlanIdentity;\n"],
  ]);
  globalThis.__testDodoProducts = dodoProducts;
  const dodo = await loadModule(dodoSource, "dodo.mjs", [
    [/import "server-only";\r?\n/, ""],
    [/import \{ getDodoProductId \} from "@\/lib\/billing\/dodo-products";\r?\n/, "const { getDodoProductId } = globalThis.__testDodoProducts;\n"],
  ]);

  assert.deepEqual(pricing.pricingPlans.map((plan) => plan.plan_tier), ["foundation", "workforce", "scale"], "exactly Foundation, Workforce, and Scale are public self-serve plans");
  assert.deepEqual(pricing.SELF_SERVE_PLAN_ORDER, ["foundation", "workforce", "scale"], "upgrade order must be explicit");
  assert.equal(pricing.getSelfServePlanRank("foundation"), 0);
  assert.equal(pricing.getSelfServePlanRank("workforce"), 1);
  assert.equal(pricing.getSelfServePlanRank("scale"), 2);

  const [foundation, workforce, scale] = pricing.pricingPlans;
  assert.equal(foundation.plan_name, "Foundation");
  assert.equal(foundation.price, "$99");
  assert.equal(foundation.metadata.operators_limit, 3);
  assert.equal(foundation.metadata.connectors_limit, 3);
  assert.equal(foundation.metadata.actions_limit, 1000);
  assert.equal(workforce.plan_name, "Workforce");
  assert.equal(workforce.price, "$299");
  assert.equal(workforce.metadata.operators_limit, 8);
  assert.equal(workforce.metadata.connectors_limit, 8);
  assert.equal(workforce.metadata.actions_limit, 5000);
  assert.equal(scale.plan_name, "Scale");
  assert.equal(scale.cta, "Request early access");
  assert.equal(scale.price, "$799");
  assert.equal(scale.metadata.operators_limit, 20);
  assert.equal(scale.metadata.connectors_limit, 20);
  assert.equal(scale.metadata.actions_limit, 20000);
  assert.equal(scale.metadata.support_level, "priority");
  assert.ok(workforce.features.includes("Slack and email approvals"));
  assert.ok(scale.features.includes("Slack and email approvals"));
  assert.ok(scale.features.includes("Priority support"));
  assert.equal(pricing.getBillingEntitlementsForPlan("foundation").supportLevel, "email");
  assert.equal(pricing.getBillingEntitlementsForPlan("workforce").supportLevel, "priority");
  assert.ok(!pricing.pricingPlans.some((plan) => plan.plan_name === "Enterprise"), "Enterprise must not be a public self-serve plan");
  assert.equal(foundation.cta, "Request early access");
  assert.equal(workforce.cta, "Request early access");

  const scaleBilling = pricing.getBillingEntitlementsForPlan("scale");
  assert.equal(scaleBilling.planTier, "scale");
  assert.equal(scaleBilling.operatorsLimit, 20);
  assert.equal(scaleBilling.connectorsLimit, 20);
  assert.equal(scaleBilling.actionsLimit, 20000);
  assert.equal(scaleBilling.canRunRealActions, true, "Scale must remain execution eligible when billing is valid");

  const scaleEntitlements = entitlements.getEntitlements({ id: "scale", name: "Scale", environment: "production", region: "eu", plan: "Scale", planTier: "scale", billingStatus: "active" });
  assert.equal(scaleEntitlements.operatorsLimit, 20);
  assert.equal(scaleEntitlements.connectorsLimit, 20);
  assert.equal(scaleEntitlements.actionsLimit, 20000);
  assert.equal(scaleEntitlements.canRunRealActions, true);
  assert.equal(entitlements.resolveWorkspacePlanTier({ id: "legacy", name: "Legacy", environment: "production", region: "eu", plan: "Workforce", planTier: "growth" }), "workforce", "existing Workforce rows normalize at the read boundary");

  assert.match(checkout, /isPlanSlug\(value\)/, "checkout accepts only canonical plan slugs");
  assert.doesNotMatch(checkout, /product_id/i, "checkout route does not accept a product ID from the browser");
  assert.match(webhook, /getPlanFromDodoProductId\(productId\)/, "webhook resolves plan from configured Dodo products");
  assert.doesNotMatch(webhook, /explicitPlan/, "signed metadata alone cannot assign a plan");
  assert.match(webhook, /plan_slug: plan/, "normalized subscription snapshots persist a canonical plan slug");
  assert.match(webhook, /plan: PLAN_LABELS\[plan\]/, "workspace plan display uses canonical labels");
  assert.match(webhook, /trial_period_days/, "webhook must read Dodo trial facts");
  assert.match(webhook, /subscription\.active/, "initial active subscriptions with a future trial end must remain trialing");
  assert.match(envExample, /DODO_PRODUCT_FOUNDATION=/);
  assert.match(envExample, /DODO_PRODUCT_WORKFORCE=/);
  assert.match(envExample, /DODO_PRODUCT_SCALE=/);
  assert.doesNotMatch(envExample, /DODO_PRODUCT_STARTER|DODO_PRODUCT_GROWTH|DODO_SCALE_PRICE_ID|DODO_PRODUCT_OPERATOR/);
  assert.match(dodoSource, /trial_period_days: input\.trialDays/, "Dodo checkout must use the server-authorized trial duration");
  assert.match(dodoProductsSource, /import "server-only"/);
  assert.doesNotMatch(dodoProductsSource, /NEXT_PUBLIC/);
  assert.match(canonicalMigration, /check \(plan_tier in \('preview', 'foundation', 'workforce', 'scale', 'starter', 'growth', 'operator', 'enterprise'\)\)/);
  assert.match(canonicalMigration, /check \(trial_plan in \('foundation', 'workforce', 'scale', 'starter', 'growth'\)\)/);
  assert.match(canonicalMigration, /plan_slug in \('foundation', 'workforce', 'scale'\)/);
  assert.match(earlyAccessMigration, /interested_plan text check \(interested_plan is null or interested_plan in \('foundation', 'workforce', 'scale'\)\)/);
  assert.match(migration, /'scale'/, "database constraint must allow Scale");
  assert.match(migration, /'starter', 'growth', 'scale', 'operator', 'enterprise'/, "migration must retain all existing values");
  assert.match(planLimits, /scale:/, "central plan-limit configuration must include Scale");
  assert.match(planLimits, /maxMonthlyRuns: 20000/);
  assert.match(operatorRegistry, /\["foundation", "workforce", "scale", "operator", "enterprise"\]/, "canonical slugs must be eligible for operator execution");
  assert.match(adminSection, /getPlanLabel/, "Admin customer records must render canonical plan names");
  assert.match(adminRevenue, /getPlanLabel/, "Admin revenue rows must render canonical plan names");
  assert.match(publicPricing, /xl:grid-cols-3/, "public pricing cards must support three columns on desktop");
  assert.match(publicPricing, /useEarlyAccess/);
  assert.match(publicPricing, /plan: plan\.plan_tier/);
  assert.doesNotMatch(publicPricing, /dodo\/checkout|resolvePublicPlanCta/);
  assert.match(pricingPage, /<EarlyAccessProvider>/, "the canonical public pricing page provides the same Early Access modal");
  assert.match(pricingPage, /<Nav earlyAccessCta \/>/);
  assert.match(pricingFinalCta, /openEarlyAccess\(\{ trigger:/);
  assert.match(publicHome, /pricingPlans\.map/, "home pricing must draw from the central catalog");
  assert.match(appPricing, /pricingPlans\.map/, "in-app billing cards must draw from the central catalog");
  assert.match(legacyHomePricing, /openEarlyAccess\(\{ plan: t\.plan_tier, trigger:/, "legacy noindex home pricing must preserve canonical plan attribution");
  assert.doesNotMatch(legacyHomePricing, /resolvePublicPlanCta|Start self-serve/, "legacy home pricing must not retain direct checkout or self-serve claims");
  assert.match(legacyHomeRoute, /<EarlyAccessProvider>/, "the legacy noindex home route supplies the Early Access context");
  assert.match(dormantHomePricing, /pricingPlans\.map/, "the dormant pricing component draws from the central catalog");
  assert.match(dormantHomePricing, /openEarlyAccess\(\{ plan: t\.plan_tier, trigger:/, "the dormant pricing component preserves canonical plan interest");
  assert.doesNotMatch(dormantHomePricing, /Starter|Growth|Enterprise|\$1,200/);
  assert.doesNotMatch(publicPricing, /enterprise/, "public pricing UI must not retain an Enterprise branch");

  const envNames = ["DODO_PRODUCT_FOUNDATION", "DODO_PRODUCT_WORKFORCE", "DODO_PRODUCT_SCALE", "DODO_API_KEY", "DODO_CHECKOUT_SESSIONS_URL"];
  const savedEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  try {
    process.env.DODO_PRODUCT_FOUNDATION = "test-product-foundation";
    process.env.DODO_PRODUCT_WORKFORCE = "test-product-workforce";
    process.env.DODO_PRODUCT_SCALE = "test-product-scale";
    process.env.DODO_API_KEY = "test-api-key";
    process.env.DODO_CHECKOUT_SESSIONS_URL = "https://dodo.test/checkouts";
    for (const [slug, productId] of [["foundation", "test-product-foundation"], ["workforce", "test-product-workforce"], ["scale", "test-product-scale"]]) {
      assert.equal(dodoProducts.getDodoProductId(slug), productId, `${slug} resolves from its named server env var`);
      assert.equal(dodoProducts.getPlanFromDodoProductId(productId), slug, `${slug} Dodo product resolves back to its plan`);
    }
    assert.equal(dodoProducts.getPlanFromDodoProductId("unknown-product"), null, "unknown Dodo products do not map to a plan");
    assert.throws(() => dodoProducts.getDodoProductId("starter"), /Invalid canonical plan/);
    delete process.env.DODO_PRODUCT_WORKFORCE;
    assert.throws(() => dodoProducts.getDodoProductId("workforce"), /DODO_PRODUCT_WORKFORCE/);
    process.env.DODO_PRODUCT_WORKFORCE = "test-product-workforce";
    process.env.DODO_PRODUCT_SCALE = "test-product-workforce";
    assert.throws(() => dodoProducts.getPlanFromDodoProductId("test-product-workforce"), /ambiguous/);
    process.env.DODO_PRODUCT_SCALE = "test-product-scale";

    let checkoutPayload;
    globalThis.fetch = async (_url, init) => {
      checkoutPayload = JSON.parse(init.body);
      return new Response(JSON.stringify({ checkout_url: "https://checkout.example/session" }), { status: 200, headers: { "content-type": "application/json" } });
    };
    await dodo.createDodoCheckoutSession({ plan: "workforce", trialDays: 0, siteUrl: "https://app.auterim.com", productId: "attacker-controlled-product" });
    assert.equal(checkoutPayload.product_cart[0].product_id, "test-product-workforce", "checkout ignores an arbitrary product ID supplied beside the plan");
    assert.equal(checkoutPayload.metadata.plan, "workforce");
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }

  console.log("Canonical pricing, entitlements, Dodo product resolution, checkout safety, and legacy compatibility contracts passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete globalThis.__canonicalPlanIdentity;
  delete globalThis.__testDodoProducts;
}

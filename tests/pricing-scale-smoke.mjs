import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pricingSource = read("src/lib/pricing.ts");
const entitlementsSource = read("src/lib/os/entitlements.ts");
const checkout = read("src/app/api/billing/dodo/checkout/route.ts");
const webhook = read("src/app/api/billing/dodo/webhook/route.ts");
const publicPricing = read("src/components/pricing/pricing-plans.tsx");
const publicHome = read("src/components/home-v3/v3-page.tsx");
const appPricing = read("src/app/app/plans/page.tsx");
const planLimits = read("src/lib/os/plans.ts");
const operatorRegistry = read("src/lib/operators/registry.ts");
const migration = read("supabase/migrations/20260907_add_scale_plan_tier.sql");
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
  const pricing = await loadModule(pricingSource, "pricing.mjs", [
    [/import \{ getPublicSignInHref, getPublicWorkspaceCta, type PublicUserState \} from "@\/lib\/public-user-state";\r?\n/, "const getPublicSignInHref = () => \"/login\"; const getPublicWorkspaceCta = () => ({ href: \"/onboarding\" });\n"],
    [/import \{ appHref \} from "@\/lib\/urls";\r?\n/, "const appHref = (value) => value;\n"],
  ]);
  const entitlements = await loadModule(entitlementsSource, "entitlements.mjs");

  assert.deepEqual(pricing.pricingPlans.map((plan) => plan.plan_tier), ["starter", "growth", "scale"], "exactly Foundation, Workforce, and Scale are public self-serve plans");
  assert.deepEqual(pricing.SELF_SERVE_PLAN_ORDER, ["starter", "growth", "scale"], "upgrade order must be explicit");
  assert.equal(pricing.getSelfServePlanRank("starter"), 0);
  assert.equal(pricing.getSelfServePlanRank("growth"), 1);
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
  assert.equal(scale.price, "$799");
  assert.equal(scale.metadata.operators_limit, 20);
  assert.equal(scale.metadata.connectors_limit, 20);
  assert.equal(scale.metadata.actions_limit, 20000);
  assert.equal(scale.metadata.support_level, "priority");
  assert.ok(!pricing.pricingPlans.some((plan) => plan.plan_name === "Enterprise"), "Enterprise must not be a public self-serve plan");
  assert.equal(pricing.resolvePublicPlanCta(scale, "signed_in").href, "/api/billing/dodo/checkout?plan=scale", "Scale must have a live checkout CTA");

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
  assert.equal(entitlements.resolveWorkspacePlanTier({ id: "legacy", name: "Legacy", environment: "production", region: "eu", plan: "Workforce", planTier: "growth" }), "growth", "existing Workforce workspace values must remain valid");

  assert.match(checkout, /value === "scale"/, "checkout must accept Scale");
  assert.match(checkout, /DODO_PRODUCT_SCALE/, "Scale checkout must fail closed when its Dodo product is missing");
  assert.match(webhook, /DODO_PRODUCT_SCALE/, "Scale Dodo events must map to Scale");
  assert.match(webhook, /explicitPlan === "scale"/, "Scale webhook metadata must be accepted");
  assert.match(webhook, /plan === "scale" \? "Scale"/, "webhook must persist a truthful Scale display plan");
  assert.match(envExample, /DODO_PRODUCT_SCALE=/, "Scale requires an explicit server-side Dodo product configuration");
  assert.match(migration, /'scale'/, "database constraint must allow Scale");
  assert.match(migration, /'starter', 'growth', 'scale', 'operator', 'enterprise'/, "migration must retain all existing values");
  assert.match(planLimits, /scale:/, "central plan-limit configuration must include Scale");
  assert.match(planLimits, /maxMonthlyRuns: 20000/);
  assert.match(operatorRegistry, /\["starter", "growth", "scale", "operator", "enterprise"\]/, "Scale must be eligible for active operator execution");
  assert.match(publicPricing, /xl:grid-cols-3/, "public pricing cards must support three columns on desktop");
  assert.match(publicHome, /pricingPlans\.map/, "home pricing must draw from the central catalog");
  assert.match(appPricing, /pricingPlans\.map/, "in-app billing cards must draw from the central catalog");
  assert.doesNotMatch(publicPricing, /enterprise/, "public pricing UI must not retain an Enterprise branch");

  console.log("Scale pricing, entitlements, checkout safety, and compatibility contracts passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

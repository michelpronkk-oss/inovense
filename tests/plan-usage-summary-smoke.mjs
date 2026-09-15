import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-plan-usage-"));

async function loadModule(source, filename, replacements = []) {
  let transformedSource = source;
  for (const [from, to] of replacements) transformedSource = transformedSource.replace(from, to);
  const { code } = esbuild.transformSync(transformedSource, { loader: "ts", format: "esm", target: "node18" });
  const target = path.join(tempDir, filename);
  fs.writeFileSync(target, code);
  return import(`${pathToFileURL(target).href}?v=${Math.random()}`);
}

try {
  const identity = await loadModule(read("src/lib/plan-identity.ts"), "plan-identity.mjs");
  globalThis.__planIdentity = identity;

  const pricing = await loadModule(read("src/lib/pricing.ts"), "pricing.mjs", [
    [/import \{ PLAN_LABELS, PLAN_SLUGS, type PlanSlug \} from "@\/lib\/plan-identity";\r?\n/, "const { PLAN_LABELS, PLAN_SLUGS } = globalThis.__planIdentity;\n"],
  ]);
  globalThis.__planPricing = pricing;

  const planLimits = await loadModule(read("src/lib/os/plans.ts"), "plans.mjs", [
    [/import \{ normalizeWorkspacePlanTier, type WorkspacePlanTier \} from "@\/lib\/plan-identity";\r?\n/, "const { normalizeWorkspacePlanTier } = globalThis.__planIdentity;\n"],
  ]);
  globalThis.__planLimits = planLimits;

  const entitlements = await loadModule(read("src/lib/os/entitlements.ts"), "entitlements.mjs", [
    [/import \{ normalizeWorkspacePlanTier, type WorkspacePlanTier \} from "@\/lib\/plan-identity";\r?\n/, "const { normalizeWorkspacePlanTier } = globalThis.__planIdentity;\n"],
  ]);
  globalThis.__osEntitlements = entitlements;

  const summary = await loadModule(read("src/lib/billing/plan-usage-summary.ts"), "plan-usage-summary.mjs", [
    [/import \{ getBillingEntitlementsForPlan, type BillingPlanTier \} from "@\/lib\/pricing";\r?\n/, "const { getBillingEntitlementsForPlan } = globalThis.__planPricing;\n"],
    [/import \{ getPlanLimits \} from "@\/lib\/os\/plans";\r?\n/, "const { getPlanLimits } = globalThis.__planLimits;\n"],
  ]);

  const usageInput = (workspace, overrides = {}) => ({
    entitlements: entitlements.getEntitlements(workspace),
    activeOperators: 1,
    operatorUsageStatus: "loading",
    connectedSystems: 1,
    activeTeamSeats: 1,
    ...overrides,
  });

  for (const [tier, limit] of [["foundation", 3], ["workforce", 8], ["scale", 20]]) {
    const workspace = { id: tier, name: tier, environment: "production", region: "eu", plan: tier, planTier: tier, billingStatus: "active" };
    const metrics = summary.getPlanUsageMetrics(usageInput(workspace, { operatorUsageStatus: "unavailable" }));
    assert.deepEqual(metrics.map(({ label, value, detail }) => [label, value, detail]), [
      ["Operators", `1 / ${limit}`, "active"],
      ["Connected systems", `1 / ${limit}`, "connected"],
      ["Team seats", `1 / ${limit}`, "active"],
    ], `${tier} reports live usage separately from its shared plan limits`);
  }

  const canceledMetrics = summary.getPlanUsageMetrics(usageInput({
    id: "canceled", name: "Canceled", environment: "production", region: "eu", plan: "Workforce", planTier: "workforce", billingStatus: "canceled",
  }, { activeOperators: 0, operatorUsageStatus: "ready" }));
  assert.deepEqual(canceledMetrics.map(({ value }) => value), ["0", "1", "1"], "canceled workspaces show zero active operators while retaining connected systems and seats");
  assert.ok(canceledMetrics.every(({ detail }) => detail.includes("capacity up to 8 when access is active")));

  const expiredTrialMetrics = summary.getPlanUsageMetrics(usageInput({
    id: "expired", name: "Expired", environment: "production", region: "eu", plan: "Scale", planTier: "scale", billingStatus: "trialing", trialEndsAt: "2020-01-01T00:00:00.000Z",
  }, { activeOperators: 0, operatorUsageStatus: "ready" }));
  assert.deepEqual(expiredTrialMetrics.map(({ value }) => value), ["0", "1", "1"], "an expired trial never displays paid capacity as active");
  assert.ok(expiredTrialMetrics.every(({ detail }) => detail.includes("capacity up to 20 when access is active")));

  const activePeriodMetrics = summary.getPlanUsageMetrics(usageInput({
    id: "active-period", name: "Active period", environment: "production", region: "eu", plan: "Workforce", planTier: "workforce", billingStatus: "active",
  }, { operatorUsageStatus: "ready" }));
  assert.equal(activePeriodMetrics[0].value, "1 / 8", "an active billing period retains its entitlement limits");

  const loadingMetrics = summary.getPlanUsageMetrics(usageInput({
    id: "loading", name: "Loading", environment: "production", region: "eu", plan: "Foundation", planTier: "foundation", billingStatus: "active",
  }, { activeOperators: null, operatorUsageStatus: "loading" }));
  assert.equal(loadingMetrics[0].value, "— / 3", "unloaded operator usage is not presented as zero");
  assert.equal(loadingMetrics[0].detail, "Loading usage");

  const customMetrics = summary.getPlanUsageMetrics(usageInput({
    id: "enterprise", name: "Enterprise", environment: "production", region: "eu", plan: "Enterprise", planTier: "enterprise", billingStatus: "active",
  }, { operatorUsageStatus: "ready" }));
  assert.deepEqual(customMetrics.map(({ value }) => value), ["1", "1", "1"], "custom/unbounded entitlements display usage without fake numeric caps");
  assert.ok(customMetrics.every(({ detail }) => detail === "active · custom plan limit" || detail === "connected · custom plan limit"));

  console.log("Plans & Billing usage and entitlement summary passed for Foundation, Workforce, Scale, canceled/expired plans, and custom limits.");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-insights-entitlement-smoke");
fs.mkdirSync(tmpDir, { recursive: true });
const identitySource = fs.readFileSync(path.join(root, "src/lib/plan-identity.ts"), "utf8");

async function loadIdentity() {
  const { code } = esbuild.transformSync(identitySource, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, `plan-identity-${Date.now()}.mjs`);
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href);
}

async function loadEntitlements() {
  const source = fs.readFileSync(path.join(root, "src/lib/os/entitlements.ts"), "utf8");
  const replaced = source.replace('import { normalizeWorkspacePlanTier, type WorkspacePlanTier } from "@/lib/plan-identity";', "const { normalizeWorkspacePlanTier } = globalThis.__planIdentity;");
  const { code } = esbuild.transformSync(replaced, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, `entitlements-${Date.now()}.mjs`);
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href);
}

async function loadTruth() {
  const source = fs.readFileSync(path.join(root, "src/lib/os/truth.ts"), "utf8");
  const replaced = source.replace('import { getCanonicalPlanLabel } from "@/lib/plan-identity";', "const { getCanonicalPlanLabel } = globalThis.__planIdentity;");
  const { code } = esbuild.transformSync(replaced, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, `truth-${Date.now()}.mjs`);
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href);
}

const identity = await loadIdentity();
globalThis.__planIdentity = identity;
const base = { id: "ws-insights", name: "Insights test", environment: "production", region: "eu", plan: "foundation" };
const entitlements = await loadEntitlements();
const truth = await loadTruth();

for (const [persisted, expectedLabel, expectedAccess] of [
  ["foundation", "Foundation", false],
  ["workforce", "Workforce", true],
  ["scale", "Scale", true],
]) {
  const workspace = { ...base, plan: persisted, planTier: persisted, billingStatus: "active" };
  assert.equal(entitlements.canAccessInsights(workspace), expectedAccess, `${persisted} Insights entitlement`);
  assert.equal(entitlements.getEntitlements(workspace).features.insights, expectedAccess);
  assert.equal(truth.getPlanLabel(persisted), expectedLabel);
}

assert.equal(truth.getPlanLabel("operator"), "Scale", "legacy operator key must use current Scale display name");
assert.equal(truth.getPlanLabel("enterprise"), "Scale", "legacy enterprise key remains presented with the current Scale label");
assert.equal(truth.getPlanLabel("Workforce"), "Workforce", "current display labels must remain stable");
assert.equal(entitlements.resolveWorkspacePlanTier({ ...base, planTier: "starter" }), "foundation", "legacy Foundation rows normalize at the boundary");
assert.equal(entitlements.resolveWorkspacePlanTier({ ...base, planTier: "growth" }), "workforce", "legacy Workforce rows normalize at the boundary");

for (const [persisted, expectedAccess] of [["workforce", true], ["scale", true], ["foundation", false]]) {
  const workspace = { ...base, plan: persisted, planTier: persisted, billingStatus: "trialing", trialEndsAt: "2099-01-01T00:00:00.000Z" };
  assert.equal(entitlements.canAccessInsights(workspace), expectedAccess, `${persisted} active trial Insights entitlement`);
}

const insights = fs.readFileSync(path.join(root, "src/app/app/insights/page.tsx"), "utf8");
const exportRoute = fs.readFileSync(path.join(root, "src/app/app/insights/export/route.ts"), "utf8");
const prompt = fs.readFileSync(path.join(root, "src/components/upgrade-prompt.tsx"), "utf8");
const truthSource = fs.readFileSync(path.join(root, "src/lib/os/truth.ts"), "utf8");

assert.match(insights, /entitlements\.features\.insights/);
assert.match(insights, /Workforce feature/);
assert.match(insights, /Outcome intelligence/);
assert.match(insights, /requiredPlan="workforce"/);
assert.doesNotMatch(insights, /Operator Plan|OPERATOR PLAN|Upgrade to Operator/);
assert.match(exportRoute, /getVerifiedSupabaseUser/);
assert.match(exportRoute, /requireWorkspaceMember/);
assert.match(exportRoute, /canAccessInsights\(workspace\)/);
assert.match(prompt, /PLAN_LABELS\[requiredPlan\]/, "upgrade prompt renders plan labels from the shared canonical identity model");
assert.doesNotMatch(prompt, /Operator Plan|Upgrade to Operator/);
assert.match(truthSource, /getCanonicalPlanLabel\(planTier\)/);
assert.match(fs.readFileSync(path.join(root, "src/lib/plan-identity.ts"), "utf8"), /slug === "starter"|slug === "growth"/);

console.log("Insights entitlement checks passed: Foundation locked, Workforce/Scale unlocked, active trials preserved, and server export gated by verified membership plus canonical entitlement.");

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-insights-entitlement-smoke");
fs.mkdirSync(tmpDir, { recursive: true });

async function loadEntitlements() {
  const source = fs.readFileSync(path.join(root, "src/lib/os/entitlements.ts"), "utf8");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, `entitlements-${Date.now()}.mjs`);
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href);
}

async function loadTruth() {
  const source = fs.readFileSync(path.join(root, "src/lib/os/truth.ts"), "utf8");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, `truth-${Date.now()}.mjs`);
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href);
}

const base = { id: "ws-insights", name: "Insights test", environment: "production", region: "eu", plan: "starter" };
const entitlements = await loadEntitlements();
const truth = await loadTruth();

for (const [persisted, expectedLabel, expectedAccess] of [
  ["starter", "Foundation", false],
  ["growth", "Workforce", true],
  ["scale", "Scale", true],
]) {
  const workspace = { ...base, plan: persisted, planTier: persisted, billingStatus: "active" };
  assert.equal(entitlements.canAccessInsights(workspace), expectedAccess, `${persisted} Insights entitlement`);
  assert.equal(entitlements.getEntitlements(workspace).features.insights, expectedAccess);
  assert.equal(truth.getPlanLabel(persisted), expectedLabel);
}

assert.equal(truth.getPlanLabel("operator"), "Scale", "legacy operator key must use current Scale display name");
assert.equal(truth.getPlanLabel("Workforce"), "Workforce", "current display labels must remain stable");

for (const [persisted, expectedAccess] of [["growth", true], ["scale", true], ["starter", false]]) {
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
assert.match(insights, /requiredPlan="growth"/);
assert.doesNotMatch(insights, /Operator Plan|OPERATOR PLAN|Upgrade to Operator/);
assert.match(exportRoute, /getVerifiedSupabaseUser/);
assert.match(exportRoute, /requireWorkspaceMember/);
assert.match(exportRoute, /canAccessInsights\(workspace\)/);
assert.match(prompt, /Workforce/);
assert.doesNotMatch(prompt, /Operator Plan|Upgrade to Operator/);
assert.match(truthSource, /t === "operator" \|\| t === "enterprise"\) return "Scale"/);

console.log("Insights entitlement checks passed: Foundation locked, Workforce/Scale unlocked, active trials preserved, and server export gated by verified membership plus canonical entitlement.");

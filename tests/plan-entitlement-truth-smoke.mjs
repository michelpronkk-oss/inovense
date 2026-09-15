import assert from "node:assert/strict";
import fs from "node:fs";
import esbuild from "esbuild";

let source = fs.readFileSync("src/lib/os/entitlements.ts", "utf8");
source = source.replace(
  'import { normalizeWorkspacePlanTier, type WorkspacePlanTier } from "@/lib/plan-identity";',
  `const normalizeWorkspacePlanTier = (value) => ["preview", "foundation", "workforce", "scale", "operator", "enterprise"].includes(String(value).toLowerCase()) ? String(value).toLowerCase() : null;`,
);
const { code } = await esbuild.transform(source, { loader: "ts", format: "esm", target: "node22" });
const mod = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const workspace = (billingStatus, planTier = "workforce", trialEndsAt) => ({ id: "ws-1", name: "Test", environment: "production", region: "us", plan: planTier, planTier, billingStatus, trialEndsAt });

const noPlan = mod.getWorkspaceAccessSummary(workspace("preview", "preview"));
assert.equal(noPlan.hasPlanIdentity, false);
assert.equal(noPlan.entitlementState, "preview");

const activeTrial = mod.getWorkspaceAccessSummary(workspace("trialing", "workforce", new Date(Date.now() + 86400000).toISOString()));
assert.equal(activeTrial.entitlementState, "trial_active");
assert.equal(activeTrial.hasUsableEntitlement, true);

const canceled = mod.getWorkspaceAccessSummary(workspace("canceled", "workforce", new Date(Date.now() - 86400000).toISOString()));
assert.equal(canceled.planLabel, "Workforce");
assert.equal(canceled.hasPlanIdentity, true);
assert.equal(canceled.entitlementState, "inactive");
assert.equal(canceled.hasUsableEntitlement, false);
assert.equal(canceled.operatorCapacity, 8);
assert.equal(canceled.connectorCapacity, 8);
assert.equal(canceled.seatCapacity, 8);

const pastDue = mod.getWorkspaceAccessSummary(workspace("past_due", "workforce"));
assert.equal(pastDue.entitlementState, "billing_attention");

console.log("Plan entitlement truth smoke: plan identity, trial, canceled access, capacities, and billing attention verified.");

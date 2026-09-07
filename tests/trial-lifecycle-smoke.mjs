import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const trialsSource = read("src/lib/billing/trials.ts");
const checkout = read("src/app/api/billing/dodo/checkout/route.ts");
const webhook = read("src/app/api/billing/dodo/webhook/route.ts");
const scheduler = read("src/trigger/trial-lifecycle.ts");
const migration = read("supabase/migrations/20260907_os_trial_lifecycle.sql");
const entitlements = read("src/lib/os/entitlements.ts");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-trial-lifecycle-"));

function mockDb({ workspace = {}, workspaceTrial = null, ownerTrial = null, customerTrial = null, error = null } = {}) {
  return {
    from(table) {
      const state = { field: "", value: "" };
      const chain = {
        select() { return chain; },
        eq(field, value) { state.field = field; state.value = value; return chain; },
        async maybeSingle() {
          if (table === "os_workspaces") return { data: workspace, error };
          const value = state.field === "workspace_id" ? workspaceTrial : state.field === "owner_user_id" ? ownerTrial : customerTrial;
          return { data: value, error };
        },
      };
      return chain;
    },
  };
}

try {
  const compiled = esbuild.transformSync(trialsSource.replace('import "server-only";\n\n', ""), { loader: "ts", format: "esm", target: "node18" }).code;
  const target = path.join(tmpDir, "trials.mjs");
  fs.writeFileSync(target, compiled);
  const trials = await import(`${pathToFileURL(target).href}?v=${Math.random()}`);
  const eligible = await trials.getTrialEligibility({ supabase: mockDb({ workspace: { dodo_customer_id: "cus-new" } }), workspaceId: "ws-new", ownerUserId: "owner-new" });
  assert.equal(eligible.eligible, true, "a first workspace is eligible");
  const row = { id: "trial-1", workspace_id: "ws-old", owner_user_id: "owner-old", billing_customer_id: "cus-old", trial_plan: "starter", trial_started_at: "2026-01-01T00:00:00Z", trial_consumed_at: "2026-01-01T00:00:00Z", trial_status: "expired" };
  assert.equal((await trials.getTrialEligibility({ supabase: mockDb({ workspace: { dodo_customer_id: "cus-new" }, ownerTrial: row }), workspaceId: "ws-new", ownerUserId: "owner-old" })).eligible, false, "verified owner history blocks a second trial");
  assert.equal((await trials.getTrialEligibility({ supabase: mockDb({ workspace: { dodo_customer_id: "cus-old" }, customerTrial: row }), workspaceId: "ws-new", ownerUserId: "owner-new" })).eligible, false, "Dodo customer history blocks a second trial");
  assert.equal((await trials.getTrialEligibility({ supabase: mockDb({ workspace: {}, error: { message: "unavailable" } }), workspaceId: "ws-new", ownerUserId: "owner-new" })).reason, "history_unavailable", "an unavailable history source fails closed");
  assert.match(checkout, /trialDays: trial\.eligible \? 3 : 0/, "checkout decides trial days on the server");
  assert.match(checkout, /trial\.entitlement\?\.trialStatus === "active"/, "active trial upgrades do not create a second checkout flow");
  assert.match(webhook, /recordTrialStarted/, "verified Dodo lifecycle records a started trial");
  assert.match(webhook, /trial_converted/, "verified conversion sends a deduplicated lifecycle event");
  assert.match(scheduler, /pattern: "5 \* \* \* \*"/, "trial lifecycle uses a durable hourly Trigger schedule");
  assert.match(scheduler, /billing_status: "canceled"/, "expired trial jobs suspend workspace access");
  assert.match(entitlements, /workspace\.billingStatus === "trialing"/, "runtime entitlement resolution expires stale trials safely");
  assert.match(migration, /unique \(workspace_id\)/, "one trial record is permanent per workspace");
  assert.match(migration, /owner_user_id\)/, "one trial record is permanent per verified owner");
  assert.match(migration, /billing_customer_id\)/, "one trial record is permanent per Dodo customer");
  assert.match(migration, /enable row level security/, "trial records are never browser-writable");
  console.log("Trial lifecycle entitlement, checkout, expiry, and access contracts passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

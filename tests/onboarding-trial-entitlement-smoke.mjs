import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Regression coverage for the fresh-signup trial bug: a brand-new workspace
// must receive the existing 3-day Foundation trial automatically (no Dodo
// checkout / card details), exactly once, and that entitlement must be
// enough for the real-connector gate to open. See ensureOrganicTrial in
// src/lib/billing/trials.ts and its call site in src/lib/server/app-gateway.ts.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const gatewaySource = read("src/lib/server/app-gateway.ts");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-onboarding-trial-"));
// Next.js provides "server-only" as a framework-internal marker module
// (throws only in a browser bundle); it isn't a resolvable npm package
// outside Next's build, so alias it to a no-op stub for this Node test.
const serverOnlyStub = path.join(tmpDir, "server-only-stub.mjs");
fs.writeFileSync(serverOnlyStub, "export {};\n");

async function bundleModule(relSourcePath) {
  const entry = path.join(root, relSourcePath);
  const outfile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}.mjs`);
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    alias: { "@": path.join(root, "src"), "server-only": serverOnlyStub },
    external: ["@supabase/supabase-js"],
    logLevel: "silent",
  });
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

function makeFakeSupabase() {
  const workspaces = new Map();
  const trials = [];
  function from(table) {
    let pendingInsert = null;
    let pendingUpdate = null;
    const builder = {
      select() { return builder; },
      insert(row) { pendingInsert = row; return builder; },
      update(patch) { pendingUpdate = patch; return builder; },
      eq(field, value) {
        if (pendingUpdate && table === "os_workspaces") {
          const current = workspaces.get(value) || {};
          workspaces.set(value, { ...current, ...pendingUpdate });
          return Promise.resolve({ error: null });
        }
        builder._field = field;
        builder._value = value;
        return builder;
      },
      async maybeSingle() {
        if (pendingInsert && table === "os_trial_entitlements") {
          const row = { id: `trial-${trials.length + 1}`, ...pendingInsert };
          trials.push(row);
          return { data: row, error: null };
        }
        if (table === "os_workspaces") {
          const row = workspaces.get(builder._value);
          return { data: row ? { ...row } : null, error: null };
        }
        if (table === "os_trial_entitlements") {
          const row = trials.find((entry) => entry[builder._field] === builder._value);
          return { data: row ?? null, error: null };
        }
        return { data: null, error: null };
      },
    };
    return builder;
  }
  return {
    from,
    seedWorkspace(id, row) { workspaces.set(id, row); },
    seedTrial(row) { trials.push(row); },
    getWorkspace(id) { return workspaces.get(id); },
    trialCount() { return trials.length; },
  };
}

try {
  const trials = await bundleModule("src/lib/billing/trials.ts");
  const entitlements = await bundleModule("src/lib/os/entitlements.ts");

  // A. Fresh workspace: no trial, no billing history -> trial is granted.
  {
    const supabase = makeFakeSupabase();
    supabase.seedWorkspace("ws-fresh", { plan_tier: "preview", billing_status: "preview" });
    const result = await trials.ensureOrganicTrial({ supabase, workspaceId: "ws-fresh", ownerUserId: "owner-fresh" });
    assert.equal(result.granted, true, "a brand-new preview workspace must receive the organic trial");
    assert.equal(result.outcome, "granted");
    const row = supabase.getWorkspace("ws-fresh");
    assert.equal(row.plan_tier, "starter");
    assert.equal(row.billing_status, "trialing");
    assert.ok(row.trial_ends_at, "trial_ends_at must be persisted");
    assert.equal(row.can_use_real_connectors, true, "the trial must unlock real connectors immediately");
    const trialEndsMs = new Date(row.trial_ends_at).getTime() - Date.now();
    assert.ok(trialEndsMs > 2.9 * 86400000 && trialEndsMs < 3.1 * 86400000, "trial must last ~3 days");
    assert.equal(supabase.trialCount(), 1);

    // B. That resulting workspace shape must actually satisfy the connector
    // gate downstream (getEntitlements), closing the loop from trial grant
    // to "Connect real account" being allowed instead of the plan gate.
    const workspaceForEntitlements = { planTier: row.plan_tier, billingStatus: row.billing_status, trialEndsAt: row.trial_ends_at };
    const computed = entitlements.getEntitlements(workspaceForEntitlements);
    assert.equal(computed.canUseRealConnectors, true, "a freshly-granted trial must satisfy the connectors real-account gate");
    assert.notEqual(computed.billingStatus, "preview", "a freshly-granted trial must never read back as preview/plan-required");
  }

  // H. Idempotency: refreshing / re-resolving the gateway must not grant a
  // second trial or reset the existing one.
  {
    const supabase = makeFakeSupabase();
    supabase.seedWorkspace("ws-repeat", { plan_tier: "preview", billing_status: "preview" });
    const first = await trials.ensureOrganicTrial({ supabase, workspaceId: "ws-repeat", ownerUserId: "owner-repeat" });
    const rowAfterFirst = { ...supabase.getWorkspace("ws-repeat") };
    const second = await trials.ensureOrganicTrial({ supabase, workspaceId: "ws-repeat", ownerUserId: "owner-repeat" });
    assert.equal(first.granted, true);
    assert.equal(second.granted, false, "a workspace that already has a trial must not be granted a second one");
    assert.equal(second.outcome, "not_preview");
    assert.deepEqual(supabase.getWorkspace("ws-repeat"), rowAfterFirst, "a repeat resolution must not mutate the already-granted trial");
    assert.equal(supabase.trialCount(), 1, "exactly one trial record per workspace");
  }

  // I. A workspace already on a real plan (or past_due/canceled) must never
  // be reset back into a trial.
  {
    const supabase = makeFakeSupabase();
    supabase.seedWorkspace("ws-paid", { plan_tier: "growth", billing_status: "active" });
    const result = await trials.ensureOrganicTrial({ supabase, workspaceId: "ws-paid", ownerUserId: "owner-paid" });
    assert.equal(result.granted, false);
    assert.equal(result.outcome, "not_preview");
    assert.deepEqual(supabase.getWorkspace("ws-paid"), { plan_tier: "growth", billing_status: "active" });
  }

  // I (continued). An owner who already consumed a trial on another
  // workspace must not get a second free trial through a new workspace.
  {
    const supabase = makeFakeSupabase();
    supabase.seedWorkspace("ws-second", { plan_tier: "preview", billing_status: "preview" });
    supabase.seedTrial({ id: "trial-existing", workspace_id: "ws-other", owner_user_id: "owner-repeat-abuse", billing_customer_id: null, trial_plan: "starter", trial_started_at: "2026-01-01T00:00:00Z", trial_consumed_at: "2026-01-01T00:00:00Z", trial_status: "active" });
    const result = await trials.ensureOrganicTrial({ supabase, workspaceId: "ws-second", ownerUserId: "owner-repeat-abuse" });
    assert.equal(result.granted, false, "the same owner must not receive a second organic trial through a different workspace");
    assert.equal(result.outcome, "not_eligible");
    assert.deepEqual(supabase.getWorkspace("ws-second"), { plan_tier: "preview", billing_status: "preview" }, "a blocked workspace must remain genuinely gated, not silently unlocked");
  }

  assert.match(gatewaySource, /ensureOrganicTrial/, "the app gateway must grant the organic trial at the safe, server-authoritative provisioning point");
  assert.match(gatewaySource, /!workspace\?\.onboarding_completed_at && workspace\?\.plan_tier === "preview" && workspace\?\.billing_status === "preview"/, "the gateway must only attempt the grant for a workspace still going through onboarding that is genuinely un-entitled - never an already-onboarded workspace that chose to stay on preview");

  console.log("Onboarding trial entitlement contracts passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

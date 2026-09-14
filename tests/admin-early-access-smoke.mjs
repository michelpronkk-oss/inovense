import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-admin-early-access-"));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
async function loadPureAdminEarlyAccess() {
  let source = read("src/lib/admin/early-access.ts");
  source = source.replace('import "server-only";', "");
  source = source.replace('import { requireInternalAdmin } from "@/lib/admin/auth";', "");
  source = source.replace('import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";', "");
  source = source.replace('import { PLAN_LABELS, type PlanSlug } from "@/lib/plan-identity";', 'const PLAN_LABELS = { foundation: "Foundation", workforce: "Workforce", scale: "Scale" }; type PlanSlug = "foundation" | "workforce" | "scale";');
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(temp, "early-access.mjs");
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href);
}
async function loadAdminTrialState() {
  const { code } = esbuild.transformSync(read("src/lib/admin/trial-state.ts"), { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(temp, "trial-state.mjs");
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href);
}

try {
  const lifecycle = await loadPureAdminEarlyAccess();
  const trialState = await loadAdminTrialState();
  assert.equal(lifecycle.getAllowedEarlyAccessTransition("requested", "reviewing"), "reviewing");
  assert.equal(lifecycle.getAllowedEarlyAccessTransition("reviewing", "declined"), "declined");
  for (const [from, to] of [["requested", "accepted"], ["reviewing", "accepted"], ["reviewing", "invited"], ["invited", "accepted"], ["invited", "declined"], ["accepted", "reviewing"], ["declined", "invited"], ["requested", "arbitrary"]]) {
    assert.equal(lifecycle.getAllowedEarlyAccessTransition(from, to), null, `${from} -> ${to} must be rejected`);
  }
  assert.equal(lifecycle.earlyAccessPriority({ email: "ops@northstar.example", team_size: "21–50", use_case: "x".repeat(90), interested_plan: "workforce" }), "High");
  assert.equal(lifecycle.earlyAccessPriority({ email: "founder@gmail.com", team_size: "1–5", use_case: "short", interested_plan: null }), "Normal");
  assert.equal(trialState.isAdminTrialActive({ trial_status: "active", trial_ends_at: "2026-09-13T00:00:00.000Z" }, Date.parse("2026-09-14T00:00:00.000Z")), false);
  assert.equal(trialState.isAdminTrialExpired({ trial_status: "active", trial_ends_at: "2026-09-13T00:00:00.000Z" }, Date.parse("2026-09-14T00:00:00.000Z")), true);
  assert.equal(trialState.isAdminTrialEndingSoon({ trial_status: "active", trial_ends_at: "2026-09-13T00:00:00.000Z" }, Date.parse("2026-09-14T00:00:00.000Z")), false);
  assert.equal(trialState.isAdminTrialActive({ trial_status: "active", trial_ends_at: "2026-09-15T00:00:00.000Z" }, Date.parse("2026-09-14T00:00:00.000Z")), true);
  assert.equal(trialState.isAdminTrialActive({ trial_status: "active", trial_ends_at: null }, Date.parse("2026-09-14T00:00:00.000Z")), true);
  assert.equal(trialState.isAdminTrialActive({ trial_status: "converted", trial_ends_at: null }, Date.parse("2026-09-14T00:00:00.000Z")), false);

  const list = read("src/lib/admin/early-access.ts");
  const page = read("src/app/admin/early-access/page.tsx");
  const detail = read("src/app/admin/early-access/[id]/page.tsx");
  const actions = read("src/app/admin/early-access/actions.ts");
  const workspaces = read("src/lib/admin/workspaces.ts");
  const trialSummary = read("src/lib/admin/trial-state.ts");
  const overview = read("src/lib/admin/analytics/overview.ts");
  const revenue = read("src/lib/admin/revenue.ts");
  const workspacePage = read("src/app/admin/[section]/page.tsx");
  const nav = read("src/app/admin/_nav.tsx");
  const middleware = read("src/proxy.ts");
  const css = read("src/app/admin/admin.css");
  const migration = read("supabase/migrations/20260913_early_access_requests.sql");

  assert.match(list, /requireInternalAdmin\(\)/);
  assert.match(list, /\.range\(/);
  for (const expression of [/\.eq\("status"/, /\.eq\("interested_plan"/, /\.eq\("team_size"/, /\.eq\("source"/, /\.eq\("utm_source"/, /\.gte\("created_at"/, /\.lt\("created_at"/, /\.or\(`/]) assert.match(list, expression);
  for (const column of ["name", "email", "company", "role", "team_size", "use_case", "source_path", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "confirmation_sent_at", "confirmation_attempted_at", "reviewed_at", "reviewed_by", "notes"]) assert.ok(list.includes(column), `Early Access model contains ${column}`);
  assert.match(page, /Applicant review/);
  assert.match(page, /<input type="date" name="from"/);
  assert.match(page, /<input type="date" name="to"/);
  assert.match(page, /Plan interest/);
  assert.match(page, /UTM source/);
  assert.match(page, /ea-mobile-list/);
  assert.match(detail, /Company and team/);
  assert.match(detail, /Use case and intent/);
  assert.match(detail, /Acquisition context/);
  assert.match(detail, /Confirmation email/);
  assert.match(detail, /Approve &amp; send invite/);
  assert.match(detail, /Private internal context/);
  assert.match(detail, /legacy unverified/);
  assert.match(detail, /Open workspace in admin/);
  assert.match(actions, /await requireInternalAdmin\(\)/);
  assert.match(actions, /getAllowedEarlyAccessTransition/);
  assert.match(actions, /reviewed_at: new Date\(\)\.toISOString\(\)/);
  assert.match(actions, /reviewed_by: admin\.userId/);
  assert.match(actions, /\.eq\("status", current\.data\.status\)/);
  assert.match(actions, /notes: notesValue\.trim\(\) \|\| null/);
  assert.match(actions, /notesValue\.length > 5000/);
  assert.match(actions, /approveAndSendEarlyAccessInvite/);
  assert.match(actions, /prepare_early_access_invite/);
  assert.match(actions, /finalize_early_access_invite_send/);
  assert.match(actions, /new Resend\(apiKey\)/);
  assert.match(actions, /revoke_early_access_invite/);
  assert.doesNotMatch(actions, /formData\.get\("status"\)[\s\S]*?"accepted"/);
  assert.doesNotMatch(actions, /auth\.admin|createUser|signUp|os_member_invites|trial\/start|startTrial/i);
  assert.match(migration, /status in \('requested', 'reviewing', 'invited', 'accepted', 'declined'\)/);
  assert.match(migration, /notes text/);

  assert.match(workspaces, /getCanonicalPlanLabel/);
  assert.match(workspaces, /billingStatus === "trialing"/);
  assert.match(workspaces, /trialEndPassed \|\| trialStatus === "expired" \? "Expired trial"/);
  assert.match(workspaces, /billingStatus === "active"\) entitlement = "Paid active"/);
  assert.match(workspaces, /subscriptionLabels/);
  assert.match(workspaces, /enabled === true && entitled/);
  assert.match(workspaces, /enabled === true && !entitled/);
  assert.match(workspaces, /os_connectors/);
  assert.match(workspaces, /os_approvals/);
  assert.match(workspaces, /No run in latest 1,000 records/);
  assert.match(trialSummary, /endsAt <= now/);
  assert.match(overview, /isAdminTrialActive/);
  assert.match(overview, /isAdminTrialExpired/);
  assert.match(revenue, /isAdminTrialActive/);
  assert.match(revenue, /isAdminTrialExpired/);
  assert.match(workspacePage, /Workspace state/);
  assert.match(workspacePage, /workspace-mobile-list/);
  assert.match(workspacePage, /Entitlement reads from workspace billing state, trial lifecycle from trial records, and subscription from the normalized Dodo snapshot/);
  assert.match(nav, /label: "Early Access"/);
  assert.match(nav, /label: "Workspaces"/);
  assert.match(middleware, /originalPathname\.startsWith\("\/early-access\/"\)/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*\.ea-desktop-table-wrap \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*\.workspace-desktop-wrap \{ display: none; \}/);
  assert.doesNotMatch(read("src/app/api/early-access/route.ts"), /requireInternalAdmin|os_internal_admins|admin\.auth/i);

  console.log("admin-early-access-smoke: status, authorization, workspace truth, and responsive contracts passed.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

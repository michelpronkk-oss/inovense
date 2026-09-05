import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Static source-contract smoke tests for the auth/workspace security
// foundation. Mirrors the style of tests/auterim-phase4-smoke.mjs: no test
// runner or live DB required, just regression guards against
// reintroducing the exact vulnerabilities this change fixed.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const workspace = read("src/lib/os/workspace.ts");
const workspaceMembership = read("src/lib/server/workspace-membership.ts");
const gmailAuth = read("src/app/api/connectors/gmail/auth/route.ts");
const nangoSession = read("src/app/api/connectors/nango/session/route.ts");
const appLayout = read("src/app/app/layout.tsx");
const appGateway = read("src/lib/server/app-gateway.ts");
const workspaceAccess = read("src/lib/server/workspace-access.ts");
const provisioning = read("src/lib/server/provisioning.ts");
const provisionSql = read("supabase/migrations/20260905_auth_identity_foundation.sql");
const rlsSql = read("supabase/migrations/20260905_auth_rls_policies.sql");
const unrestrictedSql = read("supabase/migrations/20260905_unrestricted_tables_rls.sql");
const teamActions = read("src/app/app/team/actions.ts");

// ── 1. Verified identity only: no more "trust caller-supplied identity" ──
assert.doesNotMatch(
  workspace,
  /if \(userId \|\| userEmail\) \{\s*\n\s*return \{ userId, userEmail, userName, source: "input" \};/,
  "resolveRequestIdentity must never unconditionally trust caller-supplied userId/userEmail"
);
assert.match(workspace, /resolveDevOnlyInputIdentity/, "dev-only identity fallback must be a clearly separate, gated function");
assert.match(workspace, /process\.env\.NODE_ENV === "production"\) return null;/, "dev-only identity fallback must be hard-disabled in production");
assert.match(workspace, /await resolveRequestIdentity\(\);/, "resolveRequestIdentity must be called with no caller-supplied input");

// findMembership must exclude pending/inactive rows.
assert.match(workspace, /neq\("status", "pending"\)/);
assert.match(workspace, /\.eq\("active", true\)/);

// ── 2. No silent admin escalation in workspace-membership.ts ─────────────
assert.doesNotMatch(
  workspaceMembership,
  /role: "Operator - Admin"/,
  "workspace-membership.ts must never auto-grant Operator - Admin"
);
assert.doesNotMatch(workspaceMembership, /Bootstrap fallback/i);

// ── 3. Connector routes derive identity from verified session, not params ─
assert.doesNotMatch(gmailAuth, /searchParams\.get\("userEmail"\)/);
assert.doesNotMatch(gmailAuth, /searchParams\.get\("userId"\)/);
assert.match(gmailAuth, /resolveWorkspaceContext/);

assert.doesNotMatch(nangoSession, /body\.userEmail/);
assert.doesNotMatch(nangoSession, /body\.userId/);
assert.match(nangoSession, /resolveWorkspaceContext/);

// ── 4. /app route guard exists and enforces auth + onboarding order ──────
assert.match(appLayout, /resolveAppGateway/);
assert.match(appLayout, /redirect\(`\/app\/login/);
assert.match(appLayout, /"\/app\/onboarding"/);

assert.match(appGateway, /getVerifiedSupabaseUser/);
assert.match(appGateway, /provisionInitialWorkspace/);

// ── 5. Authorization helpers exist and are role-aware ────────────────────
for (const fn of ["requireWorkspaceMember", "requireWorkspaceRole", "requireWorkspaceOwner", "requireWorkspaceAdmin"]) {
  assert.match(workspaceAccess, new RegExp(`export async function ${fn}`));
}

// ── 6. Provisioning RPC is atomic, idempotent, and auth.uid()-gated ──────
assert.match(provisionSql, /security definer/);
assert.match(provisionSql, /auth\.uid\(\)/);
assert.match(provisionSql, /pg_advisory_xact_lock/);
assert.match(provisionSql, /set search_path = public, pg_temp/);
assert.match(provisioning, /must be a client carrying the signed-in user's own/);

// ── 7. Invite acceptance rejects expired/revoked/accepted/mismatched ─────
assert.match(provisionSql, /invite_already_accepted/);
assert.match(provisionSql, /invite_revoked/);
assert.match(provisionSql, /invite_expired/);
assert.match(provisionSql, /invite_email_mismatch/);

// ── 8. RLS: helper functions + policies on the core tables ───────────────
assert.match(rlsSql, /create or replace function public\.is_workspace_member/);
assert.match(rlsSql, /create or replace function public\.workspace_role_key/);
for (const table of ["os_user_profiles", "os_workspaces", "os_workspace_members", "os_workspace_settings"]) {
  assert.match(rlsSql, new RegExp(`create policy [a-z_]+ on ${table}`), `expected an RLS policy on ${table}`);
}

// ── 9. Previously-unrestricted tables now have RLS enabled ───────────────
for (const table of ["leads", "lead_email_log", "prospects", "traffic_sessions"]) {
  assert.match(unrestrictedSql, new RegExp(`alter table if exists public\\.${table} enable row level security;`));
}

// ── 10. Team invite creation is authorization-checked, not client-trusted ─
assert.match(teamActions, /requireWorkspaceAdmin/);
assert.match(teamActions, /getVerifiedSupabaseUser/);

console.log("Auterim auth/security smoke contracts passed.");

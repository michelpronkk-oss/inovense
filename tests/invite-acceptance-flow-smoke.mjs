import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Static source-contract smoke tests for the invite-acceptance fix:
// workspace membership and Supabase authentication must be separate
// concerns. The invite delivery path must never depend on whether the
// invited email already has an Auterim account, and the invite token must
// survive both the sign-in and the brand-new-signup path so acceptance
// always completes without the recipient having to reopen the email.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const teamActions = read("src/app/app/team/actions.ts");
const registerPage = read("src/app/app/register/page.tsx");
const loginPage = read("src/app/app/login/page.tsx");
const acceptPage = read("src/app/app/invite/accept/page.tsx");
const acceptActions = read("src/app/app/invite/accept/actions.ts");
const authCallback = read("src/app/app/auth/callback/route.ts");
const appLayout = read("src/app/app/layout.tsx");
const roleKeyMigration = read("supabase/migrations/20260907_workspace_invite_role_keys.sql");

// ── 1. Invite delivery never depends on Supabase Auth user existence ─────
// admin.generateLink / inviteUserByEmail only work for brand-new users and
// error ("A user with this email address has already been registered") for
// anyone who already has an Auterim account -- exactly the auth/membership
// coupling this fix removes.
assert.doesNotMatch(teamActions, /auth\.admin\.generateLink/, "invite delivery must not call Supabase's generateLink");
assert.doesNotMatch(teamActions, /inviteUserByEmail/, "invite delivery must not call Supabase's inviteUserByEmail");

// The acceptance link is the plain Auterim invite-token URL, authoritative
// on its own -- not a Supabase-generated auth link.
assert.match(teamActions, /const acceptUrl = `\$\{getAppUrl\(\)\}\/invite\/accept\?token=\$\{input\.token\}`;/);

// ── 2. New-user signup preserves the invite token through auth ───────────
assert.match(registerPage, /useSearchParams/);
assert.match(registerPage, /searchParams\.get\("from"\)/);
assert.match(registerPage, /emailRedirectTo: authCallbackHref\(from\)/, "signup must preserve the invite destination through the canonical callback helper");
assert.match(registerPage, /router\.replace\(from \|\| "\/"\)/, "an immediate-session signup must land on `from` (e.g. the invite accept page), not always \"/\"");

// ── 3. Both auth entry points cross-link with `from` preserved ───────────
assert.match(loginPage, /\/register\?from=\$\{encodeURIComponent\(from\)\}/);
assert.match(registerPage, /\/login\?from=\$\{encodeURIComponent\(from\)\}/);

// ── 4. The invite accept page offers both an existing-user and a
//      brand-new-user path, both carrying the invite token as `from` ─────
assert.match(acceptPage, /const returnPath = `\/invite\/accept\?token=\$\{token\}`;/);
assert.match(acceptPage, /loginHref = `\/login\?from=\$\{encodeURIComponent\(returnPath\)\}`/);
assert.match(acceptPage, /registerHref = `\/register\?from=\$\{encodeURIComponent\(returnPath\)\}`/);
assert.match(acceptPage, /Sign in to accept/);
assert.match(acceptPage, /Create an account to accept/);

// ── 5. /auth/callback forwards `next` safely after either flow completes,
//      and /invite/accept is public (never intercepted by the onboarding
//      gateway before the token can be checked) ──────────────────────────
assert.match(authCallback, /const safeNext = safeAppPath\(next\) \?\? "\/"/);
assert.match(appLayout, /"\/invite\/accept"/);

// ── 6. Acceptance itself: authenticated, server-derived workspace/role,
//      idempotent, and rejects mismatched/revoked/expired/reused invites ─
assert.match(acceptActions, /getVerifiedSupabaseUser/);
assert.match(acceptActions, /if \(!user\) return \{ status: "unauthenticated" \};/);
assert.match(roleKeyMigration, /v_uid := auth\.uid\(\);/);
assert.match(roleKeyMigration, /invite_already_accepted/);
assert.match(roleKeyMigration, /invite_revoked/);
assert.match(roleKeyMigration, /invite_expired/);
assert.match(roleKeyMigration, /invite_email_mismatch/);
// Role and workspace always come from the stored invite row, never from
// client input -- v_invite.workspace_id / v_role_key are read out of the
// row selected by token, not accepted as function parameters.
assert.doesNotMatch(roleKeyMigration, /accept_workspace_invite\(p_token text, p_role/, "role must never be a client-supplied parameter");

// ── 7. Multi-workspace: acceptance is scoped to (workspace_id, email) --
//      accepting an invite to workspace B can never collide with or
//      overwrite an existing membership row in workspace A ──────────────
assert.match(roleKeyMigration, /on conflict \(workspace_id, email\) do update/);

// ── 8. A pending invite's placeholder member row never counts as an
//      active member (findMembership / listActiveMemberships exclude it) ─
const workspaceAccess = read("src/lib/server/workspace-access.ts");
assert.match(workspaceAccess, /neq\("status", "pending"\)/);

console.log("Invite acceptance flow (auth/membership separation) smoke checks passed.");

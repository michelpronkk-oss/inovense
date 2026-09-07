import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Static source-contract smoke tests for the Auterim email-delivery +
// team-invite-delivery fix: active transactional senders must no longer
// depend on the legacy inovense.com domain, and a failed invite delivery
// must be safely retryable without ever duplicating an invite/membership.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const emailConfig = read("src/lib/email/config.ts");
const teamActions = read("src/app/app/team/actions.ts");
const trialNotifications = read("src/lib/billing/trial-notifications.ts");
const slackNotifications = read("src/lib/notifications/slack.ts");
const supportRoute = read("src/app/api/support/requests/route.ts");
const feedbackRoute = read("src/app/api/feedback/route.ts");
const intakeActions = read("src/app/intake/actions.ts");
const nlIntakeActions = read("src/app/nl/intake/actions.ts");
const leadEmailActions = read("src/app/admin/leads/[id]/email-actions.ts");
const envExample = read(".env.example");
const dedupMigration = read("supabase/migrations/20260907_os_member_invites_pending_dedup.sql");
const roleKeyMigration = read("supabase/migrations/20260907_workspace_invite_role_keys.sql");

// src/lib/email/config.ts documents (in a comment) the exact inovense.com
// failure it fixes -- it is intentionally excluded from the "does not
// mention inovense.com" checks below, but still covered by the "exports the
// right hardcoded constants" checks in section 2.
const ACTIVE_SENDER_FILES = {
  "src/app/app/team/actions.ts": teamActions,
  "src/lib/billing/trial-notifications.ts": trialNotifications,
  "src/lib/notifications/slack.ts": slackNotifications,
  "src/app/api/support/requests/route.ts": supportRoute,
  "src/app/api/feedback/route.ts": feedbackRoute,
  "src/app/intake/actions.ts": intakeActions,
  "src/app/nl/intake/actions.ts": nlIntakeActions,
  "src/app/admin/leads/[id]/email-actions.ts": leadEmailActions,
};

// ── 1. No active email sender depends on the legacy inovense.com domain ──
for (const [file, content] of Object.entries(ACTIVE_SENDER_FILES)) {
  assert.doesNotMatch(content, /inovense\.com/i, `${file} must not reference the unverified inovense.com domain`);
  assert.doesNotMatch(content, /RESEND_FROM_EMAIL/, `${file} must not read the removed RESEND_FROM_EMAIL env var`);
  assert.doesNotMatch(content, /onboarding@resend\.dev/, `${file} must not fall back to the Resend sandbox sender`);
  // Legacy "Inovense <...>" sender display names -- NOT a blanket ban on the
  // word "Inovense": team/actions.ts still writes the preserved database
  // plan value "Inovense OS - Growth", which CLAUDE.md requires be kept as-is.
  assert.doesNotMatch(content, /Inovense\s*</, `${file} must not use a legacy "Inovense <...>" sender display name`);
}
assert.doesNotMatch(envExample, /RESEND_FROM_EMAIL/, ".env.example must not document the removed RESEND_FROM_EMAIL var");

// ── 2. Canonical sender identities are hardcoded constants, not env-driven ─
assert.match(emailConfig, /export const TRANSACTIONAL_FROM = `\$\{AUTERIM_NAME\} <\$\{AUTERIM_EMAILS\.noreply\}>`;/);
assert.match(emailConfig, /export const SUPPORT_FROM = `\$\{AUTERIM_NAME\} Support <\$\{AUTERIM_EMAILS\.support\}>`;/);

// ── 3. Team invite email uses the centralized Auterim sender ─────────────
assert.match(teamActions, /import \{ TRANSACTIONAL_FROM \} from "@\/lib\/email\/config";/);
assert.match(teamActions, /from: TRANSACTIONAL_FROM/);

// ── 4. Invite creation never leaks raw provider error text to the client ──
assert.doesNotMatch(teamActions, /delivery failed: \$\{providerError/, "raw Resend provider error must never be returned to the client");
assert.match(teamActions, /the email could not be delivered\. You can retry sending it\./);

// ── 5. Invite dedup: reuse an existing pending\/expired invite, never insert
//      a duplicate row for a repeated invitation attempt ──────────────────
assert.match(teamActions, /in\("status", \["pending", "expired"\]\)/);
assert.match(teamActions, /existingInvite\.data/);
assert.match(teamActions, /role_key: input\.role/);
assert.match(roleKeyMigration, /os_member_invites_role_key_chk/);
assert.match(roleKeyMigration, /coalesce\(v_invite\.role_key/);
assert.match(dedupMigration, /create unique index if not exists os_member_invites_pending_email_uidx/);
assert.match(dedupMigration, /where status = 'pending'/);

// ── 6. Resend/revoke actions exist, are authorization-checked, and never
//      create a new invite row or duplicate membership ───────────────────
assert.match(teamActions, /export async function resendWorkspaceInvite/);
assert.match(teamActions, /export async function revokeWorkspaceInvite/);
assert.match(teamActions, /randomBytes\(24\)\.toString\("hex"\)/, "resend must rotate the token only when the invite is actually expired");
assert.match(teamActions, /isExpired/);
const requireAdminCount = (teamActions.match(/requireWorkspaceAdmin\(/g) ?? []).length;
assert.ok(requireAdminCount >= 3, "invite, resend, and revoke must each call requireWorkspaceAdmin");

// ── 7. Resend is rate-limited (spam guard), matching the existing
//      in-memory-window idiom used by support/feedback routes ────────────
assert.match(teamActions, /allowedResendAttempt/);
assert.match(supportRoute, /allowedAttempt/);
assert.match(feedbackRoute, /allowedAttempt/);

// ── 8. Cross-workspace / wrong-role resend and revoke are denied ─────────
assert.match(teamActions, /canManageTarget\(actor\.role_key, invitedRole\)/);

// ── 9. Approval and execution-alert email preferences are untouched ──────
assert.match(slackNotifications, /notification_alerts/);
assert.match(slackNotifications, /notification_approvals/);

console.log("Team invite + email delivery smoke checks passed.");

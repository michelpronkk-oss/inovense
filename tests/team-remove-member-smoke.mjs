import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Static source-contract smoke tests for the Workspace Members UX/security
// pass: a real "Remove member" action for accepted members (distinct from
// Disable access), with owner/self-lockout protection enforced server-side
// (never relied on client-side UI visibility), and truthful, immediate UI
// state after every member-management action.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const teamActions = read("src/app/app/team/actions.ts");
const teamPage = read("src/app/app/team/page.tsx");
const appProvider = read("src/lib/os/app-provider.tsx");
const removeGuardMigration = read("supabase/migrations/20260907_workspace_member_remove_guard.sql");
const roleGuardMigration = read("supabase/migrations/20260907_workspace_member_role_guards.sql");

// ── 1. removeWorkspaceMember exists and is authorization-checked ──────────
assert.match(teamActions, /export async function removeWorkspaceMember/);
assert.match(teamActions, /requireWorkspaceAdmin\(user\.id, input\.workspaceId\)/);

// ── 2. Pending invites are explicitly out of scope for remove -- they must
//      go through revokeWorkspaceInvite, never through delete ────────────
assert.match(teamActions, /targetResult\.data\.status === "pending"[\s\S]{0,80}use Revoke invitation instead/);

// ── 3. Owner protection: the workspace owner can never be removed ────────
assert.match(teamActions, /targetRole === "owner"\) return \{ success: false, error: "The workspace owner cannot be removed\."/);

// ── 4. Self-lockout protection: a caller can never remove themselves ─────
assert.match(teamActions, /You cannot remove yourself from this workspace\./);

// ── 5. Role hierarchy is reused (not duplicated): admin cannot remove
//      another admin, only the owner can ────────────────────────────────
assert.match(teamActions, /canManageTarget\(actor\.role_key, targetRole\)\)[\s\S]{0,40}You do not have permission to remove this member/);

// ── 6. Removal is a real delete, not a status flip (distinct from Disable
//      access, which only deactivates) ──────────────────────────────────
assert.match(teamActions, /\.from\("os_workspace_members"\)\s*\n\s*\.delete\(\)/);

// ── 7. Audit event emitted for removal ────────────────────────────────────
assert.match(teamActions, /event: "member_removed"/);

// ── 8. Database-level defense in depth: owner row can never be deleted,
//      mirroring the existing UPDATE guard rather than duplicating it ────
assert.match(removeGuardMigration, /before delete on os_workspace_members/);
assert.match(removeGuardMigration, /old\.role_key = 'owner'/);
assert.match(removeGuardMigration, /owner_protected/);
assert.match(roleGuardMigration, /owner_protected/, "the original UPDATE-side owner guard must still exist");

// ── 9. UI: Remove member goes through a dedicated confirmation dialog,
//      never a bare browser confirm() ───────────────────────────────────
assert.doesNotMatch(teamPage, /window\.confirm\(/);
assert.match(teamPage, /removingMember/);
assert.match(teamPage, /Remove member/);
assert.match(teamPage, /lose access immediately/);

// ── 10. State-specific actions: pending shows Resend\/Revoke, active shows
//       Disable\/Remove, disabled shows Re-enable\/Remove -- never an
//       impossible action for the current state ─────────────────────────
assert.match(teamPage, /editing\.status === "pending" &&[\s\S]{0,160}Resend invitation/);
assert.match(teamPage, /editing\.status === "pending" &&[\s\S]{0,160}Revoke invitation/);
assert.match(teamPage, /!editing\.active && editing\.status !== "pending" &&[\s\S]{0,160}Re-enable access/);
assert.match(teamPage, /editing\.status !== "pending" && editing\.active &&[\s\S]{0,160}Disable access/);

// ── 11. Danger zone is visually separated and not inside the save footer ─
assert.match(teamPage, /team-danger-zone/);
const dangerZoneIndex = teamPage.indexOf("team-danger-zone");
// Search for the footer button *after* the danger zone section (a comment
// earlier in the file also mentions "Save changes" in passing).
const saveChangesIndex = teamPage.indexOf("Save changes", dangerZoneIndex);
assert.ok(dangerZoneIndex > -1 && saveChangesIndex > dangerZoneIndex, "the danger zone must render before the Cancel/Save changes footer, not inside it");

// ── 12. Member list row no longer shows capability chips (Approvals,
//       Outputs, ...) -- those now live only inside the modal's Access
//       section, quieter than the Role control ──────────────────────────
const rowSectionEnd = teamPage.indexOf("team-member-meta");
const rowSection = teamPage.slice(teamPage.indexOf("state.teamMembers.map"), rowSectionEnd + 400);
assert.doesNotMatch(rowSection, /WORKSPACE_ROLE_CAPABILITIES\[memberRole\]\.map/, "the member list row must not render capability chips directly");
assert.match(teamPage, /team-access-chips/, "capability chips must still exist inside the modal's Access section");

// ── 13. Client-side state stays truthful: removing a member updates the
//       shared team-members list immediately (no stale count/row) ───────
assert.match(appProvider, /case "REMOVE_MEMBER":/);
assert.match(appProvider, /removeMember: \(memberId: string\) => void/);
assert.match(teamPage, /removeMember\(removingMember\.id\)/);

console.log("Team remove-member + workspace UX smoke checks passed.");

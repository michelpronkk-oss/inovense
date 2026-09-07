"use server";

import { randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getAppUrl } from "@/lib/urls";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, AuthorizationError } from "@/lib/server/workspace-access";
import { renderTeamInviteEmail } from "@/lib/email/auth-emails";
import { TRANSACTIONAL_FROM } from "@/lib/email/config";
import { INVITABLE_WORKSPACE_ROLES, WORKSPACE_ROLE_CAPABILITIES, WORKSPACE_ROLE_LABELS, canManageTarget, legacyRoleLabel, normalizeWorkspaceRole, type WorkspaceRole } from "@/lib/workspace-permissions";

// Simple in-memory attempt window, same idiom used by
// src/app/api/support/requests/route.ts and src/app/api/feedback/route.ts.
// Resets per serverless instance -- a spam speed bump, not the security
// boundary (that's requireWorkspaceAdmin below).
const RESEND_WINDOW_MS = 10 * 60 * 1000;
const RESEND_MAX_ATTEMPTS = 5;
const resendAttempts = new Map<string, number[]>();
function allowedResendAttempt(key: string) {
  const now = Date.now();
  const recent = (resendAttempts.get(key) ?? []).filter((at) => at > now - RESEND_WINDOW_MS);
  if (recent.length >= RESEND_MAX_ATTEMPTS) return false;
  resendAttempts.set(key, [...recent, now]);
  return true;
}

/**
 * Builds the invite acceptance link and sends the branded invite email via
 * Resend, logging the attempt to os_email_outbox either way. Delivery
 * failure is reported back as { sent: false } -- it never throws and never
 * deletes/duplicates the invite record itself.
 */
async function deliverInviteEmail(input: {
  supabase: SupabaseClient;
  inviteId: string;
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  email: string;
  role: WorkspaceRole;
  token: string;
}): Promise<{ sent: boolean }> {
  const appUrl = getAppUrl();
  const acceptPath = `/invite/accept?token=${input.token}`;
  const directAcceptUrl = `${appUrl}${acceptPath}`;

  // Route the invite through the auth callback first so the invite token is
  // exchanged for a real session cookie before the accept page (a Server
  // Action) tries to read the verified user. `generateLink` creates the
  // underlying Supabase auth user for brand-new invitees WITHOUT sending
  // Supabase's own built-in "Invite User" email -- we send exactly one
  // branded email ourselves, below.
  const supabaseInviteRedirect = `${appUrl}/auth/callback?next=${encodeURIComponent(acceptPath)}`;
  const generated = await input.supabase.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: { redirectTo: supabaseInviteRedirect },
  });

  // `generateLink({ type: "invite" })` errors if the invitee already has an
  // Auterim account (Supabase only allows "invite" to create brand-new
  // users). That's expected -- e.g. an existing user invited to a second
  // workspace -- not a delivery failure. Fall back to the direct accept
  // link; the accept page already prompts "sign in to accept" for a visitor
  // with no session, which covers existing users correctly.
  const actionLink = generated.data?.properties?.action_link;
  const acceptUrl = actionLink ?? directAcceptUrl;
  const generateLinkError = actionLink ? null : (generated.error?.message ?? null);

  const { subject, html: htmlBody, text: textBody } = renderTeamInviteEmail({
    workspaceName: input.workspaceName,
    inviterName: input.inviterName,
    role: WORKSPACE_ROLE_LABELS[input.role],
    acceptUrl,
  });

  let sent = false;
  let providerError = "";
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const mail = await resend.emails.send({ from: TRANSACTIONAL_FROM, to: input.email, subject, text: textBody, html: htmlBody });
    if (!mail.error) sent = true;
    if (mail.error) providerError = String(mail.error.message || mail.error.name || "resend_error");
  }

  await input.supabase.from("os_email_outbox").insert({
    workspace_id: input.workspaceId,
    invite_id: input.inviteId,
    template_key: "team_invite_v1",
    to_email: input.email,
    subject,
    html_body: htmlBody,
    text_body: textBody,
    provider: "resend",
    status: sent ? "sent" : "queued",
    error_message: providerError || generateLinkError,
    sent_at: sent ? new Date().toISOString() : null,
  });

  if (!sent && (providerError || generateLinkError)) {
    // Full provider detail is logged server-side only -- never surfaced to
    // the client (see the generic messages returned by callers below).
    console.error("[team.invite_email_failed]", {
      workspaceId: input.workspaceId,
      email: input.email,
      providerError: providerError || null,
      generateLinkError,
    });
  }

  return { sent };
}

type InviteInput = {
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  /**
   * @deprecated no longer trusted for authorization. The inviter identity is
   * always re-derived from the verified session server-side.
   */
  inviterUserId?: string;
  name?: string;
  email: string;
  role: WorkspaceRole;
  permissions?: string[];
};

type InviteResult =
  | { success: true; status: "sent" | "queued"; message: string }
  | { success: false; error: string };

export async function inviteWorkspaceMember(input: InviteInput): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim().replace(/\s+/g, " ") ?? "";
  if (!email || !email.includes("@")) return { success: false, error: "Enter a valid email address." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, error: "Supabase service role config is missing." };

  // Identity and authorization are always re-derived from the verified
  // session, never from client-supplied inviterUserId/workspaceId alone.
  // Only workspace admins/owners may invite new members.
  const verifiedUser = await getVerifiedSupabaseUser();
  if (!verifiedUser) return { success: false, error: "Sign in to invite team members." };

  const workspaceId = input.workspaceId;
  const workspaceName = input.workspaceName || "Auterim Workspace";
  if (!workspaceId) return { success: false, error: "A workspace is required." };
  if (!INVITABLE_WORKSPACE_ROLES.includes(input.role)) return { success: false, error: "Choose a valid workspace access level." };
  if (input.role === "owner") return { success: false, error: "Owner access can only be established during workspace creation." };

  try {
    const inviter = await requireWorkspaceAdmin(verifiedUser.id, workspaceId);
    if (input.role === "admin" && inviter.role_key !== "owner") {
      return { success: false, error: "Only the workspace owner can grant admin access." };
    }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: "You do not have permission to invite members to this workspace." };
    }
    return { success: false, error: "Could not verify your workspace permissions." };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const inviterUserId = verifiedUser.id;
  const permissions = WORKSPACE_ROLE_CAPABILITIES[input.role];
  const legacyRole = legacyRoleLabel(input.role);

  // Ensure workspace and pending member row exist.
  await supabase.from("os_workspaces").upsert({
    id: workspaceId,
    name: workspaceName,
    environment: "production",
    region: "eu-west-1",
    plan: "Inovense OS - Growth",
  });

  // Reuse an existing pending/expired invite for this (workspace, email)
  // instead of inserting a duplicate row -- a repeated invitation attempt
  // (or a retry after a failed send) must never spawn a second active
  // pending invite for the same person.
  const existingInvite = await supabase
      .from("os_member_invites")
      .select("id, token")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .in("status", ["pending", "expired"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let inviteId: string;
  let token: string;

  if (existingInvite.data) {
    inviteId = existingInvite.data.id;
    token = existingInvite.data.token;
    const update = await supabase
      .from("os_member_invites")
      .update({
        role: legacyRole,
        role_key: input.role,
        permissions,
        invited_by: inviterUserId,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", inviteId);
    if (update.error) return { success: false, error: "Could not update the existing invite." };
  } else {
    const inviteInsert = await supabase
      .from("os_member_invites")
      .insert({
        workspace_id: workspaceId,
        email,
        role: legacyRole,
        role_key: input.role,
        permissions,
        invited_by: inviterUserId,
        status: "pending",
      })
      .select("id, token")
      .single();

    if (inviteInsert.error || !inviteInsert.data) {
      return { success: false, error: inviteInsert.error?.message ?? "Could not create invite." };
    }
    inviteId = inviteInsert.data.id;
    token = inviteInsert.data.token;
  }

  await supabase.from("os_workspace_members").upsert({
    workspace_id: workspaceId,
    email,
    full_name: name || email.split("@")[0],
    role: legacyRole,
    role_key: input.role,
    access: permissions,
    status: "pending",
    active: true,
    invited_by: inviterUserId,
  }, { onConflict: "workspace_id,email" });

  const { sent } = await deliverInviteEmail({
    supabase,
    inviteId,
    workspaceId,
    workspaceName,
    inviterName: input.inviterName,
    email,
    role: input.role,
    token,
  });

  await supabase.from("os_execution_logs").insert({
    id: `log-invite-${Date.now()}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: "manual",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#37E6D4",
    event: "member_invited",
    message: `Invited ${email} as ${input.role}`,
    duration: "-",
    status: "ok",
  });

  if (process.env.RESEND_API_KEY && !sent) {
    // Never surface raw provider error detail to the client -- it's already
    // logged server-side in deliverInviteEmail(). The invite record and
    // pending member row are kept exactly as created, so the same invite
    // can be retried via resendWorkspaceInvite below.
    return { success: false, error: "Invitation created, but the email could not be delivered. You can retry sending it." };
  }

  return { success: true, status: sent ? "sent" : "queued", message: sent ? "Invite email sent." : "Invite queued." };
}

type ResendInviteInput = { workspaceId: string; email: string };

/**
 * Resends the branded invite email for an existing pending/expired invite.
 * Never creates a new invite row or a duplicate membership -- it only
 * refreshes the existing one (rotating the token when it's actually
 * expired) and re-sends.
 */
export async function resendWorkspaceInvite(input: ResendInviteInput): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase();
  const workspaceId = input.workspaceId;
  if (!workspaceId || !email) return { success: false, error: "A workspace and email are required." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, error: "Supabase service role config is missing." };

  const verifiedUser = await getVerifiedSupabaseUser();
  if (!verifiedUser) return { success: false, error: "Sign in to manage team invitations." };

  let actor;
  try {
    actor = await requireWorkspaceAdmin(verifiedUser.id, workspaceId);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: "You do not have permission to resend invitations in this workspace." };
    }
    return { success: false, error: "Could not verify your workspace permissions." };
  }

  if (!allowedResendAttempt(`${workspaceId}:${email}`)) {
    return { success: false, error: "Please wait a few minutes before resending this invitation again." };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const invite = await supabase
    .from("os_member_invites")
    .select("id, token, role, role_key, status, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .in("status", ["pending", "expired"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invite.error || !invite.data) {
    return { success: false, error: "No pending invitation was found for this email." };
  }
  const invitedRole = normalizeWorkspaceRole(invite.data.role_key, invite.data.role);
  if (!canManageTarget(actor.role_key, invitedRole)) {
    return { success: false, error: "You do not have permission to manage this invitation." };
  }

  const workspace = await supabase.from("os_workspaces").select("name").eq("id", workspaceId).maybeSingle();
  const workspaceName = workspace.data?.name || "Auterim Workspace";

  // Rotate the token only when it's actually expired; reuse it otherwise so
  // any copy of the original link the recipient still has keeps working.
  const isExpired = invite.data.status === "expired" || new Date(invite.data.expires_at) < new Date();
  const token = isExpired ? randomBytes(24).toString("hex") : invite.data.token;

  const update = await supabase
    .from("os_member_invites")
    .update({
      token,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", invite.data.id);
  if (update.error) return { success: false, error: "Could not refresh this invitation." };

  const { sent } = await deliverInviteEmail({
    supabase,
    inviteId: invite.data.id,
    workspaceId,
    workspaceName,
    inviterName: verifiedUser.email?.split("@")[0] ?? "A workspace admin",
    email,
    role: normalizeWorkspaceRole(invite.data.role_key, invite.data.role),
    token,
  });

  await supabase.from("os_execution_logs").insert({
    id: `log-invite-resent-${Date.now()}`,
    ts: new Date().toISOString(),
    run_id: "team",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "invite_resent",
    message: `Invitation for ${email} resent by ${verifiedUser.email ?? "workspace admin"}`,
    duration: "-",
    status: "ok",
  });

  if (process.env.RESEND_API_KEY && !sent) {
    return { success: false, error: "Invitation refreshed, but the email could not be delivered. You can retry sending it." };
  }

  return { success: true, status: sent ? "sent" : "queued", message: sent ? "Invitation resent." : "Invitation queued." };
}

type RevokeInviteInput = { workspaceId: string; email: string };

/** Revokes a pending invite and clears the placeholder pending member row. */
export async function revokeWorkspaceInvite(input: RevokeInviteInput): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase();
  const workspaceId = input.workspaceId;
  if (!workspaceId || !email) return { success: false, error: "A workspace and email are required." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, error: "Supabase service role config is missing." };

  const verifiedUser = await getVerifiedSupabaseUser();
  if (!verifiedUser) return { success: false, error: "Sign in to manage team invitations." };

  let actor;
  try {
    actor = await requireWorkspaceAdmin(verifiedUser.id, workspaceId);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: "You do not have permission to revoke invitations in this workspace." };
    }
    return { success: false, error: "Could not verify your workspace permissions." };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const invite = await supabase
    .from("os_member_invites")
    .select("id, status, role, role_key")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invite.error || !invite.data) return { success: false, error: "No invitation was found for this email." };
  if (invite.data.status === "accepted") return { success: false, error: "This invitation has already been accepted." };
  const invitedRole = normalizeWorkspaceRole(invite.data.role_key, invite.data.role);
  if (!canManageTarget(actor.role_key, invitedRole)) {
    return { success: false, error: "You do not have permission to manage this invitation." };
  }

  if (invite.data.status !== "revoked") {
    const update = await supabase.from("os_member_invites").update({ status: "revoked" }).eq("id", invite.data.id);
    if (update.error) return { success: false, error: "Could not revoke this invitation." };
  }

  // The pending os_workspace_members row is only a UI placeholder for the
  // not-yet-accepted invite -- deactivate it the same way a real member is
  // disabled, so it reads as "Disabled" rather than staying "Pending".
  // accept_workspace_invite() re-activates/creates the real membership row
  // itself on acceptance, so this never blocks a later re-invite.
  await supabase
    .from("os_workspace_members")
    .update({ active: false, status: "offline" })
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .eq("status", "pending");

  await supabase.from("os_execution_logs").insert({
    id: `log-invite-revoked-${Date.now()}`,
    ts: new Date().toISOString(),
    run_id: "team",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "invite_revoked",
    message: `Invitation for ${email} revoked by ${verifiedUser.email ?? "workspace admin"}`,
    duration: "-",
    status: "ok",
  });

  return { success: true, status: "sent", message: "Invitation revoked." };
}

type UpdateMemberInput = {
  workspaceId: string;
  memberId: string;
  role: WorkspaceRole;
  permissions?: string[];
  active: boolean;
};

export async function updateWorkspaceMember(input: UpdateMemberInput): Promise<InviteResult> {
  const user = await getVerifiedSupabaseUser();
  if (!user) return { success: false, error: "Sign in to manage team members." };
  if (!input.workspaceId || !input.memberId) return { success: false, error: "A workspace member is required." };
  if (!INVITABLE_WORKSPACE_ROLES.includes(input.role)) return { success: false, error: "Choose a valid workspace access level." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, error: "Supabase service role config is missing." };

  let actor;
  try {
    actor = await requireWorkspaceAdmin(user.id, input.workspaceId);
  } catch (error) {
    if (error instanceof AuthorizationError) return { success: false, error: "You do not have permission to manage members in this workspace." };
    return { success: false, error: "Could not verify your workspace permissions." };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const targetResult = await supabase
    .from("os_workspace_members")
    .select("id,user_id,email,role,role_key,active,status")
    .eq("id", input.memberId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();
  if (targetResult.error || !targetResult.data) return { success: false, error: "Workspace member not found." };
  const targetRole = normalizeWorkspaceRole(targetResult.data.role_key, targetResult.data.role);
  if (targetRole === "owner") return { success: false, error: "The workspace owner role cannot be changed here." };
  if (targetResult.data.user_id === user.id || targetResult.data.email?.toLowerCase() === user.email?.toLowerCase()) {
    return { success: false, error: "You cannot change your own workspace access here." };
  }
  if (input.role === "owner" || !canManageTarget(actor.role_key, targetRole) || !canManageTarget(actor.role_key, input.role)) {
    return { success: false, error: "You do not have permission to grant or change this role." };
  }
  const permissions = WORKSPACE_ROLE_CAPABILITIES[input.role];
  const legacyRole = legacyRoleLabel(input.role);

  const update = await supabase
    .from("os_workspace_members")
    .update({ role: legacyRole, role_key: input.role, access: permissions, active: input.active, status: input.active ? targetResult.data.status === "pending" ? "pending" : "online" : "offline" })
    .eq("id", input.memberId)
    .eq("workspace_id", input.workspaceId);
  if (update.error) return { success: false, error: update.error.message };

  await supabase
    .from("os_member_invites")
    .update({ role: legacyRole, role_key: input.role, permissions })
    .eq("workspace_id", input.workspaceId)
    .eq("email", targetResult.data.email)
    .eq("status", "pending");

  await supabase.from("os_execution_logs").insert({
    id: `log-member-role-${Date.now()}`,
    ts: new Date().toISOString(),
    run_id: "team",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: !input.active && targetResult.data.active ? "member_disabled" : input.active && !targetResult.data.active ? "member_enabled" : "member_role_changed",
    message: `Member ${targetResult.data.email} changed from ${targetRole} to ${input.role}${input.active ? "" : " and disabled"} by ${user.email ?? "workspace admin"}`,
    duration: "-",
    status: "ok",
  });

  return { success: true, status: "sent", message: "Member access updated." };
}

type RemoveMemberInput = { workspaceId: string; memberId: string };

/**
 * Fully removes an accepted workspace member -- distinct from disabling
 * access, which only suspends it. Membership is deleted outright, so the
 * member no longer appears in the workspace at all. Pending invites are
 * out of scope here (use revokeWorkspaceInvite): removal is only for
 * members who already accepted an invite. The workspace owner can never be
 * removed (there is exactly one owner per workspace and the row-level
 * `owner_protected` trigger enforces this at the database layer too), and a
 * caller can never remove themselves.
 */
export async function removeWorkspaceMember(input: RemoveMemberInput): Promise<InviteResult> {
  const user = await getVerifiedSupabaseUser();
  if (!user) return { success: false, error: "Sign in to manage team members." };
  if (!input.workspaceId || !input.memberId) return { success: false, error: "A workspace member is required." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, error: "Supabase service role config is missing." };

  let actor;
  try {
    actor = await requireWorkspaceAdmin(user.id, input.workspaceId);
  } catch (error) {
    if (error instanceof AuthorizationError) return { success: false, error: "You do not have permission to manage members in this workspace." };
    return { success: false, error: "Could not verify your workspace permissions." };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const targetResult = await supabase
    .from("os_workspace_members")
    .select("id,user_id,email,role,role_key,status")
    .eq("id", input.memberId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();
  if (targetResult.error || !targetResult.data) return { success: false, error: "Workspace member not found." };

  if (targetResult.data.status === "pending") {
    return { success: false, error: "This is a pending invite -- use Revoke invitation instead." };
  }
  const targetRole = normalizeWorkspaceRole(targetResult.data.role_key, targetResult.data.role);
  if (targetRole === "owner") return { success: false, error: "The workspace owner cannot be removed." };
  if (targetResult.data.user_id === user.id || targetResult.data.email?.toLowerCase() === user.email?.toLowerCase()) {
    return { success: false, error: "You cannot remove yourself from this workspace." };
  }
  if (!canManageTarget(actor.role_key, targetRole)) {
    return { success: false, error: "You do not have permission to remove this member." };
  }

  const remove = await supabase
    .from("os_workspace_members")
    .delete()
    .eq("id", input.memberId)
    .eq("workspace_id", input.workspaceId);
  if (remove.error) return { success: false, error: "Could not remove this member." };

  await supabase.from("os_execution_logs").insert({
    id: `log-member-removed-${Date.now()}`,
    ts: new Date().toISOString(),
    run_id: "team",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "member_removed",
    message: `Member ${targetResult.data.email} removed from the workspace by ${user.email ?? "workspace admin"}`,
    duration: "-",
    status: "ok",
  });

  return { success: true, status: "sent", message: "Member removed." };
}

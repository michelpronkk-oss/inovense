"use server";

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getAppUrl } from "@/lib/urls";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, AuthorizationError } from "@/lib/server/workspace-access";
import { renderTeamInviteEmail } from "@/lib/email/auth-emails";

type InviteInput = {
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  /**
   * @deprecated no longer trusted for authorization. The inviter identity is
   * always re-derived from the verified session server-side.
   */
  inviterUserId?: string;
  email: string;
  role: "Operator - Admin" | "Operator - Reviewer" | "Operator - Viewer";
  permissions: string[];
};

type InviteResult =
  | { success: true; status: "sent" | "queued"; message: string }
  | { success: false; error: string };

export async function inviteWorkspaceMember(input: InviteInput): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { success: false, error: "Enter a valid email address." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, error: "Supabase service role config is missing." };

  // Identity and authorization are always re-derived from the verified
  // session, never from client-supplied inviterUserId/workspaceId alone.
  // Only workspace admins/owners may invite new members.
  const verifiedUser = await getVerifiedSupabaseUser();
  if (!verifiedUser) return { success: false, error: "Sign in to invite team members." };

  const workspaceId = input.workspaceId || "ws-atlas";
  const workspaceName = input.workspaceName || "Auterim Workspace";

  try {
    await requireWorkspaceAdmin(verifiedUser.id, workspaceId);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: "You do not have permission to invite members to this workspace." };
    }
    return { success: false, error: "Could not verify your workspace permissions." };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const inviterUserId = verifiedUser.id;

  // Ensure workspace and pending member row exist.
  await supabase.from("os_workspaces").upsert({
    id: workspaceId,
    name: workspaceName,
    environment: "production",
    region: "eu-west-1",
    plan: "Inovense OS - Growth",
  });

  const inviteInsert = await supabase
    .from("os_member_invites")
    .insert({
      workspace_id: workspaceId,
      email,
      role: input.role,
      permissions: input.permissions,
      invited_by: inviterUserId,
      status: "pending",
    })
    .select("id, token")
    .single();

  if (inviteInsert.error || !inviteInsert.data) {
    return { success: false, error: inviteInsert.error?.message ?? "Could not create invite." };
  }

  await supabase.from("os_workspace_members").upsert({
    workspace_id: workspaceId,
    email,
    full_name: email.split("@")[0],
    role: input.role,
    access: input.permissions,
    status: "pending",
    active: true,
    invited_by: inviterUserId,
  }, { onConflict: "workspace_id,email" });

  const appUrl = getAppUrl();
  const acceptPath = `/invite/accept?token=${inviteInsert.data.token}`;
  const directAcceptUrl = `${appUrl}/app${acceptPath}`;

  // Route the invite through the auth callback first so the invite token is
  // exchanged for a real session cookie before the accept page (a Server
  // Action) tries to read the verified user. `generateLink` creates the
  // underlying Supabase auth user for brand-new invitees WITHOUT sending
  // Supabase's own built-in "Invite User" email -- we send exactly one
  // branded email ourselves, below. (Previously this also called
  // `inviteUserByEmail`, which silently fired Supabase's own unbranded
  // invite email in addition to this one -- that double-send is the bug
  // this fixes.)
  const supabaseInviteRedirect = `${appUrl}/app/auth/callback?next=${encodeURIComponent(acceptPath)}`;
  const generated = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: supabaseInviteRedirect },
  });

  // `generateLink({ type: "invite" })` errors if the invitee already has an
  // Auterim account (Supabase only allows "invite" to create brand-new
  // users). That's an expected case here -- e.g. an existing user invited to
  // a second workspace -- not a delivery failure. Fall back to the direct
  // accept link; the accept page already prompts "sign in to accept" for a
  // visitor with no session, which covers existing users correctly.
  const actionLink = generated.data?.properties?.action_link;
  const acceptUrl = actionLink ?? directAcceptUrl;
  const generateLinkError = actionLink ? null : (generated.error?.message ?? null);

  const { subject, html: htmlBody, text: textBody } = renderTeamInviteEmail({
    workspaceName,
    inviterName: input.inviterName,
    role: input.role,
    acceptUrl,
  });

  let sent = false;
  let providerError = "";
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM_EMAIL ?? "Auterim <onboarding@resend.dev>";
    const mail = await resend.emails.send({ from, to: email, subject, text: textBody, html: htmlBody });
    if (!mail.error) sent = true;
    if (mail.error) providerError = String(mail.error.message || mail.error.name || "resend_error");
  }

  await supabase.from("os_email_outbox").insert({
    workspace_id: workspaceId,
    invite_id: inviteInsert.data.id,
    template_key: "team_invite_v1",
    to_email: email,
    subject,
    html_body: htmlBody,
    text_body: textBody,
    provider: "resend",
    status: sent ? "sent" : "queued",
    error_message: providerError || generateLinkError,
    sent_at: sent ? new Date().toISOString() : null,
  });

  await supabase.from("os_execution_logs").insert({
    id: `log-invite-${Date.now()}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: "manual",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#37E6D4",
    event: "team_invite",
    message: `Invited ${email} as ${input.role}`,
    duration: "-",
    status: "ok",
  });

  if (resendKey && !sent) {
    return { success: false, error: `Invite created, but delivery failed: ${providerError || "unknown error"}` };
  }

  return { success: true, status: sent ? "sent" : "queued", message: sent ? "Invite email sent." : "Invite queued." };
}

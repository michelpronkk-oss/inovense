"use server";

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getAppUrl } from "@/lib/urls";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, AuthorizationError } from "@/lib/server/workspace-access";

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

function inviteHtml(args: { workspaceName: string; inviterName: string; role: string; acceptUrl: string }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Auterim OS Invite</title>
</head>
<body style="margin:0;padding:0;background-color:#07090d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#07090d" style="padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">
        <tr><td bgcolor="#4DE8E1" style="height:2px;border-radius:2px 2px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td bgcolor="#0f1319" style="border:1px solid #1f252e;border-top:none;border-radius:0 0 12px 12px;padding:34px;">
          <p style="margin:0 0 10px 0;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6b7178;">Auterim OS invite</p>
          <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.2;color:#eceff3;">You were invited to ${args.workspaceName}</h1>
          <p style="margin:0 0 20px 0;font-size:14px;line-height:1.7;color:#a4abb4;">${args.inviterName} invited you as <span style="color:#eceff3;font-weight:600;">${args.role}</span> to join the workspace.</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td bgcolor="#4DE8E1" style="border-radius:10px;">
              <a href="${args.acceptUrl}" style="display:inline-block;padding:12px 18px;color:#04130f;text-decoration:none;font-size:13px;font-weight:700;">Accept invite</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0 0;font-size:12px;line-height:1.6;color:#6b7178;">This link expires in 7 days.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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
  const acceptUrl = `${appUrl}/app${acceptPath}`;
  const subject = `You are invited to ${workspaceName} on Auterim OS`;
  const textBody = `${input.inviterName} invited you to ${workspaceName} as ${input.role}. Accept invite: ${acceptUrl}`;
  const htmlBody = inviteHtml({ workspaceName, inviterName: input.inviterName, role: input.role, acceptUrl });

  // Route Supabase's own invite email through the auth callback first so the
  // recovery/invite token is exchanged for a real session cookie before the
  // accept page (a Server Action) tries to read the verified user.
  const supabaseInviteRedirect = `${appUrl}/app/auth/callback?next=${encodeURIComponent(acceptPath)}`;
  const authInvite = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo: supabaseInviteRedirect });

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
    error_message: providerError || (authInvite.error ? authInvite.error.message : null),
    sent_at: sent ? new Date().toISOString() : null,
  });

  await supabase.from("os_execution_logs").insert({
    id: `log-invite-${Date.now()}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: "manual",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "team_invite",
    message: `Invited ${email} as ${input.role}`,
    duration: "-",
    status: "ok",
  });

  if (authInvite.error && !sent) {
    return { success: false, error: `Invite created, but delivery failed: ${authInvite.error.message}` };
  }

  return { success: true, status: sent ? "sent" : "queued", message: sent ? "Invite email sent." : "Invite queued." };
}

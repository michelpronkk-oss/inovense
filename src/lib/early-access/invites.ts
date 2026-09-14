import "server-only";

import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { hashEarlyAccessToken, isEarlyAccessToken } from "@/lib/early-access/invite-token";

export { createEarlyAccessToken, hashEarlyAccessToken, isEarlyAccessToken } from "@/lib/early-access/invite-token";

export const EARLY_ACCESS_INVITE_COOKIE = "auterim_ea_invite";

export type EarlyAccessInvitePreview = {
  state: "valid" | "pending" | "expired" | "revoked" | "accepted" | "unavailable";
  inviteId: string;
  requestId: string;
  name: string;
  company: string;
  emailNormalized: string;
  maskedEmail: string;
  expiresAt: string;
  lastSentAt: string | null;
  acceptedAt: string | null;
  acceptedUserId: string | null;
  acceptedWorkspaceId: string | null;
};

type InviteEvent =
  | "early_access_invite_created"
  | "early_access_invite_sent"
  | "early_access_invite_send_failed"
  | "early_access_invite_opened"
  | "early_access_invite_accepted"
  | "early_access_invite_expired"
  | "early_access_invite_revoked"
  | "early_access_invite_resent";

function maskEmail(value: string): string {
  const [local = "", domain = ""] = value.split("@", 2);
  if (!local || !domain) return "the invited email address";
  return `${local.slice(0, 1)}${"•".repeat(Math.min(5, Math.max(2, local.length - 1)))}@${domain}`;
}

/** Server-only, minimal preview. The raw token is only ever hashed for reads. */
export async function getEarlyAccessInvitePreview(token: string | null | undefined): Promise<EarlyAccessInvitePreview | null> {
  if (!isEarlyAccessToken(token) || !hasSupabaseAdminConfig()) return null;
  const db = createSupabaseAdmin();
  const { data: invite, error: inviteError } = await db
    .from("os_early_access_invites")
    .select("id,request_id,email_normalized,delivery_state,expires_at,last_sent_at,accepted_at,revoked_at,accepted_user_id,accepted_workspace_id")
    .eq("token_hash", hashEarlyAccessToken(token))
    .maybeSingle();
  if (inviteError || !invite) return null;

  const { data: request, error: requestError } = await db
    .from("os_early_access_requests")
    .select("name,company,status,email_normalized")
    .eq("id", invite.request_id)
    .maybeSingle();
  if (requestError || !request || request.email_normalized !== invite.email_normalized) return null;

  const expiresAt = String(invite.expires_at);
  const expired = new Date(expiresAt).getTime() <= Date.now();
  const state: EarlyAccessInvitePreview["state"] = invite.accepted_at
    ? "accepted"
    : invite.revoked_at
      ? "revoked"
      : expired
        ? "expired"
        : request.status !== "invited"
          ? "unavailable"
          : invite.delivery_state === "pending"
            ? "pending"
            : invite.delivery_state === "sent"
              ? "valid"
              : "unavailable";

  return {
    state,
    inviteId: String(invite.id),
    requestId: String(invite.request_id),
    name: String(request.name),
    company: String(request.company),
    emailNormalized: String(invite.email_normalized),
    maskedEmail: maskEmail(String(invite.email_normalized)),
    expiresAt,
    lastSentAt: typeof invite.last_sent_at === "string" ? invite.last_sent_at : null,
    acceptedAt: typeof invite.accepted_at === "string" ? invite.accepted_at : null,
    acceptedUserId: typeof invite.accepted_user_id === "string" ? invite.accepted_user_id : null,
    acceptedWorkspaceId: typeof invite.accepted_workspace_id === "string" ? invite.accepted_workspace_id : null,
  };
}

/** Structured application event. Deliberately excludes token, email and message body. */
export function logEarlyAccessInviteEvent(event: InviteEvent, data: { inviteId?: string; requestId?: string; userId?: string; workspaceId?: string; errorCode?: string } = {}) {
  console.info(`[${event}]`, JSON.stringify({ event, ...data, at: new Date().toISOString() }));
}

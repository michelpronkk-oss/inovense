"use server";

import { createSupabaseServerActionClient, getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { acceptWorkspaceInvite } from "@/lib/server/provisioning";

export type AcceptInviteState =
  | { status: "ok"; workspaceId: string }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

const FRIENDLY_MESSAGE: Record<string, string> = {
  invite_not_found: "This invite link is not valid.",
  invite_already_accepted: "This invite has already been accepted.",
  invite_revoked: "This invite has been revoked by the workspace.",
  invite_expired: "This invite has expired. Ask an admin to send a new one.",
  invite_email_mismatch: "This invite was sent to a different email address than the one you're signed in with.",
  unknown: "This invite could not be accepted.",
};

export async function acceptInviteAction(token: string): Promise<AcceptInviteState> {
  const user = await getVerifiedSupabaseUser();
  if (!user) return { status: "unauthenticated" };

  const supabase = await createSupabaseServerActionClient();
  const result = await acceptWorkspaceInvite(supabase, token);

  if (!result.ok) {
    return { status: "error", message: FRIENDLY_MESSAGE[result.code] ?? result.message };
  }

  return { status: "ok", workspaceId: result.result.workspaceId };
}

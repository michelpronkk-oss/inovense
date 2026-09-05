import type { createSupabaseServerActionClient } from "@/lib/supabase/server";

type UserScopedSupabase = Awaited<ReturnType<typeof createSupabaseServerActionClient>>;

export type ProvisionResult = {
  workspaceId: string;
  workspaceName: string;
  roleKey: string;
  onboardingCompletedAt: string | null;
  created: boolean;
};

/**
 * Atomically provisions (or, if one already exists, returns) the caller's
 * initial workspace via the `provision_initial_workspace` Postgres
 * function (see supabase/migrations/20260905_auth_identity_foundation.sql).
 *
 * IMPORTANT: `supabase` must be a client carrying the signed-in user's own
 * access token (from `createSupabaseServerActionClient()`), NOT the
 * service-role admin client. The RPC is `security definer` and validates
 * `auth.uid()` internally - calling it with the service-role client would
 * make `auth.uid()` resolve to null server-side and the call would fail
 * closed (by design: no accidental "provision on behalf of anyone").
 */
export async function provisionInitialWorkspace(
  supabase: UserScopedSupabase,
  input: { fullName?: string | null; companyName?: string | null } = {}
): Promise<ProvisionResult> {
  const { data, error } = await supabase.rpc("provision_initial_workspace", {
    p_full_name: input.fullName ?? null,
    p_company_name: input.companyName ?? null,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Workspace provisioning did not return a workspace.");

  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    roleKey: row.role_key,
    onboardingCompletedAt: row.onboarding_completed_at ?? null,
    created: Boolean(row.created),
  };
}

export type AcceptInviteResult = { workspaceId: string; roleKey: string };

export type AcceptInviteError =
  | "unauthenticated"
  | "invite_not_found"
  | "invite_already_accepted"
  | "invite_revoked"
  | "invite_expired"
  | "invite_email_mismatch"
  | "unknown";

/**
 * Accepts a team invite via the `accept_workspace_invite` Postgres function.
 * Same rule as above: `supabase` must be the user-scoped client so the
 * invited email is checked against the *verified* signed-in user, never a
 * client-supplied email.
 */
export async function acceptWorkspaceInvite(
  supabase: UserScopedSupabase,
  token: string
): Promise<{ ok: true; result: AcceptInviteResult } | { ok: false; code: AcceptInviteError; message: string }> {
  const { data, error } = await supabase.rpc("accept_workspace_invite", { p_token: token });

  if (error) {
    const code = (error.message || "").trim() as AcceptInviteError;
    const known: AcceptInviteError[] = [
      "unauthenticated",
      "invite_not_found",
      "invite_already_accepted",
      "invite_revoked",
      "invite_expired",
      "invite_email_mismatch",
    ];
    return {
      ok: false,
      code: known.includes(code) ? code : "unknown",
      message: error.message || "Could not accept this invite.",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, code: "unknown", message: "Could not accept this invite." };

  return { ok: true, result: { workspaceId: row.workspace_id, roleKey: row.role_key } };
}

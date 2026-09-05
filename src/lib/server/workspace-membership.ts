import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

function isUuid(v: string | null | undefined): v is string {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export type MembershipResult =
  | { found: true; workspaceId: string; memberEmail: string | null }
  | { found: false; reason: "not_found" | "invalid_params" };

/**
 * Resolve workspace membership for a given identity.
 *
 * SECURITY: `userId` / `email` here must already come from a VERIFIED
 * session (see `resolveWorkspaceContext` in `src/lib/os/workspace.ts`),
 * never from unauthenticated request params. This function does not
 * perform any authentication itself - it only checks whether an already
 * -verified identity has an accepted membership row for the requested
 * workspace.
 *
 * This function previously auto-created ("bootstrapped") a brand new
 * `Operator - Admin` membership row for any email + workspaceId pair that
 * did not already have one, as long as the workspace existed. That allowed
 * unauthenticated callers to grant themselves admin access to any real
 * workspace by guessing its id. That bootstrap behavior has been removed.
 * Missing membership now always resolves to `not_found`; the caller must
 * treat that as 401/403. The only way to gain a legitimate membership row
 * is via workspace provisioning (owner) or invite acceptance
 * (`accept_workspace_invite` RPC).
 */
export async function resolveWorkspaceMembership(params: {
  workspaceId: string;
  userId?: string;
  email?: string;
}): Promise<MembershipResult> {
  const { workspaceId, userId, email } = params;
  if (!workspaceId) return { found: false, reason: "invalid_params" };

  const normalizedEmail = email ? email.trim().toLowerCase() : undefined;
  const conditions: string[] = [];
  if (isUuid(userId)) conditions.push(`user_id.eq.${userId}`);
  if (normalizedEmail) conditions.push(`email.eq.${normalizedEmail}`);

  if (conditions.length === 0) return { found: false, reason: "invalid_params" };

  const supabase = createSupabaseAdmin();

  const membership = await supabase
    .from("os_workspace_members")
    .select("workspace_id,email")
    .eq("workspace_id", workspaceId)
    .or(conditions.join(","))
    .neq("status", "pending")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership.data) {
    return { found: true, workspaceId: membership.data.workspace_id, memberEmail: membership.data.email };
  }

  return { found: false, reason: "not_found" };
}

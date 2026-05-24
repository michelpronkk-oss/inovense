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
 * Strategy:
 *   1. Match by workspace_id AND (user_id OR email) in one query.
 *   2. Bootstrap fallback: if no member row found but the workspace exists,
 *      upsert the user as a member. This handles email-change or first-access
 *      scenarios where the member row was not created for this identity yet.
 *
 * Security: workspace_id must refer to a real row in os_workspaces.
 * Arbitrary workspace IDs are rejected at the upsert gate.
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
    .limit(1)
    .maybeSingle();

  if (membership.data) {
    return { found: true, workspaceId: membership.data.workspace_id, memberEmail: membership.data.email };
  }

  // Bootstrap fallback: if workspace exists, add this identity as a member.
  // Handles the common case where the user's email changed after initial
  // bootstrap, or they access the workspace via a different identity.
  if (normalizedEmail) {
    const workspaceCheck = await supabase
      .from("os_workspaces")
      .select("id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (workspaceCheck.data) {
      await supabase.from("os_workspace_members").upsert({
        workspace_id: workspaceId,
        user_id: isUuid(userId) ? userId : null,
        email: normalizedEmail,
        full_name: normalizedEmail.split("@")[0],
        role: "Operator - Admin",
        access: ["All operators", "Approvals", "Settings"],
        status: "online",
        active: true,
      }, { onConflict: "workspace_id,email" });

      return { found: true, workspaceId, memberEmail: normalizedEmail };
    }
  }

  return { found: false, reason: "not_found" };
}

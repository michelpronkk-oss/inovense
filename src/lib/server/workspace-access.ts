import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/**
 * Conceptual role model used across the app. `role` (the legacy
 * "Operator - Admin" / "Operator - Reviewer" / "Operator - Viewer" label) is
 * retained on `os_workspace_members` for backward compatibility with
 * existing UI copy, but `role_key` is now the authoritative value used for
 * all server-side authorization decisions.
 */
export type RoleKey = "owner" | "admin" | "reviewer" | "member" | "viewer";

export type WorkspaceMembershipRow = {
  workspace_id: string;
  role_key: RoleKey;
  status: string;
  active: boolean;
  created_at?: string;
};

export class AuthorizationError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
    this.status = status;
  }
}

/**
 * All authoritative membership reads/writes below use the service-role
 * admin client with an explicit `user_id` filter supplied by the caller.
 * The `userId` passed in MUST already come from a verified session
 * (`getVerifiedSupabaseUser()` / `resolveWorkspaceContext()`), never from
 * client-supplied request params - these helpers do not authenticate,
 * they only authorize an already-verified identity.
 */
export async function listActiveMemberships(
  userId: string,
  supabase: SupabaseAdmin = createSupabaseAdmin()
): Promise<WorkspaceMembershipRow[]> {
  const { data, error } = await supabase
    .from("os_workspace_members")
    .select("workspace_id, role_key, status, active, created_at")
    .eq("user_id", userId)
    .eq("active", true)
    .neq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as WorkspaceMembershipRow[];
}

/**
 * Deterministic active-workspace resolution:
 *   1. saved active workspace (os_user_profiles.last_active_workspace_id),
 *      only if the user still has a valid membership there
 *   2. owner membership
 *   3. oldest valid membership
 * Returns null if the user has no memberships at all (not provisioned yet).
 */
export async function resolveActiveWorkspaceId(
  userId: string,
  supabase: SupabaseAdmin = createSupabaseAdmin()
): Promise<string | null> {
  const memberships = await listActiveMemberships(userId, supabase);
  if (memberships.length === 0) return null;

  const { data: profile } = await supabase
    .from("os_user_profiles")
    .select("last_active_workspace_id")
    .eq("user_id", userId)
    .maybeSingle();

  const saved = profile?.last_active_workspace_id as string | null | undefined;
  if (saved && memberships.some((m) => m.workspace_id === saved)) {
    return saved;
  }

  const owner = memberships.find((m) => m.role_key === "owner");
  if (owner) return owner.workspace_id;

  return memberships[0].workspace_id;
}

export async function getMembership(
  userId: string,
  workspaceId: string,
  supabase: SupabaseAdmin = createSupabaseAdmin()
): Promise<WorkspaceMembershipRow | null> {
  if (!userId || !workspaceId) return null;
  const { data, error } = await supabase
    .from("os_workspace_members")
    .select("workspace_id, role_key, status, active, created_at")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .neq("status", "pending")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as WorkspaceMembershipRow | null) ?? null;
}

/**
 * Switch a user's active workspace. Never accepts an arbitrary workspace id
 * without first validating real membership - this is the only path that
 * should ever change `last_active_workspace_id`.
 */
export async function setActiveWorkspace(
  userId: string,
  workspaceId: string,
  supabase: SupabaseAdmin = createSupabaseAdmin()
): Promise<WorkspaceMembershipRow> {
  const membership = await getMembership(userId, workspaceId, supabase);
  if (!membership) {
    throw new AuthorizationError("not_a_member", "You are not a member of this workspace.", 403);
  }
  const { error } = await supabase
    .from("os_user_profiles")
    .update({ last_active_workspace_id: workspaceId })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return membership;
}

export async function requireWorkspaceMember(
  userId: string | undefined,
  workspaceId: string | undefined,
  supabase: SupabaseAdmin = createSupabaseAdmin()
): Promise<WorkspaceMembershipRow> {
  if (!userId) throw new AuthorizationError("unauthenticated", "Sign in to continue.", 401);
  if (!workspaceId) throw new AuthorizationError("invalid_params", "A workspace is required.", 400);
  const membership = await getMembership(userId, workspaceId, supabase);
  if (!membership) throw new AuthorizationError("missing_membership", "No workspace membership was found for the signed-in user.", 403);
  return membership;
}

export async function requireWorkspaceRole(
  userId: string | undefined,
  workspaceId: string | undefined,
  allowed: RoleKey[],
  supabase: SupabaseAdmin = createSupabaseAdmin()
): Promise<WorkspaceMembershipRow> {
  const membership = await requireWorkspaceMember(userId, workspaceId, supabase);
  if (!allowed.includes(membership.role_key)) {
    throw new AuthorizationError("forbidden_role", `This action requires one of the following roles: ${allowed.join(", ")}.`, 403);
  }
  return membership;
}

export async function requireWorkspaceOwner(
  userId: string | undefined,
  workspaceId: string | undefined,
  supabase: SupabaseAdmin = createSupabaseAdmin()
): Promise<WorkspaceMembershipRow> {
  return requireWorkspaceRole(userId, workspaceId, ["owner"], supabase);
}

export async function requireWorkspaceAdmin(
  userId: string | undefined,
  workspaceId: string | undefined,
  supabase: SupabaseAdmin = createSupabaseAdmin()
): Promise<WorkspaceMembershipRow> {
  return requireWorkspaceRole(userId, workspaceId, ["owner", "admin"], supabase);
}

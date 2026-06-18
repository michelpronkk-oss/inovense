import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

function isUuid(v: string | null | undefined): v is string {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function makeWorkspaceId(nameOrEmail: string): string {
  const base = nameOrEmail
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/www\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24) || "preview";
  return `ws-${base}`;
}

export type WorkspaceContext =
  | {
      ok: true;
      workspaceId: string;
      userId?: string;
      userEmail: string | null;
      memberEmail: string | null;
      devFallback: boolean;
    }
  | {
      ok: false;
      status: 400 | 403 | 404;
      error: string;
      code: "invalid_params" | "workspace_membership_not_found" | "workspace_not_found";
    };

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

async function findMembership(input: {
  supabase: SupabaseAdmin;
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
}) {
  const conditions: string[] = [];
  if (isUuid(input.userId)) conditions.push(`user_id.eq.${input.userId}`);
  if (input.userEmail) conditions.push(`email.eq.${input.userEmail}`);
  if (conditions.length === 0) return null;

  let query = input.supabase
    .from("os_workspace_members")
    .select("workspace_id,email")
    .or(conditions.join(","))
    .limit(1);

  if (input.workspaceId) {
    query = query.eq("workspace_id", input.workspaceId);
  }

  const membership = await query.maybeSingle();
  return membership.data ?? null;
}

async function ensureDevWorkspace(input: {
  supabase: SupabaseAdmin;
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
}): Promise<WorkspaceContext> {
  const workspaceId = input.workspaceId || makeWorkspaceId(input.userEmail || input.userName || input.userId || "workspace");

  await input.supabase.from("os_workspaces").upsert({
    id: workspaceId,
    name: "Workspace",
    environment: "setup",
    region: "eu-west-1",
    plan: "preview",
    plan_tier: "preview",
    billing_status: "preview",
    operators_limit: 1,
    connectors_limit: "0",
    actions_limit: 0,
    log_retention_days: 0,
    can_use_real_connectors: false,
    can_run_real_actions: false,
    support_level: "none",
  }, { onConflict: "id", ignoreDuplicates: true });

  if (input.userEmail) {
    await input.supabase.from("os_workspace_members").upsert({
      workspace_id: workspaceId,
      user_id: isUuid(input.userId) ? input.userId : null,
      email: input.userEmail,
      full_name: input.userName || input.userEmail.split("@")[0],
      role: "Operator - Admin",
      access: ["All operators", "Approvals", "Settings"],
      status: "online",
      active: true,
    }, { onConflict: "workspace_id,email" });
  }

  await input.supabase.from("os_workspace_settings").upsert({
    workspace_id: workspaceId,
    approval_policy: {},
    notifications: {},
  }, { onConflict: "workspace_id" });

  return {
    ok: true,
    workspaceId,
    userId: input.userId,
    userEmail: input.userEmail ?? null,
    memberEmail: input.userEmail ?? null,
    devFallback: true,
  };
}

export async function resolveWorkspaceContext(input: {
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  supabase?: SupabaseAdmin;
  allowDevFallback?: boolean;
}): Promise<WorkspaceContext> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workspaceId = input.workspaceId?.trim() || undefined;
  const userId = input.userId?.trim() || undefined;
  const userEmail = input.userEmail?.trim().toLowerCase() || undefined;
  const allowDevFallback = input.allowDevFallback !== false && process.env.NODE_ENV !== "production";

  if (!userId && !userEmail) {
    return { ok: false, status: 400, error: "User identity is required.", code: "invalid_params" };
  }

  const membership = await findMembership({ supabase, workspaceId, userId, userEmail });
  if (membership) {
    return {
      ok: true,
      workspaceId: membership.workspace_id,
      userId,
      userEmail: userEmail ?? null,
      memberEmail: membership.email,
      devFallback: false,
    };
  }

  if (allowDevFallback) {
    return ensureDevWorkspace({ supabase, workspaceId, userId, userEmail, userName: input.userName });
  }

  if (workspaceId) {
    const workspace = await supabase
      .from("os_workspaces")
      .select("id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (!workspace.data) {
      return { ok: false, status: 404, error: "Workspace not found.", code: "workspace_not_found" };
    }
  }

  return {
    ok: false,
    status: 403,
    error: "Workspace membership not found.",
    code: "workspace_membership_not_found",
  };
}

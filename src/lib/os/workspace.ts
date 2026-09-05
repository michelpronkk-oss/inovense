import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { APP_SESSION_COOKIE, getSessionUsername, LEGACY_APP_SESSION_COOKIE, LEGACY_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { reportLegacyMigrationEvent } from "@/lib/migration-telemetry";

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
      status: 400 | 401 | 403 | 404;
      error: string;
      code: "invalid_params" | "unauthenticated" | "workspace_not_found" | "workspace_forbidden" | "missing_membership";
    };

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

type ResolvedIdentity = {
  userId?: string;
  userEmail?: string;
  userName?: string;
  source: "input" | "supabase_cookie" | "app_session" | "admin_session";
};

function normalizeEmail(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || undefined;
}

function readJsonCookie(value: string): unknown {
  const decoded = decodeURIComponent(value);
  return JSON.parse(decoded);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getAccessTokenFromAuthCookie(value: string): string | undefined {
  try {
    const parsed = readJsonCookie(value);
    if (Array.isArray(parsed)) return getString(parsed[0]);
    if (parsed && typeof parsed === "object") {
      const rec = parsed as Record<string, unknown>;
      return getString(rec.access_token) ?? getString(rec.accessToken);
    }
  } catch {
    return undefined;
  }
}

function getSupabaseAuthCookieValue(cookieStore: Awaited<ReturnType<typeof cookies>>): string | undefined {
  const all = cookieStore.getAll();
  const whole = all.find((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));
  if (whole) return whole.value;

  const chunked = all
    .filter((cookie) => /^sb-.+-auth-token\.\d+$/.test(cookie.name))
    .sort((a, b) => {
      const aIndex = Number(a.name.split(".").pop() ?? "0");
      const bIndex = Number(b.name.split(".").pop() ?? "0");
      return aIndex - bIndex;
    });

  return chunked.length ? chunked.map((cookie) => cookie.value).join("") : undefined;
}

async function getSupabaseCookieIdentity(): Promise<ResolvedIdentity | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();
  const authCookieValue = getSupabaseAuthCookieValue(cookieStore);
  const token = authCookieValue ? getAccessTokenFromAuthCookie(authCookieValue) : undefined;
  if (!token) return null;

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    userId: data.user.id,
    userEmail: normalizeEmail(data.user.email ?? undefined),
    userName: getString(data.user.user_metadata?.full_name) ?? getString(data.user.user_metadata?.name),
    source: "supabase_cookie",
  };
}

async function getSignedCookieIdentity(cookieName: string, source: "app_session" | "admin_session"): Promise<ResolvedIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  if (cookieName === LEGACY_APP_SESSION_COOKIE) reportLegacyMigrationEvent("legacy_app_cookie_used");
  if (cookieName === LEGACY_SESSION_COOKIE) reportLegacyMigrationEvent("legacy_admin_cookie_used");

  const username = await getSessionUsername(token);
  if (!username) return null;

  return {
    userEmail: normalizeEmail(username),
    userName: username,
    source,
  };
}

/**
 * Resolve the caller's identity from VERIFIED server-side session state only.
 *
 * SECURITY: This function must never trust caller-supplied `userId` /
 * `userEmail` values (query params, request body, etc.) as identity. Doing so
 * previously allowed any request that simply included a valid member's email
 * or user id to impersonate that member with zero authentication. Verified
 * sources only:
 *   1. Supabase auth cookie, checked against Supabase Auth via
 *      `supabase.auth.getUser(token)` (real JWT verification).
 *   2. Server-issued signed app/admin session cookies (HMAC-verified, not
 *      client-suppliable).
 *
 * Caller-supplied `userId`/`userName`/`userEmail` in `input` are NEVER used
 * to establish identity. They may still be read elsewhere as a *requested*
 * workspaceId/display name, but identity itself always comes from a verified
 * session.
 */
async function resolveRequestIdentity(): Promise<ResolvedIdentity | null> {
  return await getSupabaseCookieIdentity()
    ?? await getSignedCookieIdentity(APP_SESSION_COOKIE, "app_session")
    ?? await getSignedCookieIdentity(LEGACY_APP_SESSION_COOKIE, "app_session")
    ?? await getSignedCookieIdentity(SESSION_COOKIE, "admin_session")
    ?? await getSignedCookieIdentity(LEGACY_SESSION_COOKIE, "admin_session");
}

/**
 * DEV-ONLY convenience identity for local iteration before a real session
 * exists (e.g. first local run with no cookies at all). Never reachable in
 * production: gated by NODE_ENV and by `allowDevFallback`, and only used
 * when no verified session was found. This intentionally mirrors the
 * previous "input" identity but is now clearly scoped, logged as such via
 * `devFallback: true` on the returned context, and unreachable once
 * NODE_ENV === "production".
 */
function resolveDevOnlyInputIdentity(input: {
  userId?: string;
  userEmail?: string;
  userName?: string;
}): ResolvedIdentity | null {
  if (process.env.NODE_ENV === "production") return null;
  const userId = input.userId?.trim() || undefined;
  const userEmail = normalizeEmail(input.userEmail);
  const userName = input.userName?.trim() || undefined;
  if (!userId && !userEmail) return null;
  return { userId, userEmail, userName, source: "input" };
}

async function findMembership(input: {
  supabase: SupabaseAdmin;
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
}) {
  // Prefer matching by verified user_id. Email is only used as a fallback for
  // legacy rows that predate the user_id column being populated. A "pending"
  // (not-yet-accepted invite) row must never grant access on its own -
  // membership only becomes real after invite acceptance.
  const conditions: string[] = [];
  if (isUuid(input.userId)) conditions.push(`user_id.eq.${input.userId}`);
  if (input.userEmail) conditions.push(`email.eq.${input.userEmail}`);
  if (conditions.length === 0) return null;

  let query = input.supabase
    .from("os_workspace_members")
    .select("workspace_id,email")
    .or(conditions.join(","))
    .neq("status", "pending")
    .eq("active", true)
    .order("created_at", { ascending: true })
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
  const allowDevFallback = input.allowDevFallback !== false && process.env.NODE_ENV !== "production";

  // Verified identity ONLY. `input.userId` / `input.userEmail` are never
  // trusted as identity in production - see resolveRequestIdentity().
  const verifiedIdentity = await resolveRequestIdentity();
  const identity = verifiedIdentity ?? (allowDevFallback ? resolveDevOnlyInputIdentity(input) : null);
  const userId = identity?.userId;
  const userEmail = identity?.userEmail;
  const userName = identity?.userName ?? (verifiedIdentity ? undefined : input.userName);

  if (!userId && !userEmail) {
    return { ok: false, status: 401, error: "Unauthenticated request. Sign in before accessing workspace APIs.", code: "unauthenticated" };
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
    return ensureDevWorkspace({ supabase, workspaceId, userId, userEmail, userName });
  }

  if (workspaceId) {
    const workspace = await supabase
      .from("os_workspaces")
      .select("id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (!workspace.data) {
      return { ok: false, status: 404, error: "workspace_not_found: Workspace not found.", code: "workspace_not_found" };
    }

    return {
      ok: false,
      status: 403,
      error: "workspace_forbidden: Signed-in user is not allowed to access this workspace.",
      code: "workspace_forbidden",
    };
  }

  return {
    ok: false,
    status: 403,
    error: "missing_membership: No workspace membership was found for the signed-in user.",
    code: "missing_membership",
  };
}

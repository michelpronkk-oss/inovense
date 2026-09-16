import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { AuthorizationError, requireWorkspaceRoleForIdentity } from "@/lib/server/workspace-access";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { readRequestBodyWithinLimit, requestBodyWithinLimit } from "@/lib/server/request-guards";
import { WebsiteVerificationError } from "./website-types";

export type WebsiteRouteAccess = {
  workspaceId: string;
  userId?: string;
  userEmail: string | null;
  supabase: ReturnType<typeof createSupabaseAdmin>;
};

export async function readWebsiteJson(request: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown> | null> {
  if (!requestBodyWithinLimit(request, maxBytes)) return null;
  const body = await readRequestBodyWithinLimit(request, maxBytes);
  if (body === null || !body.trim()) return {};
  try {
    const parsed = JSON.parse(body) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

export async function websiteAccess(input: { workspaceId?: string; admin: boolean }): Promise<WebsiteRouteAccess> {
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId: input.workspaceId, allowDevFallback: false, supabase });
  if (!context.ok) throw new AuthorizationError(context.code, context.error, context.status);
  if (input.admin) await requireWorkspaceRoleForIdentity({ userId: context.userId, userEmail: context.userEmail }, context.workspaceId, ["owner", "admin"], supabase);
  else await requireWorkspaceRoleForIdentity({ userId: context.userId, userEmail: context.userEmail }, context.workspaceId, ["owner", "admin", "reviewer", "member", "viewer"], supabase);
  return { workspaceId: context.workspaceId, userId: context.userId, userEmail: context.userEmail, supabase };
}

export function websiteErrorResponse(error: unknown): Response {
  const status = error instanceof AuthorizationError ? error.status : 400;
  const message = error instanceof AuthorizationError ? error.message : error instanceof Error ? error.message : "Website sync request could not be completed.";
  const code = error instanceof WebsiteVerificationError ? error.code : error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
  const responseStatus = error instanceof WebsiteVerificationError ? error.status : status;
  return Response.json({ error: message, ...(code ? { code } : {}) }, { status: Math.min(500, Math.max(400, responseStatus)) });
}

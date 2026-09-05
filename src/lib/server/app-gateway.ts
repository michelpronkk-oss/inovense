import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { createSupabaseServerActionClient, getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { provisionInitialWorkspace } from "@/lib/server/provisioning";

export type AppGatewayResult =
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | {
      status: "ready";
      userId: string;
      email: string | null;
      workspaceId: string;
      onboardingCompletedAt: string | null;
    }
  | { status: "error"; message: string };

/**
 * Single source of truth for "who is this request, and where should they
 * land in the app". Used by the /app route guard (layout.tsx). Always
 * derives identity from the verified Supabase session - never from a
 * client-supplied id/email.
 *
 * Also self-heals "authenticated but not provisioned yet" by calling the
 * atomic provisioning RPC (idempotent, safe to call on every such request).
 */
export async function resolveAppGateway(): Promise<AppGatewayResult> {
  if (!hasSupabaseAdminConfig()) return { status: "unconfigured" };

  const user = await getVerifiedSupabaseUser();
  if (!user) return { status: "unauthenticated" };

  const admin = createSupabaseAdmin();

  let workspaceId: string | null;
  try {
    workspaceId = await resolveActiveWorkspaceId(user.id, admin);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not resolve your workspace." };
  }

  if (!workspaceId) {
    try {
      const userScoped = await createSupabaseServerActionClient();
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null;
      const companyName = (user.user_metadata?.company_name as string | undefined) ?? null;
      const provisioned = await provisionInitialWorkspace(userScoped, { fullName, companyName });
      workspaceId = provisioned.workspaceId;
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Your account could not be set up. Please try again or contact support.",
      };
    }
  }

  const { data: workspace, error: workspaceError } = await admin
    .from("os_workspaces")
    .select("onboarding_completed_at")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceError) {
    return { status: "error", message: workspaceError.message };
  }

  return {
    status: "ready",
    userId: user.id,
    email: user.email ?? null,
    workspaceId,
    onboardingCompletedAt: (workspace?.onboarding_completed_at as string | null | undefined) ?? null,
  };
}

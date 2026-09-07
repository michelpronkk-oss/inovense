import { NextRequest, NextResponse } from "next/server";
import { buildMicrosoftAuthUrl, getMicrosoftConfigStatus, type MicrosoftScopeProfile } from "@/lib/connectors/microsoft";
import { createMicrosoftOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { AuthorizationError, requireWorkspaceRoleForIdentity } from "@/lib/server/workspace-access";
import { getAppUrl } from "@/lib/urls";

function canUseRealConnectors(status: string | null, flag: boolean | null): boolean {
  return Boolean(flag) && status !== "preview";
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const configStatus = getMicrosoftConfigStatus();
  if (!configStatus.configured) {
    // Never leak which secret values are set - only that server-side
    // Microsoft configuration is incomplete.
    console.error("[microsoft-connector] missing_configuration", { missing: configStatus.missing });
    return NextResponse.json({ error: "Microsoft 365 is not configured yet. Contact support." }, { status: 503 });
  }

  // The requested workspaceId is only a hint - identity is always resolved
  // from the verified session, and membership in this exact workspace is
  // required before an OAuth flow can be started on its behalf.
  const requestedWorkspaceId = req.nextUrl.searchParams.get("workspaceId") || undefined;
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId: requestedWorkspaceId, supabase });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }
  if (!context.userEmail) {
    return NextResponse.json({ error: "A verified account email is required to connect Microsoft 365.", code: "email_required" }, { status: 400 });
  }

  const workspaceId = context.workspaceId;
  const userEmail = context.userEmail;

  // "capability=teams" asks Microsoft for the additional delegated Teams
  // scopes on the SAME Entra app and the SAME connection (incremental
  // consent), instead of creating a second Microsoft credential. Only owners
  // and admins may broaden what Auterim is allowed to do with a connected
  // account, so this branch requires an elevated role - members, reviewers
  // and viewers cannot grant Teams access.
  const scopeProfile: MicrosoftScopeProfile = req.nextUrl.searchParams.get("capability") === "teams" ? "teams" : "base";
  if (scopeProfile === "teams") {
    try {
      await requireWorkspaceRoleForIdentity({ userId: context.userId, userEmail }, workspaceId, ["owner", "admin"], supabase);
    } catch (error) {
      const message = error instanceof AuthorizationError ? "Only a workspace owner or admin can enable Microsoft Teams." : "Could not verify workspace permissions.";
      const status = error instanceof AuthorizationError ? error.status : 500;
      if (req.headers.get("accept")?.includes("text/html")) {
        return NextResponse.redirect(new URL("/app/connectors?microsoft_teams=forbidden", getAppUrl()));
      }
      return NextResponse.json({ error: message, code: "forbidden_role" }, { status });
    }
  }

  const workspace = await supabase
    .from("os_workspaces")
    .select("billing_status, can_use_real_connectors")
    .eq("id", workspaceId)
    .single();

  if (workspace.error || !workspace.data) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  if (!canUseRealConnectors(workspace.data.billing_status, workspace.data.can_use_real_connectors)) {
    // A browser navigation must land on the plan decision, never expose a
    // raw 402 JSON document. API callers still receive a useful status.
    if (req.headers.get("accept")?.includes("text/html")) {
      return NextResponse.redirect(new URL("/pricing?gate=connectors&source=microsoft", getAppUrl()));
    }
    return NextResponse.json({ error: "Choose a plan to begin a trial before connecting live Microsoft 365.", code: "trial_required" }, { status: 402 });
  }

  const state = createMicrosoftOAuthState(workspaceId, userEmail, scopeProfile);
  const authUrl = buildMicrosoftAuthUrl(state, scopeProfile);
  return NextResponse.redirect(authUrl);
}

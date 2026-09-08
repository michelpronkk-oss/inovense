import { NextRequest, NextResponse } from "next/server";
import { buildSlackAuthorizationUrl, getSlackConfigStatus } from "@/lib/connectors/slack";
import { createProviderOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { requireWorkspaceAdmin, AuthorizationError } from "@/lib/server/workspace-access";
import { getAppUrl } from "@/lib/urls";

/**
 * Start direct Slack OAuth. The workspaceId query parameter is only a hint:
 * identity comes from the verified session, membership is re-checked, and the
 * workspace binding is carried inside the signed, provider-tagged state so the
 * callback can never be replayed against another workspace. Only workspace
 * owners/admins may authorize a connector.
 */
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const config = getSlackConfigStatus();
  if (!config.configured) return NextResponse.json({ error: "Slack is not configured yet. Contact support.", code: "not_configured" }, { status: 503 });

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  if (!context.userEmail) return NextResponse.json({ error: "A verified account email is required to connect Slack." }, { status: 400 });

  try {
    await requireWorkspaceAdmin(context.userId, context.workspaceId, supabase);
  } catch (error) {
    const message = error instanceof AuthorizationError ? error.message : "Could not verify workspace permissions.";
    return NextResponse.json({ error: message }, { status: error instanceof AuthorizationError ? error.status : 500 });
  }

  const workspace = await supabase
    .from("os_workspaces")
    .select("billing_status,can_use_real_connectors")
    .eq("id", context.workspaceId)
    .single();
  if (workspace.error || !workspace.data) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!workspace.data.can_use_real_connectors || workspace.data.billing_status === "preview") {
    return NextResponse.redirect(new URL("/pricing?gate=connectors&source=slack", getAppUrl()));
  }

  const state = createProviderOAuthState("slack", context.workspaceId, context.userEmail);
  return NextResponse.redirect(buildSlackAuthorizationUrl(state));
}

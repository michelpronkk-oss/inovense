import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/connectors/gmail";
import { createOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";

function canUseRealConnectors(status: string | null, flag: boolean | null): boolean {
  return Boolean(flag) && status !== "preview";
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
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
    return NextResponse.json({ error: "A verified account email is required to connect Gmail.", code: "email_required" }, { status: 400 });
  }

  const workspaceId = context.workspaceId;
  const userEmail = context.userEmail;

  const workspace = await supabase
    .from("os_workspaces")
    .select("billing_status, can_use_real_connectors")
    .eq("id", workspaceId)
    .single();

  if (workspace.error || !workspace.data) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  if (!canUseRealConnectors(workspace.data.billing_status, workspace.data.can_use_real_connectors)) {
    return NextResponse.json({ error: "Activate Starter to connect real Gmail." }, { status: 402 });
  }

  const state = createOAuthState(workspaceId, userEmail);
  const authUrl = buildGoogleAuthUrl(state);
  return NextResponse.redirect(authUrl);
}

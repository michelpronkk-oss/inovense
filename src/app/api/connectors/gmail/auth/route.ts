import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/connectors/gmail";
import { createOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

function canUseRealConnectors(status: string | null, flag: boolean | null): boolean {
  return Boolean(flag) && status !== "preview";
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").toLowerCase();
  if (!workspaceId || !userEmail) {
    return NextResponse.json({ error: "workspaceId and userEmail are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const membership = await supabase
    .from("os_workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("email", userEmail)
    .maybeSingle();

  if (!membership.data) {
    return NextResponse.json({ error: "Workspace membership not found." }, { status: 403 });
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
    return NextResponse.json({ error: "Activate Starter to connect real Gmail." }, { status: 402 });
  }

  const state = createOAuthState(workspaceId, userEmail);
  const authUrl = buildGoogleAuthUrl(state);
  return NextResponse.redirect(authUrl);
}

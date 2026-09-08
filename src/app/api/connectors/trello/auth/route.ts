import { NextRequest, NextResponse } from "next/server";
import {
  TRELLO_OAUTH_COOKIE,
  buildTrelloAuthorizationUrl,
  createTrelloHandoff,
  getTrelloConfigStatus,
  requestTrelloRequestToken,
} from "@/lib/connectors/trello";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { requireWorkspaceAdmin, AuthorizationError } from "@/lib/server/workspace-access";
import { getAppUrl } from "@/lib/urls";

/**
 * Start direct Trello authorization (OAuth 1.0a).
 *
 * Trello's authorization page carries no state parameter, so the workspace
 * binding and the single-use request token secret travel in a short-lived,
 * httpOnly, signed cookie instead. Identity is resolved from the verified
 * session and owner/admin membership is required before any request token is
 * created.
 */
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const config = getTrelloConfigStatus();
  if (!config.configured) return NextResponse.json({ error: "Trello is not configured yet. Contact support.", code: "not_configured" }, { status: 503 });

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  if (!context.userEmail) return NextResponse.json({ error: "A verified account email is required to connect Trello." }, { status: 400 });

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
    return NextResponse.redirect(new URL("/pricing?gate=connectors&source=trello", getAppUrl()));
  }

  let requestToken: { token: string; tokenSecret: string };
  try {
    requestToken = await requestTrelloRequestToken();
  } catch {
    return NextResponse.redirect(new URL("/app/connectors?trello=request_token_failed", getAppUrl()));
  }

  const response = NextResponse.redirect(buildTrelloAuthorizationUrl(requestToken.token));
  response.cookies.set({
    name: TRELLO_OAUTH_COOKIE,
    value: createTrelloHandoff({
      workspaceId: context.workspaceId,
      userEmail: context.userEmail,
      requestToken: requestToken.token,
      requestTokenSecret: requestToken.tokenSecret,
    }),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax still sends the cookie on Trello's top-level GET redirect back to
    // Auterim, while blocking cross-site subresource use.
    sameSite: "lax",
    path: "/api/connectors/trello",
    maxAge: 10 * 60,
  });
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { buildSalesforceAuthorizationUrl, createSalesforcePkceChallenge, createSalesforcePkceVerifier, getSalesforceConfigStatus } from "@/lib/connectors/salesforce";
import { createSalesforceOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { getAppUrl } from "@/lib/urls";

function canUseRealConnectors(status: string | null, flag: boolean | null): boolean {
  return Boolean(flag) && status !== "preview";
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const config = getSalesforceConfigStatus();
  if (!config.configured) return NextResponse.json({ error: "Salesforce is not configured yet. Contact support." }, { status: 503 });

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  if (!context.userEmail) return NextResponse.json({ error: "A verified account email is required to connect Salesforce.", code: "email_required" }, { status: 400 });

  const workspace = await supabase.from("os_workspaces").select("billing_status, can_use_real_connectors").eq("id", context.workspaceId).single();
  if (workspace.error || !workspace.data) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!canUseRealConnectors(workspace.data.billing_status, workspace.data.can_use_real_connectors)) {
    if (req.headers.get("accept")?.includes("text/html")) return NextResponse.redirect(new URL("/pricing?gate=connectors&source=salesforce", getAppUrl()));
    return NextResponse.json({ error: "Choose a plan to begin a trial before connecting Salesforce.", code: "trial_required" }, { status: 402 });
  }

  const state = createSalesforceOAuthState(context.workspaceId, context.userEmail);
  const verifier = createSalesforcePkceVerifier();
  const response = NextResponse.redirect(buildSalesforceAuthorizationUrl(state, createSalesforcePkceChallenge(verifier)));
  response.cookies.set({ name: "salesforce_oauth_pkce", value: verifier, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/connectors/salesforce/callback", maxAge: 10 * 60 });
  return response;
}

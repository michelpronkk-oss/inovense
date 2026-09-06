import { NextRequest, NextResponse } from "next/server";
import { exchangeSalesforceCode, fetchSalesforceIdentity, toStoredSalesforceCredential } from "@/lib/connectors/salesforce";
import { parseSalesforceOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppRoute, getAppUrl } from "@/lib/urls";

function connectorRedirect(params: string): NextResponse {
  const response = NextResponse.redirect(new URL(getAppRoute(`/connectors?${params}`), getAppUrl()));
  response.cookies.set({ name: "salesforce_oauth_pkce", value: "", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/connectors/salesforce/callback", maxAge: 0 });
  return response;
}

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get("error");
  const code = req.nextUrl.searchParams.get("code");
  if (!hasSupabaseAdminConfig()) return connectorRedirect("salesforce=supabase_missing");

  try {
    // State validation deliberately precedes token exchange and any workspace use.
    const state = parseSalesforceOAuthState(req.nextUrl.searchParams.get("state"));
    if (error) return connectorRedirect("salesforce=oauth_denied");
    if (!code) return connectorRedirect("salesforce=missing_code");
    const codeVerifier = req.cookies.get("salesforce_oauth_pkce")?.value;
    if (!codeVerifier) return connectorRedirect("salesforce=pkce_missing");
    const token = await exchangeSalesforceCode(code, codeVerifier);
    const identity = await fetchSalesforceIdentity(token.id, token.access_token);
    const credential = toStoredSalesforceCredential({ workspaceId: state.workspaceId, token, identity });
    const supabase = createSupabaseAdmin();
    const stored = await supabase.from("os_connector_credentials").upsert(credential, { onConflict: "workspace_id,connector_key" });
    if (stored.error) throw new Error("Could not store Salesforce credentials.");
    return connectorRedirect("connected=salesforce");
  } catch {
    // Never put provider/token details into browser URLs or logs.
    return connectorRedirect("salesforce=error");
  }
}

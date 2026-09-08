import { NextRequest, NextResponse } from "next/server";
import { exchangeHubSpotCode, fetchHubSpotIdentity, getHubSpotConfigStatus, toStoredHubSpotCredential } from "@/lib/connectors/hubspot";
import { clearLegacyNangoConnection } from "@/lib/connectors/legacy-nango";
import { parseProviderOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppRoute, getAppUrl } from "@/lib/urls";

function redirect(params: string): NextResponse { return NextResponse.redirect(new URL(getAppRoute(`/connectors?${params}`), getAppUrl())); }

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig() || !getHubSpotConfigStatus().configured) return redirect("hubspot=not_configured");
  if (req.nextUrl.searchParams.get("error")) return redirect("hubspot=oauth_denied");
  try {
    const state = parseProviderOAuthState("hubspot", req.nextUrl.searchParams.get("state"));
    const code = req.nextUrl.searchParams.get("code");
    if (!code) return redirect("hubspot=missing_code");
    const token = await exchangeHubSpotCode(code);
    const identity = await fetchHubSpotIdentity(token.access_token);
    const credential = toStoredHubSpotCredential({ workspaceId: state.workspaceId, token, identity });
    const supabase = createSupabaseAdmin();
    const stored = await supabase.from("os_connector_credentials").upsert(credential, { onConflict: "workspace_id,connector_key" });
    if (stored.error) throw new Error(stored.error.message);
    await clearLegacyNangoConnection({ workspaceId: state.workspaceId, connectorKey: "hubspot", supabase });
    await supabase.from("os_execution_logs").insert({ id: `log-hubspot-connect-${Date.now()}`, ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), run_id: "connector", agent_id: "system", agent_mark: "OS", agent_color: "#4DE8E1", event: "connector.hubspot.connected", message: `Connected HubSpot${identity.hubId ? ` (${identity.hubId})` : ""}`, duration: "-", status: "ok" });
    return redirect("connected=hubspot");
  } catch { return redirect("hubspot=error"); }
}

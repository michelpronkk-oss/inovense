import { NextRequest, NextResponse } from "next/server";
import { exchangeIntercomCode, getIntercomConfigStatus, getIntercomCurrentAdmin, INTERCOM_REGIONS, normalizeIntercomRegion, toStoredIntercomCredential } from "@/lib/connectors/intercom";
import { parseIntercomOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppRoute, getAppUrl } from "@/lib/urls";

function redirect(params: string) { return NextResponse.redirect(new URL(getAppRoute(`/connectors?${params}`), getAppUrl())); }
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig() || !getIntercomConfigStatus().configured) return redirect("intercom=not_configured");
  if (req.nextUrl.searchParams.get("error")) return redirect("intercom=oauth_denied");
  try {
    const state = parseIntercomOAuthState(req.nextUrl.searchParams.get("state"));
    const code = req.nextUrl.searchParams.get("code"); if (!code) return redirect("intercom=missing_code");
    const region = normalizeIntercomRegion(state.region); const token = await exchangeIntercomCode(code); const admin = await getIntercomCurrentAdmin(token.access_token || token.token || "", region);
    if (admin.app?.region) {
      const providerRegion = admin.app.region.toLowerCase();
      const normalizedProviderRegion = providerRegion === "australia" || providerRegion === "au" ? "au" : providerRegion === "europe" || providerRegion === "eu" ? "eu" : providerRegion === "united states" || providerRegion === "us" ? "us" : providerRegion;
      if (normalizedProviderRegion !== region) return redirect("intercom=region_mismatch");
    }
    const supabase = createSupabaseAdmin(); const existing = await supabase.from("os_connector_credentials").select("metadata").eq("workspace_id", state.workspaceId).eq("connector_key", "intercom").maybeSingle();
    const credential = toStoredIntercomCredential({ workspaceId: state.workspaceId, region, token, admin }); credential.metadata = { ...(credential.metadata ?? {}), ...((existing.data?.metadata ?? {}) as Record<string, unknown>), region, apiBase: INTERCOM_REGIONS[region].apiBase, appId: admin.app?.id_code ?? null };
    const stored = await supabase.from("os_connector_credentials").upsert(credential, { onConflict: "workspace_id,connector_key" }); if (stored.error) throw new Error(stored.error.message);
    return redirect("connected=intercom");
  } catch { return redirect("intercom=error"); }
}

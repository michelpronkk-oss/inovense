import { NextRequest, NextResponse } from "next/server";
import { exchangeZendeskCode, fetchZendeskIdentity, getZendeskConfigStatus, normalizeZendeskSubdomain, toStoredZendeskCredential } from "@/lib/connectors/zendesk";
import { parseZendeskOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppRoute, getAppUrl } from "@/lib/urls";

function redirect(params: string): NextResponse { return NextResponse.redirect(new URL(getAppRoute(`/connectors?${params}`), getAppUrl())); }

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig() || !getZendeskConfigStatus().configured) return redirect("zendesk=not_configured");
  if (req.nextUrl.searchParams.get("error")) return redirect("zendesk=oauth_denied");
  try {
    const state = parseZendeskOAuthState(req.nextUrl.searchParams.get("state"));
    const code = req.nextUrl.searchParams.get("code");
    if (!code) return redirect("zendesk=missing_code");
    const normalized = normalizeZendeskSubdomain(state.subdomain);
    const token = await exchangeZendeskCode(normalized.subdomain, code);
    const identity = await fetchZendeskIdentity(token.access_token, normalized.subdomain);
    const supabase = createSupabaseAdmin();
    const existing = await supabase.from("os_connector_credentials").select("metadata").eq("workspace_id", state.workspaceId).eq("connector_key", "zendesk").maybeSingle();
    const credential = toStoredZendeskCredential({ workspaceId: state.workspaceId, subdomain: normalized.subdomain, token, user: identity });
    credential.metadata = { ...(credential.metadata ?? {}), ...((existing.data?.metadata ?? {}) as Record<string, unknown>), subdomain: normalized.subdomain, baseUrl: normalized.baseUrl, siteUrl: normalized.baseUrl };
    const stored = await supabase.from("os_connector_credentials").upsert(credential, { onConflict: "workspace_id,connector_key" });
    if (stored.error) throw new Error(stored.error.message);
    return redirect("connected=zendesk");
  } catch { return redirect("zendesk=error"); }
}

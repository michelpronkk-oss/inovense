import { NextRequest, NextResponse } from "next/server";
import { exchangeJiraCode, fetchJiraIdentity, getAccessibleJiraResources, getJiraConfigStatus, toStoredJiraCredential } from "@/lib/connectors/jira";
import { parseProviderOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppRoute, getAppUrl } from "@/lib/urls";

function redirect(params: string): NextResponse { return NextResponse.redirect(new URL(getAppRoute(`/connectors?${params}`), getAppUrl())); }
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig() || !getJiraConfigStatus().configured) return redirect("jira=not_configured");
  if (req.nextUrl.searchParams.get("error")) return redirect("jira=oauth_denied");
  try {
    const state = parseProviderOAuthState("jira", req.nextUrl.searchParams.get("state")); const code = req.nextUrl.searchParams.get("code"); if (!code) return redirect("jira=missing_code");
    const token = await exchangeJiraCode(code); const resources = await getAccessibleJiraResources(token.access_token); if (resources.length === 0) return redirect("jira=no_accessible_site");
    const resource = resources[0]; const identity = await fetchJiraIdentity(token.access_token); const supabase = createSupabaseAdmin();
    const existing = await supabase.from("os_connector_credentials").select("metadata").eq("workspace_id", state.workspaceId).eq("connector_key", "jira").maybeSingle();
    const credential = toStoredJiraCredential({ workspaceId: state.workspaceId, token, resource, identity }); credential.metadata = { ...(credential.metadata ?? {}), ...((existing.data?.metadata ?? {}) as Record<string, unknown>), cloudId: resource.id, siteUrl: resource.url ?? null, siteName: resource.name ?? null };
    const stored = await supabase.from("os_connector_credentials").upsert(credential, { onConflict: "workspace_id,connector_key" }); if (stored.error) throw new Error(stored.error.message);
    return redirect("connected=jira");
  } catch { return redirect("jira=error"); }
}

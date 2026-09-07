import { NextRequest, NextResponse } from "next/server";
import { exchangeAsanaCode, fetchAsanaIdentity, getAsanaConfigStatus, toStoredAsanaCredential } from "@/lib/connectors/asana";
import { parseProviderOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppRoute, getAppUrl } from "@/lib/urls";

function redirect(params: string): NextResponse { return NextResponse.redirect(new URL(getAppRoute(`/connectors?${params}`), getAppUrl())); }
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig() || !getAsanaConfigStatus().configured) return redirect("asana=not_configured");
  if (req.nextUrl.searchParams.get("error")) return redirect("asana=oauth_denied");
  try {
    const state = parseProviderOAuthState("asana", req.nextUrl.searchParams.get("state"));
    const code = req.nextUrl.searchParams.get("code");
    if (!code) return redirect("asana=missing_code");
    const token = await exchangeAsanaCode(code);
    const identity = await fetchAsanaIdentity(token.access_token);
    const supabase = createSupabaseAdmin();
    const existing = await supabase.from("os_connector_credentials").select("metadata").eq("workspace_id", state.workspaceId).eq("connector_key", "asana").maybeSingle();
    const credential = toStoredAsanaCredential({ workspaceId: state.workspaceId, token, identity });
    credential.metadata = { ...(credential.metadata ?? {}), ...((existing.data?.metadata ?? {}) as Record<string, unknown>) };
    const stored = await supabase.from("os_connector_credentials").upsert(credential, { onConflict: "workspace_id,connector_key" });
    if (stored.error) throw new Error(stored.error.message);
    return redirect("connected=asana");
  } catch { return redirect("asana=error"); }
}

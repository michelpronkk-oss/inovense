import { NextRequest, NextResponse } from "next/server";
import {
  decodeIdTokenClaims,
  exchangeCodeForTokens,
  fetchMicrosoftProfile,
  toStoredMicrosoftCredential,
} from "@/lib/connectors/microsoft";
import { parseMicrosoftOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppUrl } from "@/lib/urls";

function appBase(): string {
  return getAppUrl();
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${appBase()}/app/connectors?microsoft=oauth_denied`);
  }
  if (!code) {
    return NextResponse.redirect(`${appBase()}/app/connectors?microsoft=missing_code`);
  }
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.redirect(`${appBase()}/app/connectors?microsoft=supabase_missing`);
  }

  try {
    // Validate the CSRF state before doing anything else, including before
    // trusting that this callback belongs to a real, verified workspace.
    const state = parseMicrosoftOAuthState(stateRaw);

    const tokenData = await exchangeCodeForTokens(code);
    const profile = await fetchMicrosoftProfile(tokenData.access_token);
    const idClaims = decodeIdTokenClaims(tokenData.id_token);

    const credential = toStoredMicrosoftCredential({
      workspaceId: state.workspaceId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scopes: tokenData.scope,
      providerEmail: profile.email ?? idClaims.preferred_username ?? idClaims.email,
      providerAccountId: profile.id ?? idClaims.oid,
      tenantId: idClaims.tid,
    });

    const supabase = createSupabaseAdmin();
    await supabase.from("os_connector_credentials").upsert(credential, { onConflict: "workspace_id,connector_key" });

    await supabase
      .from("os_execution_logs")
      .insert({
        id: `log-microsoft-connect-${Date.now()}`,
        ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        run_id: "connector",
        agent_id: "system",
        agent_mark: "OS",
        agent_color: "#4DE8E1",
        event: "connector.microsoft.connected",
        message: `Connected Microsoft 365 real account${credential.provider_email ? ` (${credential.provider_email})` : ""}`,
        duration: "-",
        status: "ok",
      });

    return NextResponse.redirect(`${appBase()}/app/connectors?connected=microsoft`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(`${appBase()}/app/connectors?microsoft=error&reason=${encodeURIComponent(reason)}`);
  }
}

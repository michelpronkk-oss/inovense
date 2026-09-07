import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchGmailProfile, toStoredCredential } from "@/lib/connectors/gmail";
import { parseOAuthState } from "@/lib/connectors/oauth-state";
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
    return NextResponse.redirect(`${appBase()}/app/connectors?gmail=oauth_denied`);
  }
  if (!code) {
    return NextResponse.redirect(`${appBase()}/app/connectors?gmail=missing_code`);
  }
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.redirect(`${appBase()}/app/connectors?gmail=supabase_missing`);
  }

  try {
    const state = parseOAuthState(stateRaw);
    const tokenData = await exchangeCodeForTokens(code);
    const profile = await fetchGmailProfile(tokenData.access_token);
    const supabase = createSupabaseAdmin();
    const existing = await supabase
      .from("os_connector_credentials")
      .select("encrypted_refresh_token,metadata,scopes")
      .eq("workspace_id", state.workspaceId)
      .eq("connector_key", "gmail")
      .maybeSingle();
    const credential = toStoredCredential({
      workspaceId: state.workspaceId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scopes: tokenData.scope,
      providerEmail: profile.email,
      providerAccountId: profile.id,
    });
    const existingScopes = Array.isArray(existing.data?.scopes) ? existing.data.scopes.filter((scope): scope is string => typeof scope === "string") : [];
    credential.scopes = Array.from(new Set([...(credential.scopes ?? []), ...existingScopes]));
    // Google may omit refresh_token during incremental consent. Preserve the
    // existing encrypted refresh token and Drive folder configuration in that
    // case so adding Drive never breaks Gmail or resets the selected scope.
    if (!tokenData.refresh_token && typeof existing.data?.encrypted_refresh_token === "string") {
      credential.encrypted_refresh_token = existing.data.encrypted_refresh_token;
    }
    credential.metadata = {
      ...((existing.data?.metadata ?? {}) as Record<string, unknown>),
      ...(credential.metadata ?? {}),
    };
    await supabase.from("os_connector_credentials").upsert(credential, { onConflict: "workspace_id,connector_key" });

    await supabase
      .from("os_execution_logs")
      .insert({
        id: `log-gmail-connect-${Date.now()}`,
        ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        run_id: "connector",
        agent_id: "system",
        agent_mark: "OS",
        agent_color: "#4DE8E1",
        event: state.surface === "google_drive" ? "connector.google_drive.connected" : "connector.gmail.connected",
        message: state.surface === "google_drive"
          ? `Granted Google Drive read access${profile.email ? ` for ${profile.email}` : ""}`
          : `Connected Gmail real account${profile.email ? ` (${profile.email})` : ""}`,
        duration: "-",
        status: "ok",
      });

    return NextResponse.redirect(`${appBase()}/app/connectors?connected=${state.surface === "google_drive" ? "google_drive" : "gmail"}`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(`${appBase()}/app/connectors?gmail=error&reason=${encodeURIComponent(reason)}`);
  }
}

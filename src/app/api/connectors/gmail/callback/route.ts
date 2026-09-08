import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchGmailProfile, toStoredCredential } from "@/lib/connectors/gmail";
import { parseOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppUrl } from "@/lib/urls";
import { reconcileConnectorState } from "@/lib/connectors/reconciliation";

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
    // Scope truth comes from Google, not from what Auterim asked for.
    //
    // buildGoogleAuthUrl sends include_granted_scopes=true, so a successful
    // exchange returns the CUMULATIVE grant for this client: adding Drive to an
    // existing Gmail connection comes back with the Gmail scopes still present,
    // which is what makes incremental consent safe here.
    //
    // The provider list is therefore authoritative rather than unioned with the
    // stored one. Unioning would be the dishonest choice: a user who removes a
    // permission on Google's consent screen would keep being reported as still
    // holding it, and the connector would show healthy for a capability it can
    // no longer perform. The union only survives as a fallback for the case
    // where Google returns no scope string at all, where dropping the stored
    // truth would be a worse guess than keeping it.
    const grantedScopes = (tokenData.scope ?? "").split(" ").filter(Boolean);
    credential.scopes = grantedScopes.length
      ? Array.from(new Set(grantedScopes))
      : Array.from(new Set([...(credential.scopes ?? []), ...existingScopes]));
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

    // Read verified connector truth and derived live-operator readiness after
    // OAuth. Readiness remains a projection, not a second access store.
    await reconcileConnectorState({
      workspaceId: state.workspaceId,
      connectorKey: state.surface === "google_drive" ? "google_drive" : "gmail",
      supabase,
    }).catch(() => undefined);

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

import { NextRequest, NextResponse } from "next/server";
import {
  decodeIdTokenClaims,
  exchangeCodeForTokens,
  fetchMicrosoftProfile,
  toStoredMicrosoftCredential,
} from "@/lib/connectors/microsoft";
import {
  getMicrosoftTeamsScopeState,
  readMicrosoftTeamsSettings,
  writeMicrosoftTeamsSettings,
} from "@/lib/connectors/microsoft-teams";
import { microsoftOAuthCookieName, parseMicrosoftOAuthState } from "@/lib/connectors/oauth-state";
import { consumeMicrosoftOAuthState } from "@/lib/connectors/microsoft-oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppUrl } from "@/lib/urls";
import { ensureMicrosoftSubscriptions } from "@/lib/connectors/microsoft-subscriptions";
import { requireWorkspaceRoleForIdentity } from "@/lib/server/workspace-access";

function appBase(): string {
  return getAppUrl();
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.redirect(`${appBase()}/app/connectors?microsoft=supabase_missing`);
  }

  try {
    // Validate the CSRF state before doing anything else, including before
    // trusting that this callback belongs to a real, verified workspace.
    const state = parseMicrosoftOAuthState(stateRaw);
    const scopeProfile = state.scopeProfile === "teams" ? "teams" : "base";
    const oauthCookieName = microsoftOAuthCookieName();
    const stateCookie = req.cookies.get(oauthCookieName)?.value;
    if (!stateCookie) throw new Error("microsoft_oauth_verifier_missing");
    let verifier: string;
    let cookieState: string;
    try {
      const parsedCookie = JSON.parse(Buffer.from(stateCookie, "base64url").toString("utf8")) as { state?: unknown; codeVerifier?: unknown };
      cookieState = typeof parsedCookie.state === "string" ? parsedCookie.state : "";
      verifier = typeof parsedCookie.codeVerifier === "string" ? parsedCookie.codeVerifier : "";
    } catch {
      throw new Error("microsoft_oauth_verifier_invalid");
    }
    const supabase = createSupabaseAdmin();
    if (cookieState !== stateRaw || !verifier || !(await consumeMicrosoftOAuthState({ state: stateRaw ?? "", nonce: state.nonce, codeVerifier: verifier, supabase }))) {
      throw new Error("microsoft_oauth_state_replayed");
    }
    await requireWorkspaceRoleForIdentity({ userEmail: state.userEmail }, state.workspaceId, ["owner", "admin"], supabase);

    if (error) {
      const response = NextResponse.redirect(`${appBase()}/app/connectors?microsoft=oauth_denied`);
      response.cookies.delete(oauthCookieName);
      return response;
    }
    if (!code) {
      const response = NextResponse.redirect(`${appBase()}/app/connectors?microsoft=missing_code`);
      response.cookies.delete(oauthCookieName);
      return response;
    }

    const tokenData = await exchangeCodeForTokens(code, scopeProfile, verifier);
    const profile = await fetchMicrosoftProfile(tokenData.access_token);
    const idClaims = decodeIdTokenClaims(tokenData.id_token);
    const providerEmail = profile.email ?? idClaims.preferred_username ?? idClaims.email;
    const providerAccountId = profile.id ?? idClaims.oid;
    if (!providerEmail || !providerAccountId) throw new Error("microsoft_profile_incomplete");

    // Read the existing row first so an incremental-consent run keeps the
    // scopes and Teams settings already recorded for this workspace instead
    // of overwriting them (upsert replaces the whole row).
    const existing = await supabase
      .from("os_connector_credentials")
      .select("scopes, metadata, encrypted_refresh_token")
      .eq("workspace_id", state.workspaceId)
      .eq("connector_key", "microsoft")
      .maybeSingle();
    const existingScopes = Array.isArray(existing.data?.scopes)
      ? (existing.data?.scopes as unknown[]).filter((item): item is string => typeof item === "string")
      : [];
    const existingMetadata = (existing.data?.metadata ?? null) as Record<string, unknown> | null;

    const credential = toStoredMicrosoftCredential({
      workspaceId: state.workspaceId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scopes: tokenData.scope,
      providerEmail,
      providerAccountId,
      tenantId: idClaims.tid,
      existingScopes,
      existingMetadata,
      existingEncryptedRefreshToken: typeof existing.data?.encrypted_refresh_token === "string" ? existing.data.encrypted_refresh_token : null,
    });

    // Teams is only ever marked enabled when this run explicitly asked for
    // Teams consent AND Microsoft actually granted the Teams read scopes.
    // A denied or partial consent leaves Teams unavailable and truthful.
    const teamsScopeState = getMicrosoftTeamsScopeState(credential.scopes);
    const teamsGranted = scopeProfile === "teams" && teamsScopeState.readGranted;
    if (teamsGranted) {
      credential.metadata = writeMicrosoftTeamsSettings(credential.metadata, { enabled: true });
    }

    const savedCredential = await supabase.from("os_connector_credentials").upsert(credential, { onConflict: "workspace_id,connector_key" });
    if (savedCredential.error) throw new Error("microsoft_credential_save_failed");

    try {
      await ensureMicrosoftSubscriptions(state.workspaceId, supabase);
    } catch (subscriptionError) {
      // OAuth remains connected when Graph subscription setup is temporarily
      // unavailable. Health derives the missing lifecycle state and renewal
      // recovery will retry it; never turn a provider outage into token loss.
      console.warn(JSON.stringify({ event: "microsoft_subscription_setup_deferred", workspaceId: state.workspaceId, code: subscriptionError instanceof Error ? subscriptionError.message.slice(0, 80) : "unknown" }));
    }

    await supabase
      .from("os_execution_logs")
      .insert({
        id: `log-microsoft-connect-${Date.now()}`,
        ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        run_id: "connector",
        agent_id: "system",
        agent_mark: "OS",
        agent_color: "#4DE8E1",
        event: teamsGranted ? "connector.microsoft_teams.connected" : "connector.microsoft.connected",
        message: teamsGranted
          ? `Connected Microsoft Teams${credential.provider_email ? ` (${credential.provider_email})` : ""}`
          : `Connected Microsoft 365 real account${credential.provider_email ? ` (${credential.provider_email})` : ""}`,
        duration: "-",
        status: "ok",
      });

    if (scopeProfile === "teams") {
      const teamsAlreadyEnabled = readMicrosoftTeamsSettings(credential.metadata).enabled;
      const response = NextResponse.redirect(teamsAlreadyEnabled
        ? `${appBase()}/app/connectors?connected=microsoft_teams`
        : `${appBase()}/app/connectors?microsoft_teams=permission_required`);
      response.cookies.delete(oauthCookieName);
      return response;
    }
    const response = NextResponse.redirect(`${appBase()}/app/connectors?connected=microsoft`);
    response.cookies.delete(oauthCookieName);
    return response;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "oauth_failed";
    const response = NextResponse.redirect(`${appBase()}/app/connectors?microsoft=error&reason=${encodeURIComponent(reason)}`);
    response.cookies.delete(microsoftOAuthCookieName());
    return response;
  }
}

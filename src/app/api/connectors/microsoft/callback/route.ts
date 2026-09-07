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
    const scopeProfile = state.scopeProfile === "teams" ? "teams" : "base";

    const tokenData = await exchangeCodeForTokens(code, scopeProfile);
    const profile = await fetchMicrosoftProfile(tokenData.access_token);
    const idClaims = decodeIdTokenClaims(tokenData.id_token);

    const supabase = createSupabaseAdmin();

    // Read the existing row first so an incremental-consent run keeps the
    // scopes and Teams settings already recorded for this workspace instead
    // of overwriting them (upsert replaces the whole row).
    const existing = await supabase
      .from("os_connector_credentials")
      .select("scopes, metadata")
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
      providerEmail: profile.email ?? idClaims.preferred_username ?? idClaims.email,
      providerAccountId: profile.id ?? idClaims.oid,
      tenantId: idClaims.tid,
      existingScopes,
      existingMetadata,
    });

    // Teams is only ever marked enabled when this run explicitly asked for
    // Teams consent AND Microsoft actually granted the Teams read scopes.
    // A denied or partial consent leaves Teams unavailable and truthful.
    const teamsScopeState = getMicrosoftTeamsScopeState(credential.scopes);
    const teamsGranted = scopeProfile === "teams" && teamsScopeState.readGranted;
    if (teamsGranted) {
      credential.metadata = writeMicrosoftTeamsSettings(credential.metadata, { enabled: true });
    }

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
        event: teamsGranted ? "connector.microsoft_teams.connected" : "connector.microsoft.connected",
        message: teamsGranted
          ? `Connected Microsoft Teams${credential.provider_email ? ` (${credential.provider_email})` : ""}`
          : `Connected Microsoft 365 real account${credential.provider_email ? ` (${credential.provider_email})` : ""}`,
        duration: "-",
        status: "ok",
      });

    if (scopeProfile === "teams") {
      const teamsAlreadyEnabled = readMicrosoftTeamsSettings(credential.metadata).enabled;
      return NextResponse.redirect(teamsAlreadyEnabled
        ? `${appBase()}/app/connectors?connected=microsoft_teams`
        : `${appBase()}/app/connectors?microsoft_teams=permission_required`);
    }
    return NextResponse.redirect(`${appBase()}/app/connectors?connected=microsoft`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(`${appBase()}/app/connectors?microsoft=error&reason=${encodeURIComponent(reason)}`);
  }
}

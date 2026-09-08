// Direct Slack OAuth (Slack OAuth v2, bot token).
//
// Slack previously authenticated through Nango, which meant the connector had
// two sources of truth: an os_connectors row holding a Nango connection id, and
// a Nango-side credential Auterim could not inspect. Every Slack call was a
// Nango proxy call. This module replaces that with the same canonical shape the
// other direct connectors already use:
//
//   os_connector_credentials (workspace_id, connector_key = "slack")
//     encrypted_access_token   -> Slack bot token (xoxb-)
//     encrypted_refresh_token  -> only when Slack token rotation is enabled
//     scopes                   -> the bot scopes Slack actually granted
//
// Slack only issues a refresh token when token rotation is enabled on the app,
// and rotation DOES invalidate the previous refresh token. That is exactly the
// race the shared distributed refresh lease exists for, so the resolver below
// goes through resolveAccessTokenWithRefreshLock rather than refreshing
// unguarded.

import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { resolveAccessTokenWithRefreshLock } from "@/lib/connectors/refresh-lock";
import { AUTERIM_APP_URL } from "@/lib/brand";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/runtime/provider-health";

export const SLACK_CONNECTOR_KEY = "slack" as const;
export const SLACK_API_BASE = "https://slack.com/api";
const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";

/**
 * Bot scopes, deliberately limited to what Auterim actually calls today:
 *   channels:read  -> conversations.list (public channels)
 *   groups:read    -> conversations.list (private channels the bot is in)
 *   channels:join  -> conversations.join for the selected public alert channel
 *   chat:write     -> chat.postMessage for approved and internal messages
 * No history/read-message scope is requested because no Slack message read is
 * implemented; requesting one would broaden permissions for nothing.
 */
export const SLACK_OAUTH_SCOPES = ["channels:read", "groups:read", "channels:join", "chat:write"];
export const SLACK_READ_SCOPES = ["channels:read"];
export const SLACK_SEND_SCOPES = ["chat:write"];
export const SLACK_JOIN_SCOPE = "channels:join";

export type SlackTokenResult = {
  ok?: boolean;
  access_token?: string;
  token_type?: string;
  scope?: string;
  refresh_token?: string;
  expires_in?: number;
  bot_user_id?: string;
  app_id?: string;
  team?: { id?: string; name?: string };
  authed_user?: { id?: string };
  error?: string;
};

export type SlackIdentity = {
  teamId: string | null;
  teamName: string | null;
  botUserId: string | null;
  url: string | null;
};

export type StoredSlackCredential = {
  workspace_id: string;
  connector_key: "slack";
  provider_account_id?: string | null;
  provider_email?: string | null;
  encrypted_access_token: string;
  encrypted_refresh_token?: string | null;
  token_expires_at?: string | null;
  scopes?: string[] | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export class SlackReconnectionRequiredError extends Error {
  readonly code = "slack_reconnect_required";
  constructor(message = "Reconnect Slack to restore access.") {
    super(message);
    this.name = "SlackReconnectionRequiredError";
  }
}

function required(name: "SLACK_CLIENT_ID" | "SLACK_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const SLACK_CANONICAL_REDIRECT_URI = `${AUTERIM_APP_URL}/api/connectors/slack/callback`;

/**
 * Production always uses the canonical https://app.auterim.com callback so a
 * misconfigured env value can never redirect a Slack authorization code to an
 * unapproved host. Non-production may point at a local tunnel.
 */
export function getSlackRedirectUri(): string {
  const configured = process.env.SLACK_OAUTH_REDIRECT_URI?.trim();
  if (process.env.NODE_ENV !== "production") {
    if (configured) return configured;
    const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
    return base ? `${base.replace(/\/$/, "")}/api/connectors/slack/callback` : SLACK_CANONICAL_REDIRECT_URI;
  }
  if (!configured) return SLACK_CANONICAL_REDIRECT_URI;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && url.hostname === "app.auterim.com" && url.pathname === "/api/connectors/slack/callback"
      ? configured
      : SLACK_CANONICAL_REDIRECT_URI;
  } catch {
    return SLACK_CANONICAL_REDIRECT_URI;
  }
}

export function getSlackConfigStatus(): { configured: boolean; missing: string[] } {
  const missing = (["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"] as const).filter((name) => !process.env[name]?.trim());
  return { configured: missing.length === 0, missing: [...missing] };
}

export function buildSlackAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: required("SLACK_CLIENT_ID"),
    scope: SLACK_OAUTH_SCOPES.join(","),
    // Auterim never acts as the signed-in human in Slack, so no user scopes.
    user_scope: "",
    redirect_uri: getSlackRedirectUri(),
    state,
  });
  return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
}

async function slackOAuthRequest(body: URLSearchParams): Promise<SlackTokenResult> {
  const response = await fetch(`${SLACK_API_BASE}/oauth.v2.access`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });
  const text = await response.text();
  let json: SlackTokenResult;
  try {
    json = JSON.parse(text) as SlackTokenResult;
  } catch {
    throw new Error("Slack returned an invalid OAuth response.");
  }
  if (!response.ok || json.ok === false || !json.access_token) {
    throw new Error(json.error || `Slack OAuth failed (${response.status})`);
  }
  return json;
}

export async function exchangeSlackCode(code: string): Promise<SlackTokenResult> {
  return slackOAuthRequest(new URLSearchParams({
    code,
    client_id: required("SLACK_CLIENT_ID"),
    client_secret: required("SLACK_CLIENT_SECRET"),
    redirect_uri: getSlackRedirectUri(),
  }));
}

export async function refreshSlackAccessToken(refreshToken: string): Promise<SlackTokenResult> {
  return slackOAuthRequest(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: required("SLACK_CLIENT_ID"),
    client_secret: required("SLACK_CLIENT_SECRET"),
  }));
}

export function parseSlackScopes(scope: string | undefined | null): string[] {
  return (scope ?? "").split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
}

export function getMissingSlackScopes(scopes: string[] | null | undefined, requiredScopes: string[] = SLACK_READ_SCOPES): string[] {
  const granted = new Set((scopes ?? []).map((scope) => scope.toLowerCase()));
  return requiredScopes.filter((scope) => !granted.has(scope.toLowerCase()));
}

export function hasSlackSendScope(scopes: string[] | null | undefined): boolean {
  return getMissingSlackScopes(scopes, SLACK_SEND_SCOPES).length === 0;
}

export function toStoredSlackCredential(input: {
  workspaceId: string;
  token: SlackTokenResult;
  identity: SlackIdentity;
}): StoredSlackCredential {
  const expiresAt = input.token.expires_in ? new Date(Date.now() + input.token.expires_in * 1000).toISOString() : null;
  const teamId = input.identity.teamId ?? input.token.team?.id ?? null;
  const teamName = input.identity.teamName ?? input.token.team?.name ?? null;
  return {
    workspace_id: input.workspaceId,
    connector_key: SLACK_CONNECTOR_KEY,
    provider_account_id: teamId,
    // Slack bot installs identify a workspace, not a person. There is no
    // account email to store, and inventing one would be dishonest UI.
    provider_email: teamName,
    encrypted_access_token: encryptToken(input.token.access_token as string),
    encrypted_refresh_token: input.token.refresh_token ? encryptToken(input.token.refresh_token) : null,
    token_expires_at: expiresAt,
    scopes: parseSlackScopes(input.token.scope).length ? parseSlackScopes(input.token.scope) : SLACK_OAUTH_SCOPES,
    status: "connected",
    metadata: {
      provider: "slack",
      auth: "direct_oauth",
      teamId,
      teamName,
      botUserId: input.identity.botUserId ?? input.token.bot_user_id ?? null,
      appId: input.token.app_id ?? null,
      connectedAt: new Date().toISOString(),
    },
  };
}

export async function getStoredSlackCredential(
  workspaceId: string,
  supabase = createSupabaseAdmin(),
): Promise<StoredSlackCredential | null> {
  const result = await supabase
    .from("os_connector_credentials")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", SLACK_CONNECTOR_KEY)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data as StoredSlackCredential | null) ?? null;
}

/**
 * A Slack bot token with no recorded expiry never expires (token rotation off),
 * which is Slack's default. Only rotation-enabled installs carry an expiry.
 */
export function slackAccessTokenIsFresh(row: { token_expires_at?: string | null }): boolean {
  if (!row.token_expires_at) return true;
  const expiresAt = new Date(row.token_expires_at).getTime();
  if (!Number.isFinite(expiresAt)) return true;
  return expiresAt > Date.now() + 60_000;
}

/**
 * Resolve a usable Slack bot token, refreshing through the shared distributed
 * lease when rotation is enabled. Slack rotation invalidates the previous
 * refresh token, so an unguarded refresh race would strand the workspace.
 */
export async function resolveSlackAccessToken(input: {
  workspaceId: string;
  credential: StoredSlackCredential;
  supabase?: ReturnType<typeof createSupabaseAdmin>;
}): Promise<string> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  if (slackAccessTokenIsFresh(input.credential)) return decryptToken(input.credential.encrypted_access_token);
  if (!input.credential.encrypted_refresh_token) throw new SlackReconnectionRequiredError();
  try {
    const outcome = await resolveAccessTokenWithRefreshLock({
      workspaceId: input.workspaceId,
      connectorKey: SLACK_CONNECTOR_KEY,
      supabase,
      credential: input.credential,
      isFresh: slackAccessTokenIsFresh,
      refresh: async (latest) => {
        if (!latest.encrypted_refresh_token) throw new SlackReconnectionRequiredError();
        const token = await refreshSlackAccessToken(decryptToken(latest.encrypted_refresh_token));
        return {
          accessToken: token.access_token as string,
          refreshToken: token.refresh_token ?? null,
          expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
          scopes: parseSlackScopes(token.scope).length ? parseSlackScopes(token.scope) : null,
          status: "connected",
        };
      },
    });
    await recordProviderSuccess({ workspaceId: input.workspaceId, connectorKey: SLACK_CONNECTOR_KEY, operation: "oauth_refresh", supabase });
    return outcome.accessToken;
  } catch (error) {
    const failure = await recordProviderFailure({
      workspaceId: input.workspaceId,
      connectorKey: SLACK_CONNECTOR_KEY,
      operation: "oauth_refresh",
      status: null,
      code: error instanceof SlackReconnectionRequiredError ? "slack_reconnect_required" : "oauth_refresh_failed",
      supabase,
    });
    if (failure.connectorHealthImpact === "reconnect_required" || error instanceof SlackReconnectionRequiredError) {
      await supabase
        .from("os_connector_credentials")
        .update({ status: "needs_attention" })
        .eq("workspace_id", input.workspaceId)
        .eq("connector_key", SLACK_CONNECTOR_KEY);
      throw new SlackReconnectionRequiredError();
    }
    throw error;
  }
}

/** auth.test is Slack's cheapest real credential validation. */
export async function verifySlackConnection(accessToken: string): Promise<SlackIdentity> {
  const response = await fetch(`${SLACK_API_BASE}/auth.test`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as {
    ok?: boolean;
    error?: string;
    team?: string;
    team_id?: string;
    user_id?: string;
    url?: string;
  };
  if (!response.ok || body.ok !== true) throw new Error(body.error || `Slack auth.test failed (${response.status})`);
  return {
    teamId: body.team_id ?? null,
    teamName: body.team ?? null,
    botUserId: body.user_id ?? null,
    url: body.url ?? null,
  };
}

export async function revokeSlackToken(accessToken: string): Promise<void> {
  await fetch(`${SLACK_API_BASE}/auth.revoke`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
    cache: "no-store",
  }).catch(() => undefined);
}

// Microsoft 365 / Outlook direct OAuth connector.
//
// Mirrors src/lib/connectors/gmail.ts: this file owns the Microsoft Entra ID
// (Azure AD) OAuth 2.0 authorization-code flow and the low-level Microsoft
// Graph HTTP calls. Business logic (approval creation, draft preparation)
// lives in src/lib/operators/executors/microsoft.ts, matching the Gmail
// split.
//
// SECURITY NOTES
// - This app is registered as a MULTITENANT Microsoft Entra application.
//   The authorize/token tenant segment is always "organizations" (never a
//   single home tenant id) so any Microsoft 365 organization can consent. The actual customer
//   tenant id is captured per-connection from the returned id_token "tid"
//   claim (or refreshed via re-auth), never assumed to be Auterim's tenant.
// - MICROSOFT_REDIRECT_URI is the single source of truth for the OAuth
//   redirect_uri used both to build the authorize URL and to exchange the
//   code. It is never derived from window.location or the request host.
// - Refresh tokens issued by Microsoft's v2 endpoint are single-use and
//   rotated on every refresh. The caller of refreshAccessToken() MUST persist
//   the new refresh_token and discard the old one - see
//   resolveMicrosoftAccessToken() below, which is the only place refresh
//   tokens are read/written.

import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { resolveAccessTokenWithRefreshLock } from "@/lib/connectors/refresh-lock";
import { AUTERIM_APP_URL } from "@/lib/brand";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/runtime/provider-health";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

// Delegated scopes only. Never request application permissions or anything
// broader than what the Entra app registration was configured with.
export const MICROSOFT_OPENID_SCOPES = ["openid", "profile", "offline_access"];
export const MICROSOFT_GRAPH_SCOPES = ["User.Read", "Mail.Read", "Mail.Send"];
export const MICROSOFT_OAUTH_SCOPES = [...MICROSOFT_OPENID_SCOPES, ...MICROSOFT_GRAPH_SCOPES];
export const MICROSOFT_READ_REQUIRED_SCOPES = ["User.Read", "Mail.Read"];
export const MICROSOFT_SEND_REQUIRED_SCOPES = ["Mail.Send"];
export const MICROSOFT_REQUIRED_SCOPES = [...MICROSOFT_READ_REQUIRED_SCOPES, ...MICROSOFT_SEND_REQUIRED_SCOPES];

// ── Microsoft Teams (same Entra app, same Graph resource, extra delegated
//    scopes granted through incremental consent) ─────────────────────────
//
// Teams intentionally reuses this one Microsoft connection instead of
// creating a second Microsoft account/credential. The scope profile below is
// only requested when a workspace explicitly asks to enable Teams, so a
// Microsoft 365 (Outlook Mail) connection never silently gains Teams access
// and never claims Teams capability it was not consented for.
//
// Delegated permissions only - no application permissions, so Auterim can
// only ever see the teams/channels the signing-in user is already a member
// of. ChannelMessage.Read.All requires Entra admin consent; the other three
// do not. See getMicrosoftTeamsScopeState() in connectors/microsoft-teams.ts
// for how granted-vs-missing is turned into truthful health.
export const MICROSOFT_TEAMS_READ_SCOPES = ["Team.ReadBasic.All", "Channel.ReadBasic.All", "ChannelMessage.Read.All"];
export const MICROSOFT_TEAMS_SEND_SCOPES = ["ChannelMessage.Send"];
export const MICROSOFT_TEAMS_GRAPH_SCOPES = [...MICROSOFT_TEAMS_READ_SCOPES, ...MICROSOFT_TEAMS_SEND_SCOPES];
export const MICROSOFT_TEAMS_OAUTH_SCOPES = [...MICROSOFT_OAUTH_SCOPES, ...MICROSOFT_TEAMS_GRAPH_SCOPES];

/**
 * Which consent surface an authorization/refresh request is for. "base" is the
 * original Microsoft 365 Outlook mail profile; "teams" adds the Teams
 * delegated scopes on top (incremental consent - Microsoft keeps previously
 * granted consent, so this never downgrades Outlook Mail access).
 */
export type MicrosoftScopeProfile = "base" | "teams";

export function microsoftScopesForProfile(profile: MicrosoftScopeProfile): string[] {
  return profile === "teams" ? MICROSOFT_TEAMS_OAUTH_SCOPES : MICROSOFT_OAUTH_SCOPES;
}

/** True when a stored scope set already contains at least one Teams scope. */
export function scopesIncludeMicrosoftTeams(scopes: string[] | null | undefined): boolean {
  const granted = new Set((scopes ?? []).map((scope) => scope.toLowerCase()));
  return MICROSOFT_TEAMS_GRAPH_SCOPES.some((scope) => granted.has(scope.toLowerCase()));
}

/**
 * Scope profile to use when refreshing an existing credential. A workspace
 * that already consented to Teams must keep asking for the Teams profile, or
 * the refreshed access token would silently lose Teams access.
 */
export function microsoftProfileForStoredScopes(scopes: string[] | null | undefined): MicrosoftScopeProfile {
  return scopesIncludeMicrosoftTeams(scopes) ? "teams" : "base";
}

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

type TokenExchangeResult = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export type MicrosoftConfigStatus = {
  configured: boolean;
  missing: string[];
};

/** Safe (no secret values) check used to render a clear UI/server error when Azure env vars are absent. */
export function getMicrosoftConfigStatus(): MicrosoftConfigStatus {
  const required = ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_REDIRECT_URI"];
  const missing = required.filter((name) => !process.env[name]?.trim());
  return { configured: missing.length === 0, missing };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * The tenant segment of the Microsoft identity platform endpoint. This app is
 * multitenant ("All tenants allowed"), so this always resolves to
 * "organizations" - never a single directory/tenant id and never the Entra
 * Object ID.
 */
export function getMicrosoftTenantSegment(): string {
  return "organizations";
}

function authorizeEndpoint(): string {
  return `https://login.microsoftonline.com/${getMicrosoftTenantSegment()}/oauth2/v2.0/authorize`;
}

function tokenEndpoint(): string {
  return `https://login.microsoftonline.com/${getMicrosoftTenantSegment()}/oauth2/v2.0/token`;
}

const CANONICAL_MICROSOFT_REDIRECT_PATH = "/api/connectors/microsoft/callback";

/**
 * The OAuth redirect_uri MUST come from MICROSOFT_REDIRECT_URI exactly - it
 * is registered verbatim in the Azure app registration and Microsoft rejects
 * any mismatch. This function never derives the value from window.location,
 * getAppUrl(), or the incoming request host. In production, if the
 * configured value does not resolve to exactly
 * https://app.auterim.com/api/connectors/microsoft/callback, the canonical
 * value is used instead of trusting a possibly-misconfigured env var -
 * mirroring the same defensive check Gmail's redirect URI resolver uses.
 */
export function getMicrosoftRedirectUri(): string {
  const configured = process.env.MICROSOFT_REDIRECT_URI?.trim();
  const canonical = `${AUTERIM_APP_URL}${CANONICAL_MICROSOFT_REDIRECT_PATH}`;
  if (!configured) {
    if (process.env.NODE_ENV === "production") return canonical;
    throw new Error("Missing required env var: MICROSOFT_REDIRECT_URI");
  }
  if (process.env.NODE_ENV !== "production") return configured;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && url.hostname === "app.auterim.com" && url.pathname === CANONICAL_MICROSOFT_REDIRECT_PATH
      ? configured
      : canonical;
  } catch {
    return canonical;
  }
}

export function buildMicrosoftAuthUrl(state: string, profile: MicrosoftScopeProfile = "base", codeChallenge?: string): string {
  const clientId = required("MICROSOFT_CLIENT_ID");
  const redirectUri = getMicrosoftRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: microsoftScopesForProfile(profile).join(" "),
    state,
    ...(codeChallenge ? { code_challenge: codeChallenge, code_challenge_method: "S256" } : {}),
  });
  return `${authorizeEndpoint()}?${params.toString()}`;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export class MicrosoftOAuthError extends Error {
  code?: string;
  /** HTTP status from the token endpoint, so a 5xx is not misread as a dead credential. */
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "MicrosoftOAuthError";
    this.code = code;
    this.status = status;
  }
}

export async function exchangeCodeForTokens(code: string, profile: MicrosoftScopeProfile = "base", codeVerifier?: string): Promise<TokenExchangeResult> {
  const clientId = required("MICROSOFT_CLIENT_ID");
  const clientSecret = required("MICROSOFT_CLIENT_SECRET");
  const redirectUri = getMicrosoftRedirectUri();
  const res = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: microsoftScopesForProfile(profile).join(" "),
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    }),
    cache: "no-store",
  });
  const json = await readJson(res) as TokenExchangeResult & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new MicrosoftOAuthError(json.error_description || json.error || "Failed to exchange Microsoft auth code", json.error);
  }
  return json;
}

export async function refreshAccessToken(refreshToken: string, profile: MicrosoftScopeProfile = "base"): Promise<TokenExchangeResult> {
  const clientId = required("MICROSOFT_CLIENT_ID");
  const clientSecret = required("MICROSOFT_CLIENT_SECRET");
  const res = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: microsoftScopesForProfile(profile).join(" "),
    }),
    cache: "no-store",
  });
  const json = await readJson(res) as TokenExchangeResult & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new MicrosoftOAuthError(json.error_description || json.error || "Failed to refresh Microsoft access token", json.error, res.status);
  }
  return json;
}

/** True when Microsoft reports the refresh token itself is dead (revoked, expired, consent removed). */
export function isMicrosoftReauthRequiredError(error: unknown): boolean {
  if (!(error instanceof MicrosoftOAuthError)) return false;
  // invalid_grant covers expired/used/revoked refresh tokens. AADSTS error
  // codes surfaced in error_description also reliably indicate the same
  // "user must sign in again" condition.
  const reauthCodes = ["invalid_grant", "interaction_required", "consent_required", "login_required"];
  if (error.code && reauthCodes.includes(error.code)) return true;
  return /AADSTS(70008|700082|50173|9002313|65001)/.test(error.message);
}

type DecodedIdTokenClaims = {
  tid?: string;
  oid?: string;
  preferred_username?: string;
  email?: string;
  name?: string;
};

/**
 * Decode (never cryptographically trust) the id_token's payload segment to
 * read the customer's actual Microsoft tenant id ("tid") and object id.
 * This is informational metadata only - every real authorization decision in
 * this connector is enforced by whether the access token actually works
 * against Microsoft Graph, not by anything read out of this token.
 */
export function decodeIdTokenClaims(idToken: string | undefined): DecodedIdTokenClaims {
  if (!idToken) return {};
  const parts = idToken.split(".");
  if (parts.length < 2) return {};
  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed = JSON.parse(payload) as DecodedIdTokenClaims;
    return {
      tid: typeof parsed.tid === "string" ? parsed.tid : undefined,
      oid: typeof parsed.oid === "string" ? parsed.oid : undefined,
      preferred_username: typeof parsed.preferred_username === "string" ? parsed.preferred_username : undefined,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
    };
  } catch {
    return {};
  }
}

export type MicrosoftProfile = {
  id?: string;
  email?: string;
  displayName?: string;
};

export async function fetchMicrosoftProfile(accessToken: string): Promise<MicrosoftProfile> {
  const res = await fetch(`${GRAPH_BASE}/me?$select=id,displayName,mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return {};
  const json = await res.json() as { id?: string; displayName?: string; mail?: string; userPrincipalName?: string };
  return {
    id: json.id,
    email: (json.mail || json.userPrincipalName)?.toLowerCase(),
    displayName: json.displayName,
  };
}

export type StoredMicrosoftCredential = {
  id?: string;
  workspace_id: string;
  connector_key: string;
  provider_account_id?: string | null;
  provider_email?: string | null;
  encrypted_access_token: string;
  encrypted_refresh_token?: string | null;
  token_expires_at?: string | null;
  scopes?: string[] | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Merge the scopes Microsoft actually returned for this grant with the scopes
 * already recorded for the workspace.
 *
 * Merging (rather than replacing) is what makes incremental consent truthful
 * here: Microsoft only echoes back the scopes requested for *this* token, so
 * re-running the base Microsoft 365 flow would otherwise erase a previously
 * granted Teams consent, and running the Teams flow would otherwise look like
 * mail access had been lost. Nothing is ever added that Microsoft did not
 * return or that was not already stored - a denied Teams consent therefore
 * still leaves the Teams scopes absent, and Teams stays unavailable.
 */
export function mergeMicrosoftScopes(granted: string | string[] | null | undefined, existing: string[] | null | undefined): string[] {
  const grantedList = Array.isArray(granted) ? granted : (granted ?? "").split(" ");
  const merged = new Map<string, string>();
  for (const scope of [...(existing ?? []), ...grantedList]) {
    const trimmed = scope?.trim();
    if (!trimmed) continue;
    // Calendar was part of an earlier prototype. Do not retain or advertise
    // that permission in the current Outlook connector contract.
    if (trimmed.toLowerCase() === "calendars.readwrite") continue;
    merged.set(trimmed.toLowerCase(), trimmed);
  }
  return Array.from(merged.values());
}

export function toStoredMicrosoftCredential(input: {
  workspaceId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes?: string;
  providerEmail?: string;
  providerAccountId?: string;
  tenantId?: string;
  /** Scopes already recorded for this workspace, so consent is never lost on reconnect. */
  existingScopes?: string[] | null;
  /** Existing credential metadata (Teams settings/cursors) to preserve across reconnects. */
  existingMetadata?: Record<string, unknown> | null;
  /** Preserve a still-valid refresh token when Entra omits it on reconnect. */
  existingEncryptedRefreshToken?: string | null;
}): StoredMicrosoftCredential {
  const expiresAt = input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000).toISOString() : null;
  const scopes = input.scopes || (input.existingScopes?.length ?? 0) > 0
    ? mergeMicrosoftScopes(input.scopes, input.existingScopes)
    : MICROSOFT_OAUTH_SCOPES;
  return {
    workspace_id: input.workspaceId,
    connector_key: "microsoft",
    provider_account_id: input.providerAccountId ?? null,
    provider_email: input.providerEmail ?? null,
    encrypted_access_token: encryptToken(input.accessToken),
    encrypted_refresh_token: input.refreshToken ? encryptToken(input.refreshToken) : input.existingEncryptedRefreshToken ?? null,
    token_expires_at: expiresAt,
    scopes,
    status: "connected",
    metadata: {
      ...(input.existingMetadata ?? {}),
      provider: "microsoft",
      kind: "microsoft365",
      tenantId: input.tenantId ?? null,
    },
  };
}

export function getMissingMicrosoftScopes(scopes: string[] | null | undefined, requiredScopes: string[] = MICROSOFT_REQUIRED_SCOPES): string[] {
  const granted = new Set((scopes ?? []).map((scope) => scope.toLowerCase()));
  return requiredScopes.filter((scope) => !granted.has(scope.toLowerCase()));
}

export function hasMicrosoftSendScope(scopes: string[] | null | undefined): boolean {
  return getMissingMicrosoftScopes(scopes, MICROSOFT_SEND_REQUIRED_SCOPES).length === 0;
}

export class MicrosoftReauthRequiredError extends Error {
  constructor(message = "Microsoft 365 requires reconnection.") {
    super(message);
    this.name = "MicrosoftReauthRequiredError";
  }
}

// Same-process in-flight guard. It stays as a cheap first-level coalescer so
// concurrent calls inside ONE worker share a single refresh, but it is no
// longer the safety mechanism: serverless workers do not share this Map. The
// real guarantee is the distributed lease plus credential_version
// compare-and-swap in connectors/refresh-lock.ts, which is what makes
// Microsoft's single-use rotating refresh tokens safe across workers.
const inFlightRefreshes = new Map<string, Promise<string>>();

export function microsoftAccessTokenIsFresh(row: { token_expires_at?: string | null }): boolean {
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  return !(expiresAt && Date.now() > expiresAt - 60_000);
}

/**
 * Resolve a usable Microsoft Graph access token for a workspace, refreshing
 * and persisting rotated tokens as needed. Unlike Gmail's stateless
 * resolveAccessTokenFromCredential, this function DOES write back to
 * os_connector_credentials on refresh, because Microsoft's v2 endpoint
 * rotates the refresh token on every use - failing to persist the new one
 * would strand the connector after exactly one refresh.
 *
 * Microsoft is the strongest case for distributed refresh coordination in this
 * product: its refresh tokens are single-use, so two workers refreshing at
 * once would previously have raced to persist mutually invalidated tokens.
 */
export async function resolveMicrosoftAccessToken(input: {
  workspaceId: string;
  credential: StoredMicrosoftCredential;
  supabase?: SupabaseAdmin;
  forceRefresh?: boolean;
}): Promise<string> {
  const { workspaceId, credential } = input;
  if (!input.forceRefresh && microsoftAccessTokenIsFresh(credential)) return decryptToken(credential.encrypted_access_token);
  if (!credential.encrypted_refresh_token) {
    throw new MicrosoftReauthRequiredError("Microsoft 365 access token expired and no refresh token is stored.");
  }

  const guardKey = `microsoft:${workspaceId}`;
  const inFlight = inFlightRefreshes.get(guardKey);
  if (inFlight) return inFlight;

  const supabase = input.supabase ?? createSupabaseAdmin();
  const refreshPromise = (async () => {
    try {
      const outcome = await resolveAccessTokenWithRefreshLock({
        workspaceId,
        connectorKey: "microsoft",
        supabase,
        credential,
        isFresh: microsoftAccessTokenIsFresh,
        forceRefresh: input.forceRefresh,
        refresh: async (latest) => {
          if (!latest.encrypted_refresh_token) {
            throw new MicrosoftReauthRequiredError("Microsoft 365 access token expired and no refresh token is stored.");
          }
          // A workspace that already consented to Teams must keep refreshing
          // with the Teams scope profile, otherwise the new access token would
          // silently drop Teams access while the stored scopes still claimed
          // it. The scopes come from the freshly re-read row, never from state
          // loaded before the lease was acquired.
          const refreshed = await refreshAccessToken(decryptToken(latest.encrypted_refresh_token), microsoftProfileForStoredScopes(latest.scopes));
          return {
            accessToken: refreshed.access_token,
            // Microsoft always rotates. If it ever does not return one, the
            // lock helper keeps the existing still-valid token rather than
            // deleting credential state.
            refreshToken: refreshed.refresh_token ?? null,
            expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
            status: "connected",
          };
        },
      });
      await recordProviderSuccess({ workspaceId, connectorKey: "microsoft", operation: "oauth_refresh", supabase });
      return outcome.accessToken;
    } catch (error) {
      if (isMicrosoftReauthRequiredError(error)) {
        await recordProviderFailure({ workspaceId, connectorKey: "microsoft", operation: "oauth_refresh", status: 401, code: "invalid_grant", supabase });
        await supabase
          .from("os_connector_credentials")
          .update({ status: "needs_attention" })
          .eq("workspace_id", workspaceId)
          .eq("connector_key", "microsoft");
        throw new MicrosoftReauthRequiredError("Microsoft 365 refresh token was revoked or expired. Reconnect required.");
      }
      // A transient token-endpoint failure, a busy lease, or a refused stale
      // write must all leave the credential intact. Nothing here deletes or
      // downgrades a still-valid credential.
      await recordProviderFailure({
        workspaceId,
        connectorKey: "microsoft",
        operation: "oauth_refresh",
        status: error instanceof MicrosoftOAuthError ? error.status ?? null : null,
        code: error instanceof MicrosoftOAuthError ? error.code ?? null : (error as { code?: string } | null)?.code ?? "oauth_refresh_failed",
        supabase,
      });
      throw error;
    }
  })();

  inFlightRefreshes.set(guardKey, refreshPromise);
  try {
    return await refreshPromise;
  } finally {
    inFlightRefreshes.delete(guardKey);
  }
}

export async function getMicrosoftCredential(workspaceId: string, supabase: SupabaseAdmin = createSupabaseAdmin()): Promise<StoredMicrosoftCredential | null> {
  const res = await supabase
    .from("os_connector_credentials")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "microsoft")
    .maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return (res.data as StoredMicrosoftCredential | null) ?? null;
}

// ── Microsoft Graph API (Outlook Mail) ─────────────────────────────────

export class MicrosoftGraphError extends Error {
  details: {
    step: string;
    status: number;
    statusText: string;
    responseBody: unknown;
  };

  constructor(message: string, details: MicrosoftGraphError["details"]) {
    super(message);
    this.name = "MicrosoftGraphError";
    this.details = details;
  }
}

function graphMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const rec = body as { error?: { message?: string } };
    if (typeof rec.error?.message === "string") return rec.error.message;
  }
  return fallback;
}

export type MicrosoftGraphRequestOptions = {
  /** A single forced refresh callback. Never retry a request more than once. */
  refresh?: () => Promise<string>;
};

export async function microsoftGraphRequest<T = unknown>(accessToken: string, method: string, path: string, body?: unknown, options?: MicrosoftGraphRequestOptions): Promise<T> {
  let token = accessToken;
  let retried401 = false;
  for (;;) {
    const res = await fetch(`${GRAPH_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  // A malformed provider response must surface as a normal Graph error, not as
  // an unhandled JSON parse failure that looks like an Auterim bug.
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      if (res.ok) throw new MicrosoftGraphError("Microsoft Graph returned an unreadable response.", { step: `graph.${method.toLowerCase()}`, status: 502, statusText: "Malformed response", responseBody: null });
      json = null;
    }
  }
  if (res.status === 401 && !retried401 && options?.refresh) {
    retried401 = true;
    token = await options.refresh();
    continue;
  }
  if (!res.ok) {
    throw new MicrosoftGraphError(graphMessageFromBody(json, `Microsoft Graph ${method} ${path} failed`), {
      step: `graph.${method.toLowerCase()}`,
      status: res.status,
      statusText: res.statusText,
      responseBody: json,
    });
  }
  return json as T;
  }
}

const graphRequest = microsoftGraphRequest;

export type SafeMicrosoftMessage = {
  id: string;
  conversationId: string | null;
  subject: string | null;
  from: string | null;
  fromName: string | null;
  receivedAt: string | null;
  bodyPreview: string | null;
  bodyText: string | null;
  internetMessageId: string | null;
  toRecipients: string[];
  ccRecipients: string[];
  hasAttachments: boolean;
  isDraft: boolean;
  isDeliveryReceipt: boolean;
  webUrl: string | null;
};

type GraphMessageFrom = { emailAddress?: { address?: string; name?: string } };
type GraphMessageRecipient = { emailAddress?: { address?: string } };

type GraphMessageBody = { contentType?: string; content?: string };

type GraphMessageShape = {
  id?: string;
  conversationId?: string;
  subject?: string;
  from?: GraphMessageFrom;
  receivedDateTime?: string;
  bodyPreview?: string;
  body?: GraphMessageBody;
  internetMessageId?: string;
  toRecipients?: GraphMessageRecipient[];
  ccRecipients?: GraphMessageRecipient[];
  hasAttachments?: boolean;
  isDraft?: boolean;
  isDeliveryReceipt?: boolean;
  webLink?: string;
};

type GraphMessageListResult = {
  value?: GraphMessageShape[];
};

/**
 * Strip HTML down to plain text for keyword-based signal detection. Mirrors
 * the equivalent helper in gmail.ts (kept as a separate local copy rather
 * than a shared import, matching this file's existing "parallel
 * implementation" pattern relative to gmail.ts).
 */
function stripMicrosoftHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractMicrosoftBodyText(body: GraphMessageBody | undefined): string | null {
  if (!body?.content) return null;
  const text = body.contentType?.toLowerCase() === "html" ? stripMicrosoftHtml(body.content) : body.content.trim();
  if (!text) return null;
  return text.length > 4000 ? `${text.slice(0, 4000)}...` : text;
}

function toSafeMicrosoftMessage(message: GraphMessageShape, fallbackId: string): SafeMicrosoftMessage {
  return {
    id: message.id ?? fallbackId,
    conversationId: message.conversationId ?? null,
    subject: message.subject ?? null,
    from: message.from?.emailAddress?.address ?? null,
    fromName: message.from?.emailAddress?.name ?? null,
    receivedAt: message.receivedDateTime ?? null,
    bodyPreview: message.bodyPreview ?? null,
    bodyText: extractMicrosoftBodyText(message.body),
    internetMessageId: message.internetMessageId ?? null,
    toRecipients: (message.toRecipients ?? []).flatMap((recipient) => typeof recipient.emailAddress?.address === "string" ? [recipient.emailAddress.address.toLowerCase().slice(0, 254)] : []).slice(0, 20),
    ccRecipients: (message.ccRecipients ?? []).flatMap((recipient) => typeof recipient.emailAddress?.address === "string" ? [recipient.emailAddress.address.toLowerCase().slice(0, 254)] : []).slice(0, 20),
    hasAttachments: message.hasAttachments === true,
    isDraft: message.isDraft === true,
    isDeliveryReceipt: message.isDeliveryReceipt === true,
    webUrl: typeof message.webLink === "string" && message.webLink.startsWith("https://") ? message.webLink.slice(0, 1000) : null,
  };
}

/** Mail.Read - read-only, no approval required. */
export async function listRecentMicrosoftMessages(accessToken: string, limit = 20, options?: MicrosoftGraphRequestOptions): Promise<SafeMicrosoftMessage[]> {
  const top = Math.max(1, Math.min(limit, 50));
  const data = await graphRequest<GraphMessageListResult>(
    accessToken,
    "GET",
    `/me/mailFolders('Inbox')/messages?$top=${top}&$select=id,subject,from,receivedDateTime,bodyPreview,conversationId,internetMessageId,toRecipients,ccRecipients,hasAttachments,isDraft,isDeliveryReceipt,webLink&$orderby=receivedDateTime desc`,
    undefined,
    options,
  );
  return (data.value ?? [])
    .filter((message): message is GraphMessageShape & { id: string } => typeof message.id === "string")
    .map((message) => toSafeMicrosoftMessage(message, message.id));
}

/** Mail.Read - read-only, no approval required. */
export async function getMicrosoftMessage(accessToken: string, messageId: string, options?: MicrosoftGraphRequestOptions): Promise<SafeMicrosoftMessage> {
  const message = await graphRequest<GraphMessageShape>(
    accessToken,
    "GET",
    `/me/messages/${encodeURIComponent(messageId)}?$select=id,subject,from,receivedDateTime,bodyPreview,conversationId,body,internetMessageId,toRecipients,ccRecipients,hasAttachments,isDraft,isDeliveryReceipt,webLink`,
    undefined,
    options,
  );
  return toSafeMicrosoftMessage(message, messageId);
}

/**
 * Mail.Send - policy/approval controlled. Callers must only invoke this
 * after an Auterim approval has been granted; this function performs no
 * approval logic itself, matching how sendGmailMessage() is also just the
 * raw provider call.
 */
export type MicrosoftAcceptedWrite = {
  status: "accepted_pending_delivery";
  endpoint: string;
  deliveryConfirmed: false;
};

export async function sendMicrosoftMail(accessToken: string, payload: { to: string; subject: string; body: string }, options?: MicrosoftGraphRequestOptions): Promise<MicrosoftAcceptedWrite> {
  await graphRequest(accessToken, "POST", "/me/sendMail", {
    message: {
      subject: payload.subject,
      body: { contentType: "Text", content: payload.body },
      toRecipients: [{ emailAddress: { address: payload.to } }],
    },
    saveToSentItems: true,
  }, options);
  return { status: "accepted_pending_delivery", endpoint: "/me/sendMail", deliveryConfirmed: false };
}

export async function replyMicrosoftMail(accessToken: string, messageId: string, body: string, options?: MicrosoftGraphRequestOptions): Promise<MicrosoftAcceptedWrite> {
  await graphRequest(accessToken, "POST", `/me/messages/${encodeURIComponent(messageId)}/reply`, {
    comment: body,
  }, options);
  return { status: "accepted_pending_delivery", endpoint: `/me/messages/{id}/reply`, deliveryConfirmed: false };
}

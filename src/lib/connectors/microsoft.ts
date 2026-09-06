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
//   MICROSOFT_TENANT must be "organizations" (never a single home tenant id)
//   so any Microsoft 365 organization can consent. The actual customer
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
import { AUTERIM_APP_URL } from "@/lib/brand";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

// Delegated scopes only. Never request application permissions or anything
// broader than what the Entra app registration was configured with.
export const MICROSOFT_OPENID_SCOPES = ["openid", "profile", "offline_access"];
export const MICROSOFT_GRAPH_SCOPES = ["User.Read", "Mail.Read", "Mail.Send", "Calendars.ReadWrite"];
export const MICROSOFT_OAUTH_SCOPES = [...MICROSOFT_OPENID_SCOPES, ...MICROSOFT_GRAPH_SCOPES];
export const MICROSOFT_READ_REQUIRED_SCOPES = ["User.Read", "Mail.Read"];
export const MICROSOFT_SEND_REQUIRED_SCOPES = ["Mail.Send"];
export const MICROSOFT_CALENDAR_REQUIRED_SCOPES = ["Calendars.ReadWrite"];
export const MICROSOFT_REQUIRED_SCOPES = [...MICROSOFT_READ_REQUIRED_SCOPES, ...MICROSOFT_SEND_REQUIRED_SCOPES, ...MICROSOFT_CALENDAR_REQUIRED_SCOPES];

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
  const required = ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT", "MICROSOFT_REDIRECT_URI"];
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
 * multitenant ("All tenants allowed"), so this must resolve to "organizations"
 * in production - never a single directory/tenant id, and never the Entra
 * Object ID. Built from MICROSOFT_TENANT so the value lives in one place
 * instead of being hard-coded into multiple URL strings.
 */
export function getMicrosoftTenantSegment(): string {
  const configured = process.env.MICROSOFT_TENANT?.trim();
  return configured || "organizations";
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

export function buildMicrosoftAuthUrl(state: string): string {
  const clientId = required("MICROSOFT_CLIENT_ID");
  const redirectUri = getMicrosoftRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: MICROSOFT_OAUTH_SCOPES.join(" "),
    state,
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

  constructor(message: string, code?: string) {
    super(message);
    this.name = "MicrosoftOAuthError";
    this.code = code;
  }
}

export async function exchangeCodeForTokens(code: string): Promise<TokenExchangeResult> {
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
      scope: MICROSOFT_OAUTH_SCOPES.join(" "),
    }),
    cache: "no-store",
  });
  const json = await readJson(res) as TokenExchangeResult & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new MicrosoftOAuthError(json.error_description || json.error || "Failed to exchange Microsoft auth code", json.error);
  }
  return json;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenExchangeResult> {
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
      scope: MICROSOFT_OAUTH_SCOPES.join(" "),
    }),
    cache: "no-store",
  });
  const json = await readJson(res) as TokenExchangeResult & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new MicrosoftOAuthError(json.error_description || json.error || "Failed to refresh Microsoft access token", json.error);
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

export function toStoredMicrosoftCredential(input: {
  workspaceId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes?: string;
  providerEmail?: string;
  providerAccountId?: string;
  tenantId?: string;
}): StoredMicrosoftCredential {
  const expiresAt = input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000).toISOString() : null;
  return {
    workspace_id: input.workspaceId,
    connector_key: "microsoft",
    provider_account_id: input.providerAccountId ?? null,
    provider_email: input.providerEmail ?? null,
    encrypted_access_token: encryptToken(input.accessToken),
    encrypted_refresh_token: input.refreshToken ? encryptToken(input.refreshToken) : null,
    token_expires_at: expiresAt,
    scopes: input.scopes ? input.scopes.split(" ").filter(Boolean) : MICROSOFT_OAUTH_SCOPES,
    status: "connected",
    metadata: {
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

export function hasMicrosoftCalendarScope(scopes: string[] | null | undefined): boolean {
  return getMissingMicrosoftScopes(scopes, MICROSOFT_CALENDAR_REQUIRED_SCOPES).length === 0;
}

export class MicrosoftReauthRequiredError extends Error {
  constructor(message = "Microsoft 365 requires reconnection.") {
    super(message);
    this.name = "MicrosoftReauthRequiredError";
  }
}

// Simple same-process in-flight guard so concurrent calls for the same
// workspace credential do not each independently call Microsoft's token
// endpoint (which would otherwise race to consume/rotate the same refresh
// token). This intentionally is not a distributed lock - Microsoft's own
// refresh-token rotation and invalid_grant handling below already make a
// lost race safe, just wasteful, so an in-process guard is enough.
const inFlightRefreshes = new Map<string, Promise<string>>();

/**
 * Resolve a usable Microsoft Graph access token for a workspace, refreshing
 * and persisting rotated tokens as needed. Unlike Gmail's stateless
 * resolveAccessTokenFromCredential, this function DOES write back to
 * os_connector_credentials on refresh, because Microsoft's v2 endpoint
 * rotates the refresh token on every use - failing to persist the new one
 * would strand the connector after exactly one refresh.
 */
export async function resolveMicrosoftAccessToken(input: {
  workspaceId: string;
  credential: StoredMicrosoftCredential;
  supabase?: SupabaseAdmin;
}): Promise<string> {
  const { workspaceId, credential } = input;
  const current = decryptToken(credential.encrypted_access_token);
  const expiresAt = credential.token_expires_at ? new Date(credential.token_expires_at).getTime() : 0;
  const hasExpired = Boolean(expiresAt && Date.now() > expiresAt - 60_000);
  if (!hasExpired) return current;
  if (!credential.encrypted_refresh_token) {
    throw new MicrosoftReauthRequiredError("Microsoft 365 access token expired and no refresh token is stored.");
  }

  const guardKey = `microsoft:${workspaceId}`;
  const inFlight = inFlightRefreshes.get(guardKey);
  if (inFlight) return inFlight;

  const supabase = input.supabase ?? createSupabaseAdmin();
  const refreshPromise = (async () => {
    const refreshToken = decryptToken(credential.encrypted_refresh_token as string);
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      const nextExpiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null;
      // Microsoft always issues a new refresh token on rotation. If, for any
      // reason, one is not returned, keep the existing (still valid) one
      // rather than deleting it.
      const nextRefreshToken = refreshed.refresh_token ?? refreshToken;
      await supabase
        .from("os_connector_credentials")
        .update({
          encrypted_access_token: encryptToken(refreshed.access_token),
          encrypted_refresh_token: encryptToken(nextRefreshToken),
          token_expires_at: nextExpiresAt,
          status: "connected",
        })
        .eq("workspace_id", workspaceId)
        .eq("connector_key", "microsoft");
      return refreshed.access_token;
    } catch (error) {
      if (isMicrosoftReauthRequiredError(error)) {
        await supabase
          .from("os_connector_credentials")
          .update({ status: "needs_attention" })
          .eq("workspace_id", workspaceId)
          .eq("connector_key", "microsoft");
        throw new MicrosoftReauthRequiredError("Microsoft 365 refresh token was revoked or expired. Reconnect required.");
      }
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

// ── Microsoft Graph API (mail + calendar) ───────────────────────────────

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

async function graphRequest<T = unknown>(accessToken: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
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

export type SafeMicrosoftMessage = {
  id: string;
  subject: string | null;
  from: string | null;
  receivedAt: string | null;
  bodyPreview: string | null;
};

type GraphMessageListResult = {
  value?: Array<{
    id?: string;
    subject?: string;
    from?: { emailAddress?: { address?: string } };
    receivedDateTime?: string;
    bodyPreview?: string;
  }>;
};

/** Mail.Read - read-only, no approval required. */
export async function listRecentMicrosoftMessages(accessToken: string, limit = 20): Promise<SafeMicrosoftMessage[]> {
  const top = Math.max(1, Math.min(limit, 50));
  const data = await graphRequest<GraphMessageListResult>(
    accessToken,
    "GET",
    `/me/messages?$top=${top}&$select=id,subject,from,receivedDateTime,bodyPreview&$orderby=receivedDateTime desc`,
  );
  return (data.value ?? [])
    .filter((message): message is Required<Pick<typeof message, "id">> & typeof message => typeof message.id === "string")
    .map((message) => ({
      id: message.id as string,
      subject: message.subject ?? null,
      from: message.from?.emailAddress?.address ?? null,
      receivedAt: message.receivedDateTime ?? null,
      bodyPreview: message.bodyPreview ?? null,
    }));
}

/** Mail.Read - read-only, no approval required. */
export async function getMicrosoftMessage(accessToken: string, messageId: string): Promise<SafeMicrosoftMessage> {
  const message = await graphRequest<{ id?: string; subject?: string; from?: { emailAddress?: { address?: string } }; receivedDateTime?: string; bodyPreview?: string }>(
    accessToken,
    "GET",
    `/me/messages/${encodeURIComponent(messageId)}?$select=id,subject,from,receivedDateTime,bodyPreview`,
  );
  return {
    id: message.id ?? messageId,
    subject: message.subject ?? null,
    from: message.from?.emailAddress?.address ?? null,
    receivedAt: message.receivedDateTime ?? null,
    bodyPreview: message.bodyPreview ?? null,
  };
}

/**
 * Mail.Send - policy/approval controlled. Callers must only invoke this
 * after an Auterim approval has been granted; this function performs no
 * approval logic itself, matching how sendGmailMessage() is also just the
 * raw provider call.
 */
export async function sendMicrosoftMail(accessToken: string, payload: { to: string; subject: string; body: string }): Promise<void> {
  await graphRequest(accessToken, "POST", "/me/sendMail", {
    message: {
      subject: payload.subject,
      body: { contentType: "Text", content: payload.body },
      toRecipients: [{ emailAddress: { address: payload.to } }],
    },
    saveToSentItems: true,
  });
}

export type SafeMicrosoftEvent = {
  id: string;
  subject: string | null;
  start: string | null;
  end: string | null;
  organizer: string | null;
};

type GraphEventListResult = {
  value?: Array<{
    id?: string;
    subject?: string;
    start?: { dateTime?: string };
    end?: { dateTime?: string };
    organizer?: { emailAddress?: { address?: string } };
  }>;
};

/** Calendars.ReadWrite (read half) - read-only, no approval required. */
export async function listMicrosoftCalendarEvents(accessToken: string, limit = 20): Promise<SafeMicrosoftEvent[]> {
  const top = Math.max(1, Math.min(limit, 50));
  const data = await graphRequest<GraphEventListResult>(
    accessToken,
    "GET",
    `/me/events?$top=${top}&$select=id,subject,start,end,organizer&$orderby=start/dateTime desc`,
  );
  return (data.value ?? [])
    .filter((event): event is Required<Pick<typeof event, "id">> & typeof event => typeof event.id === "string")
    .map((event) => ({
      id: event.id as string,
      subject: event.subject ?? null,
      start: event.start?.dateTime ?? null,
      end: event.end?.dateTime ?? null,
      organizer: event.organizer?.emailAddress?.address ?? null,
    }));
}

export type PreparedMicrosoftEvent = {
  subject: string;
  startIso: string;
  endIso: string;
  attendeeEmails?: string[];
  bodyText?: string;
};

/** Calendars.ReadWrite (write half) - policy/approval controlled. */
export async function createMicrosoftCalendarEvent(accessToken: string, event: PreparedMicrosoftEvent): Promise<{ id: string }> {
  const created = await graphRequest<{ id?: string }>(accessToken, "POST", "/me/events", {
    subject: event.subject,
    start: { dateTime: event.startIso, timeZone: "UTC" },
    end: { dateTime: event.endIso, timeZone: "UTC" },
    body: event.bodyText ? { contentType: "Text", content: event.bodyText } : undefined,
    attendees: (event.attendeeEmails ?? []).map((email) => ({ emailAddress: { address: email }, type: "required" })),
  });
  if (!created.id) throw new MicrosoftGraphError("Microsoft Graph did not return an event id.", { step: "graph.calendar.create", status: 502, statusText: "Missing event id", responseBody: created });
  return { id: created.id };
}

/** Calendars.ReadWrite (write half) - policy/approval controlled. */
export async function updateMicrosoftCalendarEvent(accessToken: string, eventId: string, patch: Partial<PreparedMicrosoftEvent>): Promise<void> {
  await graphRequest(accessToken, "PATCH", `/me/events/${encodeURIComponent(eventId)}`, {
    ...(patch.subject ? { subject: patch.subject } : {}),
    ...(patch.startIso ? { start: { dateTime: patch.startIso, timeZone: "UTC" } } : {}),
    ...(patch.endIso ? { end: { dateTime: patch.endIso, timeZone: "UTC" } } : {}),
    ...(patch.bodyText ? { body: { contentType: "Text", content: patch.bodyText } } : {}),
  });
}

/** Calendars.ReadWrite (write half) - policy/approval controlled. */
export async function deleteMicrosoftCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  await graphRequest(accessToken, "DELETE", `/me/events/${encodeURIComponent(eventId)}`);
}

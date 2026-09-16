import crypto from "node:crypto";

import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

export const TRELLO_CONNECTOR_KEY = "trello" as const;
export const TRELLO_API_BASE = "https://api.trello.com";
export const TRELLO_OAUTH_AUTHORIZE_URL = "https://auth.atlassian.com/authorize";
export const TRELLO_OAUTH_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
export const TRELLO_OAUTH_SCOPES = ["read:board:trello", "write:board:trello"] as const;
export const TRELLO_OAUTH_REQUEST_SCOPES = [...TRELLO_OAUTH_SCOPES, "offline_access"] as const;
export const TRELLO_READ_SCOPE = "read:board:trello";
export const TRELLO_WRITE_SCOPE = "write:board:trello";
export const TRELLO_OAUTH_COOKIE = "auterim_trello_oauth";
export const TRELLO_CANONICAL_CALLBACK_URI = "https://app.auterim.com/api/connectors/trello/callback";
const TRELLO_REQUEST_TIMEOUT_MS = 15_000;
const TRELLO_EXECUTION_MARKER = "Auterim execution reference:";

export type TrelloIdentity = { id: string | null; username: string | null; fullName: string | null; email: string | null };
export type StoredTrelloCredential = { workspace_id: string; connector_key: "trello"; provider_account_id?: string | null; provider_email?: string | null; encrypted_access_token: string; encrypted_refresh_token?: string | null; token_expires_at?: string | null; scopes?: string[] | null; status?: string | null; metadata?: Record<string, unknown> | null; credential_version?: number | null };
export type TrelloTokenResponse = { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };

export class TrelloReconnectionRequiredError extends Error {
  readonly code = "trello_reconnect_required";
  constructor(message = "Reconnect Trello to restore access.") { super(message); this.name = "TrelloReconnectionRequiredError"; }
}

function env(name: "TRELLO_CLIENT_ID" | "TRELLO_CLIENT_SECRET" | "TRELLO_OAUTH_STATE_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getTrelloConfigStatus(): { configured: boolean; missing: string[] } {
  const missing = (["TRELLO_CLIENT_ID", "TRELLO_CLIENT_SECRET", "TRELLO_OAUTH_STATE_SECRET"] as const).filter((name) => !process.env[name]?.trim());
  return { configured: missing.length === 0, missing: [...missing] };
}

export function getTrelloCallbackUri(): string {
  const configured = process.env.TRELLO_REDIRECT_URI?.trim();
  if (process.env.NODE_ENV !== "production") {
    if (configured) return configured;
    const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
    return base ? `${base.replace(/\/$/, "")}/api/connectors/trello/callback` : TRELLO_CANONICAL_CALLBACK_URI;
  }
  if (!configured) return TRELLO_CANONICAL_CALLBACK_URI;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && url.hostname === "app.auterim.com" && url.pathname === "/api/connectors/trello/callback" ? configured : TRELLO_CANONICAL_CALLBACK_URI;
  } catch { return TRELLO_CANONICAL_CALLBACK_URI; }
}

export function createTrelloPkceVerifier(): string { return crypto.randomBytes(32).toString("base64url"); }
export function createTrelloPkceChallenge(verifier: string): string { return crypto.createHash("sha256").update(verifier).digest("base64url"); }

export function buildTrelloAuthorizationUrl(input: { state: string; codeChallenge: string }): string {
  const params = new URLSearchParams({ client_id: env("TRELLO_CLIENT_ID"), scope: TRELLO_OAUTH_REQUEST_SCOPES.join(" "), redirect_uri: getTrelloCallbackUri(), response_type: "code", prompt: "consent", code_challenge: input.codeChallenge, code_challenge_method: "S256", state: input.state });
  return `${TRELLO_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

async function parseOAuthResponse(response: Response, operation: string): Promise<TrelloTokenResponse> {
  const body = await response.json().catch(() => ({})) as Partial<TrelloTokenResponse> & { error?: string };
  if (!response.ok || typeof body.access_token !== "string") {
    const failure = new Error(`Trello ${operation} failed.`) as Error & { code?: string; status?: number };
    failure.code = typeof body.error === "string" ? body.error : `http_${response.status}`;
    failure.status = response.status;
    throw failure;
  }
  return body as TrelloTokenResponse;
}

async function trelloTokenRequest(body: Record<string, string>, operation: string): Promise<TrelloTokenResponse> {
  let response: Response;
  try {
    response = await fetch(TRELLO_OAUTH_TOKEN_URL, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(TRELLO_REQUEST_TIMEOUT_MS), cache: "no-store" });
  } catch (error) {
    const failure = new Error(`Trello ${operation} failed.`) as Error & { code?: string };
    failure.code = error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "network";
    throw failure;
  }
  return parseOAuthResponse(response, operation);
}

export async function exchangeTrelloAuthorizationCode(code: string, codeVerifier: string): Promise<TrelloTokenResponse> {
  return trelloTokenRequest({ client_id: env("TRELLO_CLIENT_ID"), client_secret: env("TRELLO_CLIENT_SECRET"), grant_type: "authorization_code", redirect_uri: getTrelloCallbackUri(), code, code_verifier: codeVerifier }, "authorization code exchange");
}

export async function refreshTrelloAccessToken(refreshToken: string): Promise<TrelloTokenResponse> {
  return trelloTokenRequest({ client_id: env("TRELLO_CLIENT_ID"), client_secret: env("TRELLO_CLIENT_SECRET"), grant_type: "refresh_token", refresh_token: refreshToken }, "token refresh");
}

export function toStoredTrelloCredential(input: { workspaceId: string; token: TrelloTokenResponse; identity: TrelloIdentity }): StoredTrelloCredential {
  const expiresAt = typeof input.token.expires_in === "number" && input.token.expires_in > 0 ? new Date(Date.now() + input.token.expires_in * 1000).toISOString() : null;
  const scopes = input.token.scope?.split(/\s+/).filter(Boolean) ?? [...TRELLO_OAUTH_SCOPES];
  return { workspace_id: input.workspaceId, connector_key: TRELLO_CONNECTOR_KEY, provider_account_id: input.identity.id, provider_email: input.identity.email?.toLowerCase() ?? input.identity.username ?? null, encrypted_access_token: encryptToken(input.token.access_token), encrypted_refresh_token: input.token.refresh_token ? encryptToken(input.token.refresh_token) : null, token_expires_at: expiresAt, scopes, status: "connected", metadata: { provider: "trello", auth: "oauth2_pkce", memberId: input.identity.id, username: input.identity.username, fullName: input.identity.fullName, connectedAt: new Date().toISOString() } };
}

type TrelloHandoffPayload = { workspaceId: string; userEmail: string; state: string; encryptedCodeVerifier: string; exp: number };
function handoffSecret(): string { return env("TRELLO_OAUTH_STATE_SECRET"); }

export function createTrelloOAuthHandoff(input: { workspaceId: string; userEmail: string; state: string; codeVerifier: string }): string {
  const payload: TrelloHandoffPayload = { workspaceId: input.workspaceId, userEmail: input.userEmail.toLowerCase(), state: input.state, encryptedCodeVerifier: encryptToken(input.codeVerifier), exp: Date.now() + 10 * 60 * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", handoffSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function parseTrelloOAuthHandoff(value: string | null | undefined): { workspaceId: string; userEmail: string; state: string; codeVerifier: string; exp: number } {
  if (!value) throw new Error("Missing Trello authorization state");
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) throw new Error("Invalid Trello authorization state");
  const expected = crypto.createHmac("sha256", handoffSecret()).update(encoded).digest("base64url");
  const actual = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) throw new Error("Invalid Trello authorization signature");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TrelloHandoffPayload;
  if (!payload.workspaceId || !payload.userEmail || !payload.state || !payload.encryptedCodeVerifier || !payload.exp || Date.now() > payload.exp) throw new Error("Invalid or expired Trello authorization state");
  return { workspaceId: payload.workspaceId, userEmail: payload.userEmail, state: payload.state, codeVerifier: decryptToken(payload.encryptedCodeVerifier), exp: payload.exp };
}

export async function getStoredTrelloCredential(workspaceId: string, supabase = createSupabaseAdmin()): Promise<StoredTrelloCredential | null> {
  const result = await supabase.from("os_connector_credentials").select("*").eq("workspace_id", workspaceId).eq("connector_key", TRELLO_CONNECTOR_KEY).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data as StoredTrelloCredential | null) ?? null;
}

export async function verifyTrelloConnection(accessToken: string): Promise<TrelloIdentity> {
  const response = await fetch(`${TRELLO_API_BASE}/1/members/me?fields=id,username,fullName`, { headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(TRELLO_REQUEST_TIMEOUT_MS), cache: "no-store" });
  if (!response.ok) throw new TrelloReconnectionRequiredError(response.status === 401 ? undefined : "Trello identity verification failed.");
  const body = await response.json().catch(() => ({})) as { id?: string; username?: string; fullName?: string };
  return { id: body.id ?? null, username: body.username ?? null, fullName: body.fullName ?? null, email: null };
}

export function isValidatedTrelloCardUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 500) return false;
  try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "trello.com" || url.hostname === "www.trello.com") && /^\/(?:c|b)\/[A-Za-z0-9_-]+/.test(url.pathname); } catch { return false; }
}

export const TRELLO_EXECUTION_MARKER_PREFIX = TRELLO_EXECUTION_MARKER;

// Deliberately retained as a failing compatibility export so legacy callers
// cannot silently reintroduce query-token authentication.
export function appendTrelloAuth(): never { throw new Error("Trello OAuth2 uses bearer authorization; query-token auth is not supported."); }

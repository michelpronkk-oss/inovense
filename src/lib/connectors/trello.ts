// Direct Trello authorization (Trello OAuth 1.0a).
//
// Trello previously authenticated through Nango, so every Trello read and
// approval-gated write was a Nango proxy call against a credential Auterim
// could not see. This module replaces that with Trello's own OAuth 1.0a flow
// and the canonical connector credential store:
//
//   os_connector_credentials (workspace_id, connector_key = "trello")
//     encrypted_access_token -> the Trello OAuth 1.0a access token
//     scopes                 -> ["read", "write"], as authorized
//
// WHY OAuth 1.0a AND NOT /1/authorize?response_type=token
// The simpler token flow returns the credential in the URL fragment, which
// only the browser can read. That would put a long-lived Trello token through
// the customer's browser and into client JavaScript. The 1.0a flow keeps the
// token server-side for its whole life.
//
// WHY THERE IS NO REFRESH PATH
// Trello access tokens are requested with expiration=never and Trello issues no
// refresh token, so there is nothing to rotate and nothing for the distributed
// refresh lease to coordinate. A revoked token surfaces as a provider 401,
// which maps to reconnect_required in the connector truth model.

import crypto from "node:crypto";

import { encryptToken } from "@/lib/connectors/crypto";
import { AUTERIM_APP_URL } from "@/lib/brand";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

export const TRELLO_CONNECTOR_KEY = "trello" as const;
export const TRELLO_API_BASE = "https://api.trello.com";
const TRELLO_REQUEST_TOKEN_URL = "https://trello.com/1/OAuthGetRequestToken";
const TRELLO_AUTHORIZE_URL = "https://trello.com/1/OAuthAuthorizeToken";
const TRELLO_ACCESS_TOKEN_URL = "https://trello.com/1/OAuthGetAccessToken";

/** Board/list/card reads plus approval-gated card writes. Nothing wider. */
export const TRELLO_OAUTH_SCOPES = ["read", "write"];
export const TRELLO_READ_SCOPE = "read";
export const TRELLO_WRITE_SCOPE = "write";

export type TrelloIdentity = { id: string | null; username: string | null; fullName: string | null; email: string | null };

export type StoredTrelloCredential = {
  workspace_id: string;
  connector_key: "trello";
  provider_account_id?: string | null;
  provider_email?: string | null;
  encrypted_access_token: string;
  encrypted_refresh_token?: string | null;
  token_expires_at?: string | null;
  scopes?: string[] | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export class TrelloReconnectionRequiredError extends Error {
  readonly code = "trello_reconnect_required";
  constructor(message = "Reconnect Trello to restore access.") {
    super(message);
    this.name = "TrelloReconnectionRequiredError";
  }
}

function required(name: "TRELLO_API_KEY" | "TRELLO_API_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getTrelloConfigStatus(): { configured: boolean; missing: string[] } {
  const missing = (["TRELLO_API_KEY", "TRELLO_API_SECRET"] as const).filter((name) => !process.env[name]?.trim());
  return { configured: missing.length === 0, missing: [...missing] };
}

export const TRELLO_CANONICAL_CALLBACK_URI = `${AUTERIM_APP_URL}/api/connectors/trello/callback`;

export function getTrelloCallbackUri(): string {
  const configured = process.env.TRELLO_OAUTH_CALLBACK_URI?.trim();
  if (process.env.NODE_ENV !== "production") {
    if (configured) return configured;
    const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
    return base ? `${base.replace(/\/$/, "")}/api/connectors/trello/callback` : TRELLO_CANONICAL_CALLBACK_URI;
  }
  if (!configured) return TRELLO_CANONICAL_CALLBACK_URI;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && url.hostname === "app.auterim.com" && url.pathname === "/api/connectors/trello/callback"
      ? configured
      : TRELLO_CANONICAL_CALLBACK_URI;
  } catch {
    return TRELLO_CANONICAL_CALLBACK_URI;
  }
}

// ── OAuth 1.0a signing ──────────────────────────────────────────────────

/** RFC 3986 percent-encoding, which OAuth 1.0a requires (encodeURIComponent leaves !*'() alone). */
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!*'()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function buildSignatureBaseString(method: string, url: string, params: Record<string, string>): string {
  const encoded = Object.entries(params)
    .map(([key, value]) => [percentEncode(key), percentEncode(value)] as const)
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(encoded)}`;
}

export function signOAuth1(input: {
  method: string;
  url: string;
  params: Record<string, string>;
  consumerSecret: string;
  tokenSecret?: string;
}): string {
  const key = `${percentEncode(input.consumerSecret)}&${percentEncode(input.tokenSecret ?? "")}`;
  return crypto
    .createHmac("sha1", key)
    .update(buildSignatureBaseString(input.method, input.url, input.params))
    .digest("base64");
}

function oauthHeader(params: Record<string, string>): string {
  return `OAuth ${Object.entries(params)
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

function baseOAuthParams(): Record<string, string> {
  return {
    oauth_consumer_key: required("TRELLO_API_KEY"),
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
  };
}

function parseFormEncoded(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(body).entries()) result[key] = value;
  return result;
}

export type TrelloRequestToken = { token: string; tokenSecret: string };

/** Step 1: obtain a temporary request token bound to Auterim's callback. */
export async function requestTrelloRequestToken(): Promise<TrelloRequestToken> {
  const url = TRELLO_REQUEST_TOKEN_URL;
  const params = { ...baseOAuthParams(), oauth_callback: getTrelloCallbackUri() };
  const signature = signOAuth1({ method: "POST", url, params, consumerSecret: required("TRELLO_API_SECRET") });
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: oauthHeader({ ...params, oauth_signature: signature }), "Content-Length": "0" },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Trello request token failed (${response.status})`);
  const parsed = parseFormEncoded(text);
  if (!parsed.oauth_token || !parsed.oauth_token_secret) throw new Error("Trello did not return a request token.");
  return { token: parsed.oauth_token, tokenSecret: parsed.oauth_token_secret };
}

/** Step 2: the Trello-hosted authorization page the workspace admin approves. */
export function buildTrelloAuthorizationUrl(requestToken: string): string {
  const params = new URLSearchParams({
    oauth_token: requestToken,
    name: "Auterim",
    scope: TRELLO_OAUTH_SCOPES.join(","),
    expiration: "never",
  });
  return `${TRELLO_AUTHORIZE_URL}?${params.toString()}`;
}

/** Step 3: exchange the verified request token for a long-lived access token. */
export async function exchangeTrelloAccessToken(input: {
  requestToken: string;
  requestTokenSecret: string;
  verifier: string;
}): Promise<{ accessToken: string; accessTokenSecret: string }> {
  const url = TRELLO_ACCESS_TOKEN_URL;
  const params = { ...baseOAuthParams(), oauth_token: input.requestToken, oauth_verifier: input.verifier };
  const signature = signOAuth1({
    method: "POST",
    url,
    params,
    consumerSecret: required("TRELLO_API_SECRET"),
    tokenSecret: input.requestTokenSecret,
  });
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: oauthHeader({ ...params, oauth_signature: signature }), "Content-Length": "0" },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Trello access token exchange failed (${response.status})`);
  const parsed = parseFormEncoded(text);
  if (!parsed.oauth_token) throw new Error("Trello did not return an access token.");
  return { accessToken: parsed.oauth_token, accessTokenSecret: parsed.oauth_token_secret ?? "" };
}

/**
 * Trello accepts an OAuth 1.0a access token as the `token` query parameter
 * alongside the application key, so no per-request signing is needed once the
 * access token exists. The token is never placed in a logged path.
 */
export function appendTrelloAuth(path: string, accessToken: string): string {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("key", required("TRELLO_API_KEY"));
  params.set("token", accessToken);
  return `${pathname}?${params.toString()}`;
}

export function toStoredTrelloCredential(input: {
  workspaceId: string;
  accessToken: string;
  identity: TrelloIdentity;
}): StoredTrelloCredential {
  return {
    workspace_id: input.workspaceId,
    connector_key: TRELLO_CONNECTOR_KEY,
    provider_account_id: input.identity.id,
    provider_email: input.identity.email?.toLowerCase() ?? input.identity.username ?? null,
    encrypted_access_token: encryptToken(input.accessToken),
    encrypted_refresh_token: null,
    // Requested with expiration=never, so there is no expiry to record and
    // nothing that would make the shared refresh lease apply here.
    token_expires_at: null,
    scopes: [...TRELLO_OAUTH_SCOPES],
    status: "connected",
    metadata: {
      provider: "trello",
      auth: "direct_oauth",
      memberId: input.identity.id,
      username: input.identity.username,
      fullName: input.identity.fullName,
      connectedAt: new Date().toISOString(),
    },
  };
}

export async function getStoredTrelloCredential(
  workspaceId: string,
  supabase = createSupabaseAdmin(),
): Promise<StoredTrelloCredential | null> {
  const result = await supabase
    .from("os_connector_credentials")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", TRELLO_CONNECTOR_KEY)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data as StoredTrelloCredential | null) ?? null;
}

export async function verifyTrelloConnection(accessToken: string): Promise<TrelloIdentity> {
  const response = await fetch(
    `${TRELLO_API_BASE}${appendTrelloAuth("/1/members/me?fields=id,username,fullName,email", accessToken)}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Trello identity check failed (${response.status})`);
  const body = await response.json().catch(() => ({})) as { id?: string; username?: string; fullName?: string; email?: string };
  return {
    id: body.id ?? null,
    username: body.username ?? null,
    fullName: body.fullName ?? null,
    email: body.email ?? null,
  };
}

// ── Signed handoff between authorization start and callback ─────────────
//
// OAuth 1.0a needs the request token secret at callback time, and Trello's
// authorization page carries no state parameter. The secret is therefore held
// in a short-lived, HMAC-signed, httpOnly cookie that also carries the
// workspace binding, so a callback can never be replayed against another
// workspace.

export const TRELLO_OAUTH_COOKIE = "auterim_trello_oauth";

type TrelloHandoffPayload = {
  workspaceId: string;
  userEmail: string;
  requestToken: string;
  requestTokenSecret: string;
  exp: number;
};

function handoffSecret(): string {
  const secret = process.env.TRELLO_OAUTH_STATE_SECRET?.trim() || process.env.TRELLO_API_SECRET?.trim() || "";
  if (!secret) throw new Error("Missing Trello OAuth state secret");
  return secret;
}

export function createTrelloHandoff(input: {
  workspaceId: string;
  userEmail: string;
  requestToken: string;
  requestTokenSecret: string;
}): string {
  const payload: TrelloHandoffPayload = {
    workspaceId: input.workspaceId,
    userEmail: input.userEmail.toLowerCase(),
    requestToken: input.requestToken,
    // The request token secret is single-use and expires with this cookie, but
    // it is still credential material, so it is encrypted at rest in the cookie
    // rather than merely signed.
    requestTokenSecret: encryptToken(input.requestTokenSecret),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", handoffSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function parseTrelloHandoff(value: string | null | undefined): TrelloHandoffPayload {
  if (!value) throw new Error("Missing Trello authorization state");
  const [encoded, sig] = value.split(".");
  if (!encoded || !sig) throw new Error("Invalid Trello authorization state");
  const expected = crypto.createHmac("sha256", handoffSecret()).update(encoded).digest("base64url");
  const actual = Buffer.from(sig, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) {
    throw new Error("Invalid Trello authorization signature");
  }
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TrelloHandoffPayload;
  if (!payload.workspaceId || !payload.requestToken || !payload.requestTokenSecret || !payload.exp) {
    throw new Error("Invalid Trello authorization payload");
  }
  if (Date.now() > payload.exp) throw new Error("Trello authorization state expired");
  return payload;
}

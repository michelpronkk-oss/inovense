import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { AUTERIM_APP_URL } from "@/lib/brand";

export const GMAIL_COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GMAIL_SEND_REQUIRED_SCOPES = [GMAIL_COMPOSE_SCOPE, GMAIL_SEND_SCOPE];
export const GMAIL_SCAN_REQUIRED_SCOPES = [GMAIL_READONLY_SCOPE];
export const GMAIL_OAUTH_SCOPES = [GMAIL_COMPOSE_SCOPE, GMAIL_SEND_SCOPE, GMAIL_READONLY_SCOPE];
export const GMAIL_REQUIRED_SCOPES = GMAIL_SEND_REQUIRED_SCOPES;

type TokenExchangeResult = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export type GmailApiErrorDetails = {
  step: string;
  status: number;
  statusText: string;
  responseBody: unknown;
  draftCreateStatus?: number;
  draftId?: string | null;
  messageId?: string | null;
  sendEndpoint?: "drafts/send" | "messages/send";
};

export type SafeGmailMessage = {
  id: string;
  threadId?: string;
  labelIds: string[];
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  bodyText?: string;
  internalDate?: string;
};

export class GmailApiError extends Error {
  details: GmailApiErrorDetails;

  constructor(message: string, details: GmailApiErrorDetails) {
    super(message);
    this.name = "GmailApiError";
    this.details = details;
  }
}

export type StoredConnectorCredential = {
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

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getGoogleRedirectUri(): string {
  const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  const canonical = `${AUTERIM_APP_URL}/api/connectors/gmail/callback`;
  if (!configured) {
    return process.env.NODE_ENV === "production"
      ? canonical
      : `${required("NEXT_PUBLIC_APP_URL").replace(/\/$/, "")}/api/connectors/gmail/callback`;
  }
  if (process.env.NODE_ENV !== "production") return configured;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && url.hostname === "app.auterim.com" && url.pathname === "/api/connectors/gmail/callback"
      ? configured
      : canonical;
  } catch {
    return canonical;
  }
}

export function buildGoogleAuthUrl(state: string): string {
  const clientId = required("GOOGLE_CLIENT_ID");
  const redirectUri = getGoogleRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_OAUTH_SCOPES.join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenExchangeResult> {
  const clientId = required("GOOGLE_CLIENT_ID");
  const clientSecret = required("GOOGLE_CLIENT_SECRET");
  const redirectUri = getGoogleRedirectUri();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const json = await res.json() as TokenExchangeResult & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Failed to exchange Google auth code");
  }
  return json;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenExchangeResult> {
  const clientId = required("GOOGLE_CLIENT_ID");
  const clientSecret = required("GOOGLE_CLIENT_SECRET");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const json = await res.json() as TokenExchangeResult & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Failed to refresh Google access token");
  }
  return json;
}

export async function fetchGmailProfile(accessToken: string): Promise<{ email?: string; id?: string }> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return {};
  const json = await res.json() as { emailAddress?: string; messagesTotal?: number; historyId?: string };
  return { email: json.emailAddress };
}

export async function listRecentMessages(accessToken: string, options?: { maxResults?: number; query?: string }): Promise<{ id: string; threadId?: string }[]> {
  const maxResults = Math.min(Math.max(options?.maxResults ?? 20, 1), 20);
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    q: options?.query || "newer_than:30d",
  });
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const json = await readGmailJson(res) as { messages?: { id?: string; threadId?: string }[] };
  if (!res.ok) throwGmailApiError("gmail.messages.list", res, json);
  return (json.messages ?? [])
    .filter((message): message is { id: string; threadId?: string } => typeof message.id === "string")
    .map((message) => ({ id: message.id, threadId: message.threadId }));
}

export async function getMessageDetails(accessToken: string, messageId: string): Promise<SafeGmailMessage> {
  const params = new URLSearchParams({ format: "full" });
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const json = await readGmailJson(res);
  if (!res.ok) throwGmailApiError("gmail.messages.get", res, json);
  return parseSafeGmailMessage(json);
}

function encodeBase64Url(raw: string): string {
  return Buffer.from(raw, "utf8").toString("base64url");
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function headerValue(headers: { name?: string; value?: string }[] | undefined, name: string): string {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value?.trim() ?? "";
}

function extractEmail(value: string): string {
  const bracketed = value.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/);
  if (bracketed?.[1]) return bracketed[1].toLowerCase();
  const direct = value.match(/[^\s<>(),;]+@[^\s<>(),;]+\.[^\s<>(),;]+/);
  return direct?.[0]?.toLowerCase() ?? "";
}

function decodeBase64UrlText(value: string | undefined): string {
  if (!value) return "";
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function stripHtml(value: string): string {
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

function extractBodyText(payload: unknown): string {
  const root = payload && typeof payload === "object" ? payload as {
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  } : {};
  const plain: string[] = [];
  const html: string[] = [];

  function visit(part: unknown) {
    const node = part && typeof part === "object" ? part as {
      mimeType?: string;
      body?: { data?: string };
      parts?: unknown[];
    } : {};
    if (Array.isArray(node.parts)) node.parts.forEach(visit);
    const decoded = decodeBase64UrlText(node.body?.data);
    if (!decoded) return;
    if (node.mimeType?.toLowerCase().startsWith("text/plain")) plain.push(decoded);
    if (node.mimeType?.toLowerCase().startsWith("text/html")) html.push(stripHtml(decoded));
  }

  visit(root);
  const text = (plain.join("\n") || html.join("\n")).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  return text.length > 4000 ? `${text.slice(0, 4000)}...` : text;
}

export function parseSafeGmailMessage(value: unknown): SafeGmailMessage {
  const message = value && typeof value === "object" ? value as {
    id?: string;
    threadId?: string;
    labelIds?: string[];
    snippet?: string;
    internalDate?: string;
    payload?: { headers?: { name?: string; value?: string }[] };
  } : {};
  const headers = message.payload?.headers;
  const from = sanitizeHeaderValue(headerValue(headers, "From"));
  const to = sanitizeHeaderValue(headerValue(headers, "To"));
  const subject = sanitizeHeaderValue(headerValue(headers, "Subject"));
  const date = sanitizeHeaderValue(headerValue(headers, "Date"));

  return {
    id: message.id ?? "",
    threadId: message.threadId,
    labelIds: Array.isArray(message.labelIds) ? message.labelIds.filter((label): label is string => typeof label === "string") : [],
    from,
    fromEmail: extractEmail(from),
    to,
    subject,
    date,
    snippet: sanitizeHeaderValue(message.snippet ?? ""),
    bodyText: extractBodyText(message.payload),
    internalDate: message.internalDate,
  };
}

function normalizeBody(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").join("\r\n");
}

function buildMessage(to: string, subject: string, body: string): string {
  return [
    `To: ${sanitizeHeaderValue(to)}`,
    `Subject: ${sanitizeHeaderValue(subject)}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
    "",
    normalizeBody(body),
  ].join("\r\n");
}

function buildRawMessage(payload: { to: string; subject: string; body: string }): string {
  return encodeBase64Url(buildMessage(payload.to, payload.subject, payload.body));
}

async function readGmailJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function gmailMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const rec = body as { error?: string | { message?: string }; error_description?: string };
    if (typeof rec.error === "object" && typeof rec.error?.message === "string") return rec.error.message;
    if (typeof rec.error_description === "string") return rec.error_description;
    if (typeof rec.error === "string") return rec.error;
  }
  return fallback;
}

function throwGmailApiError(step: string, res: Response, responseBody: unknown, extra?: Partial<GmailApiErrorDetails>): never {
  throw new GmailApiError(gmailMessageFromBody(responseBody, `${step} failed`), {
    step,
    status: res.status,
    statusText: res.statusText,
    responseBody,
    ...extra,
  });
}

export async function createGmailDraft(accessToken: string, payload: { to: string; subject: string; body: string }): Promise<{ draftId: string; messageId?: string; raw: string; draftCreateStatus: number }> {
  const raw = buildRawMessage(payload);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: { raw } }),
  });
  const json = await readGmailJson(res) as { id?: string; message?: { id?: string } };
  if (!res.ok || !json?.id) throwGmailApiError("gmail.draft.create", res, json, {
    draftCreateStatus: res.status,
    draftId: json?.id ?? null,
    messageId: json?.message?.id ?? null,
  });
  return { draftId: json.id, messageId: json.message?.id, raw, draftCreateStatus: res.status };
}

export async function sendGmailDraft(accessToken: string, draftId: string, debug?: { draftCreateStatus?: number; draftMessageId?: string }): Promise<{ messageId?: string; sendEndpoint: "drafts/send"; googleResponseBody: unknown }> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: draftId }),
  });
  const json = await readGmailJson(res) as { id?: string };
  if (!res.ok) throwGmailApiError("gmail.draft.send", res, json, {
    draftCreateStatus: debug?.draftCreateStatus,
    draftId,
    messageId: debug?.draftMessageId ?? null,
    sendEndpoint: "drafts/send",
  });
  return { messageId: json.id, sendEndpoint: "drafts/send", googleResponseBody: json };
}

export function getMissingGmailScopes(scopes: string[] | null | undefined, requiredScopes: string[] = GMAIL_REQUIRED_SCOPES): string[] {
  const granted = new Set(scopes ?? []);
  return requiredScopes.filter((scope) => !granted.has(scope));
}

export function hasGmailSendScope(scopes: string[] | null | undefined): boolean {
  return !getMissingGmailScopes(scopes, [GMAIL_SEND_SCOPE]).length;
}

export function hasGmailReadonlyScope(scopes: string[] | null | undefined): boolean {
  return !getMissingGmailScopes(scopes, GMAIL_SCAN_REQUIRED_SCOPES).length;
}

export async function sendGmailMessage(accessToken: string, raw: string, debug?: { draftCreateStatus?: number; draftId?: string; draftMessageId?: string }): Promise<{ messageId?: string; sendEndpoint: "messages/send"; googleResponseBody: unknown }> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  const json = await readGmailJson(res) as { id?: string };
  if (!res.ok) throwGmailApiError("gmail.message.send", res, json, {
    draftCreateStatus: debug?.draftCreateStatus,
    draftId: debug?.draftId ?? null,
    messageId: debug?.draftMessageId ?? null,
    sendEndpoint: "messages/send",
  });
  return { messageId: json.id, sendEndpoint: "messages/send", googleResponseBody: json };
}

export function toStoredCredential(input: {
  workspaceId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes?: string;
  providerEmail?: string;
  providerAccountId?: string;
}): StoredConnectorCredential {
  const expiresAt = input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000).toISOString() : null;
  return {
    workspace_id: input.workspaceId,
    connector_key: "gmail",
    provider_account_id: input.providerAccountId ?? null,
    provider_email: input.providerEmail ?? null,
    encrypted_access_token: encryptToken(input.accessToken),
    encrypted_refresh_token: input.refreshToken ? encryptToken(input.refreshToken) : null,
    token_expires_at: expiresAt,
    scopes: input.scopes ? input.scopes.split(" ").filter(Boolean) : GMAIL_OAUTH_SCOPES,
    status: "connected",
    metadata: {
      provider: "google",
      kind: "gmail",
    },
  };
}

export async function resolveAccessTokenFromCredential(credential: StoredConnectorCredential): Promise<string> {
  const current = decryptToken(credential.encrypted_access_token);
  const expiresAt = credential.token_expires_at ? new Date(credential.token_expires_at).getTime() : 0;
  const hasExpired = Boolean(expiresAt && Date.now() > expiresAt - 45_000);
  if (!hasExpired) return current;
  if (!credential.encrypted_refresh_token) return current;
  const refreshToken = decryptToken(credential.encrypted_refresh_token);
  const refreshed = await refreshAccessToken(refreshToken);
  return refreshed.access_token;
}

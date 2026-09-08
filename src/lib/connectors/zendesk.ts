import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { providerRetryDelayMs, shouldRetryProviderFailure } from "@/lib/runtime/provider-retry";

export const ZENDESK_REDIRECT_URI = "https://app.auterim.com/api/connectors/zendesk/callback";
export const ZENDESK_READ_SCOPES = ["tickets:read", "users:read", "organizations:read"] as const;
export const ZENDESK_WRITE_SCOPES = ["tickets:write"] as const;
export const ZENDESK_OAUTH_SCOPES = [...ZENDESK_READ_SCOPES, ...ZENDESK_WRITE_SCOPES] as const;

export type ZendeskTokenResult = { access_token: string; refresh_token?: string; expires_in?: number; token_type?: string; scope?: string };
export type ZendeskUser = { id: number; name?: string; email?: string; active?: boolean; role?: string; organization_id?: number | null };
export type ZendeskOrganization = { id: number; name?: string; details?: string; group_id?: number | null };
export type ZendeskComment = { id: number; body?: string; html_body?: string; public?: boolean; author_id?: number; created_at?: string; attachments?: unknown[] };
export type ZendeskTicket = {
  id: number; subject?: string; description?: string; status?: string; priority?: string | null; requester_id?: number; assignee_id?: number | null;
  organization_id?: number | null; tags?: string[]; created_at?: string; updated_at?: string; type?: string | null; problem_id?: number | null;
  via?: { channel?: string };
};
export type StoredZendeskCredential = {
  workspace_id: string; connector_key: "zendesk"; provider_account_id?: string | null; provider_email?: string | null;
  encrypted_access_token: string; encrypted_refresh_token?: string | null; token_expires_at?: string | null;
  scopes?: string[] | null; status?: string | null; metadata?: Record<string, unknown> | null; created_at?: string | null;
};

export type NormalizedZendeskTicket = {
  provider: "zendesk"; subdomain: string; ticketId: string; subject: string; status: string; priority: string | null;
  requesterId: string | null; requesterName: string | null; assigneeId: string | null; assigneeName: string | null;
  organizationId: string | null; organizationName: string | null; tags: string[]; createdAt: string | null; updatedAt: string | null;
  url: string; commentPreview?: string | null;
};

export class ZendeskExecutionError extends Error {
  constructor(message: string, public readonly code = "zendesk_write_failed", public readonly status = 502) { super(message); }
}
export class ZendeskReconnectionRequiredError extends Error {}

function required(name: "ZENDESK_CLIENT_ID" | "ZENDESK_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getZendeskConfigStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = (['ZENDESK_CLIENT_ID', 'ZENDESK_CLIENT_SECRET'] as const).filter((name) => !process.env[name]?.trim());
  const redirect = process.env.ZENDESK_REDIRECT_URI?.trim();
  if (!redirect) missing.push("ZENDESK_REDIRECT_URI");
  else if (redirect !== ZENDESK_REDIRECT_URI) missing.push("ZENDESK_REDIRECT_URI must equal the canonical callback URI");
  if (!process.env.ZENDESK_OAUTH_STATE_SECRET?.trim()) missing.push("ZENDESK_OAUTH_STATE_SECRET");
  return { configured: missing.length === 0, missing };
}

export function normalizeZendeskSubdomain(value: string): { subdomain: string; baseUrl: string } {
  const raw = value.trim();
  if (!raw || raw.length > 255) throw new ZendeskExecutionError("Enter a valid Zendesk workspace such as yourcompany.zendesk.com.", "invalid_subdomain", 400);
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try { parsed = new URL(candidate); } catch { throw new ZendeskExecutionError("Enter a valid Zendesk workspace hostname.", "invalid_subdomain", 400); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || (parsed.pathname !== "/" && parsed.pathname !== "")) {
    throw new ZendeskExecutionError("Only a canonical HTTPS Zendesk workspace hostname is supported.", "invalid_subdomain", 400);
  }
  const match = parsed.hostname.toLowerCase().match(/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.zendesk\.com$/);
  if (!match) throw new ZendeskExecutionError("Only *.zendesk.com workspaces are supported.", "invalid_subdomain", 400);
  const subdomain = match[1];
  return { subdomain, baseUrl: `https://${subdomain}.zendesk.com` };
}

export function buildZendeskAuthorizationUrl(subdomain: string, state: string): string {
  const normalized = normalizeZendeskSubdomain(subdomain);
  const params = new URLSearchParams({ response_type: "code", redirect_uri: ZENDESK_REDIRECT_URI, client_id: required("ZENDESK_CLIENT_ID"), scope: ZENDESK_OAUTH_SCOPES.join(" "), state });
  return `${normalized.baseUrl}/oauth/authorizations/new?${params.toString()}`;
}

async function parseResponse<T>(response: Response): Promise<T & { error?: string; error_description?: string; description?: string }> {
  const text = await response.text();
  try { return JSON.parse(text) as T & { error?: string; error_description?: string; description?: string }; }
  catch { return { error_description: text || "Zendesk returned an invalid response" } as T & { error_description: string }; }
}

export async function exchangeZendeskCode(subdomain: string, code: string): Promise<ZendeskTokenResult> {
  const { baseUrl } = normalizeZendeskSubdomain(subdomain);
  const response = await fetch(`${baseUrl}/oauth/tokens`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ grant_type: "authorization_code", code, client_id: required("ZENDESK_CLIENT_ID"), client_secret: required("ZENDESK_CLIENT_SECRET"), redirect_uri: ZENDESK_REDIRECT_URI, scope: ZENDESK_OAUTH_SCOPES.join(" ") }), cache: "no-store" });
  const token = await parseResponse<ZendeskTokenResult>(response);
  if (!response.ok || !token.access_token) throw new ZendeskExecutionError(token.error_description || token.error || "Zendesk token exchange failed", "oauth_exchange_failed", 502);
  return token;
}

export async function refreshZendeskAccessToken(subdomain: string, refreshToken: string): Promise<ZendeskTokenResult> {
  const { baseUrl } = normalizeZendeskSubdomain(subdomain);
  const response = await fetch(`${baseUrl}/oauth/tokens`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: required("ZENDESK_CLIENT_ID"), client_secret: required("ZENDESK_CLIENT_SECRET") }), cache: "no-store" });
  const token = await parseResponse<ZendeskTokenResult>(response);
  if (!response.ok || !token.access_token) throw new ZendeskExecutionError(token.error_description || token.error || "Zendesk token refresh failed", "oauth_refresh_failed", 502);
  return token;
}

export async function revokeZendeskToken(subdomain: string, accessToken: string): Promise<void> {
  const { baseUrl } = normalizeZendeskSubdomain(subdomain);
  await fetch(`${baseUrl}/api/v2/oauth/tokens/current.json`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, cache: "no-store" }).catch(() => undefined);
}

export function toStoredZendeskCredential(input: { workspaceId: string; subdomain: string; token: ZendeskTokenResult; user?: ZendeskUser }): StoredZendeskCredential {
  const normalized = normalizeZendeskSubdomain(input.subdomain);
  return {
    workspace_id: input.workspaceId, connector_key: "zendesk", provider_account_id: input.user?.id ? String(input.user.id) : null, provider_email: input.user?.email?.toLowerCase() ?? null,
    encrypted_access_token: encryptToken(input.token.access_token), encrypted_refresh_token: input.token.refresh_token ? encryptToken(input.token.refresh_token) : null,
    token_expires_at: input.token.expires_in ? new Date(Date.now() + input.token.expires_in * 1000).toISOString() : null,
    scopes: input.token.scope?.split(/[ ,]+/).filter(Boolean) ?? [...ZENDESK_OAUTH_SCOPES], status: "connected",
    metadata: { provider: "zendesk", subdomain: normalized.subdomain, baseUrl: normalized.baseUrl, siteUrl: normalized.baseUrl, syncCursor: null, connectedAt: new Date().toISOString() },
  };
}

export async function getStoredZendeskCredential(workspaceId: string, supabase = createSupabaseAdmin()): Promise<StoredZendeskCredential | null> {
  const result = await supabase.from("os_connector_credentials").select("*").eq("workspace_id", workspaceId).eq("connector_key", "zendesk").maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data as StoredZendeskCredential | null) ?? null;
}

function subdomainFromCredential(credential: StoredZendeskCredential): string {
  const value = credential.metadata?.subdomain;
  if (typeof value !== "string") throw new ZendeskReconnectionRequiredError("Zendesk workspace identity is missing. Reconnect Zendesk.");
  return normalizeZendeskSubdomain(value).subdomain;
}

export async function resolveZendeskAccessToken(input: { workspaceId: string; credential: StoredZendeskCredential; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<string> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const subdomain = subdomainFromCredential(input.credential);
  if (input.credential.token_expires_at && new Date(input.credential.token_expires_at).getTime() > Date.now() + 60_000) return decryptToken(input.credential.encrypted_access_token);
  if (!input.credential.encrypted_refresh_token) return decryptToken(input.credential.encrypted_access_token);
  try {
    const token = await refreshZendeskAccessToken(subdomain, decryptToken(input.credential.encrypted_refresh_token));
    const updated = await supabase.from("os_connector_credentials").update({ encrypted_access_token: encryptToken(token.access_token), encrypted_refresh_token: token.refresh_token ? encryptToken(token.refresh_token) : input.credential.encrypted_refresh_token, token_expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null, scopes: token.scope?.split(/[ ,]+/).filter(Boolean) ?? input.credential.scopes, status: "connected" }).eq("workspace_id", input.workspaceId).eq("connector_key", "zendesk");
    if (updated.error) throw new Error(updated.error.message);
    return token.access_token;
  } catch {
    await supabase.from("os_connector_credentials").update({ status: "needs_attention" }).eq("workspace_id", input.workspaceId).eq("connector_key", "zendesk");
    throw new ZendeskReconnectionRequiredError("Zendesk reconnection required.");
  }
}

async function providerFetch<T>(baseUrl: string, token: string, path: string, init?: RequestInit): Promise<{ response: Response; body: T }> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try { response = await fetch(`${baseUrl}/api/v2${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, cache: "no-store" }); }
    catch { if (attempt === 2) throw new ZendeskExecutionError("Zendesk could not be reached.", "provider_unavailable", 502); await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1))); continue; }
    lastStatus = response.status;
    const body = await parseResponse<T>(response);
    if (response.ok) return { response, body };
    if (!shouldRetryProviderFailure({ status: response.status, attempt })) return { response, body };
    const retryAfter = Number(response.headers.get("retry-after") || 0);
    await new Promise((resolve) => setTimeout(resolve, providerRetryDelayMs(attempt, retryAfter > 0 ? retryAfter * 1000 : null, 1500)));
  }
  throw new ZendeskExecutionError(`Zendesk request failed (${lastStatus || "network"}).`, "provider_unavailable", 502);
}

function errorFromResponse<T>(result: { response: Response; body: T }): ZendeskExecutionError {
  const body = result.body as Record<string, unknown>;
  const message = typeof body.description === "string" ? body.description : typeof body.error === "string" ? body.error : "Zendesk rejected the request.";
  const status = result.response.status;
  return new ZendeskExecutionError(message, status === 401 ? "reconnect_required" : status === 403 ? "permission_required" : `zendesk_http_${status}`, status >= 400 && status < 500 ? status : 502);
}

export async function zendeskFetch<T>(token: string, subdomain: string, path: string, init?: RequestInit): Promise<T> {
  const { baseUrl } = normalizeZendeskSubdomain(subdomain);
  const result = await providerFetch<T>(baseUrl, token, path, init);
  if (!result.response.ok) throw errorFromResponse(result);
  return result.body;
}

export async function zendeskFetchWithRefresh<T>(input: { workspaceId: string; credential: StoredZendeskCredential; path: string; init?: RequestInit; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<T> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const subdomain = subdomainFromCredential(input.credential);
  let token = await resolveZendeskAccessToken({ workspaceId: input.workspaceId, credential: input.credential, supabase });
  const baseUrl = normalizeZendeskSubdomain(subdomain).baseUrl;
  let result = await providerFetch<T>(baseUrl, token, input.path, input.init);
  if (result.response.status === 401 && input.credential.encrypted_refresh_token) {
    try {
      const refreshed = await refreshZendeskAccessToken(subdomain, decryptToken(input.credential.encrypted_refresh_token));
      token = refreshed.access_token;
      const saved = await supabase.from("os_connector_credentials").update({ encrypted_access_token: encryptToken(token), encrypted_refresh_token: refreshed.refresh_token ? encryptToken(refreshed.refresh_token) : input.credential.encrypted_refresh_token, token_expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null, scopes: refreshed.scope?.split(/[ ,]+/).filter(Boolean) ?? input.credential.scopes, status: "connected" }).eq("workspace_id", input.workspaceId).eq("connector_key", "zendesk");
      if (saved.error) throw new Error(saved.error.message);
      result = await providerFetch<T>(baseUrl, token, input.path, input.init);
    } catch {
      await supabase.from("os_connector_credentials").update({ status: "needs_attention" }).eq("workspace_id", input.workspaceId).eq("connector_key", "zendesk");
      throw new ZendeskReconnectionRequiredError("Zendesk reconnection required.");
    }
  }
  if (!result.response.ok) throw errorFromResponse(result);
  return result.body;
}

export async function getZendeskCurrentUser(token: string, subdomain: string): Promise<ZendeskUser> { return zendeskFetch<{ user: ZendeskUser }>(token, subdomain, "/users/me.json").then((body) => body.user); }
export async function fetchZendeskIdentity(token: string, subdomain: string): Promise<ZendeskUser> { return getZendeskCurrentUser(token, subdomain); }

function ticketPath(id: string | number): string {
  const value = String(id).trim();
  if (!/^\d{1,20}$/.test(value)) throw new ZendeskExecutionError("Invalid Zendesk ticket id.", "invalid_target", 400);
  return encodeURIComponent(value);
}

export async function listZendeskTickets(token: string, subdomain: string, input: { updatedSince?: string | null; cursor?: string | null; maxResults?: number } = {}): Promise<{ tickets: ZendeskTicket[]; nextCursor: string | null }> {
  const maxResults = Math.max(1, Math.min(input.maxResults ?? 100, 100));
  const values: ZendeskTicket[] = [];
  let cursor = input.cursor ?? null;
  let startTime: number | null = null;
  if (!cursor && input.updatedSince) { const parsed = Date.parse(input.updatedSince); if (!Number.isNaN(parsed)) startTime = Math.floor(parsed / 1000); }
  for (let page = 0; page < 5 && values.length < maxResults; page += 1) {
    const params = new URLSearchParams({ "page[size]": String(Math.min(100, maxResults - values.length)) });
    if (cursor) params.set("page[after]", cursor);
    const incrementalParams = new URLSearchParams({ per_page: String(Math.min(100, maxResults - values.length)) });
    if (cursor) incrementalParams.set("cursor", cursor);
    else if (startTime !== null) incrementalParams.set("start_time", String(startTime));
    const path = (startTime !== null || cursor)
      ? `/incremental/tickets/cursor.json?${incrementalParams.toString()}`
      : `/tickets.json?${params.toString()}`;
    const body = await zendeskFetch<{ tickets?: ZendeskTicket[]; meta?: { has_more?: boolean; after_cursor?: string | null }; end_of_stream?: boolean }>(token, subdomain, path);
    const tickets = Array.isArray(body.tickets) ? body.tickets : [];
    values.push(...tickets);
    cursor = body.meta?.after_cursor ?? null;
    if (tickets.length === 0 || body.end_of_stream === true || body.meta?.has_more !== true || !cursor) break;
    if (startTime === null) startTime = null;
  }
  return { tickets: values.slice(0, maxResults), nextCursor: cursor };
}

export async function getZendeskTicket(token: string, subdomain: string, id: string | number): Promise<ZendeskTicket> { return zendeskFetch<{ ticket: ZendeskTicket }>(token, subdomain, `/tickets/${ticketPath(id)}.json`).then((body) => body.ticket); }
export async function getZendeskTicketComments(token: string, subdomain: string, id: string | number, maxResults = 50): Promise<ZendeskComment[]> {
  const body = await zendeskFetch<{ comments?: ZendeskComment[] }>(token, subdomain, `/tickets/${ticketPath(id)}/comments.json?per_page=${Math.min(Math.max(maxResults, 1), 50)}`);
  return (body.comments ?? []).slice(0, Math.min(maxResults, 50));
}
export async function getZendeskUser(token: string, subdomain: string, id: string | number): Promise<ZendeskUser> { return zendeskFetch<{ user: ZendeskUser }>(token, subdomain, `/users/${ticketPath(id)}.json`).then((body) => body.user); }
export async function getZendeskOrganization(token: string, subdomain: string, id: string | number): Promise<ZendeskOrganization> { return zendeskFetch<{ organization: ZendeskOrganization }>(token, subdomain, `/organizations/${ticketPath(id)}.json`).then((body) => body.organization); }

function stripMarkup(value: string, max = 500): string { return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
export function normalizeZendeskTicket(ticket: ZendeskTicket, subdomain: string, enrichment: { requester?: ZendeskUser | null; assignee?: ZendeskUser | null; organization?: ZendeskOrganization | null; commentPreview?: string | null } = {}): NormalizedZendeskTicket {
  const normalized = normalizeZendeskSubdomain(subdomain);
  return { provider: "zendesk", subdomain: normalized.subdomain, ticketId: String(ticket.id), subject: stripMarkup(ticket.subject ?? "(no subject)", 240), status: String(ticket.status ?? "unknown").toLowerCase(), priority: ticket.priority ? String(ticket.priority).toLowerCase() : null, requesterId: ticket.requester_id ? String(ticket.requester_id) : null, requesterName: enrichment.requester?.name ?? null, assigneeId: ticket.assignee_id ? String(ticket.assignee_id) : null, assigneeName: enrichment.assignee?.name ?? null, organizationId: ticket.organization_id ? String(ticket.organization_id) : null, organizationName: enrichment.organization?.name ?? null, tags: Array.isArray(ticket.tags) ? ticket.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 50) : [], createdAt: ticket.created_at ?? null, updatedAt: ticket.updated_at ?? null, url: `${normalized.baseUrl}/agent/tickets/${ticket.id}`, commentPreview: enrichment.commentPreview ? stripMarkup(enrichment.commentPreview) : null };
}

export async function getZendeskTicketDetail(token: string, subdomain: string, id: string | number): Promise<NormalizedZendeskTicket> {
  const ticket = await getZendeskTicket(token, subdomain, id);
  const [comments, requester, assignee, organization] = await Promise.all([
    getZendeskTicketComments(token, subdomain, id, 50),
    ticket.requester_id ? getZendeskUser(token, subdomain, ticket.requester_id).catch(() => null) : Promise.resolve(null),
    ticket.assignee_id ? getZendeskUser(token, subdomain, ticket.assignee_id).catch(() => null) : Promise.resolve(null),
    ticket.organization_id ? getZendeskOrganization(token, subdomain, ticket.organization_id).catch(() => null) : Promise.resolve(null),
  ]);
  const latest = comments.length ? comments[comments.length - 1] : null;
  return normalizeZendeskTicket(ticket, subdomain, { requester, assignee, organization, commentPreview: latest?.body ?? latest?.html_body ?? null });
}

async function authorizedScope(input: { workspaceId: string; ticketId?: string | number; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<{ credential: StoredZendeskCredential; token: string; subdomain: string; ticket: ZendeskTicket }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const credential = await getStoredZendeskCredential(input.workspaceId, supabase);
  if (!credential) throw new ZendeskExecutionError("Zendesk is not connected.", "connector_not_connected", 409);
  const subdomain = subdomainFromCredential(credential);
  const scopes = new Set((credential.scopes ?? []).map((scope) => scope.toLowerCase()));
  if (!ZENDESK_READ_SCOPES.every((scope) => scopes.has(scope))) throw new ZendeskExecutionError("Zendesk read permission requires reconnecting with the approved scopes.", "read_scope_missing", 403);
  const token = await resolveZendeskAccessToken({ workspaceId: input.workspaceId, credential, supabase });
  const ticket = input.ticketId === undefined ? { id: 0 } as ZendeskTicket : await getZendeskTicket(token, subdomain, input.ticketId);
  return { credential, token, subdomain, ticket };
}

function boundedText(value: string, max: number, field: string): string { const text = value.trim(); if (!text || text.length > max) throw new ZendeskExecutionError(`${field} is required and must be ${max} characters or fewer.`, "invalid_input", 400); return text; }
function validStatus(value: string): string { const status = value.trim().toLowerCase(); if (!["new", "open", "pending", "hold", "solved"].includes(status)) throw new ZendeskExecutionError("Select a valid Zendesk ticket status.", "invalid_status", 400); return status; }
function validPriority(value: string | null | undefined): string | null | undefined { if (value === undefined || value === null || value === "") return value; const priority = value.trim().toLowerCase(); if (!["low", "normal", "high", "urgent"].includes(priority)) throw new ZendeskExecutionError("Select a valid Zendesk ticket priority.", "invalid_priority", 400); return priority; }
async function validateAssignee(token: string, subdomain: string, id: string): Promise<void> { const user = await getZendeskUser(token, subdomain, id); if (!user.active || !["agent", "admin"].includes(String(user.role ?? "").toLowerCase())) throw new ZendeskExecutionError("The selected Zendesk assignee is not an active agent.", "assignee_out_of_scope", 403); }

export async function addZendeskComment(input: { workspaceId: string; ticketId: string; body: string; public: boolean; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> {
  const scope = await authorizedScope({ workspaceId: input.workspaceId, ticketId: input.ticketId, supabase: input.supabase });
  const scopes = new Set((scope.credential.scopes ?? []).map((scopeItem) => scopeItem.toLowerCase()));
  if (!ZENDESK_WRITE_SCOPES.every((scopeItem) => scopes.has(scopeItem))) throw new ZendeskExecutionError("Zendesk write permission requires reconnecting with tickets:write.", "write_scope_missing", 403);
  return zendeskFetchWithRefresh<Record<string, unknown>>({ workspaceId: input.workspaceId, credential: scope.credential, path: `/tickets/${ticketPath(input.ticketId)}.json`, init: { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket: { comment: { body: boundedText(input.body, 5000, "Comment"), public: input.public } } }) }, supabase: input.supabase });
}
export async function replyZendeskTicket(input: { workspaceId: string; ticketId: string; body: string; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> { return addZendeskComment({ ...input, public: true }); }
export async function addZendeskInternalNote(input: { workspaceId: string; ticketId: string; body: string; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> { return addZendeskComment({ ...input, public: false }); }
export async function updateZendeskTicket(input: { workspaceId: string; ticketId: string; status?: string | null; assigneeId?: string | null; priority?: string | null; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> {
  const scope = await authorizedScope({ workspaceId: input.workspaceId, ticketId: input.ticketId, supabase: input.supabase });
  const scopes = new Set((scope.credential.scopes ?? []).map((scopeItem) => scopeItem.toLowerCase()));
  if (!ZENDESK_WRITE_SCOPES.every((scopeItem) => scopes.has(scopeItem))) throw new ZendeskExecutionError("Zendesk write permission requires reconnecting with tickets:write.", "write_scope_missing", 403);
  const ticket: Record<string, unknown> = {};
  if (input.status !== undefined && input.status !== null) ticket.status = validStatus(input.status);
  if (input.priority !== undefined) ticket.priority = validPriority(input.priority);
  if (input.assigneeId !== undefined) { if (input.assigneeId) { await validateAssignee(scope.token, scope.subdomain, input.assigneeId); ticket.assignee_id = Number(input.assigneeId); } else ticket.assignee_id = null; }
  if (Object.keys(ticket).length === 0) throw new ZendeskExecutionError("At least one supported Zendesk ticket field is required.", "invalid_update", 400);
  return zendeskFetchWithRefresh<Record<string, unknown>>({ workspaceId: input.workspaceId, credential: scope.credential, path: `/tickets/${ticketPath(input.ticketId)}.json`, init: { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket }) }, supabase: input.supabase });
}

export async function verifyZendeskConnection(token: string, subdomain: string): Promise<ZendeskUser> { return getZendeskCurrentUser(token, subdomain); }

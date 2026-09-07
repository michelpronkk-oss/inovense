import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

export const INTERCOM_REDIRECT_URI = "https://app.auterim.com/api/connectors/intercom/callback";
export const INTERCOM_REGIONS = {
  us: { label: "United States", authBase: "https://app.intercom.com", apiBase: "https://api.intercom.io" },
  eu: { label: "Europe", authBase: "https://app.eu.intercom.com", apiBase: "https://api.eu.intercom.io" },
  au: { label: "Australia", authBase: "https://app.au.intercom.com", apiBase: "https://api.au.intercom.io" },
} as const;
export type IntercomRegion = keyof typeof INTERCOM_REGIONS;
export const INTERCOM_PERMISSIONS = ["users:read", "companies:read", "conversations:read", "conversations:write", "admins:read"] as const;

export type IntercomTokenResult = { token?: string; access_token?: string; token_type?: string; expires_in?: number };
export type IntercomAdmin = { id: string; name?: string; email?: string; type?: string; team_ids?: string[] };
export type IntercomContact = { id: string; name?: string; email?: string; role?: string; created_at?: number; updated_at?: number; company?: { id?: string; name?: string } };
export type IntercomCompany = { id: string; name?: string; company_id?: string; website?: string; created_at?: number; updated_at?: number };
export type IntercomPart = { id?: string; part_type?: string; body?: string; author?: { id?: string; name?: string; type?: string }; created_at?: number; updated_at?: number };
export type IntercomConversation = {
  id: string; state?: string; title?: string; priority?: boolean; created_at?: number; updated_at?: number;
  admin_assignee_id?: string | null; team_assignee_id?: string | null; contacts?: { contacts?: IntercomContact[] } | IntercomContact[];
  user?: IntercomContact; company?: IntercomCompany; conversation_parts?: { parts?: IntercomPart[] };
  source?: { type?: string; subject?: string; body?: string; author?: { id?: string; name?: string; type?: string } };
};
export type StoredIntercomCredential = {
  workspace_id: string; connector_key: "intercom"; provider_account_id?: string | null; provider_email?: string | null;
  encrypted_access_token: string; encrypted_refresh_token?: string | null; token_expires_at?: string | null;
  scopes?: string[] | null; status?: string | null; metadata?: Record<string, unknown> | null; created_at?: string | null;
};
export type NormalizedIntercomConversation = {
  provider: "intercom"; region: IntercomRegion; conversationId: string; contactId: string | null; contactName: string | null;
  companyId: string | null; companyName: string | null; assignedAdminId: string | null; assignedAdminName: string | null;
  state: string; createdAt: string | null; updatedAt: string | null; subjectOrPreview: string | null; sourceType: string | null;
  priority: boolean; parts: Array<{ id: string | null; type: string | null; authorType: string | null; createdAt: string | null; preview: string | null }>;
};

export class IntercomExecutionError extends Error { constructor(message: string, public readonly code = "intercom_failed", public readonly status = 502) { super(message); } }
export class IntercomReconnectionRequiredError extends Error {}

function required(name: "INTERCOM_CLIENT_ID" | "INTERCOM_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim(); if (!value) throw new Error(`Missing required env var: ${name}`); return value;
}
export function getIntercomConfigStatus(): { configured: boolean; missing: string[] } {
  const missing = (["INTERCOM_CLIENT_ID", "INTERCOM_CLIENT_SECRET"] as const).filter((key) => !process.env[key]?.trim()) as string[];
  const redirect = process.env.INTERCOM_REDIRECT_URI?.trim();
  if (!redirect) missing.push("INTERCOM_REDIRECT_URI"); else if (redirect !== INTERCOM_REDIRECT_URI) missing.push("INTERCOM_REDIRECT_URI must equal the canonical callback URI");
  if (!process.env.INTERCOM_OAUTH_STATE_SECRET?.trim()) missing.push("INTERCOM_OAUTH_STATE_SECRET");
  return { configured: missing.length === 0, missing };
}
export function normalizeIntercomRegion(value: string | null | undefined): IntercomRegion {
  const region = String(value ?? "").trim().toLowerCase();
  if (region === "us" || region === "eu" || region === "au") return region;
  throw new IntercomExecutionError("Select a supported Intercom region.", "invalid_region", 400);
}
export function buildIntercomAuthorizationUrl(region: IntercomRegion, state: string): string {
  const host = INTERCOM_REGIONS[normalizeIntercomRegion(region)].authBase;
  const query = new URLSearchParams({ client_id: required("INTERCOM_CLIENT_ID"), state, redirect_uri: INTERCOM_REDIRECT_URI });
  return `${host}/oauth?${query.toString()}`;
}
async function parseResponse<T>(response: Response): Promise<T & { errors?: Array<{ code?: string; message?: string }>; error?: string }> {
  const text = await response.text(); try { return JSON.parse(text) as T & { errors?: Array<{ code?: string; message?: string }>; error?: string }; } catch { return { error: "Intercom returned an invalid response" } as T & { error: string }; }
}
export async function exchangeIntercomCode(code: string): Promise<IntercomTokenResult> {
  const response = await fetch("https://api.intercom.io/auth/eagle/token", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ code, client_id: required("INTERCOM_CLIENT_ID"), client_secret: required("INTERCOM_CLIENT_SECRET") }), cache: "no-store" });
  const token = await parseResponse<IntercomTokenResult>(response); if (!response.ok || !(token.access_token || token.token)) throw new IntercomExecutionError(token.error || "Intercom authorization failed", "oauth_exchange_failed", 502); return token;
}
function regionFromCredential(credential: StoredIntercomCredential): IntercomRegion { return normalizeIntercomRegion(typeof credential.metadata?.region === "string" ? credential.metadata.region : null); }
export function toStoredIntercomCredential(input: { workspaceId: string; region: IntercomRegion; token: IntercomTokenResult; admin?: IntercomAdmin }): StoredIntercomCredential {
  const accessToken = input.token.access_token || input.token.token; if (!accessToken) throw new IntercomExecutionError("Intercom did not return an access token.", "oauth_exchange_failed", 502);
  return { workspace_id: input.workspaceId, connector_key: "intercom", provider_account_id: input.admin?.id ?? null, provider_email: input.admin?.email?.toLowerCase() ?? null, encrypted_access_token: encryptToken(accessToken), encrypted_refresh_token: null, token_expires_at: input.token.expires_in ? new Date(Date.now() + input.token.expires_in * 1000).toISOString() : null, scopes: [...INTERCOM_PERMISSIONS], status: "connected", metadata: { provider: "intercom", region: input.region, appId: null, syncCursor: null, lastScannedAt: null, connectedAt: new Date().toISOString() } };
}
export async function getStoredIntercomCredential(workspaceId: string, supabase = createSupabaseAdmin()): Promise<StoredIntercomCredential | null> { const result = await supabase.from("os_connector_credentials").select("*").eq("workspace_id", workspaceId).eq("connector_key", "intercom").maybeSingle(); if (result.error) throw new Error(result.error.message); return (result.data as StoredIntercomCredential | null) ?? null; }
export async function resolveIntercomAccessToken(input: { workspaceId: string; credential: StoredIntercomCredential; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<string> {
  if (input.credential.token_expires_at && new Date(input.credential.token_expires_at).getTime() <= Date.now()) { await (input.supabase ?? createSupabaseAdmin()).from("os_connector_credentials").update({ status: "needs_attention" }).eq("workspace_id", input.workspaceId).eq("connector_key", "intercom"); throw new IntercomReconnectionRequiredError("Intercom authorization expired. Reconnect Intercom."); }
  return decryptToken(input.credential.encrypted_access_token);
}
function apiError(result: { response: Response; body: unknown }): IntercomExecutionError { const body = result.body as { errors?: Array<{ message?: string; code?: string }>; error?: string }; const providerCode = body.errors?.[0]?.code; const message = body.errors?.[0]?.message || body.error || "Intercom rejected the request."; return new IntercomExecutionError(message, result.response.status === 401 ? "reconnect_required" : result.response.status === 403 ? "permission_required" : providerCode || `intercom_http_${result.response.status}`, result.response.status >= 400 && result.response.status < 500 ? result.response.status : 502); }
async function intercomFetch<T>(token: string, region: IntercomRegion, path: string, init?: RequestInit): Promise<T> {
  const base = INTERCOM_REGIONS[normalizeIntercomRegion(region)].apiBase; let last = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) { let response: Response; try { response = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers: { Accept: "application/json", "Intercom-Version": "2.12", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, cache: "no-store" }); } catch { if (attempt === 2) throw new IntercomExecutionError("Intercom could not be reached.", "provider_unavailable", 502); await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1))); continue; } last = response.status; const body = await parseResponse<T>(response); if (response.ok) return body; if (![429, 500, 502, 503, 504].includes(response.status)) throw apiError({ response, body }); const retryAfter = Number(response.headers.get("retry-after") || 0); await new Promise((resolve) => setTimeout(resolve, Math.min(1500, retryAfter * 1000 || 250 * (attempt + 1)))); }
  throw new IntercomExecutionError(`Intercom request failed (${last || "network"}).`, "provider_unavailable", 502);
}
export async function intercomFetchWithRefresh<T>(input: { workspaceId: string; credential: StoredIntercomCredential; path: string; init?: RequestInit; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<T> { const token = await resolveIntercomAccessToken(input); try { return await intercomFetch<T>(token, regionFromCredential(input.credential), input.path, input.init); } catch (error) { if (error instanceof IntercomExecutionError && error.code === "reconnect_required") { await (input.supabase ?? createSupabaseAdmin()).from("os_connector_credentials").update({ status: "needs_attention" }).eq("workspace_id", input.workspaceId).eq("connector_key", "intercom"); } throw error; } }
export async function getIntercomCurrentAdmin(token: string, region: IntercomRegion): Promise<IntercomAdmin & { app?: { id_code?: string; region?: string } }> { return intercomFetch<IntercomAdmin & { app?: { id_code?: string; region?: string } }>(token, region, "/me"); }
export async function verifyIntercomConnection(token: string, region: IntercomRegion): Promise<IntercomAdmin & { app?: { id_code?: string; region?: string } }> { const admin = await getIntercomCurrentAdmin(token, region); if (!admin.id) throw new IntercomExecutionError("Intercom account identity is unavailable.", "identity_missing", 502); return admin; }
function boundedId(value: string | number): string { const id = String(value).trim(); if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new IntercomExecutionError("Invalid Intercom conversation id.", "invalid_target", 400); return encodeURIComponent(id); }
type PageResponse<T> = { data?: T[]; pages?: { next?: { starting_after?: string } } };
export async function listIntercomConversations(token: string, region: IntercomRegion, input: { updatedSince?: string | null; cursor?: string | null; maxResults?: number } = {}): Promise<{ conversations: IntercomConversation[]; nextCursor: string | null }> { const max = Math.max(1, Math.min(input.maxResults ?? 50, 100)); const since = input.updatedSince ? Date.parse(input.updatedSince) / 1000 : null; const result: IntercomConversation[] = []; let cursor = input.cursor ?? null; for (let page = 0; page < 5 && result.length < max; page += 1) { const params = new URLSearchParams({ per_page: String(Math.min(50, max - result.length)), sort_field: "updated_at", sort_direction: "desc" }); if (cursor) params.set("starting_after", cursor); const body = await intercomFetch<PageResponse<IntercomConversation>>(token, region, `/conversations?${params.toString()}`); const rows = body.data ?? []; result.push(...rows.filter((conversation) => since === null || typeof conversation.updated_at !== "number" || conversation.updated_at >= since)); cursor = body.pages?.next?.starting_after ?? null; if (!cursor || rows.length === 0 || (since !== null && rows.some((conversation) => typeof conversation.updated_at === "number" && conversation.updated_at < since))) break; } return { conversations: result.slice(0, max), nextCursor: cursor }; }
export async function getIntercomConversation(token: string, region: IntercomRegion, id: string): Promise<IntercomConversation> { return intercomFetch<IntercomConversation>(token, region, `/conversations/${boundedId(id)}?display_as=plaintext`); }
export async function listIntercomContacts(token: string, region: IntercomRegion, maxResults = 50): Promise<IntercomContact[]> { const body = await intercomFetch<PageResponse<IntercomContact>>(token, region, `/contacts?per_page=${Math.min(Math.max(maxResults, 1), 100)}`); return (body.data ?? []).slice(0, Math.min(maxResults, 100)); }
export async function getIntercomContact(token: string, region: IntercomRegion, id: string): Promise<IntercomContact> { return intercomFetch<IntercomContact>(token, region, `/contacts/${boundedId(id)}`); }
export async function getIntercomCompany(token: string, region: IntercomRegion, id: string): Promise<IntercomCompany> { return intercomFetch<IntercomCompany>(token, region, `/companies/${boundedId(id)}`); }
export async function listIntercomAdmins(token: string, region: IntercomRegion, maxResults = 100): Promise<IntercomAdmin[]> { const body = await intercomFetch<PageResponse<IntercomAdmin>>(token, region, `/admins?per_page=${Math.min(Math.max(maxResults, 1), 100)}`); return (body.data ?? []).slice(0, Math.min(maxResults, 100)); }
function textPreview(value: string | null | undefined, max = 500): string | null { if (!value) return null; return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max) || null; }
function unix(value: number | undefined): string | null { return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000).toISOString() : null; }
export function normalizeIntercomConversation(input: IntercomConversation, region: IntercomRegion): NormalizedIntercomConversation { const contact = Array.isArray(input.contacts) ? input.contacts[0] : input.contacts?.contacts?.[0] ?? input.user; const parts = (input.conversation_parts?.parts ?? []).slice(-50).map((part) => ({ id: part.id ?? null, type: part.part_type ?? null, authorType: part.author?.type ?? null, createdAt: unix(part.created_at), preview: textPreview(part.body) })); return { provider: "intercom", region, conversationId: String(input.id), contactId: contact?.id ?? null, contactName: contact?.name ?? null, companyId: input.company?.id ?? contact?.company?.id ?? null, companyName: input.company?.name ?? contact?.company?.name ?? null, assignedAdminId: input.admin_assignee_id ?? null, assignedAdminName: null, state: String(input.state ?? "unknown").toLowerCase(), createdAt: unix(input.created_at), updatedAt: unix(input.updated_at), subjectOrPreview: textPreview(input.title || input.source?.subject || input.source?.body), sourceType: input.source?.type ?? null, priority: input.priority === true, parts }; }
export async function getIntercomConversationDetail(token: string, region: IntercomRegion, id: string): Promise<NormalizedIntercomConversation> { const conversation = await getIntercomConversation(token, region, id); return normalizeIntercomConversation(conversation, region); }
async function assertWriteScope(credential: StoredIntercomCredential): Promise<void> { if (!(credential.scopes ?? []).includes("conversations:write")) throw new IntercomExecutionError("Intercom conversation write permission requires reconnecting.", "write_scope_missing", 403); }
export async function replyToIntercomConversation(input: { workspaceId: string; conversationId: string; body: string; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> { const credential = await getStoredIntercomCredential(input.workspaceId, input.supabase); if (!credential) throw new IntercomExecutionError("Intercom is not connected.", "connector_not_connected", 409); await assertWriteScope(credential); const body = input.body.trim(); if (!body || body.length > 5000) throw new IntercomExecutionError("Reply is required and must be 5,000 characters or fewer.", "invalid_input", 400); return intercomFetchWithRefresh({ workspaceId: input.workspaceId, credential, path: `/conversations/${boundedId(input.conversationId)}/reply`, init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message_type: "comment", type: "admin", body }) }, supabase: input.supabase }); }
export async function updateIntercomConversation(input: { workspaceId: string; conversationId: string; status?: "open" | "closed"; adminId?: string | null; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> { const credential = await getStoredIntercomCredential(input.workspaceId, input.supabase); if (!credential) throw new IntercomExecutionError("Intercom is not connected.", "connector_not_connected", 409); await assertWriteScope(credential); const results: Record<string, unknown> = {}; if (input.status) { const action = input.status === "closed" ? "close" : "reopen"; results[action] = await intercomFetchWithRefresh({ workspaceId: input.workspaceId, credential, path: `/conversations/${boundedId(input.conversationId)}/${action}`, init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, supabase: input.supabase }); } if (input.adminId !== undefined) { if (input.adminId && !/^[A-Za-z0-9_-]{1,128}$/.test(input.adminId)) throw new IntercomExecutionError("Invalid Intercom admin id.", "invalid_target", 400); const admins = await listIntercomAdmins(await resolveIntercomAccessToken({ workspaceId: input.workspaceId, credential, supabase: input.supabase }), regionFromCredential(credential), 100); if (input.adminId && !admins.some((admin) => admin.id === input.adminId)) throw new IntercomExecutionError("The selected Intercom admin is not available in this workspace.", "assignee_out_of_scope", 403); results.assignment = await intercomFetchWithRefresh({ workspaceId: input.workspaceId, credential, path: `/conversations/${boundedId(input.conversationId)}/users`, init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ admin_id: input.adminId || null }) }, supabase: input.supabase }); } if (!Object.keys(results).length) throw new IntercomExecutionError("At least one supported Intercom conversation field is required.", "invalid_update", 400); return results; }

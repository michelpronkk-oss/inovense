import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { resolveAccessTokenWithRefreshLock } from "@/lib/connectors/refresh-lock";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/runtime/provider-health";
import { providerRetryDelayMs, shouldRetryProviderFailure } from "@/lib/runtime/provider-retry";

export const ASANA_REDIRECT_URI = "https://app.auterim.com/api/connectors/asana/callback";
const ASANA_OAUTH_AUTHORIZE = "https://app.asana.com/-/oauth_authorize";
const ASANA_OAUTH_TOKEN = "https://app.asana.com/-/oauth_token";
const ASANA_OAUTH_REVOKE = "https://app.asana.com/-/oauth_revoke";
const ASANA_API_BASE = "https://app.asana.com/api/1.0";
export const ASANA_OAUTH_SCOPES = ["users:read", "workspaces:read", "projects:read", "tasks:read", "tasks:write", "stories:write"];
export const ASANA_WRITE_SCOPES = ["tasks:write", "stories:write"];

export type AsanaTokenResult = { access_token: string; refresh_token?: string; expires_in?: number; token_type?: string; scope?: string };
export type AsanaIdentity = { gid: string; name?: string; email?: string };
type AsanaUser = { gid: string; name?: string; workspaces?: Array<{ gid: string }> };
export type AsanaWorkspace = { gid: string; name: string; is_organization?: boolean };
export type AsanaProject = { gid: string; name: string; workspace?: { gid: string; name: string }; archived?: boolean; resource_type?: string };
export type AsanaTask = { gid: string; name: string; completed?: boolean; completed_at?: string | null; due_on?: string | null; due_at?: string | null; modified_at?: string; assignee?: { gid?: string; name?: string } | null; memberships?: Array<{ project?: { gid?: string; name?: string }; section?: { gid?: string; name?: string } }> };
export type StoredAsanaCredential = {
  workspace_id: string; connector_key: "asana"; provider_account_id?: string | null; provider_email?: string | null;
  encrypted_access_token: string; encrypted_refresh_token?: string | null; token_expires_at?: string | null;
  scopes?: string[] | null; status?: string | null; metadata?: Record<string, unknown> | null;
};

function required(name: "ASANA_CLIENT_ID" | "ASANA_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
export function getAsanaConfigStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = (["ASANA_CLIENT_ID", "ASANA_CLIENT_SECRET"] as const).filter((name) => !process.env[name]?.trim());
  const redirect = process.env.ASANA_REDIRECT_URI?.trim();
  if (!redirect) missing.push("ASANA_REDIRECT_URI");
  else if (redirect !== ASANA_REDIRECT_URI) missing.push("ASANA_REDIRECT_URI must equal the canonical callback URI");
  return { configured: missing.length === 0, missing };
}
export function getAsanaRedirectUri(): string { return ASANA_REDIRECT_URI; }
export function buildAsanaAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({ client_id: required("ASANA_CLIENT_ID"), redirect_uri: ASANA_REDIRECT_URI, response_type: "code", state, scope: ASANA_OAUTH_SCOPES.join(" ") });
  return `${ASANA_OAUTH_AUTHORIZE}?${params.toString()}`;
}
async function parseResponse<T>(response: Response): Promise<T & { error?: string; error_description?: string }> {
  const text = await response.text();
  try { return JSON.parse(text) as T & { error?: string; error_description?: string }; } catch { return { error_description: text || "Asana returned an invalid response" } as T & { error_description: string }; }
}
export async function exchangeAsanaCode(code: string): Promise<AsanaTokenResult> {
  const response = await fetch(ASANA_OAUTH_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: required("ASANA_CLIENT_ID"), client_secret: required("ASANA_CLIENT_SECRET"), redirect_uri: ASANA_REDIRECT_URI }), cache: "no-store" });
  const token = await parseResponse<AsanaTokenResult>(response);
  if (!response.ok || !token.access_token) throw new Error(token.error_description || token.error || "Asana token exchange failed");
  return token;
}
export async function refreshAsanaAccessToken(refreshToken: string): Promise<AsanaTokenResult> {
  const response = await fetch(ASANA_OAUTH_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: required("ASANA_CLIENT_ID"), client_secret: required("ASANA_CLIENT_SECRET") }), cache: "no-store" });
  const token = await parseResponse<AsanaTokenResult>(response);
  // Status and provider error code are preserved so a temporary Asana outage
  // is never mistaken for a revoked grant.
  if (!response.ok || !token.access_token) throw new AsanaExecutionError(token.error_description || token.error || "Asana token refresh failed", token.error || `http_${response.status}`, response.status);
  return token;
}
export async function revokeAsanaToken(accessToken: string): Promise<void> {
  await fetch(ASANA_OAUTH_REVOKE, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: required("ASANA_CLIENT_ID"), client_secret: required("ASANA_CLIENT_SECRET"), token: accessToken }), cache: "no-store" }).catch(() => undefined);
}
export function toStoredAsanaCredential(input: { workspaceId: string; token: AsanaTokenResult; identity: AsanaIdentity }): StoredAsanaCredential {
  const expiresAt = input.token.expires_in ? new Date(Date.now() + input.token.expires_in * 1000).toISOString() : null;
  return { workspace_id: input.workspaceId, connector_key: "asana", provider_account_id: input.identity.gid, provider_email: input.identity.email?.toLowerCase() ?? null, encrypted_access_token: encryptToken(input.token.access_token), encrypted_refresh_token: input.token.refresh_token ? encryptToken(input.token.refresh_token) : null, token_expires_at: expiresAt, scopes: input.token.scope?.split(/[ ,]+/).filter(Boolean) ?? ASANA_OAUTH_SCOPES, status: "connected", metadata: { provider: "asana", userName: input.identity.name ?? null, selectedWorkspaceId: null, selectedWorkspaceName: null, selectedProjectId: null, selectedProjectName: null, connectedAt: new Date().toISOString() } };
}
export async function getStoredAsanaCredential(workspaceId: string, supabase = createSupabaseAdmin()): Promise<StoredAsanaCredential | null> {
  const result = await supabase.from("os_connector_credentials").select("*").eq("workspace_id", workspaceId).eq("connector_key", "asana").maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data as StoredAsanaCredential | null) ?? null;
}
export class AsanaReconnectionRequiredError extends Error {}
export function asanaAccessTokenIsFresh(row: { token_expires_at?: string | null }): boolean {
  return Boolean(row.token_expires_at && new Date(row.token_expires_at).getTime() > Date.now() + 60_000);
}
/**
 * Asana refreshes are coordinated through the shared distributed lease. Asana
 * usually returns the same refresh token, but this resolver writes credential
 * state back, and any write-back can otherwise be overwritten by a worker
 * holding older state. The credential_version compare-and-swap makes that
 * impossible. A temporary Asana failure no longer forces a reconnect.
 */
export async function resolveAsanaAccessToken(input: { workspaceId: string; credential: StoredAsanaCredential; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<string> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  if (asanaAccessTokenIsFresh(input.credential)) return decryptToken(input.credential.encrypted_access_token);
  if (!input.credential.encrypted_refresh_token) return decryptToken(input.credential.encrypted_access_token);
  try {
    const outcome = await resolveAccessTokenWithRefreshLock({
      workspaceId: input.workspaceId, connectorKey: "asana", supabase, credential: input.credential, isFresh: asanaAccessTokenIsFresh,
      refresh: async (latest) => {
        if (!latest.encrypted_refresh_token) throw new AsanaReconnectionRequiredError("Asana reconnection required.");
        const token = await refreshAsanaAccessToken(decryptToken(latest.encrypted_refresh_token));
        return { accessToken: token.access_token, refreshToken: token.refresh_token ?? null, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null, status: "connected" };
      },
    });
    await recordProviderSuccess({ workspaceId: input.workspaceId, connectorKey: "asana", operation: "oauth_refresh", supabase });
    return outcome.accessToken;
  } catch (error) {
    const status = error instanceof AsanaExecutionError ? error.status : null;
    const code = error instanceof AsanaExecutionError ? error.code : (error as { code?: string } | null)?.code ?? "oauth_refresh_failed";
    const failure = await recordProviderFailure({ workspaceId: input.workspaceId, connectorKey: "asana", operation: "oauth_refresh", status, code, supabase });
    if (failure.connectorHealthImpact === "reconnect_required" || error instanceof AsanaReconnectionRequiredError) {
      await supabase.from("os_connector_credentials").update({ status: "needs_attention" }).eq("workspace_id", input.workspaceId).eq("connector_key", "asana");
      throw new AsanaReconnectionRequiredError("Asana reconnection required.");
    }
    throw new AsanaExecutionError("Asana could not be reached to refresh access.", failure.safeCode, status && status >= 400 && status < 500 ? status : 502);
  }
}
async function asanaFetchPage<T>(token: string, path: string, init?: RequestInit): Promise<{ data: T; nextOffset: string | null }> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${ASANA_API_BASE}${path}`, { ...init, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, cache: "no-store" });
    lastStatus = response.status;
    if (response.ok) { const body = await response.json() as { data: T; next_page?: { offset?: string } | null }; return { data: body.data, nextOffset: body.next_page?.offset ?? null }; }
    if (!shouldRetryProviderFailure({ status: response.status, attempt })) break;
    const retryAfter = Number(response.headers.get("retry-after") || 0);
    await new Promise((resolve) => setTimeout(resolve, providerRetryDelayMs(attempt, retryAfter > 0 ? retryAfter * 1000 : null, 1500)));
  }
  throw new Error(`Asana API request failed (${lastStatus || "network"})`);
}
async function asanaFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> { return (await asanaFetchPage<T>(token, path, init)).data; }
async function asanaFetchBoundedList<T>(token: string, path: string, maxPages = 5): Promise<T[]> {
  const values: T[] = []; let offset: string | null = null;
  for (let page = 0; page < maxPages; page += 1) { const separator = path.includes("?") ? "&" : "?"; const pageResult: { data: T[]; nextOffset: string | null } = await asanaFetchPage<T[]>(token, `${path}${offset ? `${separator}offset=${encodeURIComponent(offset)}` : ""}`); values.push(...pageResult.data); offset = pageResult.nextOffset; if (!offset || pageResult.data.length === 0) break; }
  return values;
}
export async function fetchAsanaIdentity(token: string): Promise<AsanaIdentity> { return asanaFetch<AsanaIdentity>(token, "/users/me?opt_fields=gid,name,email"); }
export async function listAsanaWorkspaces(token: string): Promise<AsanaWorkspace[]> { return asanaFetchBoundedList<AsanaWorkspace>(token, "/workspaces?limit=100", 3); }
export async function listAsanaProjects(token: string, workspaceGid: string): Promise<AsanaProject[]> { return asanaFetchBoundedList<AsanaProject>(token, `/projects?workspace=${encodeURIComponent(workspaceGid)}&limit=100&archived=false&opt_fields=gid,name,workspace,archived`, 5); }
export async function listAsanaTasks(token: string, projectGid: string): Promise<AsanaTask[]> { return asanaFetchBoundedList<AsanaTask>(token, `/tasks?project=${encodeURIComponent(projectGid)}&limit=100&completed_since=now&opt_fields=gid,name,completed,completed_at,due_on,due_at,modified_at,assignee,memberships.section,memberships.project`, 5); }
export async function getAsanaTask(token: string, taskGid: string): Promise<AsanaTask> { return asanaFetch<AsanaTask>(token, `/tasks/${encodeURIComponent(taskGid)}?opt_fields=gid,name,completed,completed_at,due_on,due_at,modified_at,assignee,memberships.section,memberships.project,notes`); }
function boundedText(value: string, max: number, field: string): string { const text = value.trim(); if (!text || text.length > max) throw new AsanaExecutionError(`${field} is required and must be ${max} characters or fewer.`); return text; }
function safeDueDate(value: string | null | undefined): string | null | undefined { if (value === undefined || value === null || value === "") return value; if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new AsanaExecutionError("Due date must be a valid ISO date.", "invalid_due_date", 400); return value; }
export class AsanaExecutionError extends Error { constructor(message: string, public readonly code = "asana_write_failed", public readonly status = 502) { super(message); } }
async function authorizedScope(input: { workspaceId: string; projectId?: string; taskId?: string; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<{ token: string; credential: StoredAsanaCredential; projectId: string }> {
  const supabase = input.supabase ?? createSupabaseAdmin(); const credential = await getStoredAsanaCredential(input.workspaceId, supabase); if (!credential) throw new AsanaExecutionError("Asana is not connected.", "connector_not_connected", 409);
  const metadata = credential.metadata ?? {}; const workspaceGid = typeof metadata.selectedWorkspaceId === "string" ? metadata.selectedWorkspaceId : null; const configuredProjectId = typeof metadata.selectedProjectId === "string" ? metadata.selectedProjectId : null;
  if (!workspaceGid || !configuredProjectId) throw new AsanaExecutionError("Select an Asana workspace and project before writing.", "destination_not_configured", 409);
  if (input.projectId && input.projectId !== configuredProjectId) throw new AsanaExecutionError("The requested Asana project is outside the configured scope.", "destination_out_of_scope", 403);
  const token = await resolveAsanaAccessToken({ workspaceId: input.workspaceId, credential, supabase });
  const projects = await listAsanaProjects(token, workspaceGid); if (!projects.some((project) => project.gid === configuredProjectId)) throw new AsanaExecutionError("The configured Asana project is no longer accessible.", "destination_inaccessible", 403);
  if (input.taskId) { const task = await getAsanaTask(token, input.taskId); const belongs = (task.memberships ?? []).some((membership) => membership.project?.gid === configuredProjectId); if (!belongs) throw new AsanaExecutionError("The Asana task is outside the configured project scope.", "target_out_of_scope", 403); }
  const scopes = new Set((credential.scopes ?? []).map((scope) => scope.toLowerCase())); if (!ASANA_WRITE_SCOPES.every((scope) => scopes.has(scope))) throw new AsanaExecutionError("Asana write permission requires reconnecting with the approved write scopes.", "write_scope_missing", 403);
  return { token, credential, projectId: configuredProjectId };
}
async function validateAssignee(token: string, workspaceGid: string, assigneeGid: string): Promise<void> {
  const user = await asanaFetch<AsanaUser>(token, `/users/${encodeURIComponent(assigneeGid)}?opt_fields=gid,name,workspaces`);
  if (!user.gid || !user.workspaces?.some((workspace) => workspace.gid === workspaceGid)) throw new AsanaExecutionError("The selected assignee is outside the configured Asana workspace.", "assignee_out_of_scope", 403);
}
export async function createAsanaTask(input: { workspaceId: string; name: string; notes?: string | null; dueOn?: string | null; assigneeGid?: string | null; projectId?: string; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> {
  const scope = await authorizedScope({ workspaceId: input.workspaceId, projectId: input.projectId, supabase: input.supabase }); const workspaceGid = String(scope.credential.metadata?.selectedWorkspaceId ?? ""); const data: Record<string, unknown> = { name: boundedText(input.name, 240, "Task name"), projects: [scope.projectId] }; if (input.notes?.trim()) data.notes = input.notes.trim().slice(0, 8000); const dueOn = safeDueDate(input.dueOn); if (dueOn) data.due_on = dueOn; if (input.assigneeGid) { await validateAssignee(scope.token, workspaceGid, input.assigneeGid); data.assignee = input.assigneeGid; }
  return asanaFetch<Record<string, unknown>>(scope.token, "/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
}
export async function updateAsanaTask(input: { workspaceId: string; taskId: string; name?: string | null; dueOn?: string | null; assigneeGid?: string | null; completed?: boolean; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> {
  if (!input.taskId.trim()) throw new AsanaExecutionError("Task id is required.", "invalid_target", 400); const scope = await authorizedScope({ workspaceId: input.workspaceId, taskId: input.taskId, supabase: input.supabase }); const data: Record<string, unknown> = {}; if (input.name !== undefined && input.name !== null) data.name = boundedText(input.name, 240, "Task name"); if (input.dueOn !== undefined) data.due_on = safeDueDate(input.dueOn); if (input.assigneeGid !== undefined) { if (input.assigneeGid) await validateAssignee(scope.token, String(scope.credential.metadata?.selectedWorkspaceId ?? ""), input.assigneeGid); data.assignee = input.assigneeGid; } if (input.completed !== undefined) data.completed = input.completed; if (Object.keys(data).length === 0) throw new AsanaExecutionError("At least one supported task field is required.", "invalid_update", 400); return asanaFetch<Record<string, unknown>>(scope.token, `/tasks/${encodeURIComponent(input.taskId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
}
export async function addAsanaTaskComment(input: { workspaceId: string; taskId: string; text: string; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> {
  if (!input.taskId.trim()) throw new AsanaExecutionError("Task id is required.", "invalid_target", 400); const scope = await authorizedScope({ workspaceId: input.workspaceId, taskId: input.taskId, supabase: input.supabase }); const text = boundedText(input.text, 4000, "Comment"); return asanaFetch<Record<string, unknown>>(scope.token, "/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { task: input.taskId, text } }) });
}
export async function verifyAsanaConnection(token: string): Promise<AsanaIdentity> { return fetchAsanaIdentity(token); }

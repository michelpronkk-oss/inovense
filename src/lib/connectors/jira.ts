import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { credentialRotatedSince, resolveAccessTokenWithRefreshLock } from "@/lib/connectors/refresh-lock";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/runtime/provider-health";
import { providerRetryDelayMs, shouldRetryProviderFailure } from "@/lib/runtime/provider-retry";

export const JIRA_REDIRECT_URI = "https://app.auterim.com/api/connectors/jira/callback";
const JIRA_AUTHORIZE_URL = "https://auth.atlassian.com/authorize";
const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const JIRA_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources";
const JIRA_API_ROOT = "https://api.atlassian.com/ex/jira";

// read:me is required by Atlassian's User Identity API, which we call during
// callback finalization to bind the connection to the authorized account.
export const JIRA_READ_SCOPES = ["read:jira-work", "read:jira-user", "read:me"] as const;
export const JIRA_WRITE_SCOPES = ["write:jira-work"] as const;
export const JIRA_OAUTH_SCOPES = [...JIRA_READ_SCOPES, ...JIRA_WRITE_SCOPES, "offline_access"] as const;

export type JiraTokenResult = { access_token: string; refresh_token?: string; expires_in?: number; token_type?: string; scope?: string };
export type JiraResource = { id: string; name?: string; url?: string; scopes?: string[]; avatarUrl?: string };
export type JiraIdentity = { accountId?: string; displayName?: string; emailAddress?: string; active?: boolean };
export type JiraProject = { id: string; key: string; name: string; projectTypeKey?: string; simplified?: boolean; style?: string; self?: string };
export type JiraIssue = {
  id: string; key: string; self?: string;
  fields?: { summary?: string; description?: unknown; status?: { name?: string; statusCategory?: { key?: string } }; priority?: { id?: string; name?: string }; assignee?: { accountId?: string; displayName?: string } | null; reporter?: { accountId?: string; displayName?: string } | null; duedate?: string | null; created?: string; updated?: string; labels?: string[]; issuetype?: { id?: string; name?: string }; parent?: { key?: string }; comment?: { comments?: Array<{ id?: string; body?: unknown; author?: { displayName?: string } }> } };
};
export type JiraIssueType = { id: string; name: string; subtask?: boolean; hierarchyLevel?: number; createable?: boolean };
export type JiraPriority = { id: string; name: string };
export type StoredJiraCredential = {
  workspace_id: string; connector_key: "jira"; provider_account_id?: string | null; provider_email?: string | null;
  encrypted_access_token: string; encrypted_refresh_token?: string | null; token_expires_at?: string | null;
  scopes?: string[] | null; status?: string | null; metadata?: Record<string, unknown> | null; created_at?: string | null;
};

function required(name: "JIRA_CLIENT_ID" | "JIRA_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getJiraConfigStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = (["JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET"] as const).filter((name) => !process.env[name]?.trim());
  const redirect = process.env.JIRA_REDIRECT_URI?.trim();
  if (!redirect) missing.push("JIRA_REDIRECT_URI");
  else if (redirect !== JIRA_REDIRECT_URI) missing.push("JIRA_REDIRECT_URI must equal the canonical callback URI");
  return { configured: missing.length === 0, missing };
}

export function buildJiraAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: required("JIRA_CLIENT_ID"),
    redirect_uri: JIRA_REDIRECT_URI,
    response_type: "code",
    prompt: "consent",
    state,
    scope: JIRA_OAUTH_SCOPES.join(" "),
  });
  return `${JIRA_AUTHORIZE_URL}?${params.toString()}`;
}

async function parseResponse<T>(response: Response): Promise<T & { error?: string; error_description?: string }> {
  const text = await response.text();
  try { return JSON.parse(text) as T & { error?: string; error_description?: string }; }
  catch { return { error_description: text || "Jira returned an invalid response" } as T & { error_description: string }; }
}

export async function exchangeJiraCode(code: string): Promise<JiraTokenResult> {
  const response = await fetch(JIRA_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ grant_type: "authorization_code", code, client_id: required("JIRA_CLIENT_ID"), client_secret: required("JIRA_CLIENT_SECRET"), redirect_uri: JIRA_REDIRECT_URI }), cache: "no-store" });
  const token = await parseResponse<JiraTokenResult>(response);
  if (!response.ok || !token.access_token) throw new Error(token.error_description || token.error || "Jira token exchange failed");
  return token;
}

export async function refreshJiraAccessToken(refreshToken: string): Promise<JiraTokenResult> {
  // Atlassian's rotating refresh-token exchange accepts the original refresh
  // token and client credentials; scopes are granted by the original consent.
  const response = await fetch(JIRA_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: required("JIRA_CLIENT_ID"), client_secret: required("JIRA_CLIENT_SECRET") }), cache: "no-store" });
  const token = await parseResponse<JiraTokenResult>(response);
  // The status and Atlassian error code are preserved so a temporary 5xx at
  // auth.atlassian.com is never mistaken for a revoked grant.
  if (!response.ok || !token.access_token) throw new JiraExecutionError(token.error_description || token.error || "Jira token refresh failed", token.error || `http_${response.status}`, response.status);
  return token;
}

export async function revokeJiraToken(accessToken: string): Promise<void> {
  // Atlassian 3LO has no reliable per-connection revoke endpoint. Deleting the
  // encrypted workspace credential blocks Auterim immediately; upstream revoke
  // is intentionally not faked here.
  void accessToken;
}

export function toStoredJiraCredential(input: { workspaceId: string; token: JiraTokenResult; resource: JiraResource; identity?: JiraIdentity }): StoredJiraCredential {
  const expiresAt = input.token.expires_in ? new Date(Date.now() + input.token.expires_in * 1000).toISOString() : null;
  const scopes = input.resource.scopes?.length ? input.resource.scopes : input.token.scope?.split(/[ ,]+/).filter(Boolean) ?? [];
  return {
    workspace_id: input.workspaceId, connector_key: "jira", provider_account_id: input.identity?.accountId ?? null, provider_email: input.identity?.emailAddress?.toLowerCase() ?? null,
    encrypted_access_token: encryptToken(input.token.access_token), encrypted_refresh_token: input.token.refresh_token ? encryptToken(input.token.refresh_token) : null, token_expires_at: expiresAt, scopes, status: "connected",
    metadata: { provider: "jira", cloudId: input.resource.id, siteUrl: input.resource.url ?? null, siteName: input.resource.name ?? null, selectedProjectId: null, selectedProjectKey: null, selectedProjectName: null, selectedIssueTypeId: null, selectedIssueTypeName: null, syncCursor: null, connectedAt: new Date().toISOString() },
  };
}

export async function getStoredJiraCredential(workspaceId: string, supabase = createSupabaseAdmin()): Promise<StoredJiraCredential | null> {
  const result = await supabase.from("os_connector_credentials").select("*").eq("workspace_id", workspaceId).eq("connector_key", "jira").maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data as StoredJiraCredential | null) ?? null;
}

export class JiraReconnectionRequiredError extends Error {}
export class JiraExecutionError extends Error { constructor(message: string, public readonly code = "jira_write_failed", public readonly status = 502) { super(message); } }

export function isCreateableJiraIssueType(issueType: JiraIssueType | null | undefined): issueType is JiraIssueType {
  return Boolean(issueType?.id && issueType.name && issueType.subtask !== true && issueType.createable !== false);
}

export function jiraAccessTokenIsFresh(row: { token_expires_at?: string | null }): boolean {
  return Boolean(row.token_expires_at && new Date(row.token_expires_at).getTime() > Date.now() + 60_000);
}

/**
 * Atlassian rotates refresh tokens, so two workers refreshing at once could
 * previously persist mutually invalidated credentials. Refreshes now run under
 * the shared distributed lease with a credential_version compare-and-swap.
 *
 * Failure handling is classified rather than blanket: only a genuinely dead
 * grant marks the connector as needing attention. A temporary auth.atlassian.com
 * outage, a busy lease, or a refused stale write all leave the credential
 * exactly as it was.
 */
async function refreshJiraCredential(input: { workspaceId: string; credential: StoredJiraCredential; supabase: ReturnType<typeof createSupabaseAdmin>; isFresh: (row: { token_expires_at?: string | null; encrypted_access_token: string }) => boolean }): Promise<string> {
  try {
    const outcome = await resolveAccessTokenWithRefreshLock({
      workspaceId: input.workspaceId,
      connectorKey: "jira",
      supabase: input.supabase,
      credential: input.credential,
      isFresh: input.isFresh,
      refresh: async (latest) => {
        if (!latest.encrypted_refresh_token) throw new JiraReconnectionRequiredError("Jira reconnection required.");
        const token = await refreshJiraAccessToken(decryptToken(latest.encrypted_refresh_token));
        return {
          accessToken: token.access_token,
          refreshToken: token.refresh_token ?? null,
          expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
          scopes: token.scope?.split(/[ ,]+/).filter(Boolean) ?? null,
          status: "connected",
        };
      },
    });
    await recordProviderSuccess({ workspaceId: input.workspaceId, connectorKey: "jira", operation: "oauth_refresh", supabase: input.supabase });
    return outcome.accessToken;
  } catch (error) {
    const status = error instanceof JiraExecutionError ? error.status : null;
    const code = error instanceof JiraExecutionError ? error.code : (error as { code?: string } | null)?.code ?? "oauth_refresh_failed";
    const failure = await recordProviderFailure({ workspaceId: input.workspaceId, connectorKey: "jira", operation: "oauth_refresh", status, code, supabase: input.supabase });
    if (failure.connectorHealthImpact === "reconnect_required" || error instanceof JiraReconnectionRequiredError) {
      await input.supabase.from("os_connector_credentials").update({ status: "needs_attention" }).eq("workspace_id", input.workspaceId).eq("connector_key", "jira");
      throw new JiraReconnectionRequiredError("Jira reconnection required.");
    }
    throw new JiraExecutionError("Jira could not be reached to refresh access.", failure.safeCode, status && status >= 400 && status < 500 ? status : 502);
  }
}

export async function resolveJiraAccessToken(input: { workspaceId: string; credential: StoredJiraCredential; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<string> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  if (jiraAccessTokenIsFresh(input.credential)) return decryptToken(input.credential.encrypted_access_token);
  if (!input.credential.encrypted_refresh_token) return decryptToken(input.credential.encrypted_access_token);
  return refreshJiraCredential({ workspaceId: input.workspaceId, credential: input.credential, supabase, isFresh: jiraAccessTokenIsFresh });
}

async function providerFetch<T>(url: string, token: string, init?: RequestInit): Promise<{ response: Response; body: T }> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try { response = await fetch(url, { ...init, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, cache: "no-store" }); }
    catch { if (attempt === 2) throw new JiraExecutionError("Jira could not be reached.", "provider_unavailable", 502); await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1))); continue; }
    lastStatus = response.status;
    const body = await parseResponse<T>(response);
    if (response.ok) return { response, body };
    if (!shouldRetryProviderFailure({ status: response.status, attempt })) return { response, body };
    const retryAfter = Number(response.headers.get("retry-after") || 0);
    await new Promise((resolve) => setTimeout(resolve, providerRetryDelayMs(attempt, retryAfter > 0 ? retryAfter * 1000 : null, 1500)));
  }
  throw new JiraExecutionError(`Jira request failed (${lastStatus || "network"}).`, "provider_unavailable", 502);
}

function resourceUrl(cloudId: string, path: string): string { return `${JIRA_API_ROOT}/${encodeURIComponent(cloudId)}/rest/api/3${path.startsWith("/") ? path : `/${path}`}`; }

export async function getAccessibleJiraResources(token: string): Promise<JiraResource[]> {
  const result = await providerFetch<JiraResource[]>(JIRA_RESOURCES_URL, token);
  if (!result.response.ok || !Array.isArray(result.body)) throw new JiraExecutionError("Jira did not return an accessible Cloud site.", "resource_discovery_failed", 403);
  return result.body.filter((item) => typeof item.id === "string" && item.id.length > 0);
}

export async function fetchJiraIdentity(token: string): Promise<JiraIdentity> { const result = await providerFetch<JiraIdentity>("https://api.atlassian.com/me", token); if (!result.response.ok) throw new JiraExecutionError("Could not verify the Jira account.", "identity_failed", 502); return result.body; }

export async function jiraFetch<T>(token: string, cloudId: string, path: string, init?: RequestInit): Promise<T> {
  const result = await providerFetch<T>(resourceUrl(cloudId, path), token, init);
  if (!result.response.ok) { const error = result.body as Record<string, unknown>; const messages = Array.isArray(error.errorMessages) ? error.errorMessages.filter((item): item is string => typeof item === "string") : []; throw new JiraExecutionError(messages[0] || "Jira rejected the request.", `jira_http_${result.response.status}`, result.response.status >= 400 && result.response.status < 500 ? result.response.status : 502); }
  return result.body;
}

/** Provider mutations use this wrapper so a valid-but-expired access token can
 * refresh exactly once on a 401. Rotated refresh tokens are persisted before
 * the single retry; a second 401 is surfaced as a reconnect-required error. */
export async function jiraFetchWithRefresh<T>(input: { workspaceId: string; credential: StoredJiraCredential; cloudId: string; path: string; init?: RequestInit; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<T> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  let token = await resolveJiraAccessToken({ workspaceId: input.workspaceId, credential: input.credential, supabase });
  let response = await providerFetch<T>(resourceUrl(input.cloudId, input.path), token, input.init);
  if (response.response.status === 401 && input.credential.encrypted_refresh_token) {
    // The token this call already used is known bad, so "fresh" here means
    // "the stored credential has actually changed since we read it". If another
    // worker rotated it while this request was in flight, the lock helper
    // returns that newer token instead of burning a second rotation.
    const usedCiphertext = input.credential.encrypted_access_token;
    token = await refreshJiraCredential({
      workspaceId: input.workspaceId,
      credential: input.credential,
      supabase,
      isFresh: credentialRotatedSince(usedCiphertext),
    });
    response = await providerFetch<T>(resourceUrl(input.cloudId, input.path), token, input.init);
  }
  if (!response.response.ok) { const error = response.body as Record<string, unknown>; const messages = Array.isArray(error.errorMessages) ? error.errorMessages.filter((item): item is string => typeof item === "string") : []; throw new JiraExecutionError(messages[0] || "Jira rejected the request.", `jira_http_${response.response.status}`, response.response.status >= 400 && response.response.status < 500 ? response.response.status : 502); }
  return response.body;
}

export async function listJiraProjects(token: string, cloudId: string): Promise<JiraProject[]> {
  const out: JiraProject[] = [];
  for (let startAt = 0; startAt < 250; startAt += 50) {
    const body = await jiraFetch<{ values?: JiraProject[]; total?: number; isLast?: boolean }>(token, cloudId, `/project/search?startAt=${startAt}&maxResults=50&orderBy=name`);
    const values = Array.isArray(body.values) ? body.values : [];
    out.push(...values);
    if (body.isLast === true || values.length === 0 || out.length >= Math.min(body.total ?? out.length, 250)) break;
  }
  return out.slice(0, 250);
}
export async function getJiraProject(token: string, cloudId: string, projectIdOrKey: string): Promise<JiraProject> { return jiraFetch<JiraProject>(token, cloudId, `/project/${encodeURIComponent(projectIdOrKey)}`); }
export async function listJiraIssueTypes(token: string, cloudId: string, projectIdOrKey: string): Promise<JiraIssueType[]> {
  const body = await jiraFetch<{ issueTypes?: JiraIssueType[] }>(token, cloudId, `/issue/createmeta/${encodeURIComponent(projectIdOrKey)}/issuetypes?startAt=0&maxResults=50`);
  return (body.issueTypes ?? []).filter(isCreateableJiraIssueType);
}
export async function listJiraPriorities(token: string, cloudId: string): Promise<JiraPriority[]> { return jiraFetch<JiraPriority[]>(token, cloudId, "/priority"); }

export type NormalizedJiraIssue = { provider: "jira"; cloudId: string; projectId: string; projectKey: string; issueId: string; issueKey: string; summary: string; description: string; status: string; priority: string | null; assigneeName: string | null; assigneeAccountId: string | null; dueAt: string | null; createdAt: string | null; updatedAt: string | null; labels: string[]; issueType: string | null; parentKey?: string; webUrl?: string };

export function normalizeJiraDocument(value: unknown, max = 8000): string {
  const chunks: string[] = [];
  const visit = (node: unknown) => { if (chunks.join("").length >= max || !node || typeof node !== "object") return; const item = node as Record<string, unknown>; if (item.type === "text" && typeof item.text === "string") chunks.push(item.text); if (item.type === "hardBreak" || item.type === "paragraph") chunks.push("\n"); if (Array.isArray(item.content)) item.content.forEach(visit); };
  if (typeof value === "string") return value.replace(/<[^>]*>/g, "").slice(0, max);
  visit(value); return chunks.join("").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

export function normalizeJiraIssue(issue: JiraIssue, cloudId: string, project: JiraProject): NormalizedJiraIssue {
  const fields = issue.fields ?? {};
  return { provider: "jira", cloudId, projectId: project.id, projectKey: project.key, issueId: issue.id, issueKey: issue.key, summary: String(fields.summary ?? "").slice(0, 500), description: normalizeJiraDocument(fields.description), status: String(fields.status?.name ?? "").slice(0, 120), priority: fields.priority?.name ? String(fields.priority.name).slice(0, 120) : null, assigneeName: fields.assignee?.displayName ? String(fields.assignee.displayName).slice(0, 200) : null, assigneeAccountId: fields.assignee?.accountId ?? null, dueAt: fields.duedate ?? null, createdAt: fields.created ?? null, updatedAt: fields.updated ?? null, labels: Array.isArray(fields.labels) ? fields.labels.filter((item): item is string => typeof item === "string").slice(0, 30) : [], issueType: fields.issuetype?.name ? String(fields.issuetype.name).slice(0, 120) : null, parentKey: fields.parent?.key, webUrl: issue.key ? `${String((project as JiraProject & { self?: string }).self ?? "").replace(/\/rest\/api\/3\/project\/.*$/, "")}/browse/${encodeURIComponent(issue.key)}` : undefined };
}

export async function searchJiraIssues(token: string, cloudId: string, project: JiraProject, input: { updatedSince?: string | null; maxResults?: number } = {}): Promise<NormalizedJiraIssue[]> {
  const bounded = Math.max(1, Math.min(input.maxResults ?? 100, 100));
  const updated = input.updatedSince && /^\d{4}-\d{2}-\d{2}T/.test(input.updatedSince) ? ` AND updated >= "${input.updatedSince.replace(/["\\]/g, "")}"` : "";
  const jql = `project = "${project.key.replace(/[^A-Za-z0-9_\-]/g, "")}"${updated} ORDER BY updated DESC`;
  const body = await jiraFetch<{ issues?: JiraIssue[] }>(token, cloudId, "/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jql, startAt: 0, maxResults: bounded, fields: ["summary", "description", "status", "priority", "assignee", "reporter", "duedate", "created", "updated", "labels", "issuetype", "parent"] }) });
  return (body.issues ?? []).map((issue) => normalizeJiraIssue(issue, cloudId, project));
}
export async function getJiraIssue(token: string, cloudId: string, issueKey: string, project: JiraProject): Promise<NormalizedJiraIssue> { if (!/^[A-Z][A-Z0-9_]{1,20}-\d+$/.test(issueKey)) throw new JiraExecutionError("Invalid Jira issue key.", "invalid_target", 400); const issue = await jiraFetch<JiraIssue>(token, cloudId, `/issue/${encodeURIComponent(issueKey)}?fields=summary,description,status,priority,assignee,reporter,duedate,created,updated,labels,issuetype,parent`); if (!issue.key || !issue.key.startsWith(`${project.key}-`)) throw new JiraExecutionError("The Jira issue is outside the configured project scope.", "target_out_of_scope", 403); return normalizeJiraIssue(issue, cloudId, project); }

async function configuredScope(input: { workspaceId: string; projectId?: string; issueKey?: string; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<{ token: string; credential: StoredJiraCredential; cloudId: string; project: JiraProject }> {
  const supabase = input.supabase ?? createSupabaseAdmin(); const credential = await getStoredJiraCredential(input.workspaceId, supabase); if (!credential) throw new JiraExecutionError("Jira is not connected.", "connector_not_connected", 409);
  const metadata = credential.metadata ?? {}; const cloudId = typeof metadata.cloudId === "string" ? metadata.cloudId : null; const configuredProjectId = typeof metadata.selectedProjectId === "string" ? metadata.selectedProjectId : null;
  if (!cloudId || !configuredProjectId) throw new JiraExecutionError("Select a Jira project before writing.", "destination_not_configured", 409);
  if (input.projectId && input.projectId !== configuredProjectId) throw new JiraExecutionError("The requested Jira project is outside the configured scope.", "destination_out_of_scope", 403);
  const token = await resolveJiraAccessToken({ workspaceId: input.workspaceId, credential, supabase });
  const resources = await getAccessibleJiraResources(token); if (!resources.some((resource) => resource.id === cloudId)) throw new JiraExecutionError("The authorized Jira Cloud site is no longer accessible.", "resource_inaccessible", 403);
  const project = await getJiraProject(token, cloudId, configuredProjectId);
  if (project.id !== configuredProjectId) throw new JiraExecutionError("The configured Jira project could not be verified.", "destination_inaccessible", 403);
  if (input.issueKey) await getJiraIssue(token, cloudId, input.issueKey, project);
  return { token, credential, cloudId, project };
}

function boundedText(value: string, max: number, field: string): string { const text = value.trim(); if (!text || text.length > max) throw new JiraExecutionError(`${field} is required and must be ${max} characters or fewer.`, "invalid_input", 400); return text; }
function safeDueDate(value: string | null | undefined): string | null | undefined { if (value === undefined || value === null || value === "") return value; if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new JiraExecutionError("Due date must be a valid ISO date.", "invalid_due_date", 400); return value; }
async function validateJiraAssignee(token: string, cloudId: string, projectKey: string, accountId: string): Promise<void> { if (!/^[A-Za-z0-9:_\-.]+$/.test(accountId) || accountId.length > 200) throw new JiraExecutionError("Invalid Jira assignee.", "invalid_assignee", 400); const body = await jiraFetch<Array<{ accountId?: string }>>(token, cloudId, `/user/assignable/search?project=${encodeURIComponent(projectKey)}&accountId=${encodeURIComponent(accountId)}&maxResults=1`); if (!body.some((user) => user.accountId === accountId)) throw new JiraExecutionError("The Jira assignee is not valid for the configured project.", "assignee_out_of_scope", 403); }
function adf(value: string): Record<string, unknown> { return { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: value }] }] }; }

export async function createJiraIssue(input: { workspaceId: string; summary: string; description?: string | null; issueTypeId: string; assigneeAccountId?: string | null; priorityId?: string | null; dueDate?: string | null; projectId?: string; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> {
  const scope = await configuredScope({ workspaceId: input.workspaceId, projectId: input.projectId, supabase: input.supabase }); const types = await listJiraIssueTypes(scope.token, scope.cloudId, scope.project.id); if (!types.some((item) => item.id === input.issueTypeId)) throw new JiraExecutionError("Select a valid issue type for the configured Jira project.", "invalid_issue_type", 400);
  const fields: Record<string, unknown> = { project: { id: scope.project.id }, summary: boundedText(input.summary, 240, "Summary"), issuetype: { id: input.issueTypeId } }; if (input.description?.trim()) fields.description = adf(boundedText(input.description, 8000, "Description")); const dueDate = safeDueDate(input.dueDate); if (dueDate) fields.duedate = dueDate; if (input.assigneeAccountId) { await validateJiraAssignee(scope.token, scope.cloudId, scope.project.key, input.assigneeAccountId); fields.assignee = { accountId: input.assigneeAccountId }; } if (input.priorityId) { const priorities = await listJiraPriorities(scope.token, scope.cloudId); if (!priorities.some((priority) => priority.id === input.priorityId)) throw new JiraExecutionError("Select a valid Jira priority.", "invalid_priority", 400); fields.priority = { id: input.priorityId }; }
  return jiraFetchWithRefresh<Record<string, unknown>>({ workspaceId: input.workspaceId, credential: scope.credential, cloudId: scope.cloudId, path: "/issue", init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) }, supabase: input.supabase });
}
export async function updateJiraIssue(input: { workspaceId: string; issueKey: string; summary?: string | null; assigneeAccountId?: string | null; priorityId?: string | null; dueDate?: string | null; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> {
  const scope = await configuredScope({ workspaceId: input.workspaceId, issueKey: input.issueKey, supabase: input.supabase }); const fields: Record<string, unknown> = {}; if (input.summary !== undefined && input.summary !== null) fields.summary = boundedText(input.summary, 240, "Summary"); if (input.dueDate !== undefined) fields.duedate = safeDueDate(input.dueDate); if (input.assigneeAccountId !== undefined) { if (input.assigneeAccountId) await validateJiraAssignee(scope.token, scope.cloudId, scope.project.key, input.assigneeAccountId); fields.assignee = input.assigneeAccountId ? { accountId: input.assigneeAccountId } : null; } if (input.priorityId !== undefined) { if (input.priorityId) { const priorities = await listJiraPriorities(scope.token, scope.cloudId); if (!priorities.some((priority) => priority.id === input.priorityId)) throw new JiraExecutionError("Select a valid Jira priority.", "invalid_priority", 400); fields.priority = { id: input.priorityId }; } else fields.priority = null; } if (Object.keys(fields).length === 0) throw new JiraExecutionError("At least one supported Jira field is required.", "invalid_update", 400); return jiraFetchWithRefresh<Record<string, unknown>>({ workspaceId: input.workspaceId, credential: scope.credential, cloudId: scope.cloudId, path: `/issue/${encodeURIComponent(input.issueKey)}`, init: { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) }, supabase: input.supabase });
}
export async function addJiraComment(input: { workspaceId: string; issueKey: string; text: string; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<Record<string, unknown>> { const scope = await configuredScope({ workspaceId: input.workspaceId, issueKey: input.issueKey, supabase: input.supabase }); return jiraFetchWithRefresh<Record<string, unknown>>({ workspaceId: input.workspaceId, credential: scope.credential, cloudId: scope.cloudId, path: `/issue/${encodeURIComponent(input.issueKey)}/comment`, init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: adf(boundedText(input.text, 4000, "Comment")) }) }, supabase: input.supabase }); }

export async function verifyJiraConnection(token: string, cloudId: string): Promise<JiraIdentity> { await getAccessibleJiraResources(token); return fetchJiraIdentity(token).then((identity) => ({ ...identity, accountId: identity.accountId, ...(cloudId ? {} : {}) })); }

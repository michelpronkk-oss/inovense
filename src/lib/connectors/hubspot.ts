import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { resolveAccessTokenWithRefreshLock } from "@/lib/connectors/refresh-lock";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/runtime/provider-health";
import { providerRetryDelayMs, shouldRetryProviderFailure } from "@/lib/runtime/provider-retry";
import { AUTERIM_APP_URL } from "@/lib/brand";

export const HUBSPOT_CONNECTOR_KEY = "hubspot" as const;
export const HUBSPOT_API_BASE = "https://api.hubapi.com";
export const HUBSPOT_OAUTH_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.deals.read",
  "crm.objects.deals.write",
  "crm.objects.notes.write",
  "crm.objects.tasks.write",
  "crm.schemas.contacts.read",
  "crm.schemas.deals.read",
] as const;
export function getMissingHubSpotScopes(scopes: string[] | null | undefined): string[] {
  const granted = new Set((scopes ?? []).map((scope) => scope.toLowerCase()));
  return HUBSPOT_OAUTH_SCOPES.filter((scope) => !granted.has(scope.toLowerCase()));
}

export type HubSpotTokenResult = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  hub_id?: number;
  user_id?: number;
};

export type HubSpotIdentity = {
  hubId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
};

export type StoredHubSpotCredential = {
  workspace_id: string;
  connector_key: "hubspot";
  provider_account_id?: string | null;
  provider_email?: string | null;
  encrypted_access_token: string;
  encrypted_refresh_token?: string | null;
  token_expires_at?: string | null;
  scopes?: string[] | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export class HubSpotReconnectionRequiredError extends Error {
  readonly code = "hubspot_reconnect_required";
  constructor(message = "Reconnect HubSpot to restore access.") { super(message); this.name = "HubSpotReconnectionRequiredError"; }
}

export class HubSpotConnectorError extends Error {
  constructor(message: string, public readonly code = "hubspot_provider_error", public readonly status = 502) { super(message); this.name = "HubSpotConnectorError"; }
}

function required(name: "HUBSPOT_CLIENT_ID" | "HUBSPOT_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getHubSpotRedirectUri(): string {
  const canonical = `${AUTERIM_APP_URL}/api/connectors/hubspot/callback`;
  const configured = process.env.HUBSPOT_REDIRECT_URI?.trim();
  if (process.env.NODE_ENV !== "production" && configured) return configured;
  if (!configured) return process.env.NODE_ENV === "production" ? canonical : `${(process.env.NEXT_PUBLIC_APP_URL || AUTERIM_APP_URL).replace(/\/$/, "")}/api/connectors/hubspot/callback`;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && url.hostname === "app.auterim.com" && url.pathname === "/api/connectors/hubspot/callback" ? configured : canonical;
  } catch { return canonical; }
}

export function getHubSpotConfigStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const name of ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"] as const) if (!process.env[name]?.trim()) missing.push(name);
  if (!process.env.HUBSPOT_REDIRECT_URI?.trim() && process.env.NODE_ENV === "production") missing.push("HUBSPOT_REDIRECT_URI");
  return { configured: missing.length === 0, missing };
}

export function buildHubSpotAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: required("HUBSPOT_CLIENT_ID"),
    redirect_uri: getHubSpotRedirectUri(),
    scope: HUBSPOT_OAUTH_SCOPES.join(" "),
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try { return (text ? JSON.parse(text) : {}) as T; } catch { return {} as T; }
}

export async function exchangeHubSpotCode(code: string): Promise<HubSpotTokenResult> {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: required("HUBSPOT_CLIENT_ID"), client_secret: required("HUBSPOT_CLIENT_SECRET"), redirect_uri: getHubSpotRedirectUri() }),
    cache: "no-store",
  });
  const token = await parseJson<HubSpotTokenResult & { error?: string; error_description?: string }>(response);
  if (!response.ok || !token.access_token) throw new HubSpotConnectorError(token.error_description || token.error || "HubSpot OAuth exchange failed.", "oauth_exchange_failed", response.status);
  return token;
}

export async function refreshHubSpotAccessToken(refreshToken: string): Promise<HubSpotTokenResult> {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: required("HUBSPOT_CLIENT_ID"), client_secret: required("HUBSPOT_CLIENT_SECRET") }),
    cache: "no-store",
  });
  const token = await parseJson<HubSpotTokenResult & { error?: string; error_description?: string }>(response);
  if (!response.ok || !token.access_token) throw new HubSpotConnectorError(token.error_description || token.error || "HubSpot token refresh failed.", token.error || (response.status === 401 ? "invalid_grant" : "oauth_refresh_failed"), response.status);
  return token;
}

export async function fetchHubSpotIdentity(accessToken: string): Promise<HubSpotIdentity> {
  const response = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + encodeURIComponent(accessToken), { cache: "no-store" });
  const body = await parseJson<{ hub_id?: number; user_id?: number; user?: string }>(response);
  if (!response.ok) throw new HubSpotConnectorError("Could not verify the HubSpot account.", "identity_failed", response.status);
  return { hubId: body.hub_id == null ? null : String(body.hub_id), userId: body.user_id == null ? null : String(body.user_id), userEmail: typeof body.user === "string" ? body.user.toLowerCase() : null };
}

export function toStoredHubSpotCredential(input: { workspaceId: string; token: HubSpotTokenResult; identity: HubSpotIdentity }): StoredHubSpotCredential {
  const expiresAt = input.token.expires_in ? new Date(Date.now() + input.token.expires_in * 1000).toISOString() : null;
  return {
    workspace_id: input.workspaceId, connector_key: HUBSPOT_CONNECTOR_KEY,
    provider_account_id: input.identity.hubId ?? null, provider_email: input.identity.userEmail ?? null,
    encrypted_access_token: encryptToken(input.token.access_token), encrypted_refresh_token: input.token.refresh_token ? encryptToken(input.token.refresh_token) : null,
    token_expires_at: expiresAt, scopes: input.token.scope?.split(/[ ,]+/).filter(Boolean) ?? [...HUBSPOT_OAUTH_SCOPES], status: "connected",
    metadata: { provider: "hubspot", hubId: input.identity.hubId ?? null, userId: input.identity.userId ?? null, connectedAt: new Date().toISOString() },
  };
}

export async function getStoredHubSpotCredential(workspaceId: string, supabase = createSupabaseAdmin()): Promise<StoredHubSpotCredential | null> {
  const result = await supabase.from("os_connector_credentials").select("*").eq("workspace_id", workspaceId).eq("connector_key", HUBSPOT_CONNECTOR_KEY).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data as StoredHubSpotCredential | null) ?? null;
}

export function hubSpotAccessTokenIsFresh(row: { token_expires_at?: string | null }): boolean {
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  return !expiresAt || !Number.isFinite(expiresAt) || expiresAt > Date.now() + 60_000;
}

export async function resolveHubSpotAccessToken(input: { workspaceId: string; credential: StoredHubSpotCredential; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<string> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  if (hubSpotAccessTokenIsFresh(input.credential)) return decryptToken(input.credential.encrypted_access_token);
  if (!input.credential.encrypted_refresh_token) return decryptToken(input.credential.encrypted_access_token);
  try {
    const outcome = await resolveAccessTokenWithRefreshLock({
      workspaceId: input.workspaceId, connectorKey: HUBSPOT_CONNECTOR_KEY, supabase, credential: input.credential, isFresh: hubSpotAccessTokenIsFresh,
      refresh: async (latest) => {
        if (!latest.encrypted_refresh_token) throw new HubSpotReconnectionRequiredError();
        const token = await refreshHubSpotAccessToken(decryptToken(latest.encrypted_refresh_token));
        return { accessToken: token.access_token, refreshToken: token.refresh_token ?? null, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null, scopes: token.scope?.split(/[ ,]+/).filter(Boolean) ?? null, status: "connected" };
      },
    });
    await recordProviderSuccess({ workspaceId: input.workspaceId, connectorKey: HUBSPOT_CONNECTOR_KEY, operation: "oauth_refresh", supabase });
    return outcome.accessToken;
  } catch (error) {
    const failure = await recordProviderFailure({ workspaceId: input.workspaceId, connectorKey: HUBSPOT_CONNECTOR_KEY, operation: "oauth_refresh", status: error instanceof HubSpotConnectorError ? error.status : null, code: error instanceof HubSpotConnectorError ? error.code : (error as { code?: string } | null)?.code ?? "oauth_refresh_failed", supabase });
    if (failure.connectorHealthImpact === "reconnect_required" || error instanceof HubSpotReconnectionRequiredError) {
      await supabase.from("os_connector_credentials").update({ status: "needs_attention" }).eq("workspace_id", input.workspaceId).eq("connector_key", HUBSPOT_CONNECTOR_KEY);
      throw new HubSpotReconnectionRequiredError();
    }
    throw new HubSpotConnectorError("HubSpot could not be reached to refresh access.", failure.safeCode, 502);
  }
}

export async function hubSpotApiRequest<T = unknown>(input: { workspaceId: string; credential: StoredHubSpotCredential; method: string; path: string; body?: unknown; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<T> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const token = await resolveHubSpotAccessToken({ workspaceId: input.workspaceId, credential: input.credential, supabase });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try { response = await fetch(`${HUBSPOT_API_BASE}${input.path}`, { method: input.method, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(input.body ? { "Content-Type": "application/json" } : {}) }, body: input.body ? JSON.stringify(input.body) : undefined, cache: "no-store" }); }
    catch { if (attempt === 2) throw new HubSpotConnectorError("HubSpot could not be reached.", "provider_unavailable", 502); await new Promise((resolve) => setTimeout(resolve, providerRetryDelayMs(attempt))); continue; }
    const body = await parseJson<T>(response);
    if (response.ok) { await recordProviderSuccess({ workspaceId: input.workspaceId, connectorKey: HUBSPOT_CONNECTOR_KEY, operation: input.method === "GET" ? "read" : "write", supabase }); return body; }
    const providerBody = body as { error?: string; message?: string };
    if (response.status === 401) { await supabase.from("os_connector_credentials").update({ status: "needs_attention" }).eq("workspace_id", input.workspaceId).eq("connector_key", HUBSPOT_CONNECTOR_KEY); throw new HubSpotReconnectionRequiredError(); }
    if (!shouldRetryProviderFailure({ status: response.status, code: providerBody.error, attempt })) throw new HubSpotConnectorError(providerBody.message || "HubSpot API request failed.", providerBody.error || `http_${response.status}`, response.status);
    await new Promise((resolve) => setTimeout(resolve, providerRetryDelayMs(attempt, Number(response.headers.get("retry-after") || 0) * 1000 || null)));
  }
  throw new HubSpotConnectorError("HubSpot API request failed.", "provider_unavailable", 502);
}

export async function verifyHubSpotConnection(input: { workspaceId: string; credential: StoredHubSpotCredential; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<HubSpotIdentity> {
  const identity = await fetchHubSpotIdentity(await resolveHubSpotAccessToken(input));
  await hubSpotApiRequest({ ...input, method: "GET", path: "/crm/v3/objects/contacts?limit=1&properties=email" });
  return identity;
}

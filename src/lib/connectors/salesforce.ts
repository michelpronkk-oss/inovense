import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { credentialRotatedSince, resolveAccessTokenWithRefreshLock } from "@/lib/connectors/refresh-lock";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/runtime/provider-health";
import crypto from "node:crypto";

const SALESFORCE_LOGIN_URL = "https://login.salesforce.com";
const SALESFORCE_REDIRECT_URI = "https://app.auterim.com/api/connectors/salesforce/callback";
export const SALESFORCE_OAUTH_SCOPES = ["api", "refresh_token", "offline_access"];

export type SalesforceTokenResult = {
  access_token: string;
  refresh_token?: string;
  instance_url?: string;
  id?: string;
  issued_at?: string;
  signature?: string;
  token_type?: string;
  scope?: string;
};

export type StoredSalesforceCredential = {
  workspace_id: string;
  connector_key: "salesforce";
  provider_account_id?: string | null;
  provider_email?: string | null;
  encrypted_access_token: string;
  encrypted_refresh_token?: string | null;
  token_expires_at?: string | null;
  scopes?: string[] | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SalesforceIdentity = {
  userId?: string;
  organizationId?: string;
  username?: string;
  displayName?: string;
};

function required(name: "SALESFORCE_CLIENT_ID" | "SALESFORCE_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getSalesforceConfigStatus(): { configured: boolean; missing: string[] } {
  const missing = ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"].filter((name) => !process.env[name]?.trim());
  const configuredRedirect = process.env.SALESFORCE_REDIRECT_URI?.trim();
  if (configuredRedirect && configuredRedirect !== SALESFORCE_REDIRECT_URI) missing.push("SALESFORCE_REDIRECT_URI must equal the canonical callback URI");
  return { configured: missing.length === 0, missing };
}

/** The stable production callback. Configuration may not replace this URI. */
export function getSalesforceRedirectUri(): string {
  return SALESFORCE_REDIRECT_URI;
}

export function createSalesforcePkceVerifier(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function createSalesforcePkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function buildSalesforceAuthorizationUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: required("SALESFORCE_CLIENT_ID"),
    redirect_uri: getSalesforceRedirectUri(),
    scope: SALESFORCE_OAUTH_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${SALESFORCE_LOGIN_URL}/services/oauth2/authorize?${params.toString()}`;
}

async function readTokenResponse(response: Response): Promise<Partial<SalesforceTokenResult> & { error?: string; error_description?: string }> {
  const text = await response.text();
  try { return JSON.parse(text) as SalesforceTokenResult & { error?: string; error_description?: string }; }
  catch { return { error_description: text || "Salesforce token endpoint returned an invalid response" }; }
}

export async function exchangeSalesforceCode(code: string, codeVerifier: string): Promise<SalesforceTokenResult> {
  const response = await fetch(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code, client_id: required("SALESFORCE_CLIENT_ID"),
      client_secret: required("SALESFORCE_CLIENT_SECRET"), redirect_uri: getSalesforceRedirectUri(), code_verifier: codeVerifier,
    }), cache: "no-store",
  });
  const token = await readTokenResponse(response);
  if (!response.ok || !token.access_token || !token.instance_url) throw new Error(token.error_description || token.error || "Salesforce token exchange failed");
  return token as SalesforceTokenResult;
}

export async function refreshSalesforceAccessToken(refreshToken: string): Promise<SalesforceTokenResult> {
  const response = await fetch(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: required("SALESFORCE_CLIENT_ID"), client_secret: required("SALESFORCE_CLIENT_SECRET") }), cache: "no-store",
  });
  const token = await readTokenResponse(response);
  // The status and Salesforce error code are carried so a temporary login-host
  // outage is never mistaken for a revoked grant.
  if (!response.ok || !token.access_token) throw new SalesforceOAuthError(token.error_description || token.error || "Salesforce token refresh failed", token.error || `http_${response.status}`, response.status);
  return token as SalesforceTokenResult;
}

export class SalesforceOAuthError extends Error {
  constructor(message: string, public readonly code = "salesforce_oauth_failed", public readonly status = 502) {
    super(message);
    this.name = "SalesforceOAuthError";
  }
}

/** Only an OAuth-returned HTTPS Salesforce instance may become an API origin. */
export function normalizeSalesforceInstanceUrl(value: string): string {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const allowed = host.endsWith(".salesforce.com") || host.endsWith(".force.com") || host.endsWith(".salesforce.mil");
  if (url.protocol !== "https:" || !allowed || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Invalid Salesforce instance URL");
  }
  return url.origin;
}

export async function fetchSalesforceIdentity(identityUrl: string | undefined, accessToken: string): Promise<SalesforceIdentity> {
  if (!identityUrl) return {};
  const safeUrl = new URL(identityUrl);
  normalizeSalesforceInstanceUrl(safeUrl.origin);
  const response = await fetch(safeUrl, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return {};
  const data = await response.json() as { user_id?: string; organization_id?: string; username?: string; display_name?: string };
  return { userId: data.user_id, organizationId: data.organization_id, username: data.username, displayName: data.display_name };
}

export function toStoredSalesforceCredential(input: { workspaceId: string; token: SalesforceTokenResult; identity?: SalesforceIdentity }): StoredSalesforceCredential {
  const instanceUrl = normalizeSalesforceInstanceUrl(input.token.instance_url ?? "");
  return {
    workspace_id: input.workspaceId, connector_key: "salesforce", provider_account_id: input.identity?.userId ?? null,
    provider_email: input.identity?.username?.toLowerCase() ?? null, encrypted_access_token: encryptToken(input.token.access_token),
    encrypted_refresh_token: input.token.refresh_token ? encryptToken(input.token.refresh_token) : null, token_expires_at: null,
    scopes: input.token.scope?.split(" ").filter(Boolean) ?? SALESFORCE_OAUTH_SCOPES, status: "connected",
    metadata: { provider: "salesforce", instanceUrl, organizationId: input.identity?.organizationId ?? null, userId: input.identity?.userId ?? null, username: input.identity?.username ?? null, displayName: input.identity?.displayName ?? null, tokenType: input.token.token_type ?? "Bearer", connectedAt: new Date().toISOString() },
  };
}

export class SalesforceReconnectionRequiredError extends Error {}

/**
 * Loads the stored Salesforce credential row for a workspace, scoped by
 * workspace_id. Returns null when Salesforce is not connected. Never trust a
 * caller-supplied workspaceId that hasn't already gone through
 * resolveWorkspaceContext - this function only filters, it does not
 * authorize.
 */
export async function getStoredSalesforceCredential(workspaceId: string, supabase: ReturnType<typeof createSupabaseAdmin> = createSupabaseAdmin()): Promise<StoredSalesforceCredential | null> {
  const res = await supabase
    .from("os_connector_credentials")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "salesforce")
    .maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return (res.data as StoredSalesforceCredential | null) ?? null;
}

/**
 * Unconditionally refreshes the Salesforce access token using the stored
 * refresh token, persists the new access token, and returns it. Used by API
 * clients that received a 401/expired-session response and need to retry
 * exactly once - unlike resolveSalesforceAccessToken (which only refreshes
 * when there is no access token at all), this always attempts a refresh.
 * Marks the credential "needs_attention" on genuine refresh failure, mirroring
 * the same pattern resolveSalesforceAccessToken already uses below.
 */
export async function forceRefreshSalesforceAccessToken(input: { workspaceId: string; credential: StoredSalesforceCredential; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<string> {
  if (!input.credential.encrypted_refresh_token) throw new SalesforceReconnectionRequiredError("Salesforce requires reconnection.");
  const supabase = input.supabase ?? createSupabaseAdmin();
  try {
    // Salesforce publishes no access-token expiry here, so "usable" means the
    // stored credential has actually changed since the token this caller used.
    // That also makes a concurrent refresh by another worker reusable rather
    // than duplicated.
    const outcome = await resolveAccessTokenWithRefreshLock({
      workspaceId: input.workspaceId, connectorKey: "salesforce", supabase, credential: input.credential,
      isFresh: credentialRotatedSince(input.credential.encrypted_access_token),
      refresh: async (latest) => {
        if (!latest.encrypted_refresh_token) throw new SalesforceReconnectionRequiredError("Salesforce requires reconnection.");
        const refreshed = await refreshSalesforceAccessToken(decryptToken(latest.encrypted_refresh_token));
        return { accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token ?? null, expiresAt: null, status: "connected" };
      },
    });
    await recordProviderSuccess({ workspaceId: input.workspaceId, connectorKey: "salesforce", operation: "oauth_refresh", supabase });
    return outcome.accessToken;
  } catch (error) {
    const status = error instanceof SalesforceOAuthError ? error.status : null;
    const code = error instanceof SalesforceOAuthError ? error.code : (error as { code?: string } | null)?.code ?? "oauth_refresh_failed";
    const failure = await recordProviderFailure({ workspaceId: input.workspaceId, connectorKey: "salesforce", operation: "oauth_refresh", status, code, supabase });
    // Only a genuinely dead grant downgrades the connector. A temporary
    // Salesforce failure or a lost refresh race leaves the credential intact.
    if (failure.connectorHealthImpact === "reconnect_required" || error instanceof SalesforceReconnectionRequiredError) {
      await supabase.from("os_connector_credentials").update({ status: "needs_attention" }).eq("workspace_id", input.workspaceId).eq("connector_key", "salesforce");
      throw new SalesforceReconnectionRequiredError("Salesforce refresh failed. Reconnect required.");
    }
    throw new SalesforceOAuthError("Salesforce could not be reached to refresh access.", failure.safeCode, status && status >= 400 && status < 500 ? status : 502);
  }
}

export async function resolveSalesforceAccessToken(input: { workspaceId: string; credential: StoredSalesforceCredential; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<string> {
  // Salesforce does not return a standard access-token expiry in this flow.
  // API clients retry once on auth failure via forceRefreshSalesforceAccessToken.
  if (input.credential.encrypted_access_token) return decryptToken(input.credential.encrypted_access_token);
  if (!input.credential.encrypted_refresh_token) throw new SalesforceReconnectionRequiredError("Salesforce requires reconnection.");
  return forceRefreshSalesforceAccessToken(input);
}

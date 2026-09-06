import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
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
  if (!response.ok || !token.access_token) throw new Error(token.error_description || token.error || "Salesforce token refresh failed");
  return token as SalesforceTokenResult;
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

export async function resolveSalesforceAccessToken(input: { workspaceId: string; credential: StoredSalesforceCredential; supabase?: ReturnType<typeof createSupabaseAdmin> }): Promise<string> {
  // Salesforce does not return a standard access-token expiry in this flow.
  // API clients will retry once on auth failure in the implementation pass.
  if (input.credential.encrypted_access_token) return decryptToken(input.credential.encrypted_access_token);
  if (!input.credential.encrypted_refresh_token) throw new SalesforceReconnectionRequiredError("Salesforce requires reconnection.");
  try {
    const refreshed = await refreshSalesforceAccessToken(decryptToken(input.credential.encrypted_refresh_token));
    const supabase = input.supabase ?? createSupabaseAdmin();
    await supabase.from("os_connector_credentials").update({ encrypted_access_token: encryptToken(refreshed.access_token), encrypted_refresh_token: refreshed.refresh_token ? encryptToken(refreshed.refresh_token) : input.credential.encrypted_refresh_token, status: "connected" }).eq("workspace_id", input.workspaceId).eq("connector_key", "salesforce");
    return refreshed.access_token;
  } catch (error) {
    const supabase = input.supabase ?? createSupabaseAdmin();
    await supabase.from("os_connector_credentials").update({ status: "needs_attention" }).eq("workspace_id", input.workspaceId).eq("connector_key", "salesforce");
    throw new SalesforceReconnectionRequiredError(error instanceof Error ? "Salesforce refresh failed. Reconnect required." : "Salesforce requires reconnection.");
  }
}

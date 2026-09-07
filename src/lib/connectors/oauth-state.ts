import crypto from "node:crypto";

type OAuthStatePayload = {
  workspaceId: string;
  userEmail: string;
  nonce: string;
  exp: number;
  surface?: "gmail" | "google_drive";
};

function stateSecret(): string {
  return process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
}

/**
 * Which Microsoft consent surface this authorization run is for. Carried
 * inside the signed state (never a query parameter the browser can edit) so
 * the callback knows, tamper-proof, whether the user was asked for Teams
 * scopes - and therefore whether it may mark Teams as enabled.
 */
export type MicrosoftScopeProfileClaim = "base" | "teams";

type MicrosoftOAuthStatePayload = OAuthStatePayload & { provider: "microsoft"; scopeProfile?: MicrosoftScopeProfileClaim };
export type DirectOAuthProvider = "microsoft" | "salesforce" | "asana" | "jira" | "zendesk" | "intercom";
export type ProviderOAuthStatePayload = OAuthStatePayload & { provider: DirectOAuthProvider };
export type ZendeskOAuthStatePayload = OAuthStatePayload & { provider: "zendesk"; subdomain: string };
export type IntercomOAuthStatePayload = OAuthStatePayload & { provider: "intercom"; region: "us" | "eu" | "au" };

function microsoftStateSecret(): string {
  return process.env.MICROSOFT_OAUTH_STATE_SECRET || process.env.MICROSOFT_CLIENT_SECRET || "";
}

function providerStateSecret(provider: DirectOAuthProvider): string {
  if (provider === "microsoft") return microsoftStateSecret();
  if (provider === "asana") return process.env.ASANA_OAUTH_STATE_SECRET || process.env.ASANA_CLIENT_SECRET || "";
  if (provider === "jira") return process.env.JIRA_OAUTH_STATE_SECRET || process.env.JIRA_CLIENT_SECRET || "";
  if (provider === "zendesk") return process.env.ZENDESK_OAUTH_STATE_SECRET || process.env.ZENDESK_CLIENT_SECRET || "";
  if (provider === "intercom") return process.env.INTERCOM_OAUTH_STATE_SECRET || process.env.INTERCOM_CLIENT_SECRET || "";
  return process.env.SALESFORCE_OAUTH_STATE_SECRET || process.env.SALESFORCE_CLIENT_SECRET || "";
}

function toBase64Url(value: Buffer | string): string {
  const raw = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return raw.toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createOAuthState(workspaceId: string, userEmail: string, surface: "gmail" | "google_drive" = "gmail"): string {
  const secret = stateSecret();
  if (!secret) throw new Error("Missing Google OAuth state secret");
  const payload: OAuthStatePayload = {
    workspaceId,
    userEmail: userEmail.toLowerCase(),
    nonce: crypto.randomUUID(),
    exp: Date.now() + 10 * 60 * 1000,
    surface,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function parseOAuthState(value: string | null): OAuthStatePayload {
  if (!value) throw new Error("Missing OAuth state");
  const [encoded, sig] = value.split(".");
  if (!encoded || !sig) throw new Error("Invalid OAuth state format");
  const secret = stateSecret();
  if (!secret) throw new Error("Missing Google OAuth state secret");
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  if (expected !== sig) throw new Error("Invalid OAuth state signature");
  const payload = JSON.parse(fromBase64Url(encoded)) as OAuthStatePayload;
  if (!payload.workspaceId || !payload.userEmail || !payload.exp) throw new Error("Invalid OAuth state payload");
  if (Date.now() > payload.exp) throw new Error("OAuth state expired");
  return payload;
}

/**
 * Microsoft-specific CSRF state. Kept as separate functions (rather than
 * widening createOAuthState/parseOAuthState) so the existing Gmail OAuth
 * call sites and their signatures are never touched. Uses its own secret and
 * embeds an explicit "microsoft" provider tag so a state value minted for one
 * provider can never be replayed against the other, even if both secrets
 * were ever misconfigured to the same value.
 */
export function createMicrosoftOAuthState(workspaceId: string, userEmail: string, scopeProfile: MicrosoftScopeProfileClaim = "base"): string {
  const secret = microsoftStateSecret();
  if (!secret) throw new Error("Missing Microsoft OAuth state secret");
  const payload: MicrosoftOAuthStatePayload = {
    provider: "microsoft",
    workspaceId,
    userEmail: userEmail.toLowerCase(),
    scopeProfile,
    nonce: crypto.randomUUID(),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function parseMicrosoftOAuthState(value: string | null): MicrosoftOAuthStatePayload {
  const payload = parseProviderOAuthState("microsoft", value) as MicrosoftOAuthStatePayload;
  // Explicitly retained at the provider wrapper as an extra regression guard.
  if (payload.provider !== "microsoft") throw new Error("OAuth state provider mismatch");
  // Unknown/absent values fall back to the narrower base profile so a tampered
  // or legacy state can never be read as "the user consented to Teams".
  if (payload.scopeProfile !== "teams") payload.scopeProfile = "base";
  return payload;
}

/**
 * Provider-bound signed state for direct OAuth connectors. The user email is
 * the authenticated context captured at authorization start; callbacks only
 * trust this signed payload, never workspace query parameters.
 */
export function createProviderOAuthState(provider: DirectOAuthProvider, workspaceId: string, userEmail: string): string {
  const secret = providerStateSecret(provider);
  if (!secret) throw new Error(`Missing ${provider} OAuth state secret`);
  const payload: ProviderOAuthStatePayload = {
    provider,
    workspaceId,
    userEmail: userEmail.toLowerCase(),
    nonce: crypto.randomUUID(),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function parseProviderOAuthState(provider: DirectOAuthProvider, value: string | null): ProviderOAuthStatePayload {
  if (!value) throw new Error("Missing OAuth state");
  const [encoded, sig] = value.split(".");
  if (!encoded || !sig) throw new Error("Invalid OAuth state format");
  const secret = providerStateSecret(provider);
  if (!secret) throw new Error(`Missing ${provider} OAuth state secret`);
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  const actual = Buffer.from(sig, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) throw new Error("Invalid OAuth state signature");
  const payload = JSON.parse(fromBase64Url(encoded)) as ProviderOAuthStatePayload;
  if (payload.provider !== provider) throw new Error("OAuth state provider mismatch");
  if (!payload.workspaceId || !payload.userEmail || !payload.exp) throw new Error("Invalid OAuth state payload");
  if (Date.now() > payload.exp) throw new Error("OAuth state expired");
  return payload;
}

export function createZendeskOAuthState(workspaceId: string, userEmail: string, subdomain: string): string {
  const secret = providerStateSecret("zendesk");
  if (!secret) throw new Error("Missing zendesk OAuth state secret");
  const payload: ZendeskOAuthStatePayload = {
    provider: "zendesk", workspaceId, userEmail: userEmail.toLowerCase(), subdomain,
    nonce: crypto.randomUUID(), exp: Date.now() + 10 * 60 * 1000,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function parseZendeskOAuthState(value: string | null): ZendeskOAuthStatePayload {
  const payload = parseProviderOAuthState("zendesk", value) as ZendeskOAuthStatePayload;
  if (!payload.subdomain || typeof payload.subdomain !== "string") throw new Error("Zendesk OAuth state is missing its workspace binding");
  return payload;
}

export function createIntercomOAuthState(workspaceId: string, userEmail: string, region: "us" | "eu" | "au"): string {
  const secret = providerStateSecret("intercom");
  if (!secret) throw new Error("Missing intercom OAuth state secret");
  const payload: IntercomOAuthStatePayload = { provider: "intercom", workspaceId, userEmail: userEmail.toLowerCase(), region, nonce: crypto.randomUUID(), exp: Date.now() + 10 * 60 * 1000 };
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${encoded}.${crypto.createHmac("sha256", secret).update(encoded).digest("base64url")}`;
}

export function parseIntercomOAuthState(value: string | null): IntercomOAuthStatePayload {
  const payload = parseProviderOAuthState("intercom", value) as IntercomOAuthStatePayload;
  if (!(payload.region === "us" || payload.region === "eu" || payload.region === "au")) throw new Error("Intercom OAuth state has an invalid region");
  return payload;
}

export function createSalesforceOAuthState(workspaceId: string, userEmail: string): string {
  return createProviderOAuthState("salesforce", workspaceId, userEmail);
}

export function parseSalesforceOAuthState(value: string | null): ProviderOAuthStatePayload {
  return parseProviderOAuthState("salesforce", value);
}

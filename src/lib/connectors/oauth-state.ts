import crypto from "node:crypto";

type OAuthStatePayload = {
  workspaceId: string;
  userEmail: string;
  nonce: string;
  exp: number;
};

function stateSecret(): string {
  return process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
}

type MicrosoftOAuthStatePayload = OAuthStatePayload & { provider: "microsoft" };

function microsoftStateSecret(): string {
  return process.env.MICROSOFT_OAUTH_STATE_SECRET || process.env.MICROSOFT_CLIENT_SECRET || "";
}

function toBase64Url(value: Buffer | string): string {
  const raw = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return raw.toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createOAuthState(workspaceId: string, userEmail: string): string {
  const secret = stateSecret();
  if (!secret) throw new Error("Missing Google OAuth state secret");
  const payload: OAuthStatePayload = {
    workspaceId,
    userEmail: userEmail.toLowerCase(),
    nonce: crypto.randomUUID(),
    exp: Date.now() + 10 * 60 * 1000,
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
export function createMicrosoftOAuthState(workspaceId: string, userEmail: string): string {
  const secret = microsoftStateSecret();
  if (!secret) throw new Error("Missing Microsoft OAuth state secret");
  const payload: MicrosoftOAuthStatePayload = {
    provider: "microsoft",
    workspaceId,
    userEmail: userEmail.toLowerCase(),
    nonce: crypto.randomUUID(),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function parseMicrosoftOAuthState(value: string | null): MicrosoftOAuthStatePayload {
  if (!value) throw new Error("Missing OAuth state");
  const [encoded, sig] = value.split(".");
  if (!encoded || !sig) throw new Error("Invalid OAuth state format");
  const secret = microsoftStateSecret();
  if (!secret) throw new Error("Missing Microsoft OAuth state secret");
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  if (expected !== sig) throw new Error("Invalid OAuth state signature");
  const payload = JSON.parse(fromBase64Url(encoded)) as MicrosoftOAuthStatePayload;
  if (payload.provider !== "microsoft") throw new Error("OAuth state provider mismatch");
  if (!payload.workspaceId || !payload.userEmail || !payload.exp) throw new Error("Invalid OAuth state payload");
  if (Date.now() > payload.exp) throw new Error("OAuth state expired");
  return payload;
}

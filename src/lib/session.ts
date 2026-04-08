/**
 * Session utilities for the Inovense CRM admin auth layer.
 *
 * Uses HMAC-SHA256 (Web Crypto API) for stateless signed session tokens.
 * Fully compatible with the Next.js Edge Runtime used in middleware.
 *
 * Token format: {username}:{issuedAtMs}:{hmac_base64url}
 *
 * Required env var: SESSION_SECRET (min 32 chars, random string)
 * Credential env var: ADMIN_USERS=alice:pass1,bob:pass2
 *   or legacy: ADMIN_USER=alice, ADMIN_PASSWORD=pass1
 */

export const SESSION_COOKIE = "inovense_admin_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SEC * 1000;

/* ─── Credentials ───────────────────────────────────────────────────────── */

export function getValidCredentials(): Array<{ user: string; pass: string }> {
  const multi = process.env.ADMIN_USERS;
  if (multi) {
    return multi
      .split(",")
      .map((pair) => {
        const colon = pair.indexOf(":");
        if (colon === -1) return null;
        return {
          user: pair.substring(0, colon).trim(),
          pass: pair.substring(colon + 1).trim(),
        };
      })
      .filter(
        (c): c is { user: string; pass: string } =>
          c !== null && c.user.length > 0 && c.pass.length > 0
      );
  }

  // Legacy single-user fallback
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (user && pass) return [{ user, pass }];
  return [];
}

/* ─── HMAC helpers ──────────────────────────────────────────────────────── */

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/* ─── Token creation ────────────────────────────────────────────────────── */

export async function createSessionToken(username: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("[session] SESSION_SECRET is not set");

  const payload = `${username}:${Date.now()}`;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  // Use base64url (no +, /, = padding) for cookie safety
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${payload}:${sigB64}`;
}

/* ─── Token verification ────────────────────────────────────────────────── */

export async function verifySessionToken(token: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  try {
    // Token: {username}:{issuedAt}:{sig}
    // Split from right so usernames containing colons still work
    const lastColon = token.lastIndexOf(":");
    if (lastColon === -1) return false;

    const sigB64 = token
      .substring(lastColon + 1)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const payload = token.substring(0, lastColon);

    // issuedAt is the second-to-last colon-delimited segment
    const secondLastColon = payload.lastIndexOf(":");
    if (secondLastColon === -1) return false;
    const issuedAt = parseInt(payload.substring(secondLastColon + 1), 10);

    if (isNaN(issuedAt) || Date.now() - issuedAt > SESSION_MAX_AGE_MS) {
      return false;
    }

    const key = await getKey(secret);
    const sigBuf = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuf,
      new TextEncoder().encode(payload)
    );
  } catch {
    return false;
  }
}

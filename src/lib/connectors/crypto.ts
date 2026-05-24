import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function readKey(): Buffer {
  const raw = process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("Missing CONNECTOR_TOKEN_ENCRYPTION_KEY");
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;

  if (raw.length === 32) return Buffer.from(raw, "utf8");

  throw new Error("CONNECTOR_TOKEN_ENCRYPTION_KEY must be 32-byte utf8, 64-char hex, or base64-encoded 32-byte key");
}

export function encryptToken(plain: string): string {
  const key = readKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptToken(encoded: string): string {
  const key = readKey();
  const [ivB64, tagB64, dataB64] = encoded.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted token payload");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString("utf8");
}

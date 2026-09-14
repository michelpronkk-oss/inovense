import { createHash, randomBytes } from "node:crypto";

const EARLY_ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createEarlyAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isEarlyAccessToken(value: string | null | undefined): value is string {
  return Boolean(value && EARLY_ACCESS_TOKEN_PATTERN.test(value));
}

export function hashEarlyAccessToken(token: string): string {
  if (!isEarlyAccessToken(token)) throw new Error("Invalid Early Access invite token.");
  return createHash("sha256").update(token, "utf8").digest("hex");
}

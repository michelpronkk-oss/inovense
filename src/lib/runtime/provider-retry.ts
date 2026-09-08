export type ProviderFailureClass = "transient" | "permission" | "reauth" | "configuration" | "permanent";

export function classifyProviderFailure(input: { status?: number | null; code?: string | null }): ProviderFailureClass {
  const code = String(input.code ?? "").toLowerCase();
  if (["invalid_grant", "token_expired", "reconnect_required", "oauth_invalid_token"].some((item) => code.includes(item)) || input.status === 401) return "reauth";
  if ([403].includes(input.status ?? 0) || ["forbidden", "permission", "scope"].some((item) => code.includes(item))) return "permission";
  if ([408, 425, 429, 500, 502, 503, 504].includes(input.status ?? 0) || ["timeout", "network", "unavailable", "rate_limit", "temporar"].some((item) => code.includes(item))) return "transient";
  if ([400, 404, 409, 422].includes(input.status ?? 0) || ["configuration", "destination", "invalid_target"].some((item) => code.includes(item))) return "configuration";
  return "permanent";
}

export function shouldRetryProviderFailure(input: { status?: number | null; code?: string | null; attempt: number; maxAttempts?: number }): boolean {
  return input.attempt < (input.maxAttempts ?? 3) - 1 && classifyProviderFailure(input) === "transient";
}

export function providerRetryDelayMs(attempt: number, retryAfterMs?: number | null, capMs = 8_000): number {
  if (typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) return Math.min(capMs, retryAfterMs);
  const base = Math.min(capMs, 250 * (2 ** Math.max(0, attempt)));
  return Math.min(capMs, base + Math.floor(Math.random() * Math.max(1, Math.floor(base / 2))));
}

export type ProviderFailureClass = "transient" | "permission" | "reauth" | "configuration" | "permanent";

export function classifyProviderFailure(input: { status?: number | null; code?: string | null }): ProviderFailureClass {
  const code = String(input.code ?? "").toLowerCase();
  if (["invalid_grant", "token_expired", "reconnect_required", "oauth_invalid_token"].some((item) => code.includes(item)) || input.status === 401) return "reauth";
  if ([403].includes(input.status ?? 0) || ["forbidden", "permission", "scope"].some((item) => code.includes(item))) return "permission";
  // "stale_credential" covers the distributed refresh guard in
  // connectors/refresh-lock.ts refusing a stale write. That is a lost race, not
  // a broken credential, so it must never be surfaced as a reconnect.
  if ([408, 425, 429, 500, 502, 503, 504].includes(input.status ?? 0) || ["timeout", "network", "unavailable", "rate_limit", "temporar", "stale_credential"].some((item) => code.includes(item))) return "transient";
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

/**
 * Read a provider Retry-After header. Supports both the delay-seconds and the
 * HTTP-date forms, and refuses anything unparseable or absurd rather than
 * inventing a delay. Returns milliseconds.
 */
export function parseRetryAfterMs(value: string | null | undefined, nowMs = Date.now(), capMs = 300_000): number | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isFinite(seconds) ? Math.min(capMs, Math.max(0, seconds * 1000)) : null;
  }
  const date = Date.parse(raw);
  if (!Number.isFinite(date)) return null;
  return Math.min(capMs, Math.max(0, date - nowMs));
}

/** How a provider failure should move the one connector health model in connectors/truth.ts. */
export type ConnectorHealthImpact = "none" | "degraded" | "reconnect_required" | "permission_required" | "configuration_required";

export type ProviderFailureDescription = {
  kind: ProviderFailureClass;
  retryable: boolean;
  /** Milliseconds the provider asked us to wait, when it said so. */
  retryAfterMs: number | null;
  connectorHealthImpact: ConnectorHealthImpact;
  /** Short, normalized, log-safe code. Never a URL, body, or identifier. */
  safeCode: string;
  rateLimited: boolean;
};

const HEALTH_IMPACT: Record<ProviderFailureClass, ConnectorHealthImpact> = {
  reauth: "reconnect_required",
  permission: "permission_required",
  configuration: "configuration_required",
  transient: "degraded",
  permanent: "none",
};

/**
 * Reduce a provider error code to something safe to store and log.
 *
 * Anything that does not already look like a short symbolic code is discarded
 * rather than sanitized, because provider "codes" are sometimes a URL or a
 * message containing a ticket, message, or account id. A long digit run is
 * treated the same way. The fallback is the HTTP status, which carries no
 * customer identifier.
 */
function safeFailureCode(input: { status?: number | null; code?: string | null }, kind: ProviderFailureClass): string {
  const raw = String(input.code ?? "").trim().toLowerCase();
  const symbolic = raw.length > 0 && raw.length <= 64 && /^[a-z][a-z0-9_.-]*$/.test(raw) && !/\d{4,}/.test(raw);
  if (symbolic) return raw.replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64);
  if (typeof input.status === "number" && input.status > 0) return `http_${input.status}`;
  return kind === "transient" ? "provider_unavailable" : `provider_${kind}`;
}

/**
 * The single shared provider-failure classifier. It reuses
 * classifyProviderFailure() rather than introducing a second taxonomy, and
 * adds the operational facts every caller needs: whether to retry, how long to
 * wait, what it means for connector health, and a code that is safe to store
 * and log. Provider-specific overrides stay in the connectors themselves.
 */
export function describeProviderFailure(input: {
  status?: number | null;
  code?: string | null;
  retryAfter?: string | number | null;
  /** Set when a request may already have been accepted by the provider. */
  timedOutAfterSend?: boolean;
}): ProviderFailureDescription {
  const kind = classifyProviderFailure({ status: input.status, code: input.code });
  const retryAfterMs = typeof input.retryAfter === "number"
    ? Math.max(0, input.retryAfter)
    : parseRetryAfterMs(typeof input.retryAfter === "string" ? input.retryAfter : null);
  return {
    kind,
    // A request that may already have been accepted is never automatically
    // retryable, however transient the transport error looked.
    retryable: kind === "transient" && input.timedOutAfterSend !== true,
    retryAfterMs,
    connectorHealthImpact: HEALTH_IMPACT[kind],
    safeCode: safeFailureCode(input, kind),
    rateLimited: input.status === 429 || String(input.code ?? "").toLowerCase().includes("rate_limit"),
  };
}

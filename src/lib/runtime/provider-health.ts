// One shared operational provider-failure record.
//
// Every connector records success and failure through this module, so there
// is exactly one place that knows "is this provider currently failing us, and
// how badly". It deliberately does NOT decide connector health - that stays in
// src/lib/connectors/truth.ts, which remains the single connector health
// model. This is the operational counter layer underneath it.
//
// What is stored is intentionally minimal and non-sensitive: a workspace, a
// connector key, a normalized operation category, timestamps, counters, and a
// short safe error code. Never endpoint URLs, request bodies, provider
// payloads, customer content, or credentials.
//
// Recording is always best-effort. Telemetry must never be able to fail a
// customer-facing action or turn a working call into an error.

import { describeProviderFailure, type ProviderFailureDescription } from "@/lib/runtime/provider-retry";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/**
 * Normalized operation categories. Full endpoint paths are never stored,
 * because provider paths routinely embed ticket, message, and account ids.
 */
export const PROVIDER_OPERATIONS = ["oauth_refresh", "read", "write", "sync", "webhook", "poll", "outcome_observation"] as const;
export type ProviderOperation = (typeof PROVIDER_OPERATIONS)[number];

export function isProviderOperation(value: string): value is ProviderOperation {
  return (PROVIDER_OPERATIONS as readonly string[]).includes(value);
}

export type ProviderOperationRow = {
  workspace_id: string;
  connector_key: string;
  operation: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error_code: string | null;
  last_failure_kind: string | null;
  consecutive_failures: number;
  recent_failure_count: number;
  last_429_at: string | null;
  retry_count: number;
  next_retry_at: string | null;
  updated_at: string;
};

/**
 * How many consecutive failures of one operation before a connector is worth
 * calling degraded. One transient 500 never marks a connector dead.
 */
export const DEGRADED_CONSECUTIVE_FAILURES = 3;

function client(supabase?: SupabaseAdmin): SupabaseAdmin | null {
  try {
    return supabase ?? createSupabaseAdmin();
  } catch {
    return null;
  }
}

/** A successful provider call. This is the only thing that clears failure state. */
export async function recordProviderSuccess(input: {
  workspaceId: string;
  connectorKey: string;
  operation: ProviderOperation;
  supabase?: SupabaseAdmin;
}): Promise<void> {
  const supabase = client(input.supabase);
  if (!supabase || !input.workspaceId || !input.connectorKey) return;
  try {
    await supabase.rpc("record_os_provider_success", {
      p_workspace_id: input.workspaceId,
      p_connector_key: input.connectorKey,
      p_operation: input.operation,
    });
  } catch {
    /* operational telemetry never breaks a provider call */
  }
}

/**
 * A failed provider call. The failure is classified through the one shared
 * classifier, so the recorded kind always matches the retry and connector
 * health decisions the caller made.
 */
export async function recordProviderFailure(input: {
  workspaceId: string;
  connectorKey: string;
  operation: ProviderOperation;
  status?: number | null;
  code?: string | null;
  retryAfter?: string | number | null;
  timedOutAfterSend?: boolean;
  supabase?: SupabaseAdmin;
}): Promise<ProviderFailureDescription> {
  const description = describeProviderFailure(input);
  const supabase = client(input.supabase);
  if (!supabase || !input.workspaceId || !input.connectorKey) return description;
  const nextRetryAt = description.retryable && description.retryAfterMs !== null
    ? new Date(Date.now() + description.retryAfterMs).toISOString()
    : null;
  try {
    await supabase.rpc("record_os_provider_failure", {
      p_workspace_id: input.workspaceId,
      p_connector_key: input.connectorKey,
      p_operation: input.operation,
      p_error_code: description.safeCode,
      p_failure_kind: description.kind,
      p_rate_limited: description.rateLimited,
      p_next_retry_at: nextRetryAt,
      p_window_minutes: 60,
    });
  } catch {
    /* operational telemetry never breaks a provider call */
  }
  return description;
}

export type ProviderFailureSnapshot = {
  available: boolean;
  rows: ProviderOperationRow[];
  degradedConnectors: string[];
  reconnectRequiredConnectors: string[];
  permissionRequiredConnectors: string[];
  recentFailureCount: number;
  rateLimitedConnectors: string[];
};

function rows(value: unknown): ProviderOperationRow[] {
  return Array.isArray(value)
    ? value.filter((row): row is ProviderOperationRow => Boolean(row) && typeof row === "object" && typeof (row as ProviderOperationRow).connector_key === "string")
    : [];
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Bounded read of current provider operation state. Used by admin
 * observability and support diagnostics. Returns `available: false` rather
 * than throwing when the table has not reached a deployment yet.
 */
export async function getProviderFailureSnapshot(input: {
  workspaceId?: string;
  supabase?: SupabaseAdmin;
  limit?: number;
}): Promise<ProviderFailureSnapshot> {
  const empty: ProviderFailureSnapshot = {
    available: false, rows: [], degradedConnectors: [], reconnectRequiredConnectors: [],
    permissionRequiredConnectors: [], recentFailureCount: 0, rateLimitedConnectors: [],
  };
  const supabase = client(input.supabase);
  if (!supabase) return empty;
  try {
    let query = supabase.from("os_provider_operations").select("*").order("updated_at", { ascending: false }).limit(Math.max(1, Math.min(input.limit ?? 200, 500)));
    if (input.workspaceId) query = query.eq("workspace_id", input.workspaceId);
    const result = await query;
    if (result.error) return empty;
    const data = rows(result.data);
    const failing = data.filter((row) => row.consecutive_failures > 0);
    const byKind = (kind: string) => Array.from(new Set(failing.filter((row) => row.last_failure_kind === kind).map((row) => row.connector_key))).sort();
    const now = Date.now();
    return {
      available: true,
      rows: data,
      degradedConnectors: Array.from(new Set(failing.filter((row) => row.last_failure_kind === "transient" && row.consecutive_failures >= DEGRADED_CONSECUTIVE_FAILURES).map((row) => row.connector_key))).sort(),
      reconnectRequiredConnectors: byKind("reauth"),
      permissionRequiredConnectors: byKind("permission"),
      recentFailureCount: failing.reduce((total, row) => total + (Number.isFinite(row.recent_failure_count) ? row.recent_failure_count : 0), 0),
      rateLimitedConnectors: Array.from(new Set(data
        .filter((row) => row.last_429_at && now - new Date(row.last_429_at).getTime() <= RATE_LIMIT_WINDOW_MS)
        .map((row) => row.connector_key))).sort(),
    };
  } catch {
    return empty;
  }
}

/** Bounded cleanup of healthy, untouched operational rows. Audit data is never touched. */
export async function pruneProviderOperations(input: { retainDays?: number; supabase?: SupabaseAdmin } = {}): Promise<number> {
  const supabase = client(input.supabase);
  if (!supabase) return 0;
  try {
    const result = await supabase.rpc("prune_os_provider_operations", { p_retain_days: input.retainDays ?? 30 });
    return result.error || typeof result.data !== "number" ? 0 : result.data;
  } catch {
    return 0;
  }
}

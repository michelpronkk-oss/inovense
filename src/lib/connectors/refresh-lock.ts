// Distributed OAuth refresh coordination.
//
// WHY THIS EXISTS
// Auterim runs on serverless workers. An in-process guard (a Map of in-flight
// promises) only coalesces refreshes inside one worker, so two workers can
// still call a provider's token endpoint with the same refresh token at the
// same time. For providers that ROTATE refresh tokens (Microsoft Entra,
// Atlassian) that race can strand a workspace: the loser persists a refresh
// token the provider has already invalidated, and the connector then needs a
// manual reconnect.
//
// This module makes that race safe using the database Auterim already has.
// There is no Redis, no second queue, and no second credential store - only
// two columns and two RPCs on os_connector_credentials.
//
// TWO INDEPENDENT GUARANTEES
//   1. A time-bounded lease (refresh_lock_token / refresh_lock_until) means
//      normally only one worker calls the provider. The lease is capped
//      server-side and always reclaimable once expired, so a worker that dies
//      mid-refresh cannot hold a credential forever.
//   2. An optimistic credential_version compare-and-swap means a lost race is
//      SAFE, not just wasteful. A worker holding state loaded before the lease
//      was acquired can never overwrite a newer rotated refresh token - its
//      write simply matches zero rows and it re-reads instead.
//
// The lease metadata is an opaque random token and an expiry. No token, no
// secret, and no customer content is ever written to it or logged from here.

import crypto from "node:crypto";

import { decryptToken, encryptToken } from "@/lib/connectors/crypto";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type LockedCredentialRow = {
  credential_version?: number | null;
  encrypted_access_token: string;
  encrypted_refresh_token?: string | null;
  token_expires_at?: string | null;
  scopes?: string[] | null;
  status?: string | null;
};

/** Plaintext result of a provider refresh. Encryption happens inside this module. */
export type RefreshedCredentialState = {
  accessToken: string;
  /** Only set when the provider rotated and returned a new refresh token. */
  refreshToken?: string | null;
  expiresAt?: string | null;
  scopes?: string[] | null;
  status?: string | null;
};

/** Transient: the credential is busy refreshing elsewhere. Never a reconnect signal. */
export class RefreshLockUnavailableError extends Error {
  readonly code = "refresh_lock_unavailable";
  constructor(message = "The connector credential is being refreshed by another worker.") {
    super(message);
    this.name = "RefreshLockUnavailableError";
  }
}

/** Transient: this worker's state was stale, so its write was refused rather than applied. */
export class StaleCredentialWriteError extends Error {
  readonly code = "stale_credential_write";
  constructor(message = "A newer connector credential already exists, so this refresh was discarded.") {
    super(message);
    this.name = "StaleCredentialWriteError";
  }
}

const CREDENTIAL_COLUMNS = "credential_version,encrypted_access_token,encrypted_refresh_token,token_expires_at,scopes,status";

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Bounded, jittered wait between lease attempts. Never a tight loop. */
export function refreshLockRetryDelayMs(attempt: number, capMs = 900): number {
  const base = Math.min(capMs, 80 * (2 ** Math.max(0, attempt)));
  return Math.min(capMs, base + Math.floor(Math.random() * Math.max(1, Math.floor(base / 2))));
}

async function readCredential(input: { supabase: SupabaseAdmin; workspaceId: string; connectorKey: string }): Promise<LockedCredentialRow | null> {
  const result = await input.supabase
    .from("os_connector_credentials")
    .select(CREDENTIAL_COLUMNS)
    .eq("workspace_id", input.workspaceId)
    .eq("connector_key", input.connectorKey)
    .maybeSingle();
  if (result.error) throw new Error(`Connector credential could not be re-read: ${result.error.message}`);
  return (result.data as LockedCredentialRow | null) ?? null;
}

async function claimLock(input: { supabase: SupabaseAdmin; workspaceId: string; connectorKey: string; lockToken: string; lockSeconds: number }): Promise<boolean> {
  const result = await input.supabase.rpc("claim_os_connector_refresh_lock", {
    p_workspace_id: input.workspaceId,
    p_connector_key: input.connectorKey,
    p_lock_token: input.lockToken,
    p_lock_seconds: input.lockSeconds,
  });
  if (result.error) throw new Error(`Connector refresh lock could not be claimed: ${result.error.message}`);
  return result.data === true;
}

async function releaseLock(input: { supabase: SupabaseAdmin; workspaceId: string; connectorKey: string; lockToken: string }): Promise<void> {
  // Best effort. A lease that was already reclaimed (because this worker
  // overran its lease) is left alone, and an infrastructure error here must
  // never mask the caller's real result - the lease expires on its own.
  try {
    await input.supabase.rpc("release_os_connector_refresh_lock", {
      p_workspace_id: input.workspaceId,
      p_connector_key: input.connectorKey,
      p_lock_token: input.lockToken,
    });
  } catch {
    /* the time bound is the real guarantee */
  }
}

export type RefreshLockOutcome = {
  accessToken: string;
  /** True when this worker performed the provider refresh. */
  refreshed: boolean;
  /** True when another worker had already refreshed and this worker reused that newer token. */
  reusedNewerToken: boolean;
};

/**
 * Resolve a usable access token for one workspace + connector credential,
 * refreshing at most once across all workers.
 *
 *   needs valid token
 *   -> acquire credential refresh lease
 *   -> re-read the latest encrypted credential
 *   -> if another worker already refreshed: use the newest token, release
 *   -> otherwise: refresh with the provider, persist atomically under a
 *      version compare-and-swap (including any rotated refresh token),
 *      release
 *
 * A stale worker never overwrites a newer refresh token: its compare-and-swap
 * matches zero rows and it re-reads instead of writing.
 */
export async function resolveAccessTokenWithRefreshLock(input: {
  workspaceId: string;
  connectorKey: string;
  supabase: SupabaseAdmin;
  credential: LockedCredentialRow;
  /** Freshness check for an access token, using the caller's own expiry skew. */
  isFresh: (row: LockedCredentialRow) => boolean;
  /** Provider refresh call. Receives the newest persisted row, never stale state. */
  refresh: (row: LockedCredentialRow) => Promise<RefreshedCredentialState>;
  lockSeconds?: number;
  waitBudgetMs?: number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<RefreshLockOutcome> {
  if (input.isFresh(input.credential)) {
    return { accessToken: decryptToken(input.credential.encrypted_access_token), refreshed: false, reusedNewerToken: false };
  }

  const supabase = input.supabase;
  const workspaceId = input.workspaceId;
  const connectorKey = input.connectorKey;
  const lockSeconds = Math.max(5, Math.min(input.lockSeconds ?? 30, 120));
  const waitBudgetMs = Math.max(0, Math.min(input.waitBudgetMs ?? 2_500, 10_000));
  const sleep = input.sleep ?? defaultSleep;
  const lockToken = crypto.randomUUID();

  const deadline = Date.now() + waitBudgetMs;
  let held = false;
  for (let attempt = 0; ; attempt += 1) {
    held = await claimLock({ supabase, workspaceId, connectorKey, lockToken, lockSeconds });
    if (held) break;
    // Someone else holds the lease. They may already have persisted a newer
    // token, in which case there is nothing left to do.
    const latest = await readCredential({ supabase, workspaceId, connectorKey });
    if (latest && input.isFresh(latest)) {
      return { accessToken: decryptToken(latest.encrypted_access_token), refreshed: false, reusedNewerToken: true };
    }
    if (Date.now() >= deadline) throw new RefreshLockUnavailableError();
    await sleep(refreshLockRetryDelayMs(attempt));
  }

  try {
    const latest = await readCredential({ supabase, workspaceId, connectorKey });
    if (!latest) throw new Error("Connector credential no longer exists.");
    if (input.isFresh(latest)) {
      return { accessToken: decryptToken(latest.encrypted_access_token), refreshed: false, reusedNewerToken: true };
    }

    const refreshed = await input.refresh(latest);
    if (!refreshed.accessToken) throw new Error("The provider refresh returned no access token.");
    const expectedVersion = typeof latest.credential_version === "number" ? latest.credential_version : 1;
    const patch: Record<string, unknown> = {
      encrypted_access_token: encryptToken(refreshed.accessToken),
      // A provider that returns no new refresh token has NOT rotated. Keep the
      // existing, still-valid one rather than deleting credential state.
      encrypted_refresh_token: refreshed.refreshToken ? encryptToken(refreshed.refreshToken) : latest.encrypted_refresh_token ?? null,
      token_expires_at: refreshed.expiresAt ?? null,
      status: refreshed.status ?? "connected",
      credential_version: expectedVersion + 1,
      refresh_lock_token: null,
      refresh_lock_until: null,
    };
    if (refreshed.scopes?.length) patch.scopes = refreshed.scopes;

    const saved = await supabase
      .from("os_connector_credentials")
      .update(patch)
      .eq("workspace_id", workspaceId)
      .eq("connector_key", connectorKey)
      .eq("credential_version", expectedVersion)
      .eq("refresh_lock_token", lockToken)
      .select("credential_version")
      .maybeSingle();
    if (saved.error) throw new Error(`Refreshed connector credential could not be persisted: ${saved.error.message}`);
    if (!saved.data) {
      // Compare-and-swap refused this write. Another worker persisted a newer
      // credential first, so this worker's rotated token is already dead and
      // must never replace the newer state.
      const newest = await readCredential({ supabase, workspaceId, connectorKey });
      if (newest && input.isFresh(newest)) {
        return { accessToken: decryptToken(newest.encrypted_access_token), refreshed: false, reusedNewerToken: true };
      }
      throw new StaleCredentialWriteError();
    }
    return { accessToken: refreshed.accessToken, refreshed: true, reusedNewerToken: false };
  } finally {
    // A successful compare-and-swap already cleared the lease; this only
    // matters when the refresh threw, and it is exactly what stops a provider
    // 500 from locking a credential until the lease expires.
    await releaseLock({ supabase, workspaceId, connectorKey, lockToken });
  }
}

/**
 * Freshness predicate for the ordinary "is the stored access token still
 * usable" case. Credentials with no recorded expiry are treated as fresh,
 * matching every existing connector resolver in this repo.
 */
export function accessTokenIsFresh(row: LockedCredentialRow, skewMs = 60_000): boolean {
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  if (!expiresAt || !Number.isFinite(expiresAt)) return true;
  return Date.now() <= expiresAt - skewMs;
}

/**
 * Freshness predicate for a provider 401 retry: the token this caller already
 * used is known bad, so only a credential that has actually changed counts as
 * fresh. Comparing the stored ciphertext is a reliable identity check because
 * every encryption uses a new random IV.
 */
export function credentialRotatedSince(usedAccessTokenCiphertext: string): (row: LockedCredentialRow) => boolean {
  return (row) => row.encrypted_access_token !== usedAccessTokenCiphertext;
}

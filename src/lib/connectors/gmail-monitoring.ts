import "server-only";

import { randomUUID } from "node:crypto";
import {
  getStoredGmailCredential,
  registerGmailWatch,
  resolveAccessTokenFromCredential,
  GMAIL_READONLY_SCOPE,
  type StoredConnectorCredential,
} from "@/lib/connectors/gmail";
import { claimSignalSyncLease } from "@/lib/signals/store";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { findUniqueWorkspaceForGmailAccount, readGmailPushConfig, safeAccountHash } from "@/lib/connectors/gmail-push-protocol";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
const LEASE_SECONDS = 900;

function safeFailureCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  return /^[a-z0-9_]{3,80}$/.test(message) ? message : "gmail_watch_failed";
}

function cursorRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function releaseLease(input: { supabase: SupabaseAdmin; workspaceId: string; leaseToken: string; cursor?: Record<string, unknown>; failureCode?: string }) {
  const update: Record<string, unknown> = { lease_token: null, lease_until: null, updated_at: new Date().toISOString() };
  if (input.cursor) update.cursor = input.cursor;
  if (input.failureCode) update.last_failure_code = input.failureCode;
  await input.supabase.from("os_signal_sync_state").update(update)
    .eq("workspace_id", input.workspaceId).eq("connector_key", "gmail").eq("lease_token", input.leaseToken);
}

/** Register/renew one mailbox watch without changing Gmail credential status. */
export async function ensureGmailWatch(input: { workspaceId: string; supabase?: SupabaseAdmin }): Promise<{ ok: boolean; expiresAt?: string; errorCode?: string }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workspaceId = input.workspaceId.trim();
  const credential = await getStoredGmailCredential(workspaceId, supabase);
  if (!credential || credential.status !== "connected") return { ok: false, errorCode: "gmail_credential_unavailable" };
  if (!(credential.scopes ?? []).includes(GMAIL_READONLY_SCOPE)) return { ok: false, errorCode: "gmail_read_scope_missing" };

  const leaseToken = randomUUID();
  let held = false;
  let previousCursor: Record<string, unknown> = {};
  try {
    const config = readGmailPushConfig();
    held = await claimSignalSyncLease({ workspaceId, connectorKey: "gmail", leaseToken, leaseSeconds: LEASE_SECONDS, supabase });
    if (!held) return { ok: false, errorCode: "gmail_sync_busy" };
    const state = await supabase.from("os_signal_sync_state").select("cursor")
      .eq("workspace_id", workspaceId).eq("connector_key", "gmail").maybeSingle();
    if (state.error) throw new Error("gmail_sync_state_unavailable");
    previousCursor = cursorRecord(state.data?.cursor);
    const accessToken = await resolveAccessTokenFromCredential(credential, supabase);
    const watch = await registerGmailWatch(accessToken, config.topic);
    const expiresMs = Number(watch.expiration);
    if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) throw new Error("gmail_watch_expiration_invalid");
    const registeredAt = new Date().toISOString();
    const cursor = {
      ...previousCursor,
      // A new mailbox starts at the watch response boundary. Renewal must not
      // overwrite an older unprocessed history checkpoint with a newer one.
      historyId: typeof previousCursor.historyId === "string" ? previousCursor.historyId : watch.historyId,
      watchHistoryId: watch.historyId,
      watchExpiresAt: new Date(expiresMs).toISOString(),
      watchRegisteredAt: registeredAt,
      watchStatus: "active",
      watchErrorCode: null,
    };
    const persisted = await supabase.from("os_signal_sync_state").update({
      cursor,
      last_success_at: registeredAt,
      last_failure_code: null,
      lease_token: null,
      lease_until: null,
      updated_at: registeredAt,
    }).eq("workspace_id", workspaceId).eq("connector_key", "gmail").eq("lease_token", leaseToken).select("workspace_id").maybeSingle();
    if (persisted.error || !persisted.data) throw new Error("gmail_watch_state_persist_failed");
    held = false;
    console.info(JSON.stringify({ event: previousCursor.watchExpiresAt ? "gmail_watch_renewed" : "gmail_watch_registered", workspaceId, accountHash: safeAccountHash(credential.provider_email ?? ""), expiresAt: cursor.watchExpiresAt }));
    return { ok: true, expiresAt: cursor.watchExpiresAt as string };
  } catch (error) {
    const errorCode = safeFailureCode(error);
    if (held) {
      await releaseLease({
        supabase,
        workspaceId,
        leaseToken,
        cursor: { ...previousCursor, watchStatus: "setup_issue", watchErrorCode: errorCode },
        failureCode: errorCode,
      }).catch(() => undefined);
    }
    console.warn(JSON.stringify({ event: "gmail_watch_failed", workspaceId, accountHash: safeAccountHash(credential.provider_email ?? ""), errorCode }));
    return { ok: false, errorCode };
  }
}

export async function findWorkspaceForGmailAccount(input: { emailAddress: string; supabase?: SupabaseAdmin }): Promise<{ workspaceId: string; status: string } | null> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const email = input.emailAddress.trim().toLowerCase();
  const escaped = email.replace(/[\\%_]/g, "\\$&");
  const result = await supabase.from("os_connector_credentials")
    .select("workspace_id,provider_email,status")
    .eq("connector_key", "gmail")
    .ilike("provider_email", escaped)
    .limit(20);
  if (result.error) throw new Error("gmail_account_mapping_unavailable");
  const rows = (result.data ?? []) as Array<{ workspace_id?: unknown; provider_email?: unknown; status?: unknown }>;
  const workspaceId = findUniqueWorkspaceForGmailAccount(email, rows);
  if (!workspaceId) return null;
  const match = rows.find((row) => String(row.workspace_id) === workspaceId && typeof row.provider_email === "string" && row.provider_email.trim().toLowerCase() === email);
  return match?.status === "connected" ? { workspaceId: String(match.workspace_id), status: match.status } : null;
}

export function gmailCredentialForAccount(credential: StoredConnectorCredential | null, emailAddress: string): credential is StoredConnectorCredential {
  return Boolean(credential && credential.status === "connected" && credential.connector_key === "gmail"
    && credential.provider_email?.trim().toLowerCase() === emailAddress.trim().toLowerCase());
}

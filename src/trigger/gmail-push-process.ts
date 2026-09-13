import { task } from "@trigger.dev/sdk/v3";
import { randomUUID } from "node:crypto";
import {
  fetchGmailProfile,
  getMessageDetails,
  getStoredGmailCredential,
  listGmailHistory,
  listGmailMessagePage,
  resolveAccessTokenFromCredential,
  type SafeGmailMessage,
} from "@/lib/connectors/gmail";
import { GmailApiError } from "@/lib/connectors/gmail";
import { GmailHistorySyncError, reconcileRecentGmailInbox, syncGmailHistoryEvent } from "@/lib/connectors/gmail-history";
import { findWorkspaceForGmailAccount, gmailCredentialForAccount } from "@/lib/connectors/gmail-monitoring";
import { readGmailPushConfig, safeAccountHash } from "@/lib/connectors/gmail-push-protocol";
import { scanRevenueOpportunities } from "@/lib/operators/revenue/scan";
import { claimSignalSyncLease } from "@/lib/signals/store";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type GmailPushPayload = {
  emailAddress: string;
  historyId: string;
  pubsubMessageId: string;
  subscription: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safeErrorCode(error: unknown): string {
  if (error instanceof GmailHistorySyncError) return error.code;
  if (error instanceof Error && /^[a-z0-9_]{3,80}$/.test(error.message)) return error.message;
  return "gmail_push_processing_failed";
}

export const gmailPushProcess = task({
  id: "gmail-push-process",
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 60_000, randomize: true },
  queue: { name: "gmail-history-sync", concurrencyLimit: 20 },
  maxDuration: 3600,
  run: async (payload: GmailPushPayload) => {
    const config = readGmailPushConfig();
    if (payload.subscription !== config.subscription || !payload.emailAddress || !/^\d{1,30}$/.test(payload.historyId)
      || !payload.pubsubMessageId || payload.emailAddress !== payload.emailAddress.trim().toLowerCase()) {
      throw new Error("gmail_push_payload_invalid");
    }
    const supabase = createSupabaseAdmin();
    const mapping = await findWorkspaceForGmailAccount({ emailAddress: payload.emailAddress, supabase });
    if (!mapping) return { status: "account_unmapped" };
    const workspaceId = mapping.workspaceId;
    const credential = await getStoredGmailCredential(workspaceId, supabase);
    if (!gmailCredentialForAccount(credential, payload.emailAddress)) return { status: "credential_changed" };

    const leaseToken = randomUUID();
    const claimed = await claimSignalSyncLease({ workspaceId, connectorKey: "gmail", leaseToken, leaseSeconds: 900, supabase });
    if (!claimed) throw new Error("gmail_sync_lease_busy");
    let leaseHeld = true;
    const stateResult = await supabase.from("os_signal_sync_state").select("cursor")
      .eq("workspace_id", workspaceId).eq("connector_key", "gmail").maybeSingle();
    if (stateResult.error || !stateResult.data) {
      await supabase.from("os_signal_sync_state").update({ lease_token: null, lease_until: null })
        .eq("workspace_id", workspaceId).eq("connector_key", "gmail").eq("lease_token", leaseToken);
      throw new Error("gmail_sync_state_unavailable");
    }
    let cursor = record(stateResult.data.cursor);
    const startedAt = new Date().toISOString();
    cursor = { ...cursor, lastEventAt: startedAt, lastPubSubMessageId: payload.pubsubMessageId };
    const touch = await supabase.from("os_signal_sync_state").update({ cursor, updated_at: startedAt })
      .eq("workspace_id", workspaceId).eq("connector_key", "gmail").eq("lease_token", leaseToken).select("workspace_id").maybeSingle();
    if (touch.error || !touch.data) {
      await supabase.from("os_signal_sync_state").update({ lease_token: null, lease_until: null })
        .eq("workspace_id", workspaceId).eq("connector_key", "gmail").eq("lease_token", leaseToken);
      throw new Error("gmail_sync_state_unavailable");
    }

    console.info(JSON.stringify({ event: "gmail_history_sync_started", workspaceId, accountHash: safeAccountHash(payload.emailAddress), pubsubMessageId: payload.pubsubMessageId }));
    try {
      const accessToken = await resolveAccessTokenFromCredential(credential, supabase);
      const checkpoint = typeof cursor.historyId === "string" ? cursor.historyId : null;
      const extendLease = async () => {
        const result = await supabase.rpc("extend_os_signal_sync_lease", {
          p_workspace_id: workspaceId, p_connector_key: "gmail", p_lease_token: leaseToken, p_lease_seconds: 900,
        });
        if (result.error || result.data !== true) throw new GmailHistorySyncError("gmail_sync_lease_lost");
      };
      const advanceCheckpoint = async (expectedHistoryId: string | null, nextHistoryId: string, patch?: Record<string, unknown>) => {
        const result = await supabase.rpc("persist_gmail_history_checkpoint", {
          p_workspace_id: workspaceId,
          p_lease_token: leaseToken,
          p_expected_history_id: expectedHistoryId,
          p_next_history_id: nextHistoryId,
          p_cursor_patch: patch ?? {},
        });
        if (result.error || result.data !== true) return false;
        leaseHeld = false;
        return true;
      };
      const runCanonicalScan = async (messages?: SafeGmailMessage[]) => {
        const result = await scanRevenueOpportunities({ workspaceId, sourceMode: "push", maxResults: 20, gmailMessages: messages, supabase });
        return result.ok;
      };
      const getCurrentMessage = async (messageId: string): Promise<SafeGmailMessage | null> => {
        try { return await getMessageDetails(accessToken, messageId); }
        catch (error) {
          if (error instanceof GmailApiError && error.details.status === 404) return null;
          throw new GmailHistorySyncError("gmail_message_fetch_failed");
        }
      };
      const reconcileRecent = async () => {
        try {
          await reconcileRecentGmailInbox({
            listPage: async (pageToken) => {
              try { return await listGmailMessagePage(accessToken, { maxResults: 500, query: "newer_than:30d", pageToken }); }
              catch { throw new GmailHistorySyncError("gmail_recent_list_failed"); }
            },
            getMessage: getCurrentMessage,
            processMessages: async (messages) => {
              console.info(JSON.stringify({ event: "gmail_history_message_found", workspaceId, count: messages.length, recovery: true }));
              return runCanonicalScan(messages);
            },
            extendLease,
            batchSize: 20,
          });
          return true;
        } catch (error) {
          if (error instanceof GmailHistorySyncError) throw error;
          throw new GmailHistorySyncError("gmail_history_recovery_scan_failed");
        }
      };

      if (!checkpoint) {
        const profile = await fetchGmailProfile(accessToken);
        if (!profile.historyId || !/^\d{1,30}$/.test(profile.historyId)) throw new GmailHistorySyncError("gmail_history_baseline_missing");
        console.info(JSON.stringify({ event: "gmail_history_recovery_started", workspaceId, reason: "checkpoint_missing" }));
        if (!await reconcileRecent()) throw new GmailHistorySyncError("gmail_history_recovery_scan_failed");
        const advanced = await advanceCheckpoint(null, profile.historyId, { lastSyncHistoryId: profile.historyId, lastSyncAt: new Date().toISOString(), watchStatus: "active", watchErrorCode: null });
        if (!advanced) throw new GmailHistorySyncError("gmail_history_recovery_checkpoint_conflict");
        return { status: "recovered", historyId: profile.historyId, messagesFound: null };
      }

      const result = await syncGmailHistoryEvent({
        checkpointHistoryId: checkpoint,
        notificationHistoryId: payload.historyId,
        listPage: async (startHistoryId, pageToken) => {
          try { return await listGmailHistory(accessToken, { startHistoryId, pageToken }); }
          catch (error) {
            if (error instanceof GmailApiError) throw Object.assign(new Error("gmail_history_api_error"), { status: error.details.status });
            throw new Error("gmail_history_api_error");
          }
        },
        getMessage: getCurrentMessage,
        processMessages: async (messages) => {
          console.info(JSON.stringify({ event: "gmail_history_message_found", workspaceId, count: messages.length }));
          return runCanonicalScan(messages);
        },
        reconcileRecent,
        getCurrentHistoryId: async () => {
          const profile = await fetchGmailProfile(accessToken);
          if (!profile.historyId || !/^\d{1,30}$/.test(profile.historyId)) throw new GmailHistorySyncError("gmail_history_baseline_missing");
          return profile.historyId;
        },
        advanceCheckpoint: async (expectedHistoryId, nextHistoryId) => advanceCheckpoint(expectedHistoryId, nextHistoryId, {
          lastSyncHistoryId: nextHistoryId,
          lastSyncAt: new Date().toISOString(),
          watchStatus: "active",
          watchErrorCode: null,
        }),
        extendLease,
        batchSize: 20,
      });
      if (result.status === "duplicate") {
        console.info(JSON.stringify({ event: "gmail_push_duplicate_ignored", workspaceId, accountHash: safeAccountHash(payload.emailAddress), historyId: result.historyId }));
      } else {
        console.info(JSON.stringify({ event: "gmail_history_checkpoint_advanced", workspaceId, historyId: result.historyId, status: result.status, messageCount: result.messagesProcessed }));
      }
      return result;
    } catch (error) {
      const errorCode = safeErrorCode(error);
      if (leaseHeld) {
        const failureCursor = { ...cursor, watchStatus: "setup_issue", watchErrorCode: errorCode };
        try {
          await supabase.from("os_signal_sync_state").update({
            cursor: failureCursor,
            last_failure_code: errorCode,
            lease_token: null,
            lease_until: null,
            updated_at: new Date().toISOString(),
          }).eq("workspace_id", workspaceId).eq("connector_key", "gmail").eq("lease_token", leaseToken);
        } catch { /* the lease also expires automatically if cleanup is unavailable */ }
        leaseHeld = false;
      }
      console.warn(JSON.stringify({ event: "gmail_history_sync_failed", workspaceId, accountHash: safeAccountHash(payload.emailAddress), pubsubMessageId: payload.pubsubMessageId, errorCode }));
      throw new Error(errorCode);
    } finally {
      if (leaseHeld) {
        await supabase.from("os_signal_sync_state").update({ lease_token: null, lease_until: null, updated_at: new Date().toISOString() })
          .eq("workspace_id", workspaceId).eq("connector_key", "gmail").eq("lease_token", leaseToken);
      }
    }
  },
});

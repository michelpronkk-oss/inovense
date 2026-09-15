import { task } from "@trigger.dev/sdk/v3";
import { randomUUID } from "node:crypto";
import {
  fetchGmailProfile,
  GmailOAuthError,
  getMessageDetails,
  getStoredGmailCredential,
  listGmailHistory,
  listGmailMessagePage,
  resolveAccessTokenFromCredential,
  type SafeGmailMessage,
} from "@/lib/connectors/gmail";
import { GmailApiError } from "@/lib/connectors/gmail";
import { GmailHistorySyncError, reconcileRecentGmailInbox, syncGmailHistoryEvent } from "@/lib/connectors/gmail-history";
import { gmailCredentialForAccount } from "@/lib/connectors/gmail-monitoring";
import { safeAccountHash } from "@/lib/connectors/gmail-push-protocol";
import { scanRevenueOpportunities } from "@/lib/operators/revenue/scan";
import { claimProviderEvent, completeProviderEvent, failProviderEvent, getProviderEvent } from "@/lib/provider-events/store";
import { hashProviderAccountId } from "@/lib/provider-events/types";
import { claimSignalSyncLease } from "@/lib/signals/store";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type GmailHistoryPayload = {
  workspaceId: string;
  emailAddress: string;
  historyId: string;
  pubsubMessageId: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safeErrorCode(error: unknown): string {
  if (error instanceof GmailHistorySyncError) return error.code;
  if (error instanceof Error && /^[a-z0-9_]{3,80}$/.test(error.message)) return error.message;
  return "gmail_push_processing_failed";
}

async function processGmailHistory(payload: GmailHistoryPayload, supabase: ReturnType<typeof createSupabaseAdmin>, credential: NonNullable<Awaited<ReturnType<typeof getStoredGmailCredential>>>) {
    const workspaceId = payload.workspaceId;

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
}

export const gmailPushProcess = task({
  id: "gmail-push-process",
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 60_000, randomize: true },
  queue: { name: "gmail-history-sync", concurrencyLimit: 20 },
  maxDuration: 3600,
  run: async (payload: { providerEventId: string }) => {
    if (!payload || !/^pev_[a-f0-9]{48}$/.test(payload.providerEventId)) throw new Error("provider_event_id_invalid");
    const supabase = createSupabaseAdmin();
    const event = await getProviderEvent(payload.providerEventId, supabase);
    if (!event) throw new Error("provider_event_missing");
    if (["processed", "failed", "ignored"].includes(event.status)) return { status: event.status };

    const leaseToken = randomUUID();
    const claimed = await claimProviderEvent({ eventId: event.id, leaseToken, leaseSeconds: 3600, supabase });
    if (!claimed) return { status: "not_claimed" };

    try {
      if (event.provider !== "gmail" || event.connector_key !== "gmail" || event.source_mode !== "push" || event.event_type !== "gmail.history.changed") {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "provider_event_type_unsupported", permanent: true, supabase });
        return { status: "failed", errorCode: "provider_event_type_unsupported" };
      }
      const historyId = typeof event.metadata?.historyId === "string" ? event.metadata.historyId : "";
      if (!/^\d{1,30}$/.test(historyId)) {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "gmail_push_history_id_invalid", permanent: true, supabase });
        return { status: "failed", errorCode: "gmail_push_history_id_invalid" };
      }
      const credential = await getStoredGmailCredential(event.workspace_id, supabase);
      const emailAddress = credential?.provider_email?.trim().toLowerCase() ?? "";
      if (!gmailCredentialForAccount(credential, emailAddress)
        || hashProviderAccountId("gmail", emailAddress) !== event.provider_account_id) {
        await failProviderEvent({ eventId: event.id, leaseToken, errorCode: "gmail_credential_changed", permanent: true, supabase });
        return { status: "failed", errorCode: "gmail_credential_changed" };
      }

      await processGmailHistory({
        workspaceId: event.workspace_id,
        emailAddress,
        historyId,
        pubsubMessageId: event.external_event_id,
      }, supabase, credential);
      const completed = await completeProviderEvent({ eventId: event.id, leaseToken, supabase });
      if (!completed) throw new Error("provider_event_completion_conflict");
      console.info(JSON.stringify({ event: "provider_event_processed", workspaceId: event.workspace_id, connectorId: event.connector_id, provider: event.provider, providerEventId: event.id, sourceMode: event.source_mode }));
      return { status: "processed" };
    } catch (error) {
      const errorCode = safeErrorCode(error);
      const permanent = error instanceof GmailOAuthError && (error.status === 400 || error.status === 401 || error.status === 403)
        || ["gmail_credential_changed", "provider_event_type_unsupported", "gmail_push_history_id_invalid"].includes(errorCode);
      try {
        await failProviderEvent({
          eventId: event.id,
          leaseToken,
          errorCode,
          permanent,
          retryAfterSeconds: Math.min(3600, 10 * 2 ** Math.min(event.attempt_count, 8)),
          supabase,
        });
      } catch { /* lease expiry leaves the event recoverable if the DB is temporarily unavailable */ }
      if (permanent) {
        console.warn(JSON.stringify({ event: "provider_event_failed", workspaceId: event.workspace_id, connectorId: event.connector_id, provider: event.provider, providerEventId: event.id, errorCode }));
        return { status: "failed", errorCode };
      }
      throw new Error(errorCode);
    }
  },
});

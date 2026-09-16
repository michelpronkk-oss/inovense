import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getStoredSlackCredential } from "@/lib/connectors/slack";
import { getProviderEvent } from "@/lib/provider-events/store";
import { hashProviderAccountId } from "@/lib/provider-events/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { getAppRoute, getAppUrl } from "@/lib/urls";
import { SlackExecutionError, slackRequest } from "@/lib/operators/executors/slack";
import { isValidatedTrelloCardUrl } from "@/lib/connectors/trello";
import {
  composeSlackReply,
  detectSlackMessageLanguage,
  normalizeSlackReplyLanguage,
  slackIntentLabel,
  slackOperatorName,
  type SlackAcknowledgementFacts,
  type SlackReplyLanguage,
  type SlackReplyState,
} from "@/lib/connectors/slack-acknowledgement-copy";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type JsonRecord = Record<string, unknown>;

export type SlackThreadUpdateType =
  | "acknowledgement"
  | "draft_prepared"
  | "approval_requested"
  | "approved"
  | "rejected"
  | "execution_succeeded"
  | "execution_failed";

export type SlackMentionContext = {
  workspaceId: string;
  connectorId: string;
  channelId: string;
  messageTs: string;
  threadTs: string;
  updateType: SlackThreadUpdateType;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, max = 240): string | null {
  return typeof value === "string" && value.trim() ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : null;
}

export function languageFromSettings(settings: Awaited<ReturnType<typeof loadWorkspacePolicySettings>>): SlackReplyLanguage | null {
  const notifications = record(settings.notifications);
  return normalizeSlackReplyLanguage(notifications.language)
    ?? normalizeSlackReplyLanguage(notifications.locale)
    ?? normalizeSlackReplyLanguage(notifications.workspaceLanguage)
    ?? normalizeSlackReplyLanguage(notifications.preferredLanguage);
}

function updateState(updateType: SlackThreadUpdateType, workflowStatus: string | null, candidate: JsonRecord, approvalStatus: string | null): SlackReplyState {
  if (updateType !== "acknowledgement") return updateType;
  if (approvalStatus === "rejected") return "rejected";
  if (workflowStatus === "failed") return "execution_failed";
  if (workflowStatus === "completed") return "execution_succeeded";
  if (workflowStatus === "partially_completed") return "execution_failed";
  if (approvalStatus === "approved" || workflowStatus === "executing" || workflowStatus === "partially_approved") return "approved";
  if (approvalStatus === "pending" || workflowStatus === "awaiting_approval") return "approval_required";
  if (workflowStatus === "blocked" || workflowStatus === "cancelled") return candidate.status === "routed" ? "routed" : "non_actionable";
  if (workflowStatus) return "workflow_created";
  if (candidate.status === "routed") return "routed";
  return "non_actionable";
}

export function slackThreadUpdateKey(input: Pick<SlackMentionContext, "workspaceId" | "channelId" | "messageTs" | "updateType">): string {
  return `${input.workspaceId}:slack:${input.channelId}:${input.messageTs}:${input.updateType}`;
}

export function slackThreadUpdateId(dedupeKey: string): string {
  return `sack_${createHash("sha256").update(dedupeKey).digest("hex").slice(0, 48)}`;
}

export async function claimSlackThreadUpdate(input: SlackMentionContext, metadata: JsonRecord, supabase: SupabaseAdmin): Promise<{ claimed: boolean; status: string; replyTs: string | null; leaseToken: string; attemptCount: number }> {
  const key = slackThreadUpdateKey(input);
  const leaseToken = randomUUID();
  const result = await supabase.rpc("claim_os_slack_thread_update", {
    p_id: slackThreadUpdateId(key),
    p_workspace_id: input.workspaceId,
    p_connector_id: input.connectorId,
    p_channel_id: input.channelId,
    p_source_message_ts: input.messageTs,
    p_thread_ts: input.threadTs,
    p_update_type: input.updateType,
    p_dedupe_key: key,
    p_metadata: metadata,
    p_lease_token: leaseToken,
    p_lease_seconds: 300,
  });
  if (result.error) throw new Error("slack_ack_claim_failed");
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return {
    claimed: row?.claimed === true,
    status: typeof row?.status === "string" ? row.status : "missing",
    replyTs: typeof row?.reply_ts === "string" ? row.reply_ts : null,
    leaseToken,
    attemptCount: typeof row?.attempt_count === "number" ? row.attempt_count : 0,
  };
}

export async function completeSlackThreadUpdate(input: { idempotencyKey: string; leaseToken: string; replyTs: string | null; status?: "sent" | "ignored"; supabase: SupabaseAdmin }): Promise<void> {
  const result = await input.supabase.from("os_slack_thread_updates").update({ status: input.status ?? "sent", reply_ts: input.replyTs, lease_token: null, lease_until: null, updated_at: new Date().toISOString() }).eq("dedupe_key", input.idempotencyKey).eq("lease_token", input.leaseToken);
  if (result.error) throw new Error("slack_ack_complete_failed");
}

export async function failSlackThreadUpdate(input: { idempotencyKey: string; leaseToken: string; errorCode: string; retryable: boolean; supabase: SupabaseAdmin }): Promise<void> {
  await input.supabase.from("os_slack_thread_updates").update({ status: input.retryable ? "retryable" : "failed", last_error_code: input.errorCode.slice(0, 80), lease_token: null, lease_until: null, updated_at: new Date().toISOString() }).eq("dedupe_key", input.idempotencyKey).eq("lease_token", input.leaseToken);
}

async function loadFacts(input: { eventId: string; updateType: SlackThreadUpdateType; supabase: SupabaseAdmin }): Promise<{ context: SlackMentionContext; facts: SlackAcknowledgementFacts; safeMeta: JsonRecord; providerEventStatus: string }> {
  const providerEvent = await getProviderEvent(input.eventId, input.supabase);
  if (!providerEvent || providerEvent.provider !== "slack" || providerEvent.event_type !== "slack.app_mentioned") throw new Error("slack_ack_source_invalid");
  const metadata = record(providerEvent.metadata);
  const teamId = text(metadata.teamId, 80);
  const channelId = text(metadata.channelId, 120);
  const messageTs = text(metadata.eventTs, 80);
  const threadTs = text(metadata.threadTs, 80) ?? messageTs;
  if (!teamId || !channelId || !messageTs || !threadTs || providerEvent.provider_account_id !== hashProviderAccountId("slack", teamId)) throw new Error("slack_ack_identity_invalid");
  const credential = await getStoredSlackCredential(providerEvent.workspace_id, input.supabase);
  if (!credential || credential.status === "needs_attention" || credential.provider_account_id !== teamId) throw new Error("slack_ack_credential_account_mismatch");

  const settings = await loadWorkspacePolicySettings({ workspaceId: providerEvent.workspace_id, supabase: input.supabase });
  const sourceText = text(metadata.signalText, 500) ?? "";
  const messageLanguage = detectSlackMessageLanguage(sourceText);
  const language = messageLanguage ?? languageFromSettings(settings) ?? "en";
  const signalResult = await input.supabase.from("os_signal_events").select("id,metadata,category,content_preview").eq("workspace_id", providerEvent.workspace_id).eq("connector_key", "slack").eq("source_type", "slack_message").eq("source_id", messageTs).maybeSingle();
  if (signalResult.error) throw new Error("slack_ack_signal_lookup_failed");
  const signal = signalResult.data as JsonRecord | null;
  const signalId = text(signal?.id, 200);
  const candidateResult = signalId
    ? await input.supabase.from("os_signal_candidates").select("id,status,operator_key,signal_type,confidence,priority").eq("workspace_id", providerEvent.workspace_id).eq("signal_id", signalId).order("priority", { ascending: false }).limit(1).maybeSingle()
    : { data: null, error: null };
  const candidate = record(candidateResult.data);
  if (candidateResult.error) throw new Error("slack_ack_candidate_lookup_failed");
  const workflowResult = signalId
    ? await input.supabase.from("os_workflow_runs").select("id,status,operator_key,relevant_context,result_evidence").eq("workspace_id", providerEvent.workspace_id).eq("originating_signal_id", signalId).order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null, error: null };
  const workflow = record(workflowResult.data);
  if (workflowResult.error) throw new Error("slack_ack_workflow_lookup_failed");
  const workflowId = text(workflow.id, 220);
  const steps = workflowId ? await input.supabase.from("os_workflow_steps").select("approval_id,status,action_type").eq("workspace_id", providerEvent.workspace_id).eq("workflow_id", workflowId).order("step_order", { ascending: true }) : { data: [], error: null };
  if (steps.error) throw new Error("slack_ack_step_lookup_failed");
  const approvalId = (steps.data ?? []).map((step) => text(step.approval_id, 220)).find(Boolean) ?? null;
  const approval = approvalId ? await input.supabase.from("os_approvals").select("status").eq("workspace_id", providerEvent.workspace_id).eq("id", approvalId).maybeSingle() : { data: null, error: null };
  if (approval.error) throw new Error("slack_ack_approval_lookup_failed");
  const approvalStatus = text(approval.data?.status, 80);
  const workflowStatus = text(workflow.status, 80);
  const trelloAction = (steps.data ?? []).some((step) => ["create_task", "move_task", "add_task_comment"].includes(String(step.action_type)));
  const trelloExecution = record(record(workflow.result_evidence).trelloExecution);
  const trelloCardUrl = isValidatedTrelloCardUrl(trelloExecution.cardUrl) ? trelloExecution.cardUrl : null;

  // A platform-internal recommendation is a fundamentally different kind of
  // "completed" than a connector-executed action: nothing external ran, so
  // it must never read as execution_succeeded. Its own step status is the
  // authoritative source of truth for whether the substantive artifact
  // actually exists yet - never the generic connector-based state machine.
  const internalRecommendationStep = (steps.data ?? []).find((step) => step.action_type === "prepare_internal_recommendation") ?? null;
  const internalRecommendation = record(record(workflow.result_evidence).internalRecommendation);
  // The current v2 artifact stores one language-resolved string. The legacy
  // deterministic v1 artifact stored { en, nl }; read both shapes so an old
  // workflow can still receive its truthful recommendation update.
  const legacyRecommendationText = record(internalRecommendation.recommendedNextStep);
  const recommendedNextStepText = text(internalRecommendation.recommendedNextStep, 900)
    ?? text(legacyRecommendationText[language], 900);
  const recommendationLanguage = normalizeSlackReplyLanguage(internalRecommendation.language) ?? language;

  let state: SlackReplyState;
  if (input.updateType === "acknowledgement" && providerEvent.status === "failed") {
    state = "processing_failure";
  } else if (internalRecommendationStep && input.updateType === "acknowledgement") {
    if (internalRecommendationStep.status === "completed" && recommendedNextStepText) state = "recommendation_ready";
    else if (["blocked", "failed", "rejected", "skipped"].includes(String(internalRecommendationStep.status))) state = candidate.status === "routed" ? "routed" : "non_actionable";
    else state = "workflow_created";
  } else {
    state = updateState(input.updateType, workflowStatus, candidate, approvalStatus);
  }

  const operatorKey = text(candidate.operator_key, 80) ?? text(workflow.operator_key, 80);
  const workflowUrl = workflowId ? `${getAppUrl()}${getAppRoute(`/workflows?workflow=${encodeURIComponent(workflowId)}`)}` : null;
  const approvalUrl = approvalId ? `${getAppUrl()}${getAppRoute(`/approvals#approval-review-${encodeURIComponent(approvalId)}`)}` : null;
  const facts: SlackAcknowledgementFacts = {
    state,
    language: state === "recommendation_ready" ? recommendationLanguage : language,
    operatorName: operatorKey ? slackOperatorName(operatorKey) : null,
    intentLabel: slackIntentLabel(text(candidate.signal_type), text(signal?.category)),
    confidence: candidate.confidence === "high" || candidate.confidence === "medium" || candidate.confidence === "low" ? candidate.confidence : null,
    workflowUrl,
    approvalUrl,
    trelloAction,
    trelloCardUrl,
    recommendedNextStepText: state === "recommendation_ready" ? recommendedNextStepText : null,
  };
  return {
    context: { workspaceId: providerEvent.workspace_id, connectorId: providerEvent.connector_id, channelId, messageTs, threadTs, updateType: input.updateType },
    facts,
    providerEventStatus: providerEvent.status,
    safeMeta: {
      language,
      state,
      operatorKey: operatorKey ?? null,
      workflowId: workflowId ?? null,
      approvalId: approvalId ?? null,
      providerEventId: providerEvent.id,
      recommendationPending: internalRecommendationStep !== null && internalRecommendationStep.status !== "completed" && !["blocked", "failed", "rejected", "skipped"].includes(String(internalRecommendationStep.status)),
    },
  };
}

export async function deliverSlackMentionUpdate(input: { eventId: string; updateType?: SlackThreadUpdateType; supabase?: SupabaseAdmin }): Promise<{ status: string; replyTs?: string | null }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const updateType = input.updateType ?? "acknowledgement";
  const loaded = await loadFacts({ eventId: input.eventId, updateType, supabase });
  // Internal recommendations use the acknowledgement claim as their single
  // final Slack reply. The initial acknowledgement task exits without
  // claiming/sending while generation is pending; the generation worker
  // triggers this same update after the validated artifact is persisted.
  if (updateType === "acknowledgement" && loaded.safeMeta.recommendationPending === true) return { status: "deferred" };
  const key = slackThreadUpdateKey(loaded.context);
  const claim = await claimSlackThreadUpdate(loaded.context, loaded.safeMeta, supabase);
  if (!claim.claimed) return { status: claim.status, replyTs: claim.replyTs };
  try {
    // chat.postMessage has no provider-side idempotency key. A lease expiry
    // after a successful provider write is therefore reconciled by looking
    // for our bounded metadata marker before sending again.
    const existingReplyTs = await findExistingSlackThreadReply(loaded.context, key);
    if (existingReplyTs) {
      await completeSlackThreadUpdate({ idempotencyKey: key, leaseToken: claim.leaseToken, replyTs: existingReplyTs, supabase });
      await updateSlackAcknowledgementMonitoring({ supabase, workspaceId: loaded.context.workspaceId, messageTs: loaded.context.messageTs, status: "sent" });
      return { status: "sent", replyTs: existingReplyTs };
    }
    const textBody = composeSlackReply(loaded.facts);
    const sent = await postSlackThreadReply({ workspaceId: loaded.context.workspaceId, channelId: loaded.context.channelId, threadTs: loaded.context.threadTs, text: textBody, acknowledgementKey: key });
    await completeSlackThreadUpdate({ idempotencyKey: key, leaseToken: claim.leaseToken, replyTs: sent.messageTs ?? null, supabase });
    await updateSlackAcknowledgementMonitoring({ supabase, workspaceId: loaded.context.workspaceId, messageTs: loaded.context.messageTs, status: "sent" });
    if (loaded.context.updateType === "acknowledgement") {
      const outcomeId = `slack-ack:${key}`;
      await supabase.from("os_workflow_outcomes").upsert({
        id: outcomeId,
        workspace_id: loaded.context.workspaceId,
        operator_key: loaded.facts.operatorName ?? "system",
        workflow_id: loaded.safeMeta.workflowId ?? null,
        signal_id: null,
        outcome_type: "slack.acknowledgement_sent",
        attribution_level: "observed",
        confidence: "high",
        evidence_refs: [loaded.context.messageTs, sent.messageTs ?? "slack_delivery_recorded"].slice(0, 2),
        observed_at: new Date().toISOString(),
      });
    }
    console.info("[slack-ack] sent", { workspaceId: loaded.context.workspaceId, connectorId: loaded.context.connectorId, channelId: loaded.context.channelId, messageTs: loaded.context.messageTs, acknowledgementState: loaded.facts.state, replyTs: sent.messageTs ?? null });
    return { status: "sent", replyTs: sent.messageTs ?? null };
  } catch (error) {
    const safeCode = error instanceof SlackExecutionError && error.details.code ? error.details.code : "slack_ack_delivery_failed";
    const retry = error instanceof SlackExecutionError && (error.details.status === 429 || (error.details.status ?? 0) >= 500 || error.details.code === "slack_request_failed");
    await failSlackThreadUpdate({ idempotencyKey: key, leaseToken: claim.leaseToken, errorCode: safeCode, retryable: retry, supabase });
    await updateSlackAcknowledgementMonitoring({ supabase, workspaceId: loaded.context.workspaceId, messageTs: loaded.context.messageTs, status: retry ? "retryable" : "failed" });
    throw error;
  }
}

async function findExistingSlackThreadReply(context: SlackMentionContext, acknowledgementKey: string): Promise<string | null> {
  try {
    const result = await slackRequest<{ messages?: Array<{ ts?: string; metadata?: { event_payload?: { acknowledgement_key?: string } } }> }>(context.workspaceId, "GET", `/conversations.replies?channel=${encodeURIComponent(context.channelId)}&ts=${encodeURIComponent(context.threadTs)}&limit=100`);
    const found = (result.messages ?? []).find((message) => message.metadata?.event_payload?.acknowledgement_key === acknowledgementKey);
    return found?.ts ?? null;
  } catch (error) {
    if (error instanceof SlackExecutionError && error.details.status === 429) throw error;
    // Reconciliation is a duplicate-prevention aid, not a reason to lose a
    // valid receipt when the history scope is unavailable.
    return null;
  }
}

async function updateSlackAcknowledgementMonitoring(input: { supabase: SupabaseAdmin; workspaceId: string; messageTs: string; status: "sent" | "retryable" | "failed" }): Promise<void> {
  const current = await input.supabase.from("os_signal_sync_state").select("cursor").eq("workspace_id", input.workspaceId).eq("connector_key", "slack").maybeSingle();
  const previous = record(current.data?.cursor);
  const now = new Date().toISOString();
  await input.supabase.from("os_signal_sync_state").upsert({ workspace_id: input.workspaceId, connector_key: "slack", cursor: { ...previous, lastAcknowledgementAt: now, lastAcknowledgedMessageTs: input.messageTs, lastAcknowledgementStatus: input.status }, updated_at: now }, { onConflict: "workspace_id,connector_key" });
}

export async function postSlackThreadReply(input: { workspaceId: string; channelId: string; threadTs: string; text: string; acknowledgementKey: string }): Promise<{ channelId: string; messageTs: string | null }> {
  const channelId = input.channelId.trim();
  const threadTs = input.threadTs.trim();
  const message = input.text.trim();
  if (!channelId || !threadTs || !message) throw new SlackExecutionError("Slack thread reply is incomplete.", { step: "slack.thread_reply.validate", code: "slack_ack_payload_invalid" });
  const data = await slackRequest<{ channel?: string; ts?: string }>(input.workspaceId, "POST", "/chat.postMessage", {
    channel: channelId,
    thread_ts: threadTs,
    text: message,
    unfurl_links: false,
    unfurl_media: false,
    metadata: { event_type: "auterim_slack_thread_update", event_payload: { acknowledgement_key: input.acknowledgementKey } },
  });
  return { channelId: data.channel ?? channelId, messageTs: data.ts ?? null };
}

export async function triggerSlackLifecycleUpdate(input: { workflowId: string; workspaceId: string; updateType: SlackThreadUpdateType; supabase?: SupabaseAdmin }): Promise<boolean> {
  const workflow = await (input.supabase ?? createSupabaseAdmin()).from("os_workflow_runs").select("relevant_context").eq("id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  const origin = record(record(workflow.data?.relevant_context).slackOrigin);
  if (!text(origin.channelId, 120) || !text(origin.messageTs, 80)) return false;
  const { slackThreadUpdate } = await import("@/trigger/slack-thread-update");
  await slackThreadUpdate.trigger({ workspaceId: input.workspaceId, workflowId: input.workflowId, updateType: input.updateType });
  return true;
}

export async function loadSlackMentionContextFromWorkflow(input: { workflowId: string; workspaceId: string; updateType: SlackThreadUpdateType; supabase?: SupabaseAdmin }): Promise<{ eventId: string } | null> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workflow = await supabase.from("os_workflow_runs").select("originating_signal_id,relevant_context").eq("id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  const signalId = text(workflow.data?.originating_signal_id, 220);
  const origin = record(record(workflow.data?.relevant_context).slackOrigin);
  if (!signalId || !text(origin.messageTs, 80)) return null;
  const signal = await supabase.from("os_signal_events").select("metadata").eq("id", signalId).eq("workspace_id", input.workspaceId).maybeSingle();
  const providerEventId = text(record(signal.data?.metadata).sourceProviderEventId, 220);
  return providerEventId ? { eventId: providerEventId } : null;
}

import {
  GMAIL_SCAN_REQUIRED_SCOPES,
  GMAIL_SEND_REQUIRED_SCOPES,
  getMessageDetails,
  getMissingGmailScopes,
  listRecentMessages,
  resolveAccessTokenFromCredential,
  type SafeGmailMessage,
  type StoredConnectorCredential,
} from "@/lib/connectors/gmail";
import {
  MICROSOFT_READ_REQUIRED_SCOPES,
  MICROSOFT_SEND_REQUIRED_SCOPES,
  getMicrosoftCredential,
  getMicrosoftMessage,
  getMissingMicrosoftScopes,
  listRecentMicrosoftMessages,
  resolveMicrosoftAccessToken,
  type SafeMicrosoftMessage,
  type StoredMicrosoftCredential,
} from "@/lib/connectors/microsoft";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { getStoredZendeskCredential, listZendeskTickets, normalizeZendeskTicket, resolveZendeskAccessToken } from "@/lib/connectors/zendesk";
import { getStoredIntercomCredential, listIntercomConversations, normalizeIntercomConversation, resolveIntercomAccessToken } from "@/lib/connectors/intercom";
import { prepareAction } from "@/lib/actions/execute";
import type { PreparedAction } from "@/lib/actions/types";
import { getOperatorReadiness, type OperatorReadiness } from "@/lib/operators/readiness";
import { operatorRuntimeId } from "@/lib/operators/logging";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizeEmailToSignalEvent } from "@/lib/signals/intake";
import { routeSignalEvent } from "@/lib/signals/engine";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type SupportSourceMode = "scheduled" | "manual";

export type SupportScanSummary = {
  type?: "support_scan_summary";
  status?: string;
  message?: string;
  sourceMode?: SupportSourceMode;
  scanned?: number;
  signalsFound?: number;
  approvalsCreated?: number;
  skippedCount?: number;
  providers?: { email: number; zendesk: number; intercom: number };
  completedAt?: string;
  readiness?: unknown;
  missingScopes?: string[];
};

export type SupportScanResult = { ok: boolean; status: number; body: SupportScanSummary & Record<string, unknown> };

const SUPPORT_AGENT_ID = "support";
const SUPPORT_AGENT_MARK = "SU";
const SUPPORT_AGENT_COLOR = "#66D0E0";
const SAFE_REPLY = "Thanks for reaching out. We’ve received this support request and are reviewing it. We’ll follow up with the next update shortly.";

function fromMicrosoftMessage(message: SafeMicrosoftMessage): SafeGmailMessage {
  return {
    id: message.id,
    threadId: message.conversationId ?? undefined,
    labelIds: [],
    from: message.fromName ? `${message.fromName} <${message.from ?? ""}>` : message.from ?? "",
    fromEmail: message.from ?? "",
    to: "",
    subject: message.subject ?? "",
    date: message.receivedAt ?? "",
    snippet: message.bodyPreview ?? "",
    bodyText: message.bodyText ?? message.bodyPreview ?? "",
    internalDate: message.receivedAt ?? undefined,
  };
}

function dailyNext(iso: string) { return new Date(new Date(iso).getTime() + 86_400_000).toISOString(); }

function emailDedupe(provider: string, message: SafeGmailMessage) {
  return `support:${provider}:message:${message.id}`;
}

function emailThreadDedupe(provider: string, message: SafeGmailMessage) {
  return message.threadId ? `support:${provider}:thread:${message.threadId}` : null;
}

function providerDedupe(provider: string, id: string, kind: string) {
  return `support:${provider}:${kind}:${id}`;
}

async function existingDedupe(supabase: SupabaseAdmin, workspaceId: string) {
  const result = await supabase.from("os_approvals").select("dedupe_key,status,continuation_payload").eq("workspace_id", workspaceId).eq("agent_id", SUPPORT_AGENT_ID).limit(500);
  const seen = new Map<string, string>();
  (result.data ?? []).forEach((row) => {
    const status = String(row.status ?? "handled");
    if (typeof row.dedupe_key === "string") seen.set(row.dedupe_key, status);
    const continuation = row.continuation_payload && typeof row.continuation_payload === "object" ? row.continuation_payload as Record<string, unknown> : {};
    const action = continuation.preparedAction && typeof continuation.preparedAction === "object" ? continuation.preparedAction as Record<string, unknown> : {};
    const metadata = action.metadata && typeof action.metadata === "object" ? action.metadata as Record<string, unknown> : {};
    if (typeof metadata.threadDedupeKey === "string") seen.set(metadata.threadDedupeKey, status);
  });
  return seen;
}

async function createApproval(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  readiness: OperatorReadiness;
  action: PreparedAction;
  triggerType: string;
  dedupeKey: string;
  policyReason: string;
}) {
  const runId = operatorRuntimeId("oprun-support");
  const startedAt = new Date().toISOString();
  const run = await input.supabase.from("os_operator_runs").insert({
    id: runId, workspace_id: input.workspaceId, operator_key: "support", trigger_type: input.triggerType,
    status: "waiting_for_approval", input: { source: input.triggerType, dedupeKey: input.dedupeKey, targetRef: input.action.normalizedTarget },
    output: {}, readiness: input.readiness, risk_level: "high", started_at: startedAt,
  });
  if (run.error) throw new Error(run.error.message);
  const approvalId = operatorRuntimeId("appr-support");
  const approval = await input.supabase.from("os_approvals").insert({
    id: approvalId, workspace_id: input.workspaceId, type: "action", title: input.action.title, body: input.action.summary,
    agent_id: SUPPORT_AGENT_ID, agent_mark: SUPPORT_AGENT_MARK, agent_color: SUPPORT_AGENT_COLOR, run_id: runId,
    status: "pending", dedupe_key: input.dedupeKey, created_at: startedAt,
    continuation_payload: { kind: "shared_action.execute_after_approval", workspaceId: input.workspaceId, operatorKey: "support", preparedAction: input.action },
    policy_reason: input.policyReason,
  });
  if (approval.error) throw new Error(approval.error.message);
  const output = await input.supabase.from("os_operator_outputs").insert({
    id: operatorRuntimeId("opout-support"), workspace_id: input.workspaceId, run_id: runId, operator_key: "support",
    output_type: "support_action", title: input.action.title,
    payload: { type: "support_action", source: input.triggerType, targetRef: input.action.normalizedTarget, approvalId, preparedAction: input.action },
    requires_approval: true, approval_id: approvalId,
  });
  if (output.error) throw new Error(output.error.message);
  return { runId, approvalId };
}

async function upsertMonitoring(input: { supabase: SupabaseAdmin; workspaceId: string; sourceMode: SupportSourceMode; summary: SupportScanSummary; at: string }) {
  return input.supabase.from("os_operator_triggers").upsert({
    id: `optrig-${input.workspaceId}-support-monitoring`, workspace_id: input.workspaceId, operator_key: "support", trigger_type: "scheduled_monitoring", enabled: true,
    config: { monitoringEnabled: true, cadence: "daily", scheduleProvider: "trigger.dev", triggerTaskId: "support-operator-daily-scan", lastRunAt: input.at, nextRunAt: dailyNext(input.at), lastRunStatus: input.summary.status ?? "completed", lastRunSummary: input.summary, manualRunAvailable: true, sourceMode: input.sourceMode },
  });
}

export async function scanSupportSignals(input: { workspaceId: string; maxResults?: number; sourceMode?: SupportSourceMode; supabase?: SupabaseAdmin }): Promise<SupportScanResult> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workspaceId = input.workspaceId.trim();
  const sourceMode = input.sourceMode ?? "manual";
  const readiness = await getOperatorReadiness({ workspaceId, operatorKey: "support" });
  if (!readiness) return { ok: false, status: 404, body: { status: "not_found", message: "Support Operator readiness was not found." } };
  if (readiness.status === "upgrade_required") return { ok: false, status: 402, body: { status: "upgrade_required", message: readiness.reason, readiness } };
  if (readiness.status === "missing_connector") return { ok: false, status: 409, body: { status: "missing_connector", message: "Connect Zendesk, Intercom, Gmail, or Microsoft 365 to monitor support work.", readiness } };
  if (!readiness.canRunManual) return { ok: false, status: 409, body: { status: readiness.status, message: readiness.reason, readiness } };
  const eligibility = await getWorkspaceExecutionEligibility(workspaceId, supabase);
  if (!eligibility.eligible) return { ok: false, status: 402, body: { status: "execution_ineligible", message: eligibility.reason, readiness } };

  const truth = await getConnectorTruth({ workspaceId, supabase });
  const maxResults = Math.min(Math.max(Number(input.maxResults) || 15, 1), 25);
  const seen = await existingDedupe(supabase, workspaceId);
  const policySettings = await loadPolicyWorkspaceSettings({ supabase, workspaceId });
  const now = new Date().toISOString();
  let scanned = 0; let signalsFound = 0; let approvalsCreated = 0; let skippedCount = 0;
  const providers = { email: 0, zendesk: 0, intercom: 0 };
  const missingScopes: string[] = [];

  const emailTruth = truth.find((item) => (item.connectorKey === "gmail" || item.connectorKey === "microsoft") && (item.status === "healthy" || item.status === "connected"));
  if (emailTruth) {
    try {
      const provider = emailTruth.connectorKey as "gmail" | "microsoft";
      let messages: SafeGmailMessage[] = [];
      if (provider === "gmail") {
        const credentialResult = await supabase.from("os_connector_credentials").select("*").eq("workspace_id", workspaceId).eq("connector_key", "gmail").maybeSingle();
        const credential = credentialResult.data as StoredConnectorCredential | null;
        if (credential) {
          missingScopes.push(...getMissingGmailScopes(credential.scopes, GMAIL_SCAN_REQUIRED_SCOPES));
          missingScopes.push(...getMissingGmailScopes(credential.scopes, GMAIL_SEND_REQUIRED_SCOPES));
          if (!missingScopes.length) { const token = await resolveAccessTokenFromCredential(credential); const listed = await listRecentMessages(token, { maxResults, query: "newer_than:30d" }); messages = await Promise.all(listed.map((item) => getMessageDetails(token, item.id))); }
        }
      } else {
        const credential = await getMicrosoftCredential(workspaceId, supabase);
        if (credential) {
          missingScopes.push(...getMissingMicrosoftScopes(credential.scopes, MICROSOFT_READ_REQUIRED_SCOPES));
          missingScopes.push(...getMissingMicrosoftScopes(credential.scopes, MICROSOFT_SEND_REQUIRED_SCOPES));
          if (!missingScopes.length) { const token = await resolveMicrosoftAccessToken({ workspaceId, credential: credential as StoredMicrosoftCredential, supabase }); messages = await Promise.all((await listRecentMicrosoftMessages(token, maxResults)).map((item) => getMicrosoftMessage(token, item.id).then(fromMicrosoftMessage))); }
        }
      }
      for (const message of messages) {
        scanned += 1; providers.email += 1;
        const dedupeKey = emailDedupe(provider, message);
        const threadKey = emailThreadDedupe(provider, message);
        if (seen.has(dedupeKey) || (threadKey ? seen.has(threadKey) : false)) { skippedCount += 1; continue; }
        const routed = routeSignalEvent(normalizeEmailToSignalEvent({ workspaceId, message, provider, rawRef: `${provider}:${message.id}`, metadata: { dedupeKey, sourceMode } }));
        const candidate = routed.candidates.find((item) => item.operatorKey === "support");
        if (!candidate) { skippedCount += 1; continue; }
        signalsFound += 1;
        const to = message.fromEmail || message.from || "";
        const action = prepareAction({ workspaceId, operatorKey: "support", actionType: "send_email", connectorKey: provider, capability: "email.send_after_approval", title: "Prepare a support reply", summary: `Prepare an approval-gated support reply for ${message.subject || "an inbound support request"}.`, input: { to, subject: message.subject ? `Re: ${message.subject}` : "Re: Your support request", body: SAFE_REPLY }, dedupeKey, source: `${provider}_scan`, destinationType: "customer", confidence: candidate.confidence, riskLevel: "high", normalizedTarget: message.threadId || message.id, metadata: { operatorKey: "support", signalType: candidate.signalType, sourceId: message.id, ...(threadKey ? { threadDedupeKey: threadKey } : {}) } }, { policySettings });
        await createApproval({ supabase, workspaceId, readiness, action, triggerType: "email_scan", dedupeKey, policyReason: "Customer-facing support replies require human approval before execution." });
        seen.set(dedupeKey, "pending"); if (threadKey) seen.set(threadKey, "pending"); approvalsCreated += 1;
      }
    } catch (error) {
      return { ok: false, status: 502, body: { status: "email_scan_failed", message: error instanceof Error ? error.message : "Support email scan failed.", readiness } };
    }
  }

  const zendeskTruth = truth.find((item) => item.connectorKey === "zendesk" && (item.status === "healthy" || item.status === "connected"));
  if (zendeskTruth) {
    try {
      const credential = await getStoredZendeskCredential(workspaceId, supabase);
      const subdomain = typeof credential?.metadata?.subdomain === "string" ? credential.metadata.subdomain : null;
      if (credential && subdomain) {
        const token = await resolveZendeskAccessToken({ workspaceId, credential, supabase });
        const listed = await listZendeskTickets(token, subdomain, { maxResults });
        for (const row of listed.tickets) {
          scanned += 1; providers.zendesk += 1;
          const ticket = normalizeZendeskTicket(row, subdomain);
          if (["solved", "closed"].includes(ticket.status)) { skippedCount += 1; continue; }
          const ageHours = ticket.updatedAt ? (Date.now() - new Date(ticket.updatedAt).getTime()) / 3_600_000 : 0;
          if (!(ticket.priority === "urgent" || ticket.priority === "high" || ageHours >= 48)) { skippedCount += 1; continue; }
          const dedupeKey = providerDedupe("zendesk", ticket.ticketId, "ticket");
          if (seen.has(dedupeKey)) { skippedCount += 1; continue; }
          signalsFound += 1;
          const action = prepareAction({ workspaceId, operatorKey: "support", actionType: "reply_zendesk_ticket", connectorKey: "zendesk", capability: "support.tickets.reply_after_approval", title: `Prepare a Zendesk reply`, summary: `Prepare an approval-gated reply for ${ticket.subject || "an unresolved support ticket"}.`, input: { ticketId: ticket.ticketId, subject: ticket.subject, body: SAFE_REPLY }, dedupeKey, source: "zendesk_scan", destinationType: "customer", confidence: ticket.priority === "urgent" ? "high" : "medium", riskLevel: "high", normalizedTarget: ticket.ticketId, metadata: { operatorKey: "support", ticketId: ticket.ticketId } }, { policySettings });
          await createApproval({ supabase, workspaceId, readiness, action, triggerType: "zendesk_scan", dedupeKey, policyReason: "Zendesk customer replies require human approval before execution." });
          seen.set(dedupeKey, "pending"); approvalsCreated += 1;
        }
      }
    } catch (error) { console.warn("[support-scan] Zendesk scan skipped", { workspaceId, error: error instanceof Error ? error.message : "unknown" }); }
  }

  const intercomTruth = truth.find((item) => item.connectorKey === "intercom" && (item.status === "healthy" || item.status === "connected"));
  if (intercomTruth) {
    try {
      const credential = await getStoredIntercomCredential(workspaceId, supabase);
      if (credential) {
        const token = await resolveIntercomAccessToken({ workspaceId, credential, supabase });
        const region = (typeof credential.metadata?.region === "string" ? credential.metadata.region : "us") as "us" | "eu" | "au";
        const listed = await listIntercomConversations(token, region, { maxResults });
        for (const row of listed.conversations) {
          scanned += 1; providers.intercom += 1;
          const conversation = normalizeIntercomConversation(row, region);
          if (["closed", "resolved"].includes(conversation.state)) { skippedCount += 1; continue; }
          const ageHours = conversation.updatedAt ? (Date.now() - new Date(conversation.updatedAt).getTime()) / 3_600_000 : 0;
          const text = conversation.subjectOrPreview?.toLowerCase() ?? "";
          if (!(conversation.priority || /urgent|critical|outage|blocked|error|issue|help|not working/.test(text) || ageHours >= 48)) { skippedCount += 1; continue; }
          const dedupeKey = providerDedupe("intercom", `${conversation.region}:${conversation.conversationId}`, "conversation");
          if (seen.has(dedupeKey)) { skippedCount += 1; continue; }
          signalsFound += 1;
          const action = prepareAction({ workspaceId, operatorKey: "support", actionType: "reply_intercom_conversation", connectorKey: "intercom", capability: "support.conversations.reply_after_approval", title: `Prepare an Intercom reply`, summary: "Prepare an approval-gated reply for an unresolved support conversation.", input: { conversationId: conversation.conversationId, body: SAFE_REPLY, region: conversation.region }, dedupeKey, source: "intercom_scan", destinationType: "customer", confidence: conversation.priority ? "high" : "medium", riskLevel: "high", normalizedTarget: conversation.conversationId, metadata: { operatorKey: "support", conversationId: conversation.conversationId } }, { policySettings });
          await createApproval({ supabase, workspaceId, readiness, action, triggerType: "intercom_scan", dedupeKey, policyReason: "Intercom customer replies require human approval before execution." });
          seen.set(dedupeKey, "pending"); approvalsCreated += 1;
        }
      }
    } catch (error) { console.warn("[support-scan] Intercom scan skipped", { workspaceId, error: error instanceof Error ? error.message : "unknown" }); }
  }

  const summary: SupportScanSummary = { type: "support_scan_summary", status: "completed", sourceMode, scanned, signalsFound, approvalsCreated, skippedCount, providers, completedAt: now, readiness, ...(missingScopes.length ? { missingScopes: [...new Set(missingScopes)] } : {}) };
  await supabase.from("os_operator_runs").insert({ id: operatorRuntimeId("oprun-support-summary"), workspace_id: workspaceId, operator_key: "support", trigger_type: "support_scan", status: "completed", input: { sourceMode }, output: summary, readiness, risk_level: "medium", started_at: now, completed_at: now });
  await upsertMonitoring({ supabase, workspaceId, sourceMode, summary, at: now });
  return { ok: true, status: 200, body: summary as SupportScanSummary & Record<string, unknown> };
}

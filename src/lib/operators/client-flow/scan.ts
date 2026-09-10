import {
  GMAIL_SCAN_REQUIRED_SCOPES,
  GMAIL_SEND_REQUIRED_SCOPES,
  GmailApiError,
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
  MicrosoftGraphError,
  MicrosoftReauthRequiredError,
  getMicrosoftCredential,
  getMicrosoftMessage,
  getMissingMicrosoftScopes,
  listRecentMicrosoftMessages,
  resolveMicrosoftAccessToken,
  type SafeMicrosoftMessage,
  type StoredMicrosoftCredential,
} from "@/lib/connectors/microsoft";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { EMPTY_TEAMS_OPERATOR_SIGNALS, getTeamsOperatorSignals, type TeamsOperatorSignals } from "@/lib/operators/executors/microsoft-teams";
import { prepareAction } from "@/lib/actions/execute";
import type { PreparedAction } from "@/lib/actions/types";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { getOperatorReadiness, type OperatorReadiness } from "@/lib/operators/readiness";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { draftClientFlowReplyWithAI } from "@/lib/operators/client-flow/ai-drafting";
import { applyGreeting, buildContactPersonalization, type SharedPersonalization } from "@/lib/operators/shared/personalization";
import { sendSlackApprovalNotification } from "@/lib/notifications/slack";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getAppUrl } from "@/lib/urls";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import type { PolicyWorkspaceSettings } from "@/lib/policies/types";
import { loadWorkspacePolicySettings, type TrelloProjectSettings } from "@/lib/settings/workspace-policy";
import { getStoredZendeskCredential, listZendeskTickets, normalizeZendeskTicket, resolveZendeskAccessToken, type NormalizedZendeskTicket } from "@/lib/connectors/zendesk";
import { getStoredIntercomCredential, listIntercomConversations, normalizeIntercomConversation, resolveIntercomAccessToken, type NormalizedIntercomConversation } from "@/lib/connectors/intercom";
import { buildUntrustedGoogleDrivePromptContext, loadSelectedGoogleDriveContext } from "@/lib/connectors/google-drive";
import { normalizeEmailToSignalEvent } from "@/lib/signals/intake";
import { routeSignalEvent } from "@/lib/signals/engine";
import type { SignalEvent } from "@/lib/signals/types";
import { buildClientFlowContext, publicClientFlowContext, type ClientFlowContext } from "@/lib/operators/client-flow/context";
import { buildClientFlowCandidate, createClientFlowSupportingHandoffs, ensureClientFlowWorkflow, linkClientFlowApprovalWorkflow, persistCanonicalClientFlowSignal, persistClientFlowCandidate } from "@/lib/operators/client-flow/workflow";
import { observeClientFlowCustomerReply, observeClientFlowHandoff } from "@/lib/workflows/outcome-observers";
import { recordObservedWorkflowOutcome } from "@/lib/workflows/store";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type ClientFlowScanSourceMode = "scheduled" | "manual" | "event_ready";

export const CLIENT_FLOW_AGENT_ID = "client_flow";
const CLIENT_FLOW_AGENT_MARK = "CF";
const CLIENT_FLOW_AGENT_COLOR = "#5FD3A8";

/**
 * Client Flow supports Gmail and Microsoft 365 as interchangeable inbox
 * sources, mirroring runOperator.ts's resolveEmailConnector() for Revenue.
 * Gmail is preferred when both happen to be connected, which keeps existing
 * Gmail-only workspaces behaving exactly as before.
 */
export type ClientFlowEmailConnector = "gmail" | "microsoft";

function resolveClientFlowEmailConnector(readiness: OperatorReadiness): ClientFlowEmailConnector | null {
  const connected = readiness.connectedRequiredConnectors;
  if (connected.includes("gmail")) return "gmail";
  if (connected.includes("microsoft")) return "microsoft";
  return null;
}

/**
 * Normalizes a Microsoft Graph message into the same safe shape Gmail
 * messages use, so signal detection, dedupe, and drafting below can stay
 * provider-agnostic.
 */
function fromMicrosoftMessage(message: SafeMicrosoftMessage): SafeGmailMessage {
  const fromEmail = (message.from ?? "").toLowerCase();
  const from = message.fromName ? `${message.fromName} <${fromEmail}>` : fromEmail;
  return {
    id: message.id,
    threadId: message.conversationId ?? undefined,
    labelIds: [],
    from,
    fromEmail,
    to: "",
    subject: message.subject ?? "",
    date: message.receivedAt ?? "",
    snippet: message.bodyPreview ?? "",
    bodyText: message.bodyText ?? message.bodyPreview ?? "",
    internalDate: message.receivedAt ?? undefined,
  };
}

export type ClientFlowSignalType =
  | "project_status_request"
  | "update_request"
  | "missing_info_received"
  | "change_request"
  | "timeline_question"
  | "issue_report"
  | "next_step_request"
  | "awaiting_delivery";

export type ClientFlowSignal = {
  message: SafeGmailMessage;
  signalType: ClientFlowSignalType;
  matchedKeywords: string[];
  confidence: "high" | "medium";
};

type ZendeskClientFlowSignalType = "urgent_ticket" | "unanswered_request" | "stale_follow_up";
type ZendeskClientFlowSignal = { ticket: NormalizedZendeskTicket; signalType: ZendeskClientFlowSignalType; confidence: "high" | "medium" };
type IntercomClientFlowSignalType = "urgent_conversation" | "unanswered_request" | "stale_follow_up";
type IntercomClientFlowSignal = { conversation: NormalizedIntercomConversation; signalType: IntercomClientFlowSignalType; confidence: "high" | "medium" };

export type ClientFlowScanSummary = {
  status?: string;
  message?: string;
  sourceMode?: ClientFlowScanSourceMode;
  scanned?: number;
  signalsFound?: number;
  approvalsCreated?: number;
  outcomesObserved?: number;
  routedToRevenueCount?: number;
  missingScopes?: string[];
  reconnectRequired?: boolean;
  signals?: {
    messageId: string;
    threadId?: string;
    from: string;
    subject: string;
    signalType: ClientFlowSignalType;
    confidence: string;
    trelloPrepared: boolean;
    dedupeKey?: string;
    runId: string;
    approvalId: string;
    sourceProvider?: string;
    ticketId?: string;
  }[];
  skipped?: {
    messageId: string;
    subject?: string;
    from?: string;
    reason: string;
    dedupeKey?: string;
  }[];
  /**
   * Microsoft Teams read context for this run. Optional enhancement only:
   * Client Flow's hard requirement is still a connected email connector, and
   * a Teams failure never fails the scan. Counts and safe reason codes only.
   */
  teams?: TeamsOperatorSignals;
  zendesk?: { scanned: number; signalsFound: number; approvalsCreated: number; skipped: number };
  intercom?: { scanned: number; signalsFound: number; approvalsCreated: number; skipped: number };
  googleDrive?: { scanned: number; usable: number; skipped: number };
  readiness?: unknown;
  error?: string;
  details?: unknown;
};

export type ClientFlowScanResult = {
  ok: boolean;
  status: number;
  body: ClientFlowScanSummary;
};

// Existing-client signal cues, ordered by specificity. The first matching
// group decides the signal type; matched cues across groups are recorded.
const SIGNAL_DEFINITIONS: { type: ClientFlowSignalType; keywords: string[]; strong?: boolean }[] = [
  { type: "issue_report", keywords: ["not working", "broken", "bug", "issue", "blocker", "blocked", "problem", "error", "doesn't work", "does not work"], strong: true },
  { type: "change_request", keywords: ["change request", "revision", "revise", "can you change", "can you update", "please change", "adjust", "amend", "tweak", "edit the"], strong: true },
  { type: "timeline_question", keywords: ["when is this ready", "when will", "eta", "deadline", "by when", "timeline", "how long until", "any update on timing"], strong: true },
  { type: "missing_info_received", keywords: ["here is the", "here are the", "attached", "as requested", "the info you", "the details you", "sending over", "please find"], strong: false },
  { type: "project_status_request", keywords: ["project status", "status update", "where are we", "current status", "status on"], strong: true },
  { type: "update_request", keywords: ["any update", "update on", "checking in", "following up on the project", "progress update", "quick update"], strong: false },
  { type: "next_step_request", keywords: ["next step", "next steps", "what's next", "whats next", "how do we proceed", "what do you need from me"], strong: false },
  { type: "awaiting_delivery", keywords: ["waiting on", "still waiting", "delivery", "when can i expect", "expecting", "awaiting"], strong: false },
];

// Revenue / new-business cues. When present we hand the message back to Revenue
// Operator rather than treating it as existing-client work.
const REVENUE_LEAD_KEYWORDS = [
  "pricing",
  "quote",
  "proposal",
  "demo",
  "how much",
  "what do you charge",
  "cost",
  "interested in working",
  "looking for an agency",
  "new project inquiry",
  "get a quote",
  "trial",
  "sign up",
];

const SKIP_PATTERNS = [
  { reason: "newsletter", pattern: /\b(newsletter|digest|unsubscribe|view in browser)\b/i },
  { reason: "no_reply", pattern: /\b(no-?reply|do-not-reply|donotreply)\b/i },
  { reason: "receipt", pattern: /\b(receipt|payment received|your order|invoice paid|subscription receipt)\b/i },
  { reason: "promo", pattern: /\b(sale|discount code|% off|limited time offer|black friday|promo code)\b/i },
  { reason: "security_alert", pattern: /\b(security alert|verification code|password reset|new sign-in|2fa|two-factor|login alert)\b/i },
  { reason: "tool_notification", pattern: /\b(github|vercel|stripe|slack|notion|linear|jira|asana|cloudflare|supabase)\b.*\b(notification|alert|build|deploy|invoice|digest)\b/i },
];

type DedupeReason =
  | "existing_pending_approval"
  | "already_approved"
  | "previously_rejected"
  | "already_handled";

type ClientFlowDedupeMetadata = {
  dedupeKey: string;
  messageDedupeKey?: string;
  threadDedupeKey?: string;
  contactSubjectDedupeKey?: string;
  gmailMessageId: string;
  gmailThreadId?: string;
  contactEmail: string;
  normalizedSubject: string;
  sourceProvider: ClientFlowEmailConnector;
  operatorKey: "client_flow";
};

function safeText(message: SafeGmailMessage): string {
  return [message.from, message.subject, message.snippet, message.bodyText].join(" ").toLowerCase();
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isSelfSent(message: SafeGmailMessage, providerEmail: string): boolean {
  return Boolean(providerEmail && normalizeEmail(message.fromEmail) === providerEmail);
}

function isSentMail(message: SafeGmailMessage): boolean {
  return message.labelIds.some((label) => label.toUpperCase() === "SENT");
}

function isInovenseGeneratedOutbound(message: SafeGmailMessage, providerEmail: string): boolean {
  if (!isSelfSent(message, providerEmail)) return false;
  const text = safeText(message);
  return text.includes("client flow operator prepared") || text.includes("inovense");
}

function skipReason(message: SafeGmailMessage, providerEmail: string): string | null {
  if (isInovenseGeneratedOutbound(message, providerEmail)) return "inovense_generated_outbound";
  if (isSelfSent(message, providerEmail)) return "self_sent";
  if (isSentMail(message)) return "sent_mail";
  if (!message.fromEmail) return "noise";
  const text = safeText(message);
  for (const item of SKIP_PATTERNS) {
    if (item.pattern.test(text)) return item.reason;
  }
  return null;
}

type DetectionOutcome =
  | { kind: "signal"; signal: ClientFlowSignal }
  | { kind: "routed"; reason: "routed_to_revenue" }
  | { kind: "skipped"; reason: string };

function detectClientFlowSignal(message: SafeGmailMessage, providerEmail: string): DetectionOutcome {
  const skipped = skipReason(message, providerEmail);
  if (skipped) return { kind: "skipped", reason: skipped };

  const text = safeText(message);

  const matched: { type: ClientFlowSignalType; keywords: string[]; strong: boolean }[] = [];
  for (const def of SIGNAL_DEFINITIONS) {
    const keywords = def.keywords.filter((keyword) => text.includes(keyword));
    if (keywords.length > 0) matched.push({ type: def.type, keywords, strong: Boolean(def.strong) });
  }

  const revenueCues = REVENUE_LEAD_KEYWORDS.filter((keyword) => text.includes(keyword));
  const hasStrongClientSignal = matched.some((item) => item.strong);

  // Routing boundary: a new-lead / pricing / demo message belongs to Revenue
  // Operator. Only keep it here when there is also a strong existing-client cue.
  if (revenueCues.length > 0 && !hasStrongClientSignal) {
    return { kind: "routed", reason: "routed_to_revenue" };
  }

  if (matched.length === 0) {
    return { kind: "skipped", reason: "no_client_signal" };
  }

  const primary = matched[0];
  const matchedKeywords = Array.from(new Set(matched.flatMap((item) => item.keywords)));
  return {
    kind: "signal",
    signal: {
      message,
      signalType: primary.type,
      matchedKeywords,
      confidence: primary.strong || matchedKeywords.length >= 2 ? "high" : "medium",
    },
  };
}

function signalLabel(signalType: ClientFlowSignalType): string {
  return {
    project_status_request: "project status request",
    update_request: "update request",
    missing_info_received: "missing info received",
    change_request: "change request",
    timeline_question: "timeline question",
    issue_report: "issue or blocker",
    next_step_request: "next step request",
    awaiting_delivery: "awaiting delivery",
  }[signalType];
}

function zendeskSignalLabel(signalType: ZendeskClientFlowSignalType): string {
  return signalType === "urgent_ticket" ? "urgent support ticket" : signalType === "unanswered_request" ? "unanswered support request" : "stale support follow-up";
}

function detectZendeskClientFlowSignal(ticket: NormalizedZendeskTicket): ZendeskClientFlowSignal | null {
  if (["solved", "closed"].includes(ticket.status)) return null;
  const ageHours = ticket.updatedAt ? Math.max(0, (Date.now() - new Date(ticket.updatedAt).getTime()) / 3_600_000) : 0;
  if (ticket.priority === "urgent" || ticket.priority === "high") return { ticket, signalType: "urgent_ticket", confidence: "high" };
  if ((ticket.status === "new" || !ticket.assigneeId) && ageHours >= 12) return { ticket, signalType: "unanswered_request", confidence: "high" };
  if ((ticket.status === "open" || ticket.status === "pending") && ageHours >= 48) return { ticket, signalType: "stale_follow_up", confidence: "medium" };
  return null;
}

function intercomSignalLabel(signalType: IntercomClientFlowSignalType): string {
  return signalType === "urgent_conversation" ? "urgent customer conversation" : signalType === "unanswered_request" ? "unanswered customer request" : "stale customer follow-up";
}

function detectIntercomClientFlowSignal(conversation: NormalizedIntercomConversation): IntercomClientFlowSignal | null {
  if (["closed", "resolved"].includes(conversation.state)) return null;
  const ageHours = conversation.updatedAt ? Math.max(0, (Date.now() - new Date(conversation.updatedAt).getTime()) / 3_600_000) : 0;
  const latestText = conversation.parts.at(-1)?.preview?.toLowerCase() ?? conversation.subjectOrPreview?.toLowerCase() ?? "";
  if (conversation.priority || /urgent|critical|outage|blocked|escalat/.test(latestText)) return { conversation, signalType: "urgent_conversation", confidence: "high" };
  if (!conversation.assignedAdminId && ageHours >= 12) return { conversation, signalType: "unanswered_request", confidence: "high" };
  if (ageHours >= 48) return { conversation, signalType: "stale_follow_up", confidence: "medium" };
  return null;
}

function approvalTitleFor(signalType: ClientFlowSignalType): string {
  if (signalType === "change_request") return "Client change request needs approval";
  if (signalType === "issue_report") return "Client reported an issue, review needed";
  if (signalType === "project_status_request" || signalType === "update_request") return "Client update needs review";
  return "Project follow-up prepared";
}

function normalizeSubjectForDedupe(subject: string | undefined | null): string {
  return (subject || "")
    .toLowerCase()
    .replace(/^(\s*(re|fw|fwd)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function buildDedupeMetadata(message: SafeGmailMessage, provider: ClientFlowEmailConnector): ClientFlowDedupeMetadata {
  const gmailMessageId = message.id;
  const gmailThreadId = message.threadId || undefined;
  const contactEmail = normalizeEmail(message.fromEmail || message.from);
  const normalizedSubject = normalizeSubjectForDedupe(message.subject);
  const messageDedupeKey = gmailMessageId ? `client_flow:${provider}:message:${gmailMessageId}` : undefined;
  const threadDedupeKey = gmailThreadId ? `client_flow:${provider}:thread:${gmailThreadId}` : undefined;
  const contactSubjectDedupeKey = contactEmail && normalizedSubject
    ? `client_flow:contact_subject:${contactEmail}:${normalizedSubject}`
    : undefined;
  return {
    dedupeKey: messageDedupeKey ?? threadDedupeKey ?? contactSubjectDedupeKey ?? `client_flow:${provider}:message:${Date.now()}`,
    messageDedupeKey,
    threadDedupeKey,
    contactSubjectDedupeKey,
    gmailMessageId,
    gmailThreadId,
    contactEmail,
    normalizedSubject,
    sourceProvider: provider,
    operatorKey: "client_flow",
  };
}

function reasonFromApprovalStatus(status: unknown): DedupeReason {
  if (status === "pending" || status === "executing") return "existing_pending_approval";
  if (status === "approved" || status === "partially_completed" || status === "completed") return "already_approved";
  if (status === "rejected") return "previously_rejected";
  return "already_handled";
}

function setDedupeReason(map: Map<string, DedupeReason>, key: string | undefined | null, reason: DedupeReason) {
  if (!key) return;
  const current = map.get(key);
  if (current === "already_approved" || current === "existing_pending_approval") return;
  map.set(key, reason);
}

function collectDedupeRefs(value: unknown, refs: Map<string, DedupeReason>, reason: DedupeReason) {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  // Historical records predate Microsoft 365 support and never stored
  // sourceProvider - they were always Gmail, so default to "gmail" to keep
  // existing dedupe keys (and therefore existing approval history) intact.
  const provider: ClientFlowEmailConnector = record.sourceProvider === "microsoft" ? "microsoft" : "gmail";
  const messageId = typeof record.gmailMessageId === "string"
    ? record.gmailMessageId
    : typeof record.messageId === "string"
      ? record.messageId
      : undefined;
  const threadId = typeof record.gmailThreadId === "string"
    ? record.gmailThreadId
    : typeof record.threadId === "string"
      ? record.threadId
      : undefined;
  const contactEmail = typeof record.contactEmail === "string" ? normalizeEmail(record.contactEmail) : "";
  const normalizedSubject = typeof record.normalizedSubject === "string"
    ? normalizeSubjectForDedupe(record.normalizedSubject)
    : typeof record.subject === "string"
      ? normalizeSubjectForDedupe(record.subject)
      : "";
  setDedupeReason(refs, typeof record.dedupeKey === "string" ? record.dedupeKey : undefined, reason);
  setDedupeReason(refs, messageId ? `client_flow:${provider}:message:${messageId}` : undefined, reason);
  setDedupeReason(refs, threadId ? `client_flow:${provider}:thread:${threadId}` : undefined, reason);
  setDedupeReason(refs, contactEmail && normalizedSubject ? `client_flow:contact_subject:${contactEmail}:${normalizedSubject}` : undefined, reason);
  Object.values(record).forEach((nested) => collectDedupeRefs(nested, refs, reason));
}

async function loadClientFlowDedupeState(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
}): Promise<Map<string, DedupeReason>> {
  const refs = new Map<string, DedupeReason>();
  const [runs, outputs, approvals, logs] = await Promise.all([
    input.supabase.from("os_operator_runs").select("input,output").eq("workspace_id", input.workspaceId).eq("operator_key", "client_flow").limit(500),
    input.supabase.from("os_operator_outputs").select("payload").eq("workspace_id", input.workspaceId).eq("operator_key", "client_flow").limit(500),
    input.supabase.from("os_approvals").select("status,dedupe_key,continuation_payload").eq("workspace_id", input.workspaceId).eq("agent_id", "client_flow").limit(500),
    input.supabase.from("os_operator_run_logs").select("metadata").eq("workspace_id", input.workspaceId).limit(500),
  ]);

  (runs.data ?? []).forEach((row) => {
    collectDedupeRefs(row.input, refs, "already_handled");
    collectDedupeRefs(row.output, refs, "already_handled");
  });
  (outputs.data ?? []).forEach((row) => collectDedupeRefs(row.payload, refs, "already_handled"));
  (approvals.data ?? []).forEach((row) => {
    const reason = reasonFromApprovalStatus(row.status);
    setDedupeReason(refs, typeof row.dedupe_key === "string" ? row.dedupe_key : undefined, reason);
    collectDedupeRefs(row.continuation_payload, refs, reason);
  });
  (logs.data ?? []).forEach((row) => collectDedupeRefs(row.metadata, refs, "already_handled"));

  return refs;
}

function findDuplicateReason(metadata: ClientFlowDedupeMetadata, refs: Map<string, DedupeReason>): DedupeReason | null {
  const keys = [
    metadata.messageDedupeKey,
    metadata.threadDedupeKey,
    metadata.dedupeKey,
    metadata.contactSubjectDedupeKey,
  ].filter((key): key is string => Boolean(key));
  for (const key of keys) {
    const reason = refs.get(key);
    if (reason) return reason;
  }
  return null;
}

function buildDeterministicDraft(input: {
  signal: ClientFlowSignal;
  personalization: SharedPersonalization;
  signoffName: string;
}): { to: string; subject: string; body: string } {
  const subject = input.signal.message.subject ? `Re: ${input.signal.message.subject}` : "Following up on your message";
  const actionLine = (() => {
    switch (input.signal.signalType) {
      case "change_request":
        return "I've noted the change request and will follow up with the status shortly.";
      case "issue_report":
        return "I've logged what you reported and will look into it, then come back with a clear next step.";
      case "timeline_question":
        return "I'll confirm where this stands and come back to you with the timing.";
      case "missing_info_received":
        return "Thanks for sending this over. I've got what I need and will keep things moving.";
      case "project_status_request":
      case "update_request":
        return "I'll check the current status and make sure the next step is clear.";
      case "awaiting_delivery":
        return "I'll check on this and update you on where the delivery stands.";
      default:
        return "I'll review this and make sure the next step is clear.";
    }
  })();
  return {
    to: input.signal.message.fromEmail,
    subject,
    body: [
      input.personalization.greetingUsed,
      "",
      "Thanks for the update.",
      "",
      actionLine,
      "",
      "Best,",
      input.signoffName,
    ].join("\n"),
  };
}

function scanFailure(error: unknown): ClientFlowScanResult {
  if (error instanceof GmailApiError) {
    return {
      ok: false,
      status: error.details.status || 502,
      body: { error: "gmail_scan_failed", message: error.message, details: error.details },
    };
  }
  if (error instanceof MicrosoftReauthRequiredError) {
    return {
      ok: false,
      status: 409,
      body: { error: "microsoft_reconnect_required", message: error.message, reconnectRequired: true },
    };
  }
  if (error instanceof MicrosoftGraphError) {
    return {
      ok: false,
      status: error.details.status || 502,
      body: { error: "microsoft_scan_failed", message: error.message, details: error.details },
    };
  }
  return {
    ok: false,
    status: 500,
    body: { error: "client_flow_scan_failed", message: error instanceof Error ? error.message : "Client Flow scan failed." },
  };
}

async function insertStep(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  runId: string;
  stepKey: string;
  title: string;
  output?: Record<string, unknown>;
}) {
  return input.supabase.from("os_operator_run_steps").insert({
    id: operatorRuntimeId("opstep"),
    workspace_id: input.workspaceId,
    run_id: input.runId,
    step_key: input.stepKey,
    title: input.title,
    status: "completed",
    output: input.output ?? {},
    completed_at: new Date().toISOString(),
  });
}

function nextDailyRunFrom(lastRunAt: string): string {
  return new Date(new Date(lastRunAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
}

async function upsertClientFlowMonitoringConfig(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  sourceMode: ClientFlowScanSourceMode;
  lastRunAt: string;
  lastRunStatus: string;
  lastRunSummary: Record<string, unknown>;
}) {
  const triggerId = `optrig-${input.workspaceId}-client-flow-monitoring`;
  return input.supabase.from("os_operator_triggers").upsert({
    id: triggerId,
    workspace_id: input.workspaceId,
    operator_key: "client_flow",
    trigger_type: "scheduled_monitoring",
    enabled: true,
    config: {
      monitoringEnabled: true,
      cadence: "daily",
      scheduleProvider: "trigger.dev",
      triggerTaskId: "client-flow-operator-daily-scan",
      lastRunAt: input.lastRunAt,
      nextRunAt: nextDailyRunFrom(input.lastRunAt),
      lastRunStatus: input.lastRunStatus,
      lastRunSummary: input.lastRunSummary,
      manualRunAvailable: true,
      sourceMode: input.sourceMode,
    },
  });
}

function buildClientFlowTrelloAction(input: {
  workspaceId: string;
  signal: ClientFlowSignal;
  trello: TrelloProjectSettings;
  taskTitle: string;
  taskDescription: string;
  dedupeKey: string;
  policySettings: PolicyWorkspaceSettings;
  emailConnector: ClientFlowEmailConnector;
}): PreparedAction | null {
  if (!input.trello.defaultBoardId || !input.trello.defaultListId) return null;
  return prepareAction({
    workspaceId: input.workspaceId,
    operatorKey: "client_flow",
    actionType: "create_task",
    connectorKey: "trello",
    capability: "pm.tasks.write_after_approval",
    title: input.taskTitle,
    summary: `Client Flow task for ${signalLabel(input.signal.signalType)} from ${input.signal.message.fromEmail}.`,
    input: {
      boardId: input.trello.defaultBoardId,
      boardName: input.trello.defaultBoardName ?? "Default board",
      listId: input.trello.defaultListId,
      listName: input.trello.defaultListName ?? "Default list",
      name: input.taskTitle,
      description: input.taskDescription,
    },
    dedupeKey: `${input.dedupeKey}:trello_task`,
    source: input.emailConnector,
    metadata: {
      operatorKey: "client_flow",
      signalType: input.signal.signalType,
      fromEmail: input.signal.message.fromEmail,
      sourceSubject: input.signal.message.subject,
    },
  }, { policySettings: input.policySettings });
}

async function prepareExternalClientFlowWorkflow(input: { supabase: SupabaseAdmin; workspaceId: string; provider: string; sourceId: string; threadId?: string | null; subject: string; snippet: string; signalType: string; priority: number; confidence: "low" | "medium" | "high"; action: PreparedAction; context: ClientFlowContext }): Promise<{ workflowId: string; stepId: string; existingApprovalId: string | null }> {
  const dedupeKey = `client_flow:${input.provider}:${input.sourceId}:${input.signalType}`;
  const event: SignalEvent = { id: `sig_${dedupeKey}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180), workspaceId: input.workspaceId, connectorKey: input.provider, provider: input.provider, source: input.provider, sourceType: input.provider === "zendesk" ? "support_ticket" : "support_conversation", eventType: `${input.provider}.client_flow_observed`, sourceId: input.sourceId, sourceParentId: input.threadId ?? null, threadId: input.threadId ?? null, subject: input.subject, snippet: input.snippet, occurredAt: new Date().toISOString(), category: "customer_request", dedupeKey, metadata: { clientFlowContext: publicClientFlowContext(input.context), signalType: input.signalType } };
  const candidate = buildClientFlowCandidate({ workspaceId: input.workspaceId, provider: input.provider, sourceId: input.sourceId, signalType: input.signalType, priority: input.priority, confidence: input.confidence, reasonCodes: input.context.priorityReasons, dedupeKey, supportingOperators: [] });
  const persisted = await persistClientFlowCandidate({ supabase: input.supabase, workspaceId: input.workspaceId, event, candidate });
  const workflow = await ensureClientFlowWorkflow({ supabase: input.supabase, workspaceId: input.workspaceId, signalId: persisted.signalId, candidate: persisted.candidate, entityId: input.threadId ?? input.sourceId, action: input.action, context: input.context });
  await createClientFlowSupportingHandoffs({ supabase: input.supabase, workspaceId: input.workspaceId, parentWorkflowId: workflow.workflowId, signalId: persisted.signalId, candidate: persisted.candidate, context: input.context });
  return workflow;
}

async function createZendeskClientFlowApproval(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  readiness: OperatorReadiness;
  policySettings: PolicyWorkspaceSettings;
  signal: ZendeskClientFlowSignal;
  subdomain: string;
}): Promise<{ runId: string; approvalId: string; action: PreparedAction; workflowId: string; stepId: string; existingApprovalId: string | null }> {
  const { ticket, signalType } = input.signal;
  const dedupeKey = `client_flow:zendesk:ticket:${ticket.ticketId}:${signalType}`;
  const body = "Thanks for reaching out. We’re reviewing this request and will follow up with the next update shortly.";
  const action = prepareAction({
    workspaceId: input.workspaceId,
    operatorKey: "client_flow",
    actionType: "reply_zendesk_ticket",
    connectorKey: "zendesk",
    capability: "support.tickets.reply_after_approval",
    title: `Reply to Zendesk ticket ${ticket.ticketId}`,
    summary: `Prepare an approval-gated reply for ${zendeskSignalLabel(signalType)}: ${ticket.subject}.`,
    input: { ticketId: ticket.ticketId, subject: ticket.subject, body },
    dedupeKey,
    source: "zendesk_scan",
    destinationType: "customer",
    confidence: input.signal.confidence,
    riskLevel: "high",
    normalizedTarget: ticket.ticketId,
    metadata: { operatorKey: "client_flow", zendeskSubdomain: input.subdomain, zendeskTicketId: ticket.ticketId, payloadIdentity: `${ticket.ticketId}:${signalType}`, signalType },
  }, { policySettings: input.policySettings });
  const context = buildClientFlowContext({ provider: "zendesk", messageId: ticket.ticketId, customerName: ticket.requesterName, company: ticket.organizationName, subject: ticket.subject, request: ticket.commentPreview, signalType, confidence: input.signal.confidence, supportingOperators: [], support: { ticketId: ticket.ticketId, openIssue: ticket.commentPreview, escalationState: ticket.priority ?? null } });
  const workflow = await prepareExternalClientFlowWorkflow({ supabase: input.supabase, workspaceId: input.workspaceId, provider: "zendesk", sourceId: ticket.ticketId, subject: ticket.subject, snippet: ticket.commentPreview ?? "", signalType, priority: context.priority, confidence: input.signal.confidence, action, context });
  if (workflow.existingApprovalId) return { runId: "", approvalId: workflow.existingApprovalId, action, workflowId: workflow.workflowId, stepId: workflow.stepId, existingApprovalId: workflow.existingApprovalId };
  const runId = operatorRuntimeId("oprun-client-flow-zendesk");
  const startedAt = new Date().toISOString();
  const runInsert = await input.supabase.from("os_operator_runs").insert({ id: runId, workspace_id: input.workspaceId, operator_key: "client_flow", trigger_type: "zendesk_scan", status: "waiting_for_approval", input: { source: "zendesk_scan", ticketId: ticket.ticketId, signalType, dedupeKey }, output: {}, readiness: input.readiness, risk_level: "high", started_at: startedAt });
  if (runInsert.error) throw new Error(runInsert.error.message);
  const approvalId = operatorRuntimeId("appr-client-flow-zendesk");
  const approvalInsert = await input.supabase.from("os_approvals").insert({ id: approvalId, workspace_id: input.workspaceId, type: "action", title: action.title, body: action.summary, agent_id: CLIENT_FLOW_AGENT_ID, agent_mark: CLIENT_FLOW_AGENT_MARK, agent_color: CLIENT_FLOW_AGENT_COLOR, run_id: runId, status: "pending", dedupe_key: dedupeKey, created_at: startedAt, continuation_payload: { kind: "shared_action.execute_after_approval", workspaceId: input.workspaceId, operatorKey: "client_flow", preparedAction: action, workflowId: workflow.workflowId, workflowStepId: workflow.stepId, clientFlowContext: publicClientFlowContext(context) }, policy_reason: "Zendesk customer replies require human approval before execution." });
  if (approvalInsert.error) throw new Error(approvalInsert.error.message);
  await linkClientFlowApprovalWorkflow({ supabase: input.supabase, workspaceId: input.workspaceId, workflowId: workflow.workflowId, stepId: workflow.stepId, approvalId, context });
  const output = { type: "client_flow_zendesk_action", source: "zendesk_scan", ticketId: ticket.ticketId, subject: ticket.subject, signalType, approvalId, preparedAction: action };
  const outputInsert = await input.supabase.from("os_operator_outputs").insert({ id: operatorRuntimeId("opout"), workspace_id: input.workspaceId, run_id: runId, operator_key: "client_flow", output_type: "client_flow_zendesk_action", title: action.title, payload: output, requires_approval: true, approval_id: approvalId });
  if (outputInsert.error) throw new Error(outputInsert.error.message);
  return { runId, approvalId, action, workflowId: workflow.workflowId, stepId: workflow.stepId, existingApprovalId: null };
}

async function createIntercomClientFlowApproval(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  readiness: OperatorReadiness;
  policySettings: PolicyWorkspaceSettings;
  signal: IntercomClientFlowSignal;
}): Promise<{ runId: string; approvalId: string; action: PreparedAction; workflowId: string; stepId: string; existingApprovalId: string | null }> {
  const { conversation, signalType } = input.signal;
  const dedupeKey = `client_flow:intercom:conversation:${conversation.region}:${conversation.conversationId}:${signalType}`;
  const body = "Thanks for reaching out. We’re reviewing this request and will follow up with the next update shortly.";
  const action = prepareAction({
    workspaceId: input.workspaceId,
    operatorKey: "client_flow",
    actionType: "reply_intercom_conversation",
    connectorKey: "intercom",
    capability: "support.conversations.reply_after_approval",
    title: `Reply to Intercom conversation ${conversation.conversationId}`,
    summary: `Prepare an approval-gated reply for ${intercomSignalLabel(signalType)}${conversation.contactName ? ` from ${conversation.contactName}` : ""}.`,
    input: { conversationId: conversation.conversationId, body, region: conversation.region },
    dedupeKey,
    source: "intercom_scan",
    destinationType: "customer",
    confidence: input.signal.confidence,
    riskLevel: "high",
    normalizedTarget: conversation.conversationId,
    metadata: { operatorKey: "client_flow", intercomRegion: conversation.region, intercomConversationId: conversation.conversationId, payloadIdentity: `${conversation.region}:${conversation.conversationId}:${signalType}`, signalType },
  }, { policySettings: input.policySettings });
  const context = buildClientFlowContext({ provider: "intercom", messageId: conversation.conversationId, threadId: conversation.conversationId, customerName: conversation.contactName, company: conversation.companyName, subject: conversation.subjectOrPreview, request: conversation.parts.map((part) => part.preview ?? "").filter(Boolean).slice(-3).join(" "), signalType, confidence: input.signal.confidence, supportingOperators: [] });
  const workflow = await prepareExternalClientFlowWorkflow({ supabase: input.supabase, workspaceId: input.workspaceId, provider: "intercom", sourceId: conversation.conversationId, threadId: conversation.conversationId, subject: conversation.subjectOrPreview ?? "", snippet: conversation.parts.map((part) => part.preview ?? "").filter(Boolean).slice(-3).join(" "), signalType, priority: context.priority, confidence: input.signal.confidence, action, context });
  if (workflow.existingApprovalId) return { runId: "", approvalId: workflow.existingApprovalId, action, workflowId: workflow.workflowId, stepId: workflow.stepId, existingApprovalId: workflow.existingApprovalId };
  const runId = operatorRuntimeId("oprun-client-flow-intercom");
  const startedAt = new Date().toISOString();
  const runInsert = await input.supabase.from("os_operator_runs").insert({ id: runId, workspace_id: input.workspaceId, operator_key: "client_flow", trigger_type: "intercom_scan", status: "waiting_for_approval", input: { source: "intercom_scan", conversationId: conversation.conversationId, signalType, dedupeKey }, output: {}, readiness: input.readiness, risk_level: "high", started_at: startedAt });
  if (runInsert.error) throw new Error(runInsert.error.message);
  const approvalId = operatorRuntimeId("appr-client-flow-intercom");
  const approvalInsert = await input.supabase.from("os_approvals").insert({ id: approvalId, workspace_id: input.workspaceId, type: "action", title: action.title, body: action.summary, agent_id: CLIENT_FLOW_AGENT_ID, agent_mark: CLIENT_FLOW_AGENT_MARK, agent_color: CLIENT_FLOW_AGENT_COLOR, run_id: runId, status: "pending", dedupe_key: dedupeKey, created_at: startedAt, continuation_payload: { kind: "shared_action.execute_after_approval", workspaceId: input.workspaceId, operatorKey: "client_flow", preparedAction: action, workflowId: workflow.workflowId, workflowStepId: workflow.stepId, clientFlowContext: publicClientFlowContext(context) }, policy_reason: "Intercom customer replies require human approval before execution." });
  if (approvalInsert.error) throw new Error(approvalInsert.error.message);
  await linkClientFlowApprovalWorkflow({ supabase: input.supabase, workspaceId: input.workspaceId, workflowId: workflow.workflowId, stepId: workflow.stepId, approvalId, context });
  const output = { type: "client_flow_intercom_action", source: "intercom_scan", conversationId: conversation.conversationId, signalType, approvalId, preparedAction: action };
  const outputInsert = await input.supabase.from("os_operator_outputs").insert({ id: operatorRuntimeId("opout"), workspace_id: input.workspaceId, run_id: runId, operator_key: "client_flow", output_type: "client_flow_intercom_action", title: action.title, payload: output, requires_approval: true, approval_id: approvalId });
  if (outputInsert.error) throw new Error(outputInsert.error.message);
  return { runId, approvalId, action, workflowId: workflow.workflowId, stepId: workflow.stepId, existingApprovalId: null };
}

async function observeClientFlowWorkflows(input: { supabase: SupabaseAdmin; workspaceId: string; emailMessages: SafeGmailMessage[] }): Promise<number> {
  const workflowsResult = await input.supabase.from("os_workflow_runs").select("id,originating_signal_id,status").eq("workspace_id", input.workspaceId).eq("operator_key", "client_flow").eq("status", "executing").limit(100);
  if (workflowsResult.error || !workflowsResult.data?.length) return 0;
  const workflows = workflowsResult.data as Array<Record<string, unknown>>;
  const workflowIds = workflows.map((row) => String(row.id));
  const signalIds = workflows.map((row) => String(row.originating_signal_id ?? "")).filter(Boolean);
  const [stepsResult, signalsResult, childrenResult] = await Promise.all([
    input.supabase.from("os_workflow_steps").select("id,workflow_id,execution_intent_id,status").eq("workspace_id", input.workspaceId).in("workflow_id", workflowIds).eq("status", "executing"),
    signalIds.length ? input.supabase.from("os_signal_events").select("id,source,source_id,source_parent_id,observed_at").eq("workspace_id", input.workspaceId).in("id", signalIds) : Promise.resolve({ data: [], error: null }),
    input.supabase.from("os_workflow_runs").select("id,parent_workflow_id,operator_key,status").eq("workspace_id", input.workspaceId).in("parent_workflow_id", workflowIds).in("status", ["completed", "partially_completed"]),
  ]);
  if (stepsResult.error || signalsResult.error || childrenResult.error) return 0;
  const steps = new Map((stepsResult.data ?? []).map((row) => [String(row.workflow_id), row as Record<string, unknown>]));
  const signals = new Map((signalsResult.data ?? []).map((row) => [String(row.id), row as Record<string, unknown>]));
  const children = (childrenResult.data ?? []) as Array<Record<string, unknown>>;
  let observed = 0;
  for (const workflow of workflows) {
    const workflowId = String(workflow.id);
    const step = steps.get(workflowId);
    if (!step) continue;
    const signal = signals.get(String(workflow.originating_signal_id ?? ""));
    const provider = String(signal?.source ?? "");
    const sourceId = String(signal?.source_id ?? "");
    const threadId = String(signal?.source_parent_id ?? sourceId);
    const initialAt = Date.parse(String(signal?.observed_at ?? ""));
    const reply = ["gmail", "microsoft"].includes(provider)
      ? input.emailMessages.find((message) => Boolean(message.threadId === threadId && message.id !== sourceId && (!Number.isFinite(initialAt) || Date.parse(message.date || message.internalDate || "") >= initialAt)))
      : null;
    if (reply) {
      const observation = observeClientFlowCustomerReply({ workflowId, provider, threadId, messageId: reply.id, subject: reply.subject, snippet: reply.snippet || reply.bodyText, linkedActionExecuted: true });
      await recordObservedWorkflowOutcome({ workspaceId: input.workspaceId, operatorKey: "client_flow", workflowId, signalId: signal?.id ? String(signal.id) : null, executionIntentId: step.execution_intent_id ? String(step.execution_intent_id) : null, outcomeType: observation.outcomeType, attributionLevel: observation.attributionLevel, confidence: observation.confidence, evidenceRefs: observation.evidenceRefs, observedAt: new Date().toISOString(), supabase: input.supabase });
      observed += 1;
      if (observation.outcomeType === "clientflow_customer_confirmed") {
        await input.supabase.from("os_workflow_steps").update({ status: "completed", result_ref: observation.evidenceRefs[0] ?? "clientflow_customer_confirmed", safe_error_code: null }).eq("id", String(step.id)).eq("workspace_id", input.workspaceId);
        await input.supabase.from("os_workflow_runs").update({ status: "completed" }).eq("id", workflowId).eq("workspace_id", input.workspaceId);
      }
    }
    for (const child of children.filter((item) => String(item.parent_workflow_id) === workflowId)) {
      const observation = observeClientFlowHandoff({ workflowId, supportingOwner: String(child.operator_key ?? "unknown"), childWorkflowId: String(child.id), childStatus: String(child.status), linkedActionExecuted: true });
      if (!observation) continue;
      // The child operator has already returned its evidence through the
      // shared return path. This row is presentation state, not a second win.
      observed += 1;
    }
  }
  return observed;
}

export async function scanClientFlowSignals(input: {
  workspaceId: string;
  maxResults?: number;
  sourceMode?: ClientFlowScanSourceMode;
  supabase?: SupabaseAdmin;
}): Promise<ClientFlowScanResult> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workspaceId = input.workspaceId.trim();
  const sourceMode = input.sourceMode ?? "manual";

  const readiness = await getOperatorReadiness({ workspaceId, operatorKey: "client_flow" });
  if (!readiness) {
    return { ok: false, status: 404, body: { error: "Client Flow Operator readiness was not found." } };
  }
  if (readiness.status === "missing_connector") {
    return { ok: false, status: 409, body: { status: "missing_connector", message: "Connect Gmail or Microsoft 365 to monitor client communication.", readiness } };
  }
  if (readiness.status === "upgrade_required") {
    return { ok: false, status: 402, body: { status: "upgrade_required", message: readiness.reason, readiness } };
  }
  if (!readiness.canRunManual || (readiness.status !== "ready" && readiness.status !== "draft_only")) {
    return { ok: false, status: 409, body: { status: readiness.status, message: readiness.reason, readiness } };
  }

  // Real billing enforcement - see the matching check in revenue/scan.ts for
  // the full rationale. Checked after connector readiness, before any
  // connector API/model call, and never blocks review/action on approvals
  // already sitting in the queue - it only gates starting new scan work.
  const executionEligibility = await getWorkspaceExecutionEligibility(workspaceId, supabase);
  if (!executionEligibility.eligible) {
    return {
      ok: false,
      status: 402,
      body: {
        status: "plan_required",
        message: executionEligibility.reason,
        sourceMode,
        readiness,
        details: { billingStatus: executionEligibility.billingStatus, planTier: executionEligibility.planTier, trialEndsAt: executionEligibility.trialEndsAt },
      },
    };
  }

  const emailConnector = resolveClientFlowEmailConnector(readiness);
  if (!emailConnector) {
    return { ok: false, status: 409, body: { status: "missing_connector", message: "Connect Gmail or Microsoft 365 to monitor client communication.", readiness } };
  }

  let gmailCredential: StoredConnectorCredential | null = null;
  let microsoftCredential: StoredMicrosoftCredential | null = null;

  if (emailConnector === "gmail") {
    const credentialRes = await supabase
      .from("os_connector_credentials")
      .select("id,workspace_id,connector_key,provider_account_id,provider_email,encrypted_access_token,encrypted_refresh_token,token_expires_at,scopes,status,metadata")
      .eq("workspace_id", workspaceId)
      .eq("connector_key", "gmail")
      .maybeSingle();

    if (credentialRes.error) {
      return { ok: false, status: 500, body: { error: credentialRes.error.message } };
    }
    if (!credentialRes.data) {
      return { ok: false, status: 409, body: { status: "missing_gmail", message: "Connect Gmail to monitor client communication." } };
    }

    gmailCredential = credentialRes.data as StoredConnectorCredential;
    const missingSendScopes = getMissingGmailScopes(gmailCredential.scopes, GMAIL_SEND_REQUIRED_SCOPES);
    if (missingSendScopes.length > 0) {
      return {
        ok: false,
        status: 409,
        body: { status: "requires_gmail_send_scope", message: "Reconnect Gmail to enable approval-gated client replies.", missingScopes: missingSendScopes, reconnectRequired: true },
      };
    }
    const missingScanScopes = getMissingGmailScopes(gmailCredential.scopes, GMAIL_SCAN_REQUIRED_SCOPES);
    if (missingScanScopes.length > 0) {
      return {
        ok: false,
        status: 409,
        body: { status: "requires_gmail_read_scope", message: "Reconnect Gmail to enable client communication monitoring.", missingScopes: missingScanScopes, reconnectRequired: true },
      };
    }
  } else {
    microsoftCredential = await getMicrosoftCredential(workspaceId, supabase);
    if (!microsoftCredential || microsoftCredential.status === "needs_attention") {
      return { ok: false, status: 409, body: { status: "missing_microsoft", message: "Connect Microsoft 365 to monitor client communication." } };
    }
    const missingSendScopes = getMissingMicrosoftScopes(microsoftCredential.scopes, MICROSOFT_SEND_REQUIRED_SCOPES);
    if (missingSendScopes.length > 0) {
      return {
        ok: false,
        status: 409,
        body: { status: "requires_microsoft_send_scope", message: "Reconnect Microsoft 365 to enable approval-gated client replies.", missingScopes: missingSendScopes, reconnectRequired: true },
      };
    }
    const missingScanScopes = getMissingMicrosoftScopes(microsoftCredential.scopes, MICROSOFT_READ_REQUIRED_SCOPES);
    if (missingScanScopes.length > 0) {
      return {
        ok: false,
        status: 409,
        body: { status: "requires_microsoft_read_scope", message: "Reconnect Microsoft 365 to enable client communication monitoring.", missingScopes: missingScanScopes, reconnectRequired: true },
      };
    }
  }

  try {
    const accessToken = emailConnector === "gmail"
      ? await resolveAccessTokenFromCredential(gmailCredential as StoredConnectorCredential)
      : await resolveMicrosoftAccessToken({ workspaceId, credential: microsoftCredential as StoredMicrosoftCredential, supabase });
    const providerEmail = emailConnector === "gmail"
      ? normalizeEmail((gmailCredential as StoredConnectorCredential).provider_email)
      : normalizeEmail((microsoftCredential as StoredMicrosoftCredential).provider_email);
    const connectorTruth = await getConnectorTruth({ workspaceId, supabase });
    const hubspotConnected = connectorTruth.some((connector) =>
      connector.connectorKey === "hubspot" && connector.executable === true);
    const trelloConnected = connectorTruth.some((connector) =>
      connector.connectorKey === "trello" && (connector.status === "healthy" || connector.status === "connected") && connector.source === "native");
    // Microsoft Teams is a native connector, so there are no Nango ids to
    // check - only its own healthy truth (which already requires real Teams
    // consent, not just a working Microsoft 365 mail connection).
    const teamsConnected = connectorTruth.some((connector) =>
      connector.connectorKey === "microsoft_teams" && connector.status === "healthy");
    const zendeskTruth = connectorTruth.find((connector) => connector.connectorKey === "zendesk");
    const zendeskConnected = zendeskTruth?.status === "healthy";
    const zendeskExecutable = zendeskTruth?.executable === true;
    const intercomTruth = connectorTruth.find((connector) => connector.connectorKey === "intercom");
    const intercomConnected = intercomTruth?.status === "healthy";
    const intercomExecutable = intercomTruth?.executable === true;
    let driveContextPrompt = "";
    let driveContextSummary = { scanned: 0, usable: 0, skipped: 0 };
    const driveTruth = connectorTruth.find((connector) => connector.connectorKey === "google_drive");
    if (driveTruth?.status === "healthy") {
      try { const driveContext = await loadSelectedGoogleDriveContext({ workspaceId, supabase, maxFiles: 5 }); driveContextPrompt = buildUntrustedGoogleDrivePromptContext(driveContext.files); driveContextSummary = { scanned: driveContext.scanned, usable: driveContext.files.length, skipped: driveContext.skipped }; } catch (error) { console.warn("[client-flow-scan] Drive context skipped", { workspaceId, error: error instanceof Error ? error.message : "Unknown Drive error" }); }
    }

    const workspacePolicy = await loadWorkspacePolicySettings({ supabase, workspaceId });
    const policySettings = await loadPolicyWorkspaceSettings({ supabase, workspaceId });
    const workspaceRow = await supabase.from("os_workspaces").select("name").eq("id", workspaceId).maybeSingle();
    const signoffName = (typeof workspaceRow.data?.name === "string" && workspaceRow.data.name.trim()) ? workspaceRow.data.name.trim() : "The team";

    const maxResults = Math.min(Math.max(Number(input.maxResults) || 15, 1), 20);
  const listed = emailConnector === "gmail"
      ? await listRecentMessages(accessToken, { maxResults, query: "newer_than:30d" })
      : (await listRecentMicrosoftMessages(accessToken, maxResults)).map((message) => ({ id: message.id }));
    const handled = await loadClientFlowDedupeState({ supabase, workspaceId });
    const emailObservations: SafeGmailMessage[] = [];

    const skipped: NonNullable<ClientFlowScanSummary["skipped"]> = [];
    const signals: ClientFlowSignal[] = [];
    let routedToRevenueCount = 0;
    const zendeskSignals: ZendeskClientFlowSignal[] = [];
    let zendeskScanned = 0;
    let zendeskSkipped = 0;
    let zendeskActionCount = 0;
    const intercomSignals: IntercomClientFlowSignal[] = [];
    let intercomScanned = 0;
    let intercomSkipped = 0;
    let intercomActionCount = 0;

    if (zendeskConnected) {
      try {
        const credential = await getStoredZendeskCredential(workspaceId, supabase);
        const subdomain = typeof credential?.metadata?.subdomain === "string" ? credential.metadata.subdomain : null;
        if (credential && subdomain) {
          const token = await resolveZendeskAccessToken({ workspaceId, credential, supabase });
          const result = await listZendeskTickets(token, subdomain, { cursor: typeof credential.metadata?.syncCursor === "string" ? credential.metadata.syncCursor : null, updatedSince: typeof credential.metadata?.lastScannedAt === "string" ? credential.metadata.lastScannedAt : null, maxResults: Math.min(maxResults, 20) });
          zendeskScanned = result.tickets.length;
          for (const ticket of result.tickets) {
            const normalized = normalizeZendeskTicket(ticket, subdomain);
            const detected = detectZendeskClientFlowSignal(normalized);
            if (detected) zendeskSignals.push(detected); else zendeskSkipped += 1;
          }
          await supabase.from("os_connector_credentials").update({ metadata: { ...(credential.metadata ?? {}), lastScannedAt: new Date().toISOString(), syncCursor: result.nextCursor } }).eq("workspace_id", workspaceId).eq("connector_key", "zendesk");
        }
      } catch (error) {
        console.warn("[client-flow-scan] Zendesk context skipped", { workspaceId, error: error instanceof Error ? error.message : "Unknown Zendesk error" });
      }
    }

    if (intercomConnected) {
      try {
        const credential = await getStoredIntercomCredential(workspaceId, supabase);
        if (credential) {
          const token = await resolveIntercomAccessToken({ workspaceId, credential, supabase });
          const region = typeof credential.metadata?.region === "string" ? credential.metadata.region as "us" | "eu" | "au" : "us";
          const result = await listIntercomConversations(token, region, { cursor: typeof credential.metadata?.syncCursor === "string" ? credential.metadata.syncCursor : null, updatedSince: typeof credential.metadata?.lastScannedAt === "string" ? credential.metadata.lastScannedAt : null, maxResults: Math.min(maxResults, 20) });
          intercomScanned = result.conversations.length;
          for (const conversation of result.conversations) {
            const normalized = normalizeIntercomConversation(conversation, region);
            const detected = detectIntercomClientFlowSignal(normalized);
            if (detected) intercomSignals.push(detected); else intercomSkipped += 1;
          }
          await supabase.from("os_connector_credentials").update({ metadata: { ...(credential.metadata ?? {}), lastScannedAt: new Date().toISOString(), syncCursor: result.nextCursor } }).eq("workspace_id", workspaceId).eq("connector_key", "intercom");
        }
      } catch (error) {
        console.warn("[client-flow-scan] Intercom context skipped", { workspaceId, error: error instanceof Error ? error.message : "Unknown Intercom error" });
      }
    }

    for (const item of listed) {
      const message = emailConnector === "gmail"
        ? await getMessageDetails(accessToken, item.id)
        : fromMicrosoftMessage(await getMicrosoftMessage(accessToken, item.id));
      emailObservations.push(message);
      const dedupe = buildDedupeMetadata(message, emailConnector);
      const duplicateReason = findDuplicateReason(dedupe, handled);
      if (duplicateReason) {
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: duplicateReason, dedupeKey: dedupe.dedupeKey });
        continue;
      }
      const inboundEvent = normalizeEmailToSignalEvent({
        workspaceId,
        message,
        provider: emailConnector,
        rawRef: `${emailConnector}:${message.id}`,
        metadata: {
          dedupeKey: dedupe.dedupeKey,
          sourceMode,
          senderName: message.from,
          threadMessageCount: message.threadId ? 2 : 1,
        },
      });
      const routedInbound = routeSignalEvent(inboundEvent);
      const clientFlowCandidate = routedInbound.candidates.find((candidate) => candidate.operatorKey === "client_flow") ?? null;
      if (!clientFlowCandidate) {
        if (routedInbound.decision.primaryOperator === "revenue") {
          routedToRevenueCount += 1;
          skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: "routed_to_revenue" });
        } else {
          skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: `inbound_${(routedInbound.decision.primaryIntent || "unknown").toLowerCase()}` });
        }
        continue;
      }
      const detected = detectClientFlowSignal(message, providerEmail);
      if (detected.kind === "routed") {
        routedToRevenueCount += 1;
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: detected.reason });
      } else if (detected.kind === "skipped") {
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: detected.reason });
      } else {
        signals.push(detected.signal);
      }
    }

    const created: NonNullable<ClientFlowScanSummary["signals"]> = [];

    for (const signal of signals) {
      const dedupe = buildDedupeMetadata(signal.message, emailConnector);
      const duplicateReason = findDuplicateReason(dedupe, handled);
      if (duplicateReason) {
        skipped.push({ messageId: signal.message.id, subject: signal.message.subject, from: signal.message.from, reason: duplicateReason, dedupeKey: dedupe.dedupeKey });
        continue;
      }

      const runId = operatorRuntimeId("oprun-client-flow-scan");
      const personalization = await buildContactPersonalization({
        workspaceId,
        from: signal.message.from,
        fromEmail: signal.message.fromEmail,
        bodyText: signal.message.bodyText,
        snippet: signal.message.snippet,
        hubspotConnected,
      });
      const deterministicDraft = buildDeterministicDraft({ signal, personalization, signoffName });
      const defaultTaskTitle = `${approvalTitleFor(signal.signalType).replace(/ needs.*$/i, "")}: ${personalization.contactName ?? signal.message.fromEmail}`.slice(0, 70);
      const defaultTaskDescription = [
        `Client signal: ${signalLabel(signal.signalType)}.`,
        `From: ${signal.message.fromEmail}.`,
        `Source subject: ${signal.message.subject || "(no subject)"}.`,
        signal.message.snippet ? `Context: ${signal.message.snippet.slice(0, 280)}` : null,
      ].filter(Boolean).join("\n");

      const aiDraft = await draftClientFlowReplyWithAI({ signal, deterministicDraft, defaultTaskTitle, defaultTaskDescription, driveContext: driveContextPrompt });
      const draft = { ...aiDraft.draft, body: applyGreeting(aiDraft.draft.body, personalization.greetingUsed) };

      const clientFlowTrelloAction = trelloConnected
        ? buildClientFlowTrelloAction({
          workspaceId,
          signal,
          trello: workspacePolicy.trello,
          taskTitle: aiDraft.trelloTaskTitle,
          taskDescription: aiDraft.trelloTaskDescription,
          dedupeKey: dedupe.dedupeKey,
          policySettings,
          emailConnector,
        })
        : null;
      const trelloPrepared = Boolean(clientFlowTrelloAction);

      const canonicalEvent = normalizeEmailToSignalEvent({
        workspaceId,
        message: signal.message,
        provider: emailConnector,
        rawRef: `${emailConnector}:${signal.message.id}`,
        metadata: { sourceMode, senderName: signal.message.from, threadMessageCount: signal.message.threadId ? 2 : 1 },
      });
      const canonical = await persistCanonicalClientFlowSignal({ supabase, event: { ...canonicalEvent, id: canonicalEvent.id } });
      if (!canonical) {
        skipped.push({ messageId: signal.message.id, subject: signal.message.subject, from: signal.message.from, reason: "canonical_candidate_unavailable", dedupeKey: dedupe.dedupeKey });
        continue;
      }
      const clientFlowContext = buildClientFlowContext({ provider: emailConnector, messageId: signal.message.id, threadId: signal.message.threadId, customerEmail: signal.message.fromEmail, customerName: personalization.contactName, subject: signal.message.subject, request: signal.message.bodyText || signal.message.snippet, receivedAt: signal.message.date || signal.message.internalDate, signalType: signal.signalType, matchedSignals: signal.matchedKeywords, confidence: signal.confidence, supportingOperators: canonical.candidate.supportingOperators, delivery: { projectId: workspacePolicy.trello.defaultBoardId, projectName: workspacePolicy.trello.defaultBoardName, handoffStatus: workspacePolicy.trello.defaultBoardId ? "project_context_available" : "project_context_missing" } });

      const slackEnabled = Boolean(workspacePolicy.slack.slackNotificationsEnabled && workspacePolicy.slack.slackApprovalAlertsEnabled);
      const preparedActions = ["send_client_email", ...(trelloPrepared ? ["create_trello_task"] : []), ...(slackEnabled ? ["slack_internal_alert"] : [])];

      const sourceMetadata = {
        operatorKey: "client_flow",
        gmailMessageId: signal.message.id,
        gmailThreadId: signal.message.threadId,
        dedupeKey: dedupe.dedupeKey,
        normalizedSubject: dedupe.normalizedSubject,
        sourceProvider: dedupe.sourceProvider,
        from: signal.message.from,
        fromEmail: signal.message.fromEmail,
        subject: signal.message.subject,
        signalType: signal.signalType,
        signalLabel: signalLabel(signal.signalType),
        confidence: signal.confidence,
        matchedKeywords: signal.matchedKeywords,
        contactName: personalization.contactName,
        contactEmail: personalization.contactEmail,
        personalizationSource: personalization.personalizationSource,
        greetingUsed: personalization.greetingUsed,
        detectedSignalSummary: aiDraft.detectedSignalSummary,
        recommendedNextStep: aiDraft.recommendedNextStep,
        riskNotes: aiDraft.riskNotes,
        draftingMetadata: aiDraft.draftingMetadata,
        rejectedNameCandidates: personalization.rejectedNameCandidates,
        clientFlowContext: publicClientFlowContext(clientFlowContext),
        businessContext: clientFlowContext.businessContext,
        preparationState: clientFlowContext.preparationState,
        priority: clientFlowContext.priority,
        priorityReasons: clientFlowContext.priorityReasons,
      };

      const clientFlowWorkflow = await ensureClientFlowWorkflow({ supabase, workspaceId, signalId: canonical.signalId, candidate: canonical.candidate, entityId: signal.message.threadId || signal.message.id, action: prepareAction({ workspaceId, operatorKey: "client_flow", actionType: emailConnector === "microsoft" ? "send_email" : "send_email", connectorKey: emailConnector, capability: "email.send_after_approval", title: approvalTitleFor(signal.signalType), summary: `Prepare an approval-gated Client Flow update for ${signal.message.subject || "the customer request"}.`, input: { to: signal.message.fromEmail, subject: draft.subject, body: draft.body, subjectType: "customer_thread", subjectId: signal.message.threadId || signal.message.id, businessContext: clientFlowContext.businessContext }, dedupeKey: dedupe.dedupeKey, source: `${emailConnector}_scan`, destinationType: "customer", confidence: signal.confidence, riskLevel: "high", normalizedTarget: signal.message.threadId || signal.message.id, metadata: { clientFlowContext: publicClientFlowContext(clientFlowContext), preparationState: clientFlowContext.preparationState } }, { policySettings }), context: clientFlowContext });
      await createClientFlowSupportingHandoffs({ supabase, workspaceId, parentWorkflowId: clientFlowWorkflow.workflowId, signalId: canonical.signalId, candidate: canonical.candidate, context: clientFlowContext });
      if (clientFlowWorkflow.existingApprovalId) {
        skipped.push({ messageId: signal.message.id, subject: signal.message.subject, from: signal.message.from, reason: "existing_client_flow_workflow", dedupeKey: dedupe.dedupeKey });
        continue;
      }

      const runInput = {
        source: "gmail_scan",
        sourceMode,
        ...sourceMetadata,
        preparedActions,
      };

      const runInsert = await supabase.from("os_operator_runs").insert({
        id: runId,
        workspace_id: workspaceId,
        operator_key: "client_flow",
        trigger_type: "gmail_scan",
        status: "running",
        input: runInput,
        output: {},
        readiness,
        risk_level: "medium",
        started_at: new Date().toISOString(),
      });
      if (runInsert.error) throw new Error(runInsert.error.message);

      await logOperatorEvent({
        supabase,
        workspaceId,
        runId,
        eventType: "client_flow_signal_detected",
        message: `Detected ${signalLabel(signal.signalType)} from ${signal.message.fromEmail}.`,
        metadata: sourceMetadata,
      });
      await insertStep({ supabase, workspaceId, runId, stepKey: "scan_gmail", title: "Scan recent client communication", output: { messageId: signal.message.id } });
      await insertStep({ supabase, workspaceId, runId, stepKey: "detect_client_signal", title: "Detect client signal", output: sourceMetadata });
      await insertStep({ supabase, workspaceId, runId, stepKey: "prepare_client_reply", title: "Prepare client reply draft", output: draft });
      if (trelloPrepared) {
        await insertStep({ supabase, workspaceId, runId, stepKey: "prepare_trello_task", title: "Prepare Trello task", output: { action: clientFlowTrelloAction } });
        await logOperatorEvent({
          supabase,
          workspaceId,
          runId,
          eventType: "client_flow_trello_task_prepared",
          message: `Prepared Trello task: ${aiDraft.trelloTaskTitle}.`,
          metadata: { dedupeKey: dedupe.dedupeKey, taskTitle: aiDraft.trelloTaskTitle },
        });
      }

      const approvalId = operatorRuntimeId("appr-client-flow");
      const approvalInsert = await supabase.from("os_approvals").insert({
        id: approvalId,
        workspace_id: workspaceId,
        type: "email",
        title: approvalTitleFor(signal.signalType),
        body: `Client Flow Operator prepared a reply to ${draft.to}${trelloPrepared ? " and a Trello task" : ""}.`,
        agent_id: CLIENT_FLOW_AGENT_ID,
        agent_mark: CLIENT_FLOW_AGENT_MARK,
        agent_color: CLIENT_FLOW_AGENT_COLOR,
        run_id: runId,
        status: "pending",
        dedupe_key: dedupe.dedupeKey,
        created_at: new Date().toISOString(),
        continuation_payload: {
          kind: emailConnector === "microsoft" ? "microsoft.send_after_approval" : "gmail.send_after_approval",
          workspaceId,
          operatorRunId: runId,
          operatorKey: "client_flow",
          dedupeKey: dedupe.dedupeKey,
          dedupeMetadata: dedupe,
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
          draftSubject: draft.subject,
          draftBody: draft.body,
          originalDraftSubject: draft.subject,
          originalDraftBody: draft.body,
          editedDraftSubject: null,
          editedDraftBody: null,
          wasEdited: false,
          editedAt: null,
          editedBy: null,
          sourceMetadata,
          workflowId: clientFlowWorkflow.workflowId,
          workflowStepId: clientFlowWorkflow.stepId,
          preparedActions,
          clientFlowTrelloAction,
          clientFlow: {
            signalType: signal.signalType,
            signalLabel: signalLabel(signal.signalType),
            confidence: signal.confidence,
            recommendedNextStep: aiDraft.recommendedNextStep,
            detectedSignalSummary: aiDraft.detectedSignalSummary,
            trelloPrepared,
            trelloTaskTitle: trelloPrepared ? aiDraft.trelloTaskTitle : null,
          },
          customerEmailPolicy: {
            mode: workspacePolicy.customerEmailMode,
            customerEmail: workspacePolicy.customerEmailMode === "draft_only"
              ? "Draft only mode. This email will not be sent automatically."
              : "Customer emails require approval before sending.",
            trelloTask: trelloPrepared ? "Approval required" : "Not prepared",
            humanReview: "Required",
            slackAlert: slackEnabled ? "Enabled" : "Disabled",
          },
        },
        policy_reason: workspacePolicy.customerEmailMode === "draft_only"
          ? "Customer email policy is draft-only. This reply will not be sent automatically."
          : "External client email send requires human approval before Gmail execution.",
      });
      if (approvalInsert.error) throw new Error(approvalInsert.error.message);
      await linkClientFlowApprovalWorkflow({ supabase, workspaceId, workflowId: clientFlowWorkflow.workflowId, stepId: clientFlowWorkflow.stepId, approvalId, context: clientFlowContext });

      await insertStep({ supabase, workspaceId, runId, stepKey: "create_approval", title: "Create approval request", output: { approvalId } });

      const output = {
        type: "client_flow_reply_draft",
        source: "gmail_scan",
        draft,
        approvalId,
        preparedActions,
        trelloPrepared,
        clientFlowTrelloAction,
        sourceMetadata,
      };
      const outputInsert = await supabase.from("os_operator_outputs").insert({
        id: operatorRuntimeId("opout"),
        workspace_id: workspaceId,
        run_id: runId,
        operator_key: "client_flow",
        output_type: "client_flow_reply_draft",
        title: `Client reply draft for ${signal.message.fromEmail}`,
        payload: output,
        requires_approval: true,
        approval_id: approvalId,
      });
      if (outputInsert.error) throw new Error(outputInsert.error.message);

      const runUpdate = await supabase.from("os_operator_runs").update({
        status: "waiting_for_approval",
        output,
        approval_id: approvalId,
      }).eq("id", runId).eq("workspace_id", workspaceId);
      if (runUpdate.error) throw new Error(runUpdate.error.message);

      await logOperatorEvent({
        supabase,
        workspaceId,
        runId,
        eventType: "client_flow_approval_created",
        message: `Created Client Flow approval ${approvalId}.`,
        metadata: { approvalId, ...dedupe, preparedActions },
      });
      await logOperatorEvent({
        supabase,
        workspaceId,
        runId,
        eventType: "client_flow_email_policy_applied",
        message: `Customer email policy applied: ${workspacePolicy.customerEmailMode}.`,
        metadata: { approvalId, customerEmailMode: workspacePolicy.customerEmailMode, dedupeKey: dedupe.dedupeKey },
      });

      try {
        await sendSlackApprovalNotification({
          supabase,
          workspaceId,
          approvalId,
          runId,
          eventType: "revenue_approval_created",
          operatorKey: "client_flow",
          title: `Client Flow prepared a ${signalLabel(signal.signalType)}${personalization.firstname ? ` from ${personalization.firstname}` : ""}.`,
          summary: aiDraft.detectedSignalSummary,
          confidence: signal.confidence,
          risk: "medium",
          source: "gmail",
          actionLabel: trelloPrepared ? "send client reply and create Trello task" : "send client reply",
          approvalUrl: `${getAppUrl()}/approvals`,
          metadata: { dedupeKey: dedupe.dedupeKey, fromEmail: signal.message.fromEmail, subject: signal.message.subject, preparedActions },
        });
      } catch (error) {
        console.warn("[client-flow-scan] slack approval notification skipped", {
          workspaceId,
          approvalId,
          error: error instanceof Error ? error.message : "Unknown Slack notification error",
        });
      }

      created.push({
        messageId: signal.message.id,
        threadId: signal.message.threadId,
        from: signal.message.fromEmail,
        subject: signal.message.subject,
        signalType: signal.signalType,
        confidence: signal.confidence,
        trelloPrepared,
        dedupeKey: dedupe.dedupeKey,
        runId,
        approvalId,
      });
      [dedupe.dedupeKey, dedupe.messageDedupeKey, dedupe.threadDedupeKey, dedupe.contactSubjectDedupeKey]
        .filter((key): key is string => Boolean(key))
        .forEach((key) => setDedupeReason(handled, key, "existing_pending_approval"));
    }

    for (const signal of zendeskSignals) {
      const dedupeKey = `client_flow:zendesk:ticket:${signal.ticket.ticketId}:${signal.signalType}`;
      const duplicateReason = findDuplicateReason({ dedupeKey, contactEmail: "", normalizedSubject: signal.ticket.subject, sourceProvider: "gmail", operatorKey: "client_flow", gmailMessageId: "" }, handled);
      if (duplicateReason) { zendeskSkipped += 1; continue; }
      if (!zendeskExecutable) { zendeskSkipped += 1; continue; }
      const credential = await getStoredZendeskCredential(workspaceId, supabase);
      const subdomain = typeof credential?.metadata?.subdomain === "string" ? credential.metadata.subdomain : null;
      if (!subdomain) { zendeskSkipped += 1; continue; }
      const createdZendesk = await createZendeskClientFlowApproval({ supabase, workspaceId, readiness, policySettings, signal, subdomain });
      if (createdZendesk.existingApprovalId) { zendeskSkipped += 1; continue; }
      zendeskActionCount += 1;
      setDedupeReason(handled, dedupeKey, "existing_pending_approval");
      created.push({ messageId: `zendesk-${signal.ticket.ticketId}`, from: signal.ticket.requesterName ?? "Zendesk requester", subject: signal.ticket.subject, signalType: "issue_report", confidence: signal.confidence, trelloPrepared: false, dedupeKey, runId: createdZendesk.runId, approvalId: createdZendesk.approvalId, sourceProvider: "zendesk", ticketId: signal.ticket.ticketId });
    }

    for (const signal of intercomSignals) {
      const dedupeKey = `client_flow:intercom:conversation:${signal.conversation.region}:${signal.conversation.conversationId}:${signal.signalType}`;
      const duplicateReason = findDuplicateReason({ dedupeKey, contactEmail: "", normalizedSubject: signal.conversation.subjectOrPreview ?? signal.conversation.conversationId, sourceProvider: "gmail", operatorKey: "client_flow", gmailMessageId: "" }, handled);
      if (duplicateReason || !intercomExecutable) { intercomSkipped += 1; continue; }
      const createdIntercom = await createIntercomClientFlowApproval({ supabase, workspaceId, readiness, policySettings, signal });
      if (createdIntercom.existingApprovalId) { intercomSkipped += 1; continue; }
      intercomActionCount += 1;
      setDedupeReason(handled, dedupeKey, "existing_pending_approval");
      created.push({ messageId: `intercom-${signal.conversation.conversationId}`, from: signal.conversation.contactName ?? "Intercom customer", subject: signal.conversation.subjectOrPreview ?? "Intercom conversation", signalType: "issue_report", confidence: signal.confidence, trelloPrepared: false, dedupeKey, runId: createdIntercom.runId, approvalId: createdIntercom.approvalId, sourceProvider: "intercom", ticketId: signal.conversation.conversationId });
    }

    const outcomesObserved = await observeClientFlowWorkflows({ supabase, workspaceId, emailMessages: emailObservations });
    const completedAt = new Date().toISOString();
    // Optional Microsoft Teams read context. Guarded so a Teams outage or
    // revoked Teams consent can never fail an otherwise healthy email scan.
    let teamsSignals: TeamsOperatorSignals = EMPTY_TEAMS_OPERATOR_SIGNALS;
    if (teamsConnected) {
      try {
        teamsSignals = await getTeamsOperatorSignals({ workspaceId, operatorKey: "client_flow", supabase });
      } catch (error) {
        console.warn("[client-flow-scan] teams context skipped", { workspaceId, error: error instanceof Error ? error.message : "Unknown Teams context error" });
      }
    }
    const scanSummary = {
      type: "client_flow_scan_summary",
      status: "completed",
      sourceMode,
      teams: teamsSignals,
      monitoringEnabled: true,
      cadence: "daily",
      scanned: listed.length,
      signalsFound: signals.length,
      approvalsCreated: created.length,
      outcomesObserved,
      skippedCount: skipped.length,
      zendesk: { scanned: zendeskScanned, signalsFound: zendeskSignals.length, approvalsCreated: zendeskActionCount, skipped: zendeskSkipped },
      intercom: { scanned: intercomScanned, signalsFound: intercomSignals.length, approvalsCreated: intercomActionCount, skipped: intercomSkipped },
      googleDrive: driveContextSummary,
      routedToRevenueCount,
      skipped,
      completedAt,
    };
    const scanRunId = operatorRuntimeId("oprun-client-flow-scan-summary");
    const scanRunInsert = await supabase.from("os_operator_runs").insert({
      id: scanRunId,
      workspace_id: workspaceId,
      operator_key: "client_flow",
      trigger_type: "gmail_scan",
      status: "completed",
      input: { source: "gmail_scan_monitor", sourceMode, maxResults, zendeskScanned, zendeskActionCount, intercomScanned, intercomActionCount },
      output: scanSummary,
      readiness,
      risk_level: "low",
      started_at: completedAt,
      completed_at: completedAt,
    });
    if (scanRunInsert.error) throw new Error(scanRunInsert.error.message);

    await logOperatorEvent({
      supabase,
      workspaceId,
      runId: scanRunId,
      eventType: "client_flow_scan_completed",
      message: `Client Flow scan completed: ${listed.length} scanned, ${signals.length} signals, ${created.length} approvals, ${routedToRevenueCount} routed to Revenue.`,
      metadata: scanSummary,
    });

    const scanOutputInsert = await supabase.from("os_operator_outputs").insert({
      id: operatorRuntimeId("opout"),
      workspace_id: workspaceId,
      run_id: scanRunId,
      operator_key: "client_flow",
      output_type: "client_flow_scan_summary",
      title: "Client Flow scan summary",
      payload: scanSummary,
      requires_approval: false,
    });
    if (scanOutputInsert.error) throw new Error(scanOutputInsert.error.message);

    const monitoringUpdate = await upsertClientFlowMonitoringConfig({
      supabase,
      workspaceId,
      sourceMode,
      lastRunAt: completedAt,
      lastRunStatus: "completed",
      lastRunSummary: scanSummary,
    });
    if (monitoringUpdate.error) {
      console.warn("[client-flow-scan] monitoring config update skipped", { workspaceId, error: monitoringUpdate.error.message });
    }

    return {
      ok: true,
      status: 200,
      body: {
        status: "completed",
        sourceMode,
        scanned: listed.length,
        signalsFound: signals.length,
        approvalsCreated: created.length,
        outcomesObserved,
        routedToRevenueCount,
        signals: created,
        skipped,
        zendesk: { scanned: zendeskScanned, signalsFound: zendeskSignals.length, approvalsCreated: zendeskActionCount, skipped: zendeskSkipped },
        intercom: { scanned: intercomScanned, signalsFound: intercomSignals.length, approvalsCreated: intercomActionCount, skipped: intercomSkipped },
        googleDrive: driveContextSummary,
      },
    };
  } catch (error) {
    return scanFailure(error);
  }
}

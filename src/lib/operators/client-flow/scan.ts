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
import { getConnectorTruth } from "@/lib/connectors/truth";
import { prepareAction } from "@/lib/actions/execute";
import type { PreparedAction } from "@/lib/actions/types";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { draftClientFlowReplyWithAI } from "@/lib/operators/client-flow/ai-drafting";
import { applyGreeting, buildContactPersonalization, type SharedPersonalization } from "@/lib/operators/shared/personalization";
import { sendSlackApprovalNotification } from "@/lib/notifications/slack";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import type { PolicyWorkspaceSettings } from "@/lib/policies/types";
import { loadWorkspacePolicySettings, type TrelloProjectSettings } from "@/lib/settings/workspace-policy";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type ClientFlowScanSourceMode = "scheduled" | "manual" | "event_ready";

export const CLIENT_FLOW_AGENT_ID = "client_flow";
const CLIENT_FLOW_AGENT_MARK = "CF";
const CLIENT_FLOW_AGENT_COLOR = "#5FD3A8";

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

export type ClientFlowScanSummary = {
  status?: string;
  message?: string;
  sourceMode?: ClientFlowScanSourceMode;
  scanned?: number;
  signalsFound?: number;
  approvalsCreated?: number;
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
  }[];
  skipped?: {
    messageId: string;
    subject?: string;
    from?: string;
    reason: string;
    dedupeKey?: string;
  }[];
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
  sourceProvider: "gmail";
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

function buildDedupeMetadata(message: SafeGmailMessage): ClientFlowDedupeMetadata {
  const gmailMessageId = message.id;
  const gmailThreadId = message.threadId || undefined;
  const contactEmail = normalizeEmail(message.fromEmail || message.from);
  const normalizedSubject = normalizeSubjectForDedupe(message.subject);
  const messageDedupeKey = gmailMessageId ? `client_flow:gmail:message:${gmailMessageId}` : undefined;
  const threadDedupeKey = gmailThreadId ? `client_flow:gmail:thread:${gmailThreadId}` : undefined;
  const contactSubjectDedupeKey = contactEmail && normalizedSubject
    ? `client_flow:contact_subject:${contactEmail}:${normalizedSubject}`
    : undefined;
  return {
    dedupeKey: messageDedupeKey ?? threadDedupeKey ?? contactSubjectDedupeKey ?? `client_flow:gmail:message:${Date.now()}`,
    messageDedupeKey,
    threadDedupeKey,
    contactSubjectDedupeKey,
    gmailMessageId,
    gmailThreadId,
    contactEmail,
    normalizedSubject,
    sourceProvider: "gmail",
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
  setDedupeReason(refs, messageId ? `client_flow:gmail:message:${messageId}` : undefined, reason);
  setDedupeReason(refs, threadId ? `client_flow:gmail:thread:${threadId}` : undefined, reason);
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
  return {
    ok: false,
    status: 500,
    body: { error: "gmail_scan_failed", message: error instanceof Error ? error.message : "Gmail scan failed." },
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
    source: "gmail",
    metadata: {
      operatorKey: "client_flow",
      signalType: input.signal.signalType,
      fromEmail: input.signal.message.fromEmail,
      sourceSubject: input.signal.message.subject,
    },
  }, { policySettings: input.policySettings });
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
    return { ok: false, status: 409, body: { status: "missing_gmail", message: "Connect Gmail to monitor client communication.", readiness } };
  }
  if (readiness.status === "upgrade_required") {
    return { ok: false, status: 402, body: { status: "upgrade_required", message: readiness.reason, readiness } };
  }
  if (!readiness.canRunManual || (readiness.status !== "ready" && readiness.status !== "draft_only")) {
    return { ok: false, status: 409, body: { status: readiness.status, message: readiness.reason, readiness } };
  }

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

  const credential = credentialRes.data as StoredConnectorCredential;
  const missingSendScopes = getMissingGmailScopes(credential.scopes, GMAIL_SEND_REQUIRED_SCOPES);
  if (missingSendScopes.length > 0) {
    return {
      ok: false,
      status: 409,
      body: { status: "requires_gmail_send_scope", message: "Reconnect Gmail to enable approval-gated client replies.", missingScopes: missingSendScopes, reconnectRequired: true },
    };
  }
  const missingScanScopes = getMissingGmailScopes(credential.scopes, GMAIL_SCAN_REQUIRED_SCOPES);
  if (missingScanScopes.length > 0) {
    return {
      ok: false,
      status: 409,
      body: { status: "requires_gmail_read_scope", message: "Reconnect Gmail to enable client communication monitoring.", missingScopes: missingScanScopes, reconnectRequired: true },
    };
  }

  try {
    const accessToken = await resolveAccessTokenFromCredential(credential);
    const providerEmail = normalizeEmail(credential.provider_email);
    const connectorTruth = await getConnectorTruth({ workspaceId, supabase });
    const hubspotConnected = connectorTruth.some((connector) =>
      connector.connectorKey === "hubspot" && connector.status === "connected" && connector.providerConfigKey && connector.nangoConnectionId);
    const trelloConnected = connectorTruth.some((connector) =>
      connector.connectorKey === "trello" && connector.status === "connected" && connector.providerConfigKey && connector.nangoConnectionId);

    const workspacePolicy = await loadWorkspacePolicySettings({ supabase, workspaceId });
    const policySettings = await loadPolicyWorkspaceSettings({ supabase, workspaceId });
    const workspaceRow = await supabase.from("os_workspaces").select("name").eq("id", workspaceId).maybeSingle();
    const signoffName = (typeof workspaceRow.data?.name === "string" && workspaceRow.data.name.trim()) ? workspaceRow.data.name.trim() : "The team";

    const maxResults = Math.min(Math.max(Number(input.maxResults) || 15, 1), 20);
    const listed = await listRecentMessages(accessToken, { maxResults, query: "newer_than:30d" });
    const handled = await loadClientFlowDedupeState({ supabase, workspaceId });

    const skipped: NonNullable<ClientFlowScanSummary["skipped"]> = [];
    const signals: ClientFlowSignal[] = [];
    let routedToRevenueCount = 0;

    for (const item of listed) {
      const message = await getMessageDetails(accessToken, item.id);
      const dedupe = buildDedupeMetadata(message);
      const duplicateReason = findDuplicateReason(dedupe, handled);
      if (duplicateReason) {
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: duplicateReason, dedupeKey: dedupe.dedupeKey });
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
      const dedupe = buildDedupeMetadata(signal.message);
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

      const aiDraft = await draftClientFlowReplyWithAI({ signal, deterministicDraft, defaultTaskTitle, defaultTaskDescription });
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
        })
        : null;
      const trelloPrepared = Boolean(clientFlowTrelloAction);

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
      };

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
          kind: "gmail.send_after_approval",
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
          approvalUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.inovense.com"}/app/approvals`,
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

    const completedAt = new Date().toISOString();
    const scanSummary = {
      type: "client_flow_scan_summary",
      status: "completed",
      sourceMode,
      monitoringEnabled: true,
      cadence: "daily",
      scanned: listed.length,
      signalsFound: signals.length,
      approvalsCreated: created.length,
      skippedCount: skipped.length,
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
      input: { source: "gmail_scan_monitor", sourceMode, maxResults },
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
        routedToRevenueCount,
        signals: created,
        skipped,
      },
    };
  } catch (error) {
    return scanFailure(error);
  }
}

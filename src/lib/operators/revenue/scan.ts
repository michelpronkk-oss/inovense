import { GMAIL_SCAN_REQUIRED_SCOPES, GMAIL_SEND_REQUIRED_SCOPES, GmailApiError, getMessageDetails, getMissingGmailScopes, listRecentMessages, resolveAccessTokenFromCredential, type SafeGmailMessage, type StoredConnectorCredential } from "@/lib/connectors/gmail";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { createGmailSendApproval } from "@/lib/operators/executors/gmail";
import { findContactByEmail, type PreparedHubSpotActions } from "@/lib/operators/executors/hubspot";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { draftRevenueFollowUpWithAI } from "@/lib/operators/revenue/ai-drafting";
import { loadRevenueCompanyGraphContext } from "@/lib/operators/revenue/context";
import { normalizeEmailToSignalEvent, routeSignalCandidate, classifySignalCandidateLightweight } from "@/lib/signals/intake";
import type { SignalCandidate } from "@/lib/signals/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type RevenueScanSourceMode = "scheduled" | "manual" | "event_ready";

export type Opportunity = {
  message: SafeGmailMessage;
  matchedKeywords: string[];
  classification: "revenue_opportunity";
  confidence: "high";
};

type CrmPreparation = {
  contactEmail: string;
  contactName: string | null;
  firstname?: string | null;
  lastname?: string | null;
  companyName: string | null;
  source: "gmail";
  sourceSubject?: string;
  classification: string;
  confidence: string;
  gmailMessageId: string;
  gmailThreadId?: string;
  dedupeKey?: string;
  normalizedSubject?: string;
  summary: string;
  suggestedNextStep: string;
  suggestedDealStage: string;
  suggestedFollowUpTask: string;
  matchedKeywords: string[];
  personalizationSource?: string;
  greetingUsed?: string;
  signatureCandidateRaw?: string | null;
  signatureCandidateAccepted?: string | null;
  rejectedNameCandidates?: { candidate: string; reason: string; source: string }[];
  attribution?: {
    leadSource: "Inovense OS";
    operator: "revenue";
    signalSource: "gmail";
    signalType: "revenue_opportunity";
  };
};

type Personalization = {
  contactEmail: string;
  contactName: string | null;
  firstname: string | null;
  lastname: string | null;
  greetingUsed: string;
  personalizationSource: "hubspot" | "signature" | "from_display" | "email_local" | "fallback";
  signatureCandidate?: string | null;
  signatureCandidateAccepted?: string | null;
  rejectedNameCandidates?: { candidate: string; reason: string; source: string }[];
};

export type RevenueScanSummary = {
  status?: string;
  message?: string;
  sourceMode?: RevenueScanSourceMode;
  scanned?: number;
  opportunitiesFound?: number;
  approvalsCreated?: number;
  routedItemCount?: number;
  missingScopes?: string[];
  reconnectRequired?: boolean;
  opportunities?: {
    messageId: string;
    threadId?: string;
    from: string;
    subject: string;
    matchedKeywords: string[];
    classification: string;
    confidence: string;
    crmPreparationStatus?: string;
    dedupeKey?: string;
    signalCandidate?: SignalCandidate;
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

export type RevenueScanResult = {
  ok: boolean;
  status: number;
  body: RevenueScanSummary;
};

const OPPORTUNITY_KEYWORDS = [
  "pricing",
  "quote",
  "proposal",
  "demo",
  "interested",
  "availability",
  "can you help",
  "website",
  "automation",
  "ai",
  "follow up",
  "follow-up",
  "call",
  "meeting",
  "offer",
];

type DedupeReason =
  | "existing_pending_approval"
  | "already_approved"
  | "previously_rejected"
  | "already_handled";

type RevenueDedupeMetadata = {
  dedupeKey: string;
  messageDedupeKey?: string;
  threadDedupeKey?: string;
  contactSubjectDedupeKey?: string;
  gmailMessageId: string;
  gmailThreadId?: string;
  contactEmail: string;
  normalizedSubject: string;
  sourceProvider: "gmail";
  operatorKey: "revenue";
};

const STRONG_KEYWORDS = new Set(["pricing", "quote", "proposal", "demo", "interested", "can you help", "automation", "website"]);
const GENERIC_NAME_PARTS = new Set(["info", "sales", "support", "hello", "admin", "noreply", "no-reply", "contact", "team", "newsletter", "office", "service", "help", "marketing", "founder", "agency"]);
const NAME_CONTAMINATION_PARTS = new Set(["hi", "hello", "hey", "dear", "hoi", "hallo", "michel"]);

const SKIP_PATTERNS = [
  { reason: "newsletter", pattern: /\b(newsletter|digest|unsubscribe|view in browser)\b/i },
  { reason: "no_reply", pattern: /\b(no-?reply|do-not-reply|donotreply)\b/i },
  { reason: "receipt", pattern: /\b(receipt|payment received|your order|invoice paid|subscription receipt)\b/i },
  { reason: "security_alert", pattern: /\b(security alert|verification code|password reset|new sign-in|2fa|two-factor|login alert)\b/i },
  { reason: "tool_notification", pattern: /\b(github|vercel|stripe|slack|notion|linear|jira|asana|cloudflare|supabase)\b.*\b(notification|alert|build|deploy|invoice|digest)\b/i },
];

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
  return text.includes("following up on") || text.includes("revenue operator prepared") || text.includes("inovense");
}

function skipReason(message: SafeGmailMessage, providerEmail: string): string | null {
  if (isInovenseGeneratedOutbound(message, providerEmail)) return "inovense_generated_outbound";
  if (isSelfSent(message, providerEmail)) return "self_sent";
  if (isSentMail(message)) return "sent_mail";
  const text = safeText(message);
  if (!message.fromEmail) return "noise";
  for (const item of SKIP_PATTERNS) {
    if (item.pattern.test(text)) return item.reason;
  }
  return null;
}

function detectOpportunity(message: SafeGmailMessage, providerEmail: string): Opportunity | { skipped: string } {
  const skipped = skipReason(message, providerEmail);
  if (skipped) return { skipped };

  const text = safeText(message);
  const matchedKeywords = OPPORTUNITY_KEYWORDS.filter((keyword) => text.includes(keyword));
  const hasStrongKeyword = matchedKeywords.some((keyword) => STRONG_KEYWORDS.has(keyword));
  if (matchedKeywords.length >= 2 || hasStrongKeyword) {
    return { message, matchedKeywords, classification: "revenue_opportunity", confidence: "high" };
  }
  return { skipped: matchedKeywords.length > 0 ? "low_confidence" : "noise" };
}

function titleCaseName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function splitHumanName(value: string | null): { firstname: string | null; lastname: string | null } {
  if (!value) return { firstname: null, lastname: null };
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: null, lastname: null };
  if (parts.length === 1) return { firstname: parts[0], lastname: null };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}

function isGenericName(value: string): boolean {
  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return true;
  if (GENERIC_NAME_PARTS.has(cleaned)) return true;
  return cleaned.split(/[\s._+-]+/).some((part) => GENERIC_NAME_PARTS.has(part));
}

function safeHumanName(value: string | null | undefined): { name: string | null; reason?: string } {
  if (!value) return { name: null, reason: "empty" };
  const cleaned = value
    .replace(/<[^>]+>/g, " ")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return { name: null, reason: "empty" };
  if (cleaned.includes("@")) return { name: null, reason: "contains_email" };
  if (/\d/.test(cleaned)) return { name: null, reason: "contains_number" };
  if (/\b(?:www\.|\.com|\.net|\.org|\.io|\.co|https?:\/\/)\b/i.test(cleaned)) return { name: null, reason: "contains_domain" };
  if ((cleaned.match(/[^\p{L}\s'-]/gu) ?? []).length > 0) return { name: null, reason: "punctuation_heavy" };
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0 || parts.length > 3) return { name: null, reason: "invalid_word_count" };
  if (parts.some((part) => part.length < 2)) return { name: null, reason: "too_short" };
  if (parts.some((part) => isGenericName(part))) return { name: null, reason: "generic" };
  if (parts.some((part) => NAME_CONTAMINATION_PARTS.has(part.toLowerCase()))) return { name: null, reason: "contains_greeting_or_body_word" };
  if (parts.some((part) => !/^\p{L}[\p{L}'-]*$/u.test(part))) return { name: null, reason: "username_like" };
  return { name: titleCaseName(parts.join(" ")) };
}

function displayNameFromHeader(from: string, email: string): string | null {
  const rawName = from.replace(/<[^>]+>/g, "").replace(/"/g, "").trim();
  if (!rawName || rawName.toLowerCase() === email.toLowerCase() || rawName.includes("@")) return null;
  const cleaned = rawName.replace(/\s+via\s+.+$/i, "").trim();
  return safeHumanName(cleaned).name;
}

function humanNameFromEmailLocal(email: string): string | null {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (!local || /\d/.test(local)) return null;
  const parts = local.split(/[._+-]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > 3) return null;
  if (parts.some((part) => part.length < 2 || isGenericName(part))) return null;
  return safeHumanName(parts.join(" ")).name;
}

function cleanSignatureCandidate(candidate: string): { candidate: string; reduced?: boolean } {
  const parts = candidate.trim().split(/\s+/).filter(Boolean);
  const contaminationIndex = parts.findIndex((part, index) => index > 0 && NAME_CONTAMINATION_PARTS.has(part.toLowerCase()));
  if (contaminationIndex > 0) {
    return { candidate: parts.slice(0, contaminationIndex).join(" "), reduced: true };
  }
  return { candidate: candidate.trim() };
}

function isSignoffLine(line: string): boolean {
  const normalized = line.trim().replace(/[,.\s]+$/g, "").toLowerCase();
  return [
    "best",
    "best regards",
    "kind regards",
    "regards",
    "thanks",
    "thank you",
    "met vriendelijke groet",
    "groet",
    "vriendelijke groet",
  ].includes(normalized);
}

function nameFromSignatureText(text: string): { name: string | null; candidate?: string; accepted?: string; rejected?: { candidate: string; reason: string; source: string } } {
  const lastLines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-20);
  for (let index = lastLines.length - 2; index >= 0; index -= 1) {
    if (!isSignoffLine(lastLines[index])) continue;
    const rawCandidate = lastLines[index + 1] ?? "";
    const cleaned = cleanSignatureCandidate(rawCandidate);
    const safe = safeHumanName(cleaned.candidate);
    if (safe.name) return { name: safe.name, candidate: rawCandidate, accepted: safe.name };
    return { name: null, candidate: rawCandidate, rejected: { candidate: rawCandidate, reason: safe.reason ?? "unsafe", source: "signature" } };
  }
  return { name: null };
}

async function buildPersonalization(input: {
  workspaceId: string;
  opportunity: Opportunity;
  hubspotConnected: boolean;
}): Promise<Personalization> {
  const email = input.opportunity.message.fromEmail;
  const rejectedNameCandidates: { candidate: string; reason: string; source: string }[] = [];
  if (input.hubspotConnected) {
    try {
      const contact = await findContactByEmail(input.workspaceId, email);
      const first = typeof contact?.properties?.firstname === "string" ? contact.properties.firstname.trim() : "";
      const last = typeof contact?.properties?.lastname === "string" ? contact.properties.lastname.trim() : "";
      const contactName = safeHumanName([first, last].filter(Boolean).join(" ")).name;
      if (contactName) {
        const split = splitHumanName(contactName);
        return { contactEmail: email, contactName, firstname: split.firstname, lastname: split.lastname, greetingUsed: `Hi ${split.firstname ?? contactName},`, personalizationSource: "hubspot", rejectedNameCandidates };
      }
    } catch (error) {
      console.warn("[revenue-scan] hubspot contact personalization skipped", {
        workspaceId: input.workspaceId,
        email,
        error: error instanceof Error ? error.message : "Unknown HubSpot lookup error",
      });
    }
  }

  const signature = nameFromSignatureText([input.opportunity.message.bodyText, input.opportunity.message.snippet].filter(Boolean).join("\n"));
  if (signature.rejected) rejectedNameCandidates.push(signature.rejected);
  if (signature.name) {
    const split = splitHumanName(signature.name);
    return { contactEmail: email, contactName: signature.name, firstname: split.firstname, lastname: split.lastname, greetingUsed: `Hi ${split.firstname ?? signature.name},`, personalizationSource: "signature", signatureCandidate: signature.candidate ?? signature.name, signatureCandidateAccepted: signature.accepted ?? signature.name, rejectedNameCandidates };
  }

  const fromName = displayNameFromHeader(input.opportunity.message.from, email);
  if (fromName) {
    const split = splitHumanName(fromName);
    return { contactEmail: email, contactName: fromName, firstname: split.firstname, lastname: split.lastname, greetingUsed: `Hi ${split.firstname ?? fromName},`, personalizationSource: "from_display", signatureCandidate: signature.candidate ?? null, rejectedNameCandidates };
  }

  const localName = humanNameFromEmailLocal(email);
  if (localName) {
    const split = splitHumanName(localName);
    return { contactEmail: email, contactName: localName, firstname: split.firstname, lastname: split.lastname, greetingUsed: `Hi ${split.firstname ?? localName},`, personalizationSource: "email_local", signatureCandidate: signature.candidate ?? null, rejectedNameCandidates };
  }

  return { contactEmail: email, contactName: null, firstname: null, lastname: null, greetingUsed: "Hi there,", personalizationSource: "fallback", signatureCandidate: signature.candidate ?? null, rejectedNameCandidates };
}

function applyGreeting(body: string, greeting: string): string {
  const lines = body.trim().split(/\r?\n/);
  if (lines[0] && /^hi\b/i.test(lines[0].trim())) {
    return [greeting, ...lines.slice(1)].join("\n");
  }
  return [greeting, "", body.trim()].join("\n");
}

function buildDraftFromOpportunity(opportunity: Opportunity, personalization: Personalization) {
  const subject = opportunity.message.subject
    ? `Re: ${opportunity.message.subject}`
    : "Following up on your message";
  const context = opportunity.message.snippet || "your recent message";
  return {
    to: opportunity.message.fromEmail,
    subject,
    body: [
      personalization.greetingUsed,
      "",
      `Thanks for reaching out. I saw your note about "${context.slice(0, 180)}${context.length > 180 ? "..." : ""}" and wanted to follow up while it is fresh.`,
      "",
      "If helpful, I can map the next practical step and keep the path lightweight.",
      "",
      "Would you be open to a short call this week to see whether there is a fit?",
      "",
      "Best,",
      "Inovense",
    ].join("\n"),
  };
}

function companyFromEmail(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  const root = domain.split(".")[0];
  if (!root || ["gmail", "outlook", "hotmail", "icloud", "yahoo", "proton", "aol"].includes(root)) return null;
  return root.split(/[-_]/).filter(Boolean).map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function buildCrmPreparation(opportunity: Opportunity, personalization: Personalization): CrmPreparation {
  const summary = opportunity.message.snippet
    ? opportunity.message.snippet.slice(0, 280)
    : `Inbound revenue signal from ${opportunity.message.fromEmail}.`;
  return {
    contactEmail: opportunity.message.fromEmail,
    contactName: personalization.contactName,
    firstname: personalization.firstname,
    lastname: personalization.lastname,
    companyName: companyFromEmail(opportunity.message.fromEmail),
    source: "gmail",
    sourceSubject: opportunity.message.subject,
    classification: opportunity.classification,
    confidence: opportunity.confidence,
    gmailMessageId: opportunity.message.id,
    gmailThreadId: opportunity.message.threadId,
    summary,
    suggestedNextStep: "Review the prepared follow-up and decide whether to move this lead into active qualification.",
    suggestedDealStage: opportunity.matchedKeywords.some((keyword) => ["pricing", "quote", "proposal"].includes(keyword))
      ? "Proposal / pricing discussion"
      : "New inbound opportunity",
    suggestedFollowUpTask: "Follow up with the contact and capture the next step in HubSpot.",
    matchedKeywords: opportunity.matchedKeywords,
    personalizationSource: personalization.personalizationSource,
    greetingUsed: personalization.greetingUsed,
    signatureCandidateRaw: personalization.signatureCandidate ?? null,
    signatureCandidateAccepted: personalization.signatureCandidateAccepted ?? null,
    rejectedNameCandidates: personalization.rejectedNameCandidates ?? [],
    attribution: {
      leadSource: "Inovense OS",
      operator: "revenue",
      signalSource: "gmail",
      signalType: "revenue_opportunity",
    },
  };
}

function buildPreparedHubSpotActions(input: {
  crmPreparation: CrmPreparation;
  hubspotConnected: boolean;
}): PreparedHubSpotActions {
  const contactLabel = input.crmPreparation.contactName || input.crmPreparation.contactEmail;
  return {
    contact: {
      email: input.crmPreparation.contactEmail,
      firstname: input.crmPreparation.firstname ?? null,
      lastname: input.crmPreparation.lastname ?? null,
      companyName: input.crmPreparation.companyName,
      source: "gmail",
    },
    deal: {
      dealname: `New inbound opportunity: ${contactLabel}`,
      stageLabel: input.crmPreparation.suggestedDealStage,
      pipelineLabel: "Default HubSpot pipeline",
      amount: null,
    },
    note: {
      body: [
        "Created by Inovense OS Revenue Operator.",
        "Source channel: Gmail/email.",
        `Source subject: ${input.crmPreparation.sourceSubject || "-"}.`,
        `Classification: ${input.crmPreparation.classification}.`,
        `Confidence: ${input.crmPreparation.confidence}.`,
        `Suggested next step: ${input.crmPreparation.suggestedNextStep}`,
        "",
        input.crmPreparation.summary,
      ].join("\n"),
    },
    task: {
      title: input.crmPreparation.suggestedFollowUpTask,
      dueSuggestion: "Next business day",
      type: "follow_up",
    },
    executionStatus: input.hubspotConnected ? "execution_enabled" : "prepared_not_enabled",
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

async function upsertRevenueMonitoringConfig(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  sourceMode: RevenueScanSourceMode;
  lastRunAt: string;
  lastRunStatus: string;
  lastRunSummary: Record<string, unknown>;
}) {
  const cadence = "daily";
  const triggerId = `optrig-${input.workspaceId}-revenue-monitoring`;
  return input.supabase.from("os_operator_triggers").upsert({
    id: triggerId,
    workspace_id: input.workspaceId,
    operator_key: "revenue",
    trigger_type: "scheduled_monitoring",
    enabled: true,
    config: {
      monitoringEnabled: true,
      cadence,
      scheduleProvider: "trigger.dev",
      triggerTaskId: "revenue-operator-daily-scan",
      lastRunAt: input.lastRunAt,
      nextRunAt: nextDailyRunFrom(input.lastRunAt),
      lastRunStatus: input.lastRunStatus,
      lastRunSummary: input.lastRunSummary,
      manualRunAvailable: true,
      sourceMode: input.sourceMode,
    },
  });
}

function normalizeSubjectForDedupe(subject: string | undefined | null): string {
  return (subject || "")
    .toLowerCase()
    .replace(/^(\s*(re|fw|fwd)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function buildDedupeMetadata(message: SafeGmailMessage): RevenueDedupeMetadata {
  const gmailMessageId = message.id;
  const gmailThreadId = message.threadId || undefined;
  const contactEmail = normalizeEmail(message.fromEmail || message.from);
  const normalizedSubject = normalizeSubjectForDedupe(message.subject);
  const messageDedupeKey = gmailMessageId ? `revenue:gmail:message:${gmailMessageId}` : undefined;
  const threadDedupeKey = gmailThreadId ? `revenue:gmail:thread:${gmailThreadId}` : undefined;
  const contactSubjectDedupeKey = contactEmail && normalizedSubject
    ? `revenue:contact_subject:${contactEmail}:${normalizedSubject}`
    : undefined;
  return {
    dedupeKey: messageDedupeKey ?? threadDedupeKey ?? contactSubjectDedupeKey ?? `revenue:gmail:message:${Date.now()}`,
    messageDedupeKey,
    threadDedupeKey,
    contactSubjectDedupeKey,
    gmailMessageId,
    gmailThreadId,
    contactEmail,
    normalizedSubject,
    sourceProvider: "gmail",
    operatorKey: "revenue",
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
  setDedupeReason(refs, messageId ? `revenue:gmail:message:${messageId}` : undefined, reason);
  setDedupeReason(refs, threadId ? `revenue:gmail:thread:${threadId}` : undefined, reason);
  setDedupeReason(refs, contactEmail && normalizedSubject ? `revenue:contact_subject:${contactEmail}:${normalizedSubject}` : undefined, reason);
  Object.values(record).forEach((nested) => collectDedupeRefs(nested, refs, reason));
}

async function loadRevenueDedupeState(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
}): Promise<Map<string, DedupeReason>> {
  const refs = new Map<string, DedupeReason>();
  const [runs, outputs, approvals, logs] = await Promise.all([
    input.supabase.from("os_operator_runs").select("input,output").eq("workspace_id", input.workspaceId).eq("operator_key", "revenue").limit(500),
    input.supabase.from("os_operator_outputs").select("payload").eq("workspace_id", input.workspaceId).eq("operator_key", "revenue").limit(500),
    input.supabase.from("os_approvals").select("status,dedupe_key,continuation_payload").eq("workspace_id", input.workspaceId).eq("agent_id", "revenue").limit(500),
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

function findDuplicateReason(metadata: RevenueDedupeMetadata, refs: Map<string, DedupeReason>): DedupeReason | null {
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

function scanFailure(error: unknown): RevenueScanResult {
  if (error instanceof GmailApiError) {
    return {
      ok: false,
      status: error.details.status || 502,
      body: {
        error: "gmail_scan_failed",
        message: error.message,
        details: error.details,
      },
    };
  }

  return {
    ok: false,
    status: 500,
    body: {
      error: "gmail_scan_failed",
      message: error instanceof Error ? error.message : "Gmail scan failed.",
    },
  };
}

export async function scanRevenueOpportunities(input: {
  workspaceId: string;
  maxResults?: number;
  sourceMode?: RevenueScanSourceMode;
  supabase?: SupabaseAdmin;
}): Promise<RevenueScanResult> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workspaceId = input.workspaceId.trim();
  const sourceMode = input.sourceMode ?? "manual";

  const readiness = await getOperatorReadiness({ workspaceId, operatorKey: "revenue" });
  if (!readiness) {
    return { ok: false, status: 404, body: { error: "Revenue Operator readiness was not found." } };
  }
  if (readiness.status === "missing_connector") {
    return { ok: false, status: 409, body: { status: "missing_gmail", message: "Connect Gmail to scan for revenue opportunities.", readiness } };
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
    return { ok: false, status: 409, body: { status: "missing_gmail", message: "Connect Gmail to scan for revenue opportunities." } };
  }

  const credential = credentialRes.data as StoredConnectorCredential;
  const missingSendScopes = getMissingGmailScopes(credential.scopes, GMAIL_SEND_REQUIRED_SCOPES);
  if (missingSendScopes.length > 0) {
    return {
      ok: false,
      status: 409,
      body: {
        status: "requires_gmail_send_scope",
        message: "Reconnect Gmail to enable approval-gated sending.",
        missingScopes: missingSendScopes,
        reconnectRequired: true,
      },
    };
  }

  const missingScanScopes = getMissingGmailScopes(credential.scopes, GMAIL_SCAN_REQUIRED_SCOPES);
  if (missingScanScopes.length > 0) {
    return {
      ok: false,
      status: 409,
      body: {
        status: "requires_gmail_read_scope",
        message: "Reconnect Gmail to enable opportunity scanning.",
        missingScopes: missingScanScopes,
        reconnectRequired: true,
      },
    };
  }

  try {
    const accessToken = await resolveAccessTokenFromCredential(credential);
    const providerEmail = normalizeEmail(credential.provider_email);
    const connectorTruth = await getConnectorTruth({ workspaceId, supabase });
    const hubspotConnected = connectorTruth.some((connector) =>
      connector.connectorKey === "hubspot"
      && connector.status === "connected"
      && connector.providerConfigKey
      && connector.nangoConnectionId
    );
    const maxResults = Math.min(Math.max(Number(input.maxResults) || 15, 1), 20);
    const listed = await listRecentMessages(accessToken, { maxResults, query: "newer_than:30d" });
    const handled = await loadRevenueDedupeState({ supabase, workspaceId });
    const companyGraphContext = await loadRevenueCompanyGraphContext({ supabase, workspaceId });
    const skipped: NonNullable<RevenueScanSummary["skipped"]> = [];
    const opportunities: Opportunity[] = [];
    const signalCandidates: SignalCandidate[] = [];

    for (const item of listed) {
      const message = await getMessageDetails(accessToken, item.id);
      const dedupe = buildDedupeMetadata(message);
      const duplicateReason = findDuplicateReason(dedupe, handled);
      if (duplicateReason) {
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: duplicateReason, dedupeKey: dedupe.dedupeKey });
        continue;
      }
      const detected = detectOpportunity(message, providerEmail);
      if ("skipped" in detected) {
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: detected.skipped });
      } else {
        const signalEvent = normalizeEmailToSignalEvent({
          workspaceId,
          message,
          rawRef: `gmail:${message.id}`,
          metadata: {
            dedupeKey: dedupe.dedupeKey,
            sourceMode,
          },
        });
        const signalCandidate = routeSignalCandidate(classifySignalCandidateLightweight(signalEvent));
        signalCandidates.push(signalCandidate);
        opportunities.push(detected);
      }
    }

    const created: NonNullable<RevenueScanSummary["opportunities"]> = [];

    for (const opportunity of opportunities) {
      const runId = operatorRuntimeId("oprun-revenue-scan");
      const dedupe = buildDedupeMetadata(opportunity.message);
      const duplicateReason = findDuplicateReason(dedupe, handled);
      if (duplicateReason) {
        skipped.push({ messageId: opportunity.message.id, subject: opportunity.message.subject, from: opportunity.message.from, reason: duplicateReason, dedupeKey: dedupe.dedupeKey });
        continue;
      }
      const personalization = await buildPersonalization({ workspaceId, opportunity, hubspotConnected });
      const deterministicDraft = buildDraftFromOpportunity(opportunity, personalization);
      const crmPreparation = buildCrmPreparation(opportunity, personalization);
      crmPreparation.dedupeKey = dedupe.dedupeKey;
      crmPreparation.normalizedSubject = dedupe.normalizedSubject;
      const aiDraft = await draftRevenueFollowUpWithAI({
        opportunity,
        deterministicDraft,
        context: companyGraphContext,
      });
      const draft = {
        ...aiDraft.draft,
        body: applyGreeting(aiDraft.draft.body, personalization.greetingUsed),
      };
      crmPreparation.summary = aiDraft.detectedSignalSummary || crmPreparation.summary;
      crmPreparation.suggestedNextStep = aiDraft.suggestedAction || crmPreparation.suggestedNextStep;
      const preparedHubSpotActions = buildPreparedHubSpotActions({ crmPreparation, hubspotConnected });
      const crmPreparationStatus = hubspotConnected ? "hubspot_execution_enabled" : "hubspot_not_connected";
      const preparedActions = hubspotConnected
        ? ["send_gmail_follow_up", "update_hubspot_contact", "add_hubspot_note", "create_hubspot_follow_up_task"]
        : ["send_gmail_follow_up"];
      const runInput = {
        source: "gmail_scan",
        sourceMode,
        gmailMessageId: opportunity.message.id,
        gmailThreadId: opportunity.message.threadId,
        dedupeKey: dedupe.dedupeKey,
        normalizedSubject: dedupe.normalizedSubject,
        sourceProvider: dedupe.sourceProvider,
        operatorKey: dedupe.operatorKey,
        from: opportunity.message.from,
        fromEmail: opportunity.message.fromEmail,
        subject: opportunity.message.subject,
        snippet: opportunity.message.snippet,
        matchedKeywords: opportunity.matchedKeywords,
        classification: opportunity.classification,
        confidence: opportunity.confidence,
        personalization,
        crmPreparationStatus,
        crmPreparation,
        preparedHubSpotActions,
        preparedActions,
        drafting: {
          detectedSignalSummary: aiDraft.detectedSignalSummary,
          whyThisMatters: aiDraft.whyThisMatters,
          suggestedAction: aiDraft.suggestedAction,
          expectedOutcome: aiDraft.expectedOutcome,
          riskNotes: aiDraft.riskNotes,
          metadata: aiDraft.draftingMetadata,
        },
      };
      const signalCandidate = signalCandidates.find((candidate) => candidate.sourceId === opportunity.message.id) ?? null;
      const sourceMetadata = {
        gmailMessageId: opportunity.message.id,
        gmailThreadId: opportunity.message.threadId,
        dedupeKey: dedupe.dedupeKey,
        normalizedSubject: dedupe.normalizedSubject,
        sourceProvider: dedupe.sourceProvider,
        operatorKey: dedupe.operatorKey,
        from: opportunity.message.from,
        fromEmail: opportunity.message.fromEmail,
        subject: opportunity.message.subject,
        classification: opportunity.classification,
        confidence: opportunity.confidence,
        matchedKeywords: opportunity.matchedKeywords,
        contactName: personalization.contactName,
        contactEmail: personalization.contactEmail,
        personalizationSource: personalization.personalizationSource,
        greetingUsed: personalization.greetingUsed,
        signatureCandidate: personalization.signatureCandidate ?? null,
        signatureCandidateAccepted: personalization.signatureCandidateAccepted ?? null,
        rejectedNameCandidates: personalization.rejectedNameCandidates ?? [],
        crmPreparationStatus,
        detectedSignalSummary: aiDraft.detectedSignalSummary,
        whyThisMatters: aiDraft.whyThisMatters,
        suggestedAction: aiDraft.suggestedAction,
        expectedOutcome: aiDraft.expectedOutcome,
        riskNotes: aiDraft.riskNotes,
        draftingMetadata: aiDraft.draftingMetadata,
        signalCandidate,
      };

      const runInsert = await supabase.from("os_operator_runs").insert({
        id: runId,
        workspace_id: workspaceId,
        operator_key: "revenue",
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
        eventType: "gmail.scan.opportunity_detected",
        message: `Detected revenue opportunity from ${opportunity.message.fromEmail}.`,
        metadata: sourceMetadata,
      });
      await insertStep({ supabase, workspaceId, runId, stepKey: "scan_gmail", title: "Scan recent Gmail messages", output: { messageId: opportunity.message.id } });
      await insertStep({ supabase, workspaceId, runId, stepKey: "detect_opportunity", title: "Detect revenue opportunity", output: sourceMetadata });
      await insertStep({
        supabase,
        workspaceId,
        runId,
        stepKey: "load_company_graph_context",
        title: "Load Company Graph context",
        output: {
          memoryKeysUsed: companyGraphContext.memoryKeysUsed,
          approvedExamples: companyGraphContext.approvedExamples.length,
          rejectedExamples: companyGraphContext.rejectedExamples.length,
        },
      });
      await insertStep({
        supabase,
        workspaceId,
        runId,
        stepKey: "draft_follow_up_with_context",
        title: "Draft follow-up with Company Graph context",
        output: {
          fallbackUsed: aiDraft.draftingMetadata.fallbackUsed,
          modelUsed: aiDraft.draftingMetadata.modelUsed,
          promptVersion: aiDraft.draftingMetadata.promptVersion,
          memoryKeysUsed: aiDraft.draftingMetadata.memoryKeysUsed,
        },
      });
      await insertStep({
        supabase,
        workspaceId,
        runId,
        stepKey: "prepare_crm_update",
        title: "Prepare CRM update",
        output: { status: crmPreparationStatus, preparedActions, crmPreparation, preparedHubSpotActions },
      });
      await insertStep({ supabase, workspaceId, runId, stepKey: "prepare_follow_up", title: "Prepare follow-up email", output: draft });

      const approval = await createGmailSendApproval({
        supabase,
        workspaceId,
        runId,
        to: draft.to,
        subject: draft.subject,
        body: draft.body,
        policyReason: "External email send requires human approval before Gmail execution.",
        sourceMetadata,
        dedupeKey: dedupe.dedupeKey,
        dedupeMetadata: dedupe,
        preparedActions,
        crmPreparation,
        crmPreparationStatus,
        preparedHubSpotActions,
      });

      await insertStep({ supabase, workspaceId, runId, stepKey: "create_approval", title: "Create approval request", output: { approvalId: approval.approvalId } });

      const output = {
        type: "gmail_follow_up_draft",
        source: "gmail_scan",
        draft,
        approvalId: approval.approvalId,
        opportunity: runInput,
        dedupeKey: dedupe.dedupeKey,
        dedupeMetadata: dedupe,
        signalCandidate,
        sourceMetadata,
        drafting: {
          detectedSignalSummary: aiDraft.detectedSignalSummary,
          whyThisMatters: aiDraft.whyThisMatters,
          suggestedAction: aiDraft.suggestedAction,
          expectedOutcome: aiDraft.expectedOutcome,
          riskNotes: aiDraft.riskNotes,
          metadata: aiDraft.draftingMetadata,
        },
        preparedActions,
        crmPreparation,
        crmPreparationStatus,
        preparedHubSpotActions,
      };
      const outputInsert = await supabase.from("os_operator_outputs").insert({
        id: operatorRuntimeId("opout"),
        workspace_id: workspaceId,
        run_id: runId,
        operator_key: "revenue",
        output_type: "gmail_follow_up_draft",
        title: `Follow-up draft for ${opportunity.message.fromEmail}`,
        payload: output,
        requires_approval: true,
        approval_id: approval.approvalId,
      });
      if (outputInsert.error) throw new Error(outputInsert.error.message);

      const runUpdate = await supabase.from("os_operator_runs").update({
        status: "waiting_for_approval",
        output,
        approval_id: approval.approvalId,
      }).eq("id", runId).eq("workspace_id", workspaceId);
      if (runUpdate.error) throw new Error(runUpdate.error.message);

      await logOperatorEvent({
        supabase,
        workspaceId,
        runId,
        eventType: "approval.created",
        message: `Created Gmail send approval ${approval.approvalId}.`,
        metadata: { approvalId: approval.approvalId, ...dedupe },
      });

      created.push({
        messageId: opportunity.message.id,
        threadId: opportunity.message.threadId,
        from: opportunity.message.fromEmail,
        subject: opportunity.message.subject,
        matchedKeywords: opportunity.matchedKeywords,
        classification: opportunity.classification,
        confidence: opportunity.confidence,
        crmPreparationStatus,
        dedupeKey: dedupe.dedupeKey,
        signalCandidate: signalCandidate ? { ...signalCandidate, status: "approval_created" } : undefined,
        runId,
        approvalId: approval.approvalId,
      });
      [dedupe.dedupeKey, dedupe.messageDedupeKey, dedupe.threadDedupeKey, dedupe.contactSubjectDedupeKey]
        .filter((key): key is string => Boolean(key))
        .forEach((key) => setDedupeReason(handled, key, "existing_pending_approval"));
    }

    const completedAt = new Date().toISOString();
    const scanSummary = {
      type: "gmail_scan_summary",
      status: "completed",
      sourceMode,
      monitoringEnabled: true,
      cadence: "daily",
      scanned: listed.length,
      opportunitiesFound: opportunities.length,
      approvalsCreated: created.length,
      skippedCount: skipped.length,
      skipped,
      routedItemCount: created.length,
      completedAt,
    };
    const scanRunId = operatorRuntimeId("oprun-revenue-scan-summary");
    const scanRunInsert = await supabase.from("os_operator_runs").insert({
      id: scanRunId,
      workspace_id: workspaceId,
      operator_key: "revenue",
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
      eventType: "gmail.scan.completed",
      message: `Revenue Gmail scan completed: ${listed.length} scanned, ${opportunities.length} opportunities, ${created.length} approvals.`,
      metadata: scanSummary,
    });

    const scanOutputInsert = await supabase.from("os_operator_outputs").insert({
      id: operatorRuntimeId("opout"),
      workspace_id: workspaceId,
      run_id: scanRunId,
      operator_key: "revenue",
      output_type: "gmail_scan_summary",
      title: "Revenue Gmail scan summary",
      payload: scanSummary,
      requires_approval: false,
    });
    if (scanOutputInsert.error) throw new Error(scanOutputInsert.error.message);
    const monitoringUpdate = await upsertRevenueMonitoringConfig({
      supabase,
      workspaceId,
      sourceMode,
      lastRunAt: completedAt,
      lastRunStatus: "completed",
      lastRunSummary: scanSummary,
    });
    if (monitoringUpdate.error) {
      console.warn("[revenue-scan] monitoring config update skipped", {
        workspaceId,
        error: monitoringUpdate.error.message,
      });
    }

    return {
      ok: true,
      status: 200,
      body: {
        status: "completed",
        sourceMode,
        scanned: listed.length,
        opportunitiesFound: opportunities.length,
        approvalsCreated: created.length,
        routedItemCount: created.length,
        opportunities: created,
        skipped,
      },
    };
  } catch (error) {
    return scanFailure(error);
  }
}

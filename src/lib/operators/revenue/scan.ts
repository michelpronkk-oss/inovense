import { GMAIL_SCAN_REQUIRED_SCOPES, GMAIL_SEND_REQUIRED_SCOPES, GmailApiError, getMessageDetails, getMissingGmailScopes, listRecentMessages, resolveAccessTokenFromCredential, type SafeGmailMessage, type StoredConnectorCredential } from "@/lib/connectors/gmail";
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
import { createGmailSendApproval } from "@/lib/operators/executors/gmail";
import { createMicrosoftSendApproval } from "@/lib/operators/executors/microsoft";
import {
  getRevenueCrmAdapter,
  isRevenueCrmAmbiguous,
  isRevenueCrmLookupError,
  isRevenueCrmUnsupported,
  type RevenueCrmAdapter,
  type RevenueCrmCompany,
  type RevenueCrmMatchStatus,
  type RevenueCrmOpportunity,
  type RevenueCrmPerson,
  type RevenueCrmProvider,
} from "@/lib/operators/revenue/crm";
import type { PreparedHubSpotActions } from "@/lib/operators/executors/hubspot";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { getOperatorReadiness, type OperatorReadiness } from "@/lib/operators/readiness";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { draftRevenueFollowUpWithAI } from "@/lib/operators/revenue/ai-drafting";
import { loadRevenueCompanyGraphContext } from "@/lib/operators/revenue/context";
import { sendSlackApprovalNotification } from "@/lib/notifications/slack";
import { normalizeEmailToSignalEvent, routeSignalCandidate, classifySignalCandidateLightweight } from "@/lib/signals/intake";
import type { SignalCandidate } from "@/lib/signals/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { getAppUrl } from "@/lib/urls";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type RevenueScanSourceMode = "scheduled" | "manual" | "event_ready";

/**
 * Revenue supports Gmail and Microsoft 365 as interchangeable inbox sources.
 * This mirrors Client Flow Operator's resolveClientFlowEmailConnector() -
 * readiness.ts already reports "ready"/"draft_only" for either connector via
 * its capability-based email check, so the scan itself must be able to run
 * against whichever one is actually connected instead of assuming Gmail.
 * Gmail is preferred when both happen to be connected, which keeps existing
 * Gmail-only workspaces behaving exactly as before.
 */
export type RevenueEmailConnector = "gmail" | "microsoft";

function resolveRevenueEmailConnector(readiness: OperatorReadiness): RevenueEmailConnector | null {
  const connected = readiness.connectedRequiredConnectors;
  if (connected.includes("gmail")) return "gmail";
  if (connected.includes("microsoft")) return "microsoft";
  return null;
}

/**
 * Normalizes a Microsoft Graph message into the same safe shape Gmail
 * messages use, so signal detection, scoring, dedupe, and drafting below can
 * stay provider-agnostic. Mirrors client-flow/scan.ts's fromMicrosoftMessage
 * (kept as a separate local copy, matching this codebase's existing
 * "parallel implementation, not shared" convention for scan.ts modules).
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

export type RevenueConfidence = "high" | "medium" | "low";
export type RevenueNextAction = "prepare_email_reply" | "prepare_qualification_question" | "defer_low_priority";

export type Opportunity = {
  message: SafeGmailMessage;
  matchedKeywords: string[];
  classification: "revenue_opportunity";
  confidence: RevenueConfidence;
  priorityScore: number;
  priorityReasons: string[];
  directSignals: string[];
  requestSignals: string[];
  contextSignals: string[];
  isReactivation: boolean;
  reactivationReason?: DedupeReason;
};

type CrmPreparation = {
  contactEmail: string;
  contactName: string | null;
  firstname?: string | null;
  lastname?: string | null;
  companyName: string | null;
  source: RevenueEmailConnector;
  sourceSubject?: string;
  classification: string;
  confidence: string;
  priorityScore?: number;
  priorityReasons?: string[];
  nextAction?: RevenueNextAction;
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
    leadSource: "Auterim";
    operator: "revenue";
    signalSource: RevenueEmailConnector;
    signalType: "revenue_opportunity";
  };
};

type Personalization = {
  contactEmail: string;
  contactName: string | null;
  firstname: string | null;
  lastname: string | null;
  greetingUsed: string;
  personalizationSource: RevenueCrmProvider | "signature" | "from_display" | "email_local" | "fallback";
  signatureCandidate?: string | null;
  signatureCandidateAccepted?: string | null;
  rejectedNameCandidates?: { candidate: string; reason: string; source: string }[];
};

/**
 * Read-only Revenue<->CRM context for a single inbound message: which
 * provider was used, the person-match outcome, and (when the matched person
 * resolves to an Account) company + open-opportunity context. Never a write
 * trigger - purely observability + drafting context.
 */
type RevenueCrmScanContext = {
  provider: RevenueCrmProvider | null;
  personMatchStatus: "matched_contact" | "matched_lead" | "ambiguous" | "no_match" | "unsupported" | "error" | "not_attempted";
  person: RevenueCrmPerson | null;
  companyMatchStatus: RevenueCrmMatchStatus | "not_attempted";
  company: RevenueCrmCompany | null;
  opportunityMatchStatus: RevenueCrmMatchStatus | "not_attempted";
  opportunities: RevenueCrmOpportunity[];
  lookupDurationMs: number;
  fallbackReason: string | null;
};

function emptyRevenueCrmScanContext(provider: RevenueCrmProvider | null, fallbackReason: string | null): RevenueCrmScanContext {
  return {
    provider,
    personMatchStatus: "not_attempted",
    person: null,
    companyMatchStatus: "not_attempted",
    company: null,
    opportunityMatchStatus: "not_attempted",
    opportunities: [],
    lookupDurationMs: 0,
    fallbackReason,
  };
}

/**
 * Resolves person + company + open-opportunity context from whichever CRM
 * adapter was selected for this scan (see resolveRevenueCrmProvider below).
 * Read-only: never writes, never triggers a Salesforce/HubSpot mutation.
 * Called once per inbound message so both the priority score and the AI
 * drafting context see the same lookup result.
 */
async function resolveRevenueCrmContext(input: {
  workspaceId: string;
  email: string;
  crm: RevenueCrmAdapter | null;
}): Promise<RevenueCrmScanContext> {
  if (!input.crm || !input.crm.supports("person.read")) {
    return emptyRevenueCrmScanContext(input.crm?.provider ?? null, input.crm ? "person_read_unsupported" : "no_crm_connected");
  }

  const startedAt = Date.now();
  try {
    const result = await input.crm.findPersonByEmail(input.workspaceId, input.email);
    const lookupDurationMs = Date.now() - startedAt;

    if (isRevenueCrmUnsupported(result)) {
      return { ...emptyRevenueCrmScanContext(input.crm.provider, "person_read_unsupported"), personMatchStatus: "unsupported", lookupDurationMs };
    }
    if (isRevenueCrmAmbiguous(result)) {
      return { ...emptyRevenueCrmScanContext(input.crm.provider, "ambiguous_email_match"), personMatchStatus: "ambiguous", lookupDurationMs };
    }
    if (isRevenueCrmLookupError(result)) {
      return { ...emptyRevenueCrmScanContext(input.crm.provider, result.message), personMatchStatus: "error", lookupDurationMs };
    }
    if (!result) {
      return { ...emptyRevenueCrmScanContext(input.crm.provider, null), personMatchStatus: "no_match", lookupDurationMs };
    }

    const person = result;
    const personMatchStatus: RevenueCrmScanContext["personMatchStatus"] = person.matchType === "lead" ? "matched_lead" : "matched_contact";
    let companyMatchStatus: RevenueCrmMatchStatus | "not_attempted" = "not_attempted";
    let company: RevenueCrmCompany | null = null;
    let opportunityMatchStatus: RevenueCrmMatchStatus | "not_attempted" = "not_attempted";
    let opportunities: RevenueCrmOpportunity[] = [];
    let fallbackReason: string | null = null;

    if (input.crm.supports("company.read") && input.crm.getOpportunityContext) {
      const opportunityContext = await input.crm.getOpportunityContext(input.workspaceId, person);
      if (isRevenueCrmUnsupported(opportunityContext)) {
        companyMatchStatus = "unsupported";
        opportunityMatchStatus = "unsupported";
        fallbackReason = "company_read_unsupported";
      } else {
        companyMatchStatus = opportunityContext.companyMatchStatus;
        company = opportunityContext.company;
        opportunityMatchStatus = opportunityContext.opportunityMatchStatus;
        opportunities = opportunityContext.opportunities;
        fallbackReason = opportunityContext.fallbackReason;
      }
    }

    return {
      provider: input.crm.provider,
      personMatchStatus,
      person,
      companyMatchStatus,
      company,
      opportunityMatchStatus,
      opportunities,
      lookupDurationMs: Date.now() - startedAt,
      fallbackReason,
    };
  } catch (error) {
    console.warn("[revenue-scan] crm context lookup failed", {
      workspaceId: input.workspaceId,
      provider: input.crm.provider,
      error: error instanceof Error ? error.message : "Unknown CRM lookup error",
    });
    return { ...emptyRevenueCrmScanContext(input.crm.provider, error instanceof Error ? error.message : "crm_lookup_failed"), personMatchStatus: "error", lookupDurationMs: Date.now() - startedAt };
  }
}

/**
 * Chooses exactly one CRM adapter for the whole scan - never both. HubSpot
 * only -> HubSpot. Salesforce only -> Salesforce. Neither -> null (email-first
 * Revenue still works unchanged). Both connected -> an explicit workspace
 * preference if one is configured, otherwise a fixed, documented default:
 * HubSpot, because it is the only provider that also supports Revenue's
 * write path (contact/deal/note/task) today. This is a stable rule, not
 * dependent on object key iteration order.
 */
function resolveRevenueCrmProvider(input: {
  hubspotConnected: boolean;
  salesforceConnected: boolean;
  preferredProvider: RevenueCrmProvider | null;
}): RevenueCrmProvider | null {
  if (input.hubspotConnected && input.salesforceConnected) {
    if (input.preferredProvider === "salesforce" || input.preferredProvider === "hubspot") return input.preferredProvider;
    return "hubspot";
  }
  if (input.hubspotConnected) return "hubspot";
  if (input.salesforceConnected) return "salesforce";
  return null;
}

export type RevenueScanSummary = {
  status?: string;
  message?: string;
  sourceMode?: RevenueScanSourceMode;
  scanned?: number;
  opportunitiesFound?: number;
  approvalsCreated?: number;
  deferredCount?: number;
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
    priorityScore?: number;
    priorityReasons?: string[];
    nextAction?: RevenueNextAction;
    isReactivation?: boolean;
    crmPreparationStatus?: string;
    dedupeKey?: string;
    signalCandidate?: SignalCandidate;
    runId: string;
    approvalId: string;
  }[];
  deferred?: {
    messageId: string;
    subject?: string;
    from?: string;
    reason: string;
    dedupeKey?: string;
    runId: string;
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

const DIRECT_COMMERCIAL_SIGNALS = [
  { label: "pricing", pattern: /\b(?:pricing|price|cost|budget)\b/i },
  { label: "quote", pattern: /\b(?:quote|quotation|estimate)\b/i },
  { label: "proposal", pattern: /\bproposal\b/i },
  { label: "demo", pattern: /\b(?:demo|demonstration)\b/i },
];

const QUALIFIED_REQUEST_SIGNALS = [
  { label: "interested", pattern: /\b(?:interested in|exploring|evaluating)\b/i },
  { label: "help request", pattern: /\b(?:can you help|looking for|need help with|how can you help)\b/i },
  { label: "meeting request", pattern: /\b(?:book|schedule|arrange)\b[^.!?]{0,40}\b(?:call|meeting|demo)\b|\b(?:can we|could we|would you)\b[^.!?]{0,40}\b(?:call|meet|talk)\b/i },
  { label: "availability", pattern: /\bavailability\b/i },
];

// A request is only commercial when it names a relevant service area. These
// are never scanned in sender addresses: `ai` must not match inside `mail`.
const PRODUCT_CONTEXT_SIGNALS = [
  { label: "automation", pattern: /\bautomation\b/i },
  { label: "AI", pattern: /\bai\b/i },
  { label: "website", pattern: /\bwebsite\b/i },
  { label: "operator", pattern: /\b(?:operator|workflow|integration)\b/i },
  { label: "service", pattern: /\b(?:service|solution|implementation)\b/i },
];

// Business email domains vs. personal mail providers is a cheap, honest proxy
// for "this may be a decision-maker writing from a company inbox" - never
// used alone, only as one input among several to the priority score below.
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
]);

const WARM_REFERRAL_PATTERN = /\b(?:referred by|recommended (?:you|your)|was told to (?:reach out|contact)|suggested i (?:reach out|contact)|a (?:mutual )?friend (?:of ours )?recommended|someone recommended)\b/i;

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
  sourceProvider: RevenueEmailConnector;
  operatorKey: "revenue";
};

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

function opportunityText(message: SafeGmailMessage): string {
  // Sender display values and email addresses are metadata, never evidence of
  // purchase intent. In particular, "ai" in an address such as mail@… must
  // not turn an unrelated inbound email into a lead.
  return [message.subject, message.snippet, message.bodyText].filter(Boolean).join(" ");
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

function isPromotionalOrJunk(message: SafeGmailMessage): boolean {
  return message.labelIds.some((label) => {
    const normalized = label.toUpperCase();
    return normalized === "SPAM" || normalized === "TRASH" || normalized === "CATEGORY_PROMOTIONS" || normalized === "CATEGORY_UPDATES";
  });
}

function isAutomatedMailbox(email: string): boolean {
  const local = email.split("@")[0] ?? "";
  return /^(?:no-?reply|do-?not-?reply|newsletter|notifications?|updates?|marketing|mailer-daemon)(?:[._+-]|$)/i.test(local);
}

function isAuterimGeneratedOutbound(message: SafeGmailMessage, providerEmail: string): boolean {
  if (!isSelfSent(message, providerEmail)) return false;
  const text = safeText(message);
  return text.includes("following up on") || text.includes("revenue operator prepared") || text.includes("auterim") || text.includes("inovense");
}

function skipReason(message: SafeGmailMessage, providerEmail: string): string | null {
  if (isAuterimGeneratedOutbound(message, providerEmail)) return "auterim_generated_outbound";
  if (isSelfSent(message, providerEmail)) return "self_sent";
  if (isSentMail(message)) return "sent_mail";
  if (isPromotionalOrJunk(message)) return "promotional_or_junk";
  const text = safeText(message);
  if (!message.fromEmail || isAutomatedMailbox(message.fromEmail)) return "automated_or_missing_sender";
  for (const item of SKIP_PATTERNS) {
    if (item.pattern.test(text)) return item.reason;
  }
  return null;
}

function isBusinessEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  return !PERSONAL_EMAIL_DOMAINS.has(domain);
}

function hasWarmReferralLanguage(text: string): boolean {
  return WARM_REFERRAL_PATTERN.test(text);
}

/**
 * Deterministic confidence/priority scoring. Every input is a signal that is
 * either directly present in the message or trivially derivable from it - no
 * monetary values, timelines, or CRM facts are invented here. The resulting
 * `reasons` array is the plain-language explanation surfaced on the
 * opportunity, run, and approval so a human can see exactly why Revenue rated
 * something the way it did.
 */
function scoreOpportunitySignal(input: {
  directSignals: string[];
  requestSignals: string[];
  contextSignals: string[];
  matchedKeywords: string[];
  fromEmail: string;
  text: string;
}): { confidence: RevenueConfidence; score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (input.directSignals.length > 0) {
    score += 3;
    reasons.push(`Direct commercial language detected (${input.directSignals.join(", ")}).`);
  } else if (input.requestSignals.length > 0 && input.contextSignals.length > 0) {
    score += 2;
    reasons.push("Qualified request language combined with relevant product context.");
  }
  if (input.matchedKeywords.length >= 3) {
    score += 1;
    reasons.push("Multiple buying signals matched in a single message.");
  }
  if (isBusinessEmailDomain(input.fromEmail)) {
    score += 1;
    reasons.push("Sent from a business email domain rather than a personal mail provider.");
  }
  if (hasWarmReferralLanguage(input.text)) {
    score += 1;
    reasons.push("Message references a referral or recommendation.");
  }

  const confidence: RevenueConfidence = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
  return { confidence, score, reasons };
}

/**
 * Best-next-action decision. Deterministic and auditable on purpose: the AI
 * drafting step (when a model key is configured) only ever refines the
 * phrasing of whichever action is chosen here, it never picks the action.
 * "defer_low_priority" is a first-class, logged outcome, not a silent drop.
 */
function decideNextAction(input: { confidence: RevenueConfidence; directSignals: string[] }): { action: RevenueNextAction; reason: string } {
  if (input.confidence === "low") {
    return {
      action: "defer_low_priority",
      reason: "Signal strength is low. Deferred with no draft or approval created instead of contacting the sender.",
    };
  }
  if (input.confidence === "medium" && input.directSignals.length === 0) {
    return {
      action: "prepare_qualification_question",
      reason: "Interest is implied but the message has no direct commercial ask. Preparing a short qualification question instead of a full follow-up.",
    };
  }
  return {
    action: "prepare_email_reply",
    reason: "A direct or high-confidence commercial signal was detected. Preparing a full follow-up reply.",
  };
}

type DetectionOutcome =
  | { kind: "opportunity"; message: SafeGmailMessage; matchedKeywords: string[]; directSignals: string[]; requestSignals: string[]; contextSignals: string[] }
  | { kind: "low_signal"; message: SafeGmailMessage; matchedKeywords: string[] }
  | { kind: "skipped"; reason: string };

function detectOpportunity(message: SafeGmailMessage, providerEmail: string): DetectionOutcome {
  const skipped = skipReason(message, providerEmail);
  if (skipped) return { kind: "skipped", reason: skipped };

  const text = opportunityText(message);
  const directSignals = DIRECT_COMMERCIAL_SIGNALS.filter((signal) => signal.pattern.test(text)).map((signal) => signal.label);
  const requestSignals = QUALIFIED_REQUEST_SIGNALS.filter((signal) => signal.pattern.test(text)).map((signal) => signal.label);
  const contextSignals = PRODUCT_CONTEXT_SIGNALS.filter((signal) => signal.pattern.test(text)).map((signal) => signal.label);
  const matchedKeywords = [...new Set([...directSignals, ...requestSignals, ...contextSignals])];

  // A price, quote, proposal or demo is explicit buying intent. Less specific
  // requests require product context as well. Messages that matched at least
  // one keyword but do not clear this bar are not dropped silently - they
  // become a "low_signal" outcome that Revenue explicitly defers (see
  // decideNextAction), so "noise-adjacent but not clearly actionable" is a
  // real, logged state instead of vanishing. Messages that matched nothing at
  // all remain pure noise and are skipped without a run record.
  if (directSignals.length > 0 || (requestSignals.length > 0 && contextSignals.length > 0)) {
    return { kind: "opportunity", message, matchedKeywords, directSignals, requestSignals, contextSignals };
  }
  if (matchedKeywords.length > 0) {
    return { kind: "low_signal", message, matchedKeywords };
  }
  return { kind: "skipped", reason: "noise" };
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
  message: SafeGmailMessage;
  crmContext: RevenueCrmScanContext;
}): Promise<Personalization> {
  const email = input.message.fromEmail;
  const rejectedNameCandidates: { candidate: string; reason: string; source: string }[] = [];
  const person = input.crmContext.person;
  if (person && input.crmContext.provider) {
    const first = person.firstName?.trim() ?? "";
    const last = person.lastName?.trim() ?? "";
    const contactName = safeHumanName([first, last].filter(Boolean).join(" ")).name;
    if (contactName) {
      const split = splitHumanName(contactName);
      return { contactEmail: email, contactName, firstname: split.firstname, lastname: split.lastname, greetingUsed: `Hi ${split.firstname ?? contactName},`, personalizationSource: input.crmContext.provider, rejectedNameCandidates };
    }
  }

  const signature = nameFromSignatureText([input.message.bodyText, input.message.snippet].filter(Boolean).join("\n"));
  if (signature.rejected) rejectedNameCandidates.push(signature.rejected);
  if (signature.name) {
    const split = splitHumanName(signature.name);
    return { contactEmail: email, contactName: signature.name, firstname: split.firstname, lastname: split.lastname, greetingUsed: `Hi ${split.firstname ?? signature.name},`, personalizationSource: "signature", signatureCandidate: signature.candidate ?? signature.name, signatureCandidateAccepted: signature.accepted ?? signature.name, rejectedNameCandidates };
  }

  const fromName = displayNameFromHeader(input.message.from, email);
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

function buildDraftFromOpportunity(opportunity: Opportunity, personalization: Personalization, nextAction: RevenueNextAction) {
  const subject = opportunity.message.subject
    ? `Re: ${opportunity.message.subject}`
    : nextAction === "prepare_qualification_question" ? "Quick question about your message" : "Following up on your message";
  const context = opportunity.message.snippet || "your recent message";
  const contextLine = `Thanks for reaching out. I saw your note about "${context.slice(0, 180)}${context.length > 180 ? "..." : ""}" and wanted to follow up while it is fresh.`;

  if (nextAction === "prepare_qualification_question") {
    return {
      to: opportunity.message.fromEmail,
      subject,
      body: [
        personalization.greetingUsed,
        "",
        contextLine,
        "",
        "Before I point you in the right direction, could you share a bit more about what you are trying to solve or what prompted the message?",
        "",
        "Best,",
        "Auterim",
      ].join("\n"),
    };
  }

  return {
    to: opportunity.message.fromEmail,
    subject,
    body: [
      personalization.greetingUsed,
      "",
      contextLine,
      "",
      "If helpful, I can map the next practical step and keep the path lightweight.",
      "",
      "Would you be open to a short call this week to see whether there is a fit?",
      "",
      "Best,",
      "Auterim",
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

function buildCrmPreparation(opportunity: Opportunity, personalization: Personalization, provider: RevenueEmailConnector, nextAction: RevenueNextAction): CrmPreparation {
  const summary = opportunity.message.snippet
    ? opportunity.message.snippet.slice(0, 280)
    : `Inbound revenue signal from ${opportunity.message.fromEmail}.`;
  return {
    contactEmail: opportunity.message.fromEmail,
    contactName: personalization.contactName,
    firstname: personalization.firstname,
    lastname: personalization.lastname,
    companyName: companyFromEmail(opportunity.message.fromEmail),
    source: provider,
    sourceSubject: opportunity.message.subject,
    classification: opportunity.classification,
    confidence: opportunity.confidence,
    priorityScore: opportunity.priorityScore,
    priorityReasons: opportunity.priorityReasons,
    nextAction,
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
      leadSource: "Auterim",
      operator: "revenue",
      signalSource: provider,
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
      source: input.crmPreparation.source,
    },
    deal: {
      dealname: `New inbound opportunity: ${contactLabel}`,
      stageLabel: input.crmPreparation.suggestedDealStage,
      pipelineLabel: "Default HubSpot pipeline",
      amount: null,
    },
    note: {
      body: [
        "Prepared by Auterim Revenue Operator.",
        `Source channel: ${input.crmPreparation.source === "microsoft" ? "Microsoft 365/email" : "Gmail/email"}.`,
        `Source subject: ${input.crmPreparation.sourceSubject || "-"}.`,
        `Classification: ${input.crmPreparation.classification}.`,
        `Confidence: ${input.crmPreparation.confidence}${typeof input.crmPreparation.priorityScore === "number" ? ` (score ${input.crmPreparation.priorityScore})` : ""}.`,
        input.crmPreparation.priorityReasons?.length ? `Why: ${input.crmPreparation.priorityReasons.join(" ")}` : null,
        `Suggested next step: ${input.crmPreparation.suggestedNextStep}`,
        "",
        input.crmPreparation.summary,
      ].filter((line): line is string => Boolean(line)).join("\n"),
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

function buildDedupeMetadata(message: SafeGmailMessage, provider: RevenueEmailConnector): RevenueDedupeMetadata {
  const gmailMessageId = message.id;
  const gmailThreadId = message.threadId || undefined;
  const contactEmail = normalizeEmail(message.fromEmail || message.from);
  const normalizedSubject = normalizeSubjectForDedupe(message.subject);
  const messageDedupeKey = gmailMessageId ? `revenue:${provider}:message:${gmailMessageId}` : undefined;
  const threadDedupeKey = gmailThreadId ? `revenue:${provider}:thread:${gmailThreadId}` : undefined;
  const contactSubjectDedupeKey = contactEmail && normalizedSubject
    ? `revenue:contact_subject:${contactEmail}:${normalizedSubject}`
    : undefined;
  return {
    dedupeKey: messageDedupeKey ?? threadDedupeKey ?? contactSubjectDedupeKey ?? `revenue:${provider}:message:${Date.now()}`,
    messageDedupeKey,
    threadDedupeKey,
    contactSubjectDedupeKey,
    gmailMessageId,
    gmailThreadId,
    contactEmail,
    normalizedSubject,
    sourceProvider: provider,
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
  // Historical records predate Microsoft 365 support and never stored
  // sourceProvider - they were always Gmail, so default to "gmail" to keep
  // existing dedupe keys (and therefore existing approval history) intact.
  const provider: RevenueEmailConnector = record.sourceProvider === "microsoft" ? "microsoft" : "gmail";
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
  setDedupeReason(refs, messageId ? `revenue:${provider}:message:${messageId}` : undefined, reason);
  setDedupeReason(refs, threadId ? `revenue:${provider}:thread:${threadId}` : undefined, reason);
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

type DedupeLookup = { reason: DedupeReason; scope: "message" | "thread" };

/**
 * Message/subject-scoped keys are a hard duplicate: this exact message (or an
 * equivalent subject from the same contact) was already handled. A
 * thread-scoped-only match means the thread was acted on before but *this*
 * message id is new - that is a genuinely new inbound reply, not a duplicate,
 * so the caller treats it as a reactivation instead of silently dropping it
 * (closing the "already responded" / "new meaningful reply" gap: previously
 * a thread that had ever been touched stayed permanently deduped even when
 * the contact sent a brand new message).
 */
function findDuplicateReason(metadata: RevenueDedupeMetadata, refs: Map<string, DedupeReason>): DedupeLookup | null {
  const messageScopedKeys = [metadata.messageDedupeKey, metadata.contactSubjectDedupeKey, metadata.dedupeKey]
    .filter((key): key is string => Boolean(key));
  for (const key of messageScopedKeys) {
    const reason = refs.get(key);
    if (reason) return { reason, scope: "message" };
  }
  if (metadata.threadDedupeKey) {
    const reason = refs.get(metadata.threadDedupeKey);
    if (reason) return { reason, scope: "thread" };
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
    body: {
      error: "revenue_scan_failed",
      message: error instanceof Error ? error.message : "Revenue scan failed.",
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
    return { ok: false, status: 409, body: { status: "missing_connector", message: "Connect Gmail or Microsoft 365 to scan for revenue opportunities.", readiness } };
  }
  if (readiness.status === "upgrade_required") {
    return { ok: false, status: 402, body: { status: "upgrade_required", message: readiness.reason, readiness } };
  }
  if (!readiness.canRunManual || (readiness.status !== "ready" && readiness.status !== "draft_only")) {
    return { ok: false, status: 409, body: { status: readiness.status, message: readiness.reason, readiness } };
  }

  // Real billing enforcement: connector readiness alone is never enough to
  // let a scan create new approvals. This is checked after readiness (a
  // missing connector is still the more specific/useful error) and before
  // any connector API call or model call, so a lapsed workspace never
  // consumes Gmail/Microsoft/HubSpot quota or model spend for a scan whose
  // results could not be acted on anyway. Already-created approvals from
  // before a workspace lapsed are untouched by this check - it only gates
  // starting new scan work.
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

  const emailConnector = resolveRevenueEmailConnector(readiness);
  if (!emailConnector) {
    return { ok: false, status: 409, body: { status: "missing_connector", message: "Connect Gmail or Microsoft 365 to scan for revenue opportunities.", readiness } };
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
      return { ok: false, status: 409, body: { status: "missing_gmail", message: "Connect Gmail to scan for revenue opportunities." } };
    }

    gmailCredential = credentialRes.data as StoredConnectorCredential;
    const missingSendScopes = getMissingGmailScopes(gmailCredential.scopes, GMAIL_SEND_REQUIRED_SCOPES);
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

    const missingScanScopes = getMissingGmailScopes(gmailCredential.scopes, GMAIL_SCAN_REQUIRED_SCOPES);
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
  } else {
    microsoftCredential = await getMicrosoftCredential(workspaceId, supabase);
    if (!microsoftCredential || microsoftCredential.status === "needs_attention") {
      return { ok: false, status: 409, body: { status: "missing_microsoft", message: "Connect Microsoft 365 to scan for revenue opportunities." } };
    }
    const missingSendScopes = getMissingMicrosoftScopes(microsoftCredential.scopes, MICROSOFT_SEND_REQUIRED_SCOPES);
    if (missingSendScopes.length > 0) {
      return {
        ok: false,
        status: 409,
        body: {
          status: "requires_microsoft_send_scope",
          message: "Reconnect Microsoft 365 to enable approval-gated sending.",
          missingScopes: missingSendScopes,
          reconnectRequired: true,
        },
      };
    }
    const missingScanScopes = getMissingMicrosoftScopes(microsoftCredential.scopes, MICROSOFT_READ_REQUIRED_SCOPES);
    if (missingScanScopes.length > 0) {
      return {
        ok: false,
        status: 409,
        body: {
          status: "requires_microsoft_read_scope",
          message: "Reconnect Microsoft 365 to enable opportunity scanning.",
          missingScopes: missingScanScopes,
          reconnectRequired: true,
        },
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
      connector.connectorKey === "hubspot"
      && connector.status === "connected"
      && connector.providerConfigKey
      && connector.nangoConnectionId
    );
    // Salesforce is a direct-OAuth (native) connector, not Nango-managed, so
    // it has no providerConfigKey/nangoConnectionId to check - a "connected"
    // status on the stored credential row is sufficient, mirroring how
    // Microsoft 365's native connection is treated elsewhere in this file.
    const salesforceConnected = connectorTruth.some((connector) =>
      connector.connectorKey === "salesforce"
      && connector.status === "connected"
    );
    const maxResults = Math.min(Math.max(Number(input.maxResults) || 15, 1), 20);
    const listed = emailConnector === "gmail"
      ? await listRecentMessages(accessToken, { maxResults, query: "newer_than:30d" })
      : (await listRecentMicrosoftMessages(accessToken, maxResults)).map((message) => ({ id: message.id }));
    const handled = await loadRevenueDedupeState({ supabase, workspaceId });
    const companyGraphContext = await loadRevenueCompanyGraphContext({ supabase, workspaceId });
    const workspacePolicy = await loadWorkspacePolicySettings({ supabase, workspaceId });
    // No workspace-level "preferred CRM provider" setting exists in
    // os_workspace_settings today - this reads the field honestly (it will
    // simply be undefined) rather than inventing a settings UI for this pass.
    // If one is ever added under approval_policy.preferredCrmProvider, it is
    // honored automatically.
    const preferredCrmProviderRaw = (workspacePolicy.approvalPolicy as Record<string, unknown>).preferredCrmProvider;
    const preferredCrmProvider: RevenueCrmProvider | null = preferredCrmProviderRaw === "hubspot" || preferredCrmProviderRaw === "salesforce" ? preferredCrmProviderRaw : null;
    // Resolved once per scan/workspace - the rest of the scan uses only this
    // one adapter. Never query both CRMs "just in case" on every message.
    const revenueCrmProvider = resolveRevenueCrmProvider({ hubspotConnected, salesforceConnected, preferredProvider: preferredCrmProvider });
    const revenueCrm = getRevenueCrmAdapter(revenueCrmProvider);
    const skipped: NonNullable<RevenueScanSummary["skipped"]> = [];
    const opportunities: Opportunity[] = [];
    const signalCandidates: SignalCandidate[] = [];

    for (const item of listed) {
      const message = emailConnector === "gmail"
        ? await getMessageDetails(accessToken, item.id)
        : fromMicrosoftMessage(await getMicrosoftMessage(accessToken, item.id));
      const dedupe = buildDedupeMetadata(message, emailConnector);
      const duplicate = findDuplicateReason(dedupe, handled);
      const isReactivation = Boolean(duplicate && duplicate.scope === "thread");
      if (duplicate && duplicate.scope === "message") {
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: duplicate.reason, dedupeKey: dedupe.dedupeKey });
        continue;
      }

      const detected = detectOpportunity(message, providerEmail);
      if (detected.kind === "skipped") {
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: detected.reason });
        continue;
      }

      const text = opportunityText(message);
      if (detected.kind === "low_signal") {
        const score = scoreOpportunitySignal({ directSignals: [], requestSignals: [], contextSignals: [], matchedKeywords: detected.matchedKeywords, fromEmail: message.fromEmail, text });
        opportunities.push({
          message,
          matchedKeywords: detected.matchedKeywords,
          classification: "revenue_opportunity",
          confidence: "low",
          priorityScore: score.score,
          priorityReasons: ["Message matched limited product-context keywords only, with no clear buying signal or request.", ...score.reasons],
          directSignals: [],
          requestSignals: [],
          contextSignals: [],
          isReactivation,
          reactivationReason: isReactivation ? duplicate?.reason : undefined,
        });
        continue;
      }

      const score = scoreOpportunitySignal({
        directSignals: detected.directSignals,
        requestSignals: detected.requestSignals,
        contextSignals: detected.contextSignals,
        matchedKeywords: detected.matchedKeywords,
        fromEmail: message.fromEmail,
        text,
      });
      const opportunity: Opportunity = {
        message,
        matchedKeywords: detected.matchedKeywords,
        classification: "revenue_opportunity",
        confidence: score.confidence,
        priorityScore: score.score,
        priorityReasons: score.reasons,
        directSignals: detected.directSignals,
        requestSignals: detected.requestSignals,
        contextSignals: detected.contextSignals,
        isReactivation,
        reactivationReason: isReactivation ? duplicate?.reason : undefined,
      };

      const signalEvent = normalizeEmailToSignalEvent({
        workspaceId,
        message,
        rawRef: `${emailConnector}:${message.id}`,
        metadata: {
          dedupeKey: dedupe.dedupeKey,
          sourceMode,
        },
      });
      const signalCandidate = routeSignalCandidate(classifySignalCandidateLightweight(signalEvent));
      signalCandidates.push(signalCandidate);
      opportunities.push(opportunity);
    }

    const created: NonNullable<RevenueScanSummary["opportunities"]> = [];
    const deferred: NonNullable<RevenueScanSummary["deferred"]> = [];

    for (const opportunity of opportunities) {
      const runId = operatorRuntimeId("oprun-revenue-scan");
      const dedupe = buildDedupeMetadata(opportunity.message, emailConnector);
      // Re-check duplicate state at this point in case an earlier iteration in
      // this same scan already handled the same contact/subject pair.
      const duplicate = findDuplicateReason(dedupe, handled);
      if (duplicate && duplicate.scope === "message") {
        skipped.push({ messageId: opportunity.message.id, subject: opportunity.message.subject, from: opportunity.message.from, reason: duplicate.reason, dedupeKey: dedupe.dedupeKey });
        continue;
      }

      const { action: nextAction, reason: nextActionReason } = decideNextAction({ confidence: opportunity.confidence, directSignals: opportunity.directSignals });

      if (nextAction === "defer_low_priority") {
        const completedAt = new Date().toISOString();
        const deferInput = {
          source: `${emailConnector}_scan`,
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
          matchedKeywords: opportunity.matchedKeywords,
          classification: opportunity.classification,
          confidence: opportunity.confidence,
          priorityScore: opportunity.priorityScore,
          priorityReasons: opportunity.priorityReasons,
          nextAction,
          nextActionReason,
          isReactivation: opportunity.isReactivation,
        };
        const runInsert = await supabase.from("os_operator_runs").insert({
          id: runId,
          workspace_id: workspaceId,
          operator_key: "revenue",
          trigger_type: `${emailConnector}_scan`,
          status: "completed",
          input: deferInput,
          output: { status: "no_action_low_priority", reason: nextActionReason },
          readiness,
          risk_level: "low",
          started_at: completedAt,
          completed_at: completedAt,
        });
        if (runInsert.error) throw new Error(runInsert.error.message);
        await logOperatorEvent({
          supabase,
          workspaceId,
          runId,
          eventType: "revenue.scan.no_action",
          message: `No action taken for message from ${opportunity.message.fromEmail}: ${nextActionReason}`,
          metadata: deferInput,
        });
        const outputInsert = await supabase.from("os_operator_outputs").insert({
          id: operatorRuntimeId("opout"),
          workspace_id: workspaceId,
          run_id: runId,
          operator_key: "revenue",
          output_type: "revenue_no_action_summary",
          title: `No action: ${opportunity.message.fromEmail}`,
          payload: deferInput,
          requires_approval: false,
        });
        if (outputInsert.error) throw new Error(outputInsert.error.message);
        deferred.push({
          messageId: opportunity.message.id,
          subject: opportunity.message.subject,
          from: opportunity.message.from,
          reason: nextActionReason,
          dedupeKey: dedupe.dedupeKey,
          runId,
        });
        [dedupe.dedupeKey, dedupe.messageDedupeKey, dedupe.threadDedupeKey, dedupe.contactSubjectDedupeKey]
          .filter((key): key is string => Boolean(key))
          .forEach((key) => setDedupeReason(handled, key, "already_handled"));
        continue;
      }

      const revenueCrmContext = await resolveRevenueCrmContext({ workspaceId, email: opportunity.message.fromEmail, crm: revenueCrm });
      const personalization = await buildPersonalization({ workspaceId, message: opportunity.message, crmContext: revenueCrmContext });
      // A real CRM contact/lead match is a real relationship signal - boost
      // priority and record why, regardless of which CRM provider matched,
      // without re-deciding a next action that was already chosen
      // deterministically above.
      if (revenueCrmContext.personMatchStatus === "matched_contact" || revenueCrmContext.personMatchStatus === "matched_lead") {
        const providerLabel = revenueCrmContext.provider === "salesforce" ? "Salesforce" : "HubSpot";
        const kindLabel = revenueCrmContext.personMatchStatus === "matched_lead" ? "Lead" : "Contact";
        opportunity.priorityScore += 1;
        opportunity.priorityReasons = [...opportunity.priorityReasons, `${kindLabel} already exists in ${providerLabel}.`];
      }
      const deterministicDraft = buildDraftFromOpportunity(opportunity, personalization, nextAction);
      const crmPreparation = buildCrmPreparation(opportunity, personalization, emailConnector, nextAction);
      crmPreparation.dedupeKey = dedupe.dedupeKey;
      crmPreparation.normalizedSubject = dedupe.normalizedSubject;
      const aiDraft = await draftRevenueFollowUpWithAI({
        opportunity,
        deterministicDraft,
        context: companyGraphContext,
        nextAction,
        crmContext: revenueCrmContext.provider ? { provider: revenueCrmContext.provider, company: revenueCrmContext.company, opportunities: revenueCrmContext.opportunities } : null,
      });
      const draft = {
        ...aiDraft.draft,
        body: applyGreeting(aiDraft.draft.body, personalization.greetingUsed),
      };
      crmPreparation.summary = aiDraft.detectedSignalSummary || crmPreparation.summary;
      crmPreparation.suggestedNextStep = aiDraft.suggestedAction || crmPreparation.suggestedNextStep;
      const preparedHubSpotActions = buildPreparedHubSpotActions({ crmPreparation, hubspotConnected });
      const crmPreparationStatus = hubspotConnected ? "hubspot_execution_enabled" : "hubspot_not_connected";
      const sendActionKey = emailConnector === "microsoft" ? "send_microsoft_follow_up" : "send_gmail_follow_up";
      const preparedActions = hubspotConnected
        ? [sendActionKey, "update_hubspot_contact", "add_hubspot_note", "create_hubspot_follow_up_task"]
        : [sendActionKey];
      // Read-only CRM context observability. Never logs a raw access token or
      // a full/raw CRM API response - only normalized, minimal fields.
      const revenueCrmContextMeta = {
        crmProviderUsed: revenueCrmContext.provider ?? "none",
        personMatchStatus: revenueCrmContext.personMatchStatus,
        companyMatchStatus: revenueCrmContext.companyMatchStatus,
        opportunityMatchStatus: revenueCrmContext.opportunityMatchStatus,
        opportunityCount: revenueCrmContext.opportunities.length,
        stage: revenueCrmContext.opportunities[0]?.stage ?? null,
        owner: revenueCrmContext.opportunities[0]?.ownerName ?? revenueCrmContext.company?.ownerName ?? null,
        lookupDurationMs: revenueCrmContext.lookupDurationMs,
        fallbackReason: revenueCrmContext.fallbackReason,
      };
      const runInput = {
        source: `${emailConnector}_scan`,
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
        priorityScore: opportunity.priorityScore,
        priorityReasons: opportunity.priorityReasons,
        nextAction,
        nextActionReason,
        isReactivation: opportunity.isReactivation,
        reactivationReason: opportunity.reactivationReason ?? null,
        personalization,
        revenueCrmContext: revenueCrmContextMeta,
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
        priorityScore: opportunity.priorityScore,
        priorityReasons: opportunity.priorityReasons,
        nextAction,
        nextActionReason,
        isReactivation: opportunity.isReactivation,
        matchedKeywords: opportunity.matchedKeywords,
        contactName: personalization.contactName,
        contactEmail: personalization.contactEmail,
        personalizationSource: personalization.personalizationSource,
        greetingUsed: personalization.greetingUsed,
        signatureCandidate: personalization.signatureCandidate ?? null,
        signatureCandidateAccepted: personalization.signatureCandidateAccepted ?? null,
        rejectedNameCandidates: personalization.rejectedNameCandidates ?? [],
        revenueCrmContext: revenueCrmContextMeta,
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
        trigger_type: `${emailConnector}_scan`,
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
        eventType: opportunity.isReactivation ? "revenue.scan.thread_reactivated" : `${emailConnector}.scan.opportunity_detected`,
        message: opportunity.isReactivation
          ? `New reply detected on a previously handled thread from ${opportunity.message.fromEmail}.`
          : `Detected revenue opportunity from ${opportunity.message.fromEmail}.`,
        metadata: sourceMetadata,
      });
      await insertStep({ supabase, workspaceId, runId, stepKey: "scan_inbox", title: `Scan recent ${emailConnector === "microsoft" ? "Microsoft 365" : "Gmail"} messages`, output: { messageId: opportunity.message.id } });
      await insertStep({ supabase, workspaceId, runId, stepKey: "detect_opportunity", title: "Detect revenue opportunity", output: sourceMetadata });
      await insertStep({
        supabase,
        workspaceId,
        runId,
        stepKey: "score_priority",
        title: "Score confidence and priority",
        output: { confidence: opportunity.confidence, priorityScore: opportunity.priorityScore, priorityReasons: opportunity.priorityReasons },
      });
      await insertStep({
        supabase,
        workspaceId,
        runId,
        stepKey: "decide_next_action",
        title: "Decide best next action",
        output: { nextAction, nextActionReason },
      });
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

      const approval = emailConnector === "microsoft"
        ? await createMicrosoftSendApproval({
          supabase,
          workspaceId,
          runId,
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
          policyReason: workspacePolicy.customerEmailMode === "draft_only"
            ? "Customer email policy is draft-only. This email will not be sent automatically."
            : "External email send requires human approval before Microsoft 365 execution.",
          sourceMetadata,
          dedupeKey: dedupe.dedupeKey,
          dedupeMetadata: dedupe,
          preparedActions,
          crmPreparation,
          crmPreparationStatus,
          preparedHubSpotActions,
          customerEmailMode: workspacePolicy.customerEmailMode,
          slackNotificationSettings: workspacePolicy.slack,
        })
        : await createGmailSendApproval({
          supabase,
          workspaceId,
          runId,
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
          policyReason: workspacePolicy.customerEmailMode === "draft_only"
            ? "Customer email policy is draft-only. This email will not be sent automatically."
            : "External email send requires human approval before Gmail execution.",
          sourceMetadata,
          dedupeKey: dedupe.dedupeKey,
          dedupeMetadata: dedupe,
          preparedActions,
          crmPreparation,
          crmPreparationStatus,
          preparedHubSpotActions,
          customerEmailMode: workspacePolicy.customerEmailMode,
          slackNotificationSettings: workspacePolicy.slack,
        });

      await insertStep({ supabase, workspaceId, runId, stepKey: "create_approval", title: "Create approval request", output: { approvalId: approval.approvalId } });

      const output = {
        type: `${emailConnector}_follow_up_draft`,
        source: `${emailConnector}_scan`,
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
        output_type: `${emailConnector}_follow_up_draft`,
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
        message: `Created ${emailConnector === "microsoft" ? "Microsoft 365" : "Gmail"} send approval ${approval.approvalId}.`,
        metadata: { approvalId: approval.approvalId, ...dedupe },
      });
      await logOperatorEvent({
        supabase,
        workspaceId,
        runId,
        eventType: workspacePolicy.customerEmailMode === "draft_only" ? "customer_email_draft_only" : "customer_email_approval_required",
        message: workspacePolicy.customerEmailMode === "draft_only"
          ? "Customer email policy applied: draft only."
          : "Customer email policy applied: approval required.",
        metadata: {
          approvalId: approval.approvalId,
          customerEmailMode: workspacePolicy.customerEmailMode,
          dedupeKey: dedupe.dedupeKey,
        },
      });
      await logOperatorEvent({
        supabase,
        workspaceId,
        runId,
        eventType: "customer_email_policy_applied",
        message: `Customer email policy applied: ${workspacePolicy.customerEmailMode}.`,
        metadata: {
          approvalId: approval.approvalId,
          customerEmailMode: workspacePolicy.customerEmailMode,
          dedupeKey: dedupe.dedupeKey,
        },
      });
      try {
        await sendSlackApprovalNotification({
          supabase,
          workspaceId,
          approvalId: approval.approvalId,
          runId,
          eventType: "revenue_approval_created",
          operatorKey: "revenue",
          title: nextAction === "prepare_qualification_question"
            ? `Revenue Operator found a lead${personalization.firstname ? ` from ${personalization.firstname}` : ""} that needs qualification.`
            : `Revenue Operator found a high-intent lead${personalization.firstname ? ` from ${personalization.firstname}` : ""}.`,
          summary: aiDraft.detectedSignalSummary,
          confidence: opportunity.confidence,
          risk: "medium",
          source: emailConnector,
          actionLabel: hubspotConnected ? "send follow-up email and update HubSpot" : "send follow-up email",
          approvalUrl: `${getAppUrl()}/approvals`,
          metadata: {
            dedupeKey: dedupe.dedupeKey,
            fromEmail: opportunity.message.fromEmail,
            subject: opportunity.message.subject,
            preparedActions,
            priorityScore: opportunity.priorityScore,
            priorityReasons: opportunity.priorityReasons,
            nextAction,
          },
        });
      } catch (error) {
        console.warn("[revenue-scan] slack approval notification skipped", {
          workspaceId,
          approvalId: approval.approvalId,
          error: error instanceof Error ? error.message : "Unknown Slack notification error",
        });
      }

      created.push({
        messageId: opportunity.message.id,
        threadId: opportunity.message.threadId,
        from: opportunity.message.fromEmail,
        subject: opportunity.message.subject,
        matchedKeywords: opportunity.matchedKeywords,
        classification: opportunity.classification,
        confidence: opportunity.confidence,
        priorityScore: opportunity.priorityScore,
        priorityReasons: opportunity.priorityReasons,
        nextAction,
        isReactivation: opportunity.isReactivation,
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
      type: `${emailConnector}_scan_summary`,
      status: "completed",
      sourceMode,
      monitoringEnabled: true,
      cadence: "daily",
      emailConnector,
      scanned: listed.length,
      opportunitiesFound: opportunities.length,
      approvalsCreated: created.length,
      deferredCount: deferred.length,
      skippedCount: skipped.length,
      skipped,
      deferred,
      routedItemCount: created.length,
      completedAt,
    };
    const scanRunId = operatorRuntimeId("oprun-revenue-scan-summary");
    const scanRunInsert = await supabase.from("os_operator_runs").insert({
      id: scanRunId,
      workspace_id: workspaceId,
      operator_key: "revenue",
      trigger_type: `${emailConnector}_scan`,
      status: "completed",
      input: { source: `${emailConnector}_scan_monitor`, sourceMode, maxResults },
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
      eventType: `${emailConnector}.scan.completed`,
      message: `Revenue scan completed: ${listed.length} scanned, ${opportunities.length} opportunities, ${created.length} approvals, ${deferred.length} deferred.`,
      metadata: scanSummary,
    });

    const scanOutputInsert = await supabase.from("os_operator_outputs").insert({
      id: operatorRuntimeId("opout"),
      workspace_id: workspaceId,
      run_id: scanRunId,
      operator_key: "revenue",
      output_type: `${emailConnector}_scan_summary`,
      title: "Revenue scan summary",
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
        deferredCount: deferred.length,
        routedItemCount: created.length,
        opportunities: created,
        deferred,
        skipped,
      },
    };
  } catch (error) {
    return scanFailure(error);
  }
}

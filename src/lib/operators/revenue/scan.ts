import { GMAIL_SCAN_REQUIRED_SCOPES, GMAIL_SEND_REQUIRED_SCOPES, GmailApiError, getMessageDetails, getMissingGmailScopes, listRecentMessages, resolveAccessTokenFromCredential, type SafeGmailMessage, type StoredConnectorCredential } from "@/lib/connectors/gmail";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { createGmailSendApproval } from "@/lib/operators/executors/gmail";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { draftRevenueFollowUpWithAI } from "@/lib/operators/revenue/ai-drafting";
import { loadRevenueCompanyGraphContext } from "@/lib/operators/revenue/context";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type Opportunity = {
  message: SafeGmailMessage;
  matchedKeywords: string[];
  classification: "revenue_opportunity";
  confidence: "high";
};

type CrmPreparation = {
  contactEmail: string;
  contactName: string | null;
  companyName: string | null;
  source: "gmail";
  classification: string;
  confidence: string;
  gmailMessageId: string;
  gmailThreadId?: string;
  summary: string;
  suggestedNextStep: string;
  suggestedDealStage: string;
  suggestedFollowUpTask: string;
  matchedKeywords: string[];
};

export type RevenueScanSummary = {
  status?: string;
  message?: string;
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
    runId: string;
    approvalId: string;
  }[];
  skipped?: {
    messageId: string;
    subject?: string;
    from?: string;
    reason: string;
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

const STRONG_KEYWORDS = new Set(["pricing", "quote", "proposal", "demo", "interested", "can you help", "automation", "website"]);

const SKIP_PATTERNS = [
  { reason: "newsletter", pattern: /\b(newsletter|digest|unsubscribe|view in browser)\b/i },
  { reason: "no_reply", pattern: /\b(no-?reply|do-not-reply|donotreply)\b/i },
  { reason: "receipt", pattern: /\b(receipt|payment received|your order|invoice paid|subscription receipt)\b/i },
  { reason: "security_alert", pattern: /\b(security alert|verification code|password reset|new sign-in|2fa|two-factor|login alert)\b/i },
  { reason: "tool_notification", pattern: /\b(github|vercel|stripe|slack|notion|linear|jira|asana|cloudflare|supabase)\b.*\b(notification|alert|build|deploy|invoice|digest)\b/i },
];

function safeText(message: SafeGmailMessage): string {
  return [message.from, message.subject, message.snippet].join(" ").toLowerCase();
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

function buildDraftFromOpportunity(opportunity: Opportunity) {
  const subject = opportunity.message.subject
    ? `Re: ${opportunity.message.subject}`
    : "Following up on your message";
  const context = opportunity.message.snippet || "your recent message";
  return {
    to: opportunity.message.fromEmail,
    subject,
    body: [
      "Hi there,",
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

function senderName(from: string, email: string): string | null {
  const name = from.replace(/<[^>]+>/g, "").replace(/"/g, "").trim();
  if (!name || name.toLowerCase() === email.toLowerCase()) return null;
  return name;
}

function companyFromEmail(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  const root = domain.split(".")[0];
  if (!root || ["gmail", "outlook", "hotmail", "icloud", "yahoo", "proton", "aol"].includes(root)) return null;
  return root.split(/[-_]/).filter(Boolean).map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function buildCrmPreparation(opportunity: Opportunity): CrmPreparation {
  const summary = opportunity.message.snippet
    ? opportunity.message.snippet.slice(0, 280)
    : `Inbound revenue signal from ${opportunity.message.fromEmail}.`;
  return {
    contactEmail: opportunity.message.fromEmail,
    contactName: senderName(opportunity.message.from, opportunity.message.fromEmail),
    companyName: companyFromEmail(opportunity.message.fromEmail),
    source: "gmail",
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

function collectHandledIds(value: unknown, messages: Set<string>, threads: Set<string>) {
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
  if (messageId) messages.add(messageId);
  if (threadId) threads.add(threadId);
  Object.values(record).forEach((nested) => collectHandledIds(nested, messages, threads));
}

async function loadHandledGmailIds(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
}): Promise<{ messages: Set<string>; threads: Set<string> }> {
  const messages = new Set<string>();
  const threads = new Set<string>();
  const [runs, outputs, approvals, logs] = await Promise.all([
    input.supabase.from("os_operator_runs").select("input,output").eq("workspace_id", input.workspaceId).eq("operator_key", "revenue").limit(500),
    input.supabase.from("os_operator_outputs").select("payload").eq("workspace_id", input.workspaceId).eq("operator_key", "revenue").limit(500),
    input.supabase.from("os_approvals").select("continuation_payload").eq("workspace_id", input.workspaceId).eq("agent_id", "revenue").limit(500),
    input.supabase.from("os_operator_run_logs").select("metadata").eq("workspace_id", input.workspaceId).limit(500),
  ]);

  (runs.data ?? []).forEach((row) => {
    collectHandledIds(row.input, messages, threads);
    collectHandledIds(row.output, messages, threads);
  });
  (outputs.data ?? []).forEach((row) => collectHandledIds(row.payload, messages, threads));
  (approvals.data ?? []).forEach((row) => collectHandledIds(row.continuation_payload, messages, threads));
  (logs.data ?? []).forEach((row) => collectHandledIds(row.metadata, messages, threads));

  return { messages, threads };
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
  supabase?: SupabaseAdmin;
}): Promise<RevenueScanResult> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workspaceId = input.workspaceId.trim();

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
    const handled = await loadHandledGmailIds({ supabase, workspaceId });
    const companyGraphContext = await loadRevenueCompanyGraphContext({ supabase, workspaceId });
    const skipped: NonNullable<RevenueScanSummary["skipped"]> = [];
    const opportunities: Opportunity[] = [];

    for (const item of listed) {
      const message = await getMessageDetails(accessToken, item.id);
      if (handled.messages.has(message.id || item.id) || (message.threadId && handled.threads.has(message.threadId))) {
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: "already_handled" });
        continue;
      }
      const detected = detectOpportunity(message, providerEmail);
      if ("skipped" in detected) {
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: detected.skipped });
      } else {
        opportunities.push(detected);
      }
    }

    const created: NonNullable<RevenueScanSummary["opportunities"]> = [];

    for (const opportunity of opportunities) {
      const runId = operatorRuntimeId("oprun-revenue-scan");
      const deterministicDraft = buildDraftFromOpportunity(opportunity);
      const crmPreparation = buildCrmPreparation(opportunity);
      const aiDraft = await draftRevenueFollowUpWithAI({
        opportunity,
        deterministicDraft,
        context: companyGraphContext,
      });
      const draft = aiDraft.draft;
      crmPreparation.summary = aiDraft.detectedSignalSummary || crmPreparation.summary;
      crmPreparation.suggestedNextStep = aiDraft.suggestedAction || crmPreparation.suggestedNextStep;
      const crmPreparationStatus = hubspotConnected ? "hubspot_execution_not_ready" : "hubspot_not_connected";
      const preparedActions = hubspotConnected
        ? ["send_gmail_follow_up", "update_hubspot_contact", "add_hubspot_note", "create_hubspot_follow_up_task"]
        : ["send_gmail_follow_up"];
      const runInput = {
        source: "gmail_scan",
        gmailMessageId: opportunity.message.id,
        gmailThreadId: opportunity.message.threadId,
        from: opportunity.message.from,
        fromEmail: opportunity.message.fromEmail,
        subject: opportunity.message.subject,
        snippet: opportunity.message.snippet,
        matchedKeywords: opportunity.matchedKeywords,
        classification: opportunity.classification,
        confidence: opportunity.confidence,
        crmPreparationStatus,
        crmPreparation,
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
      const sourceMetadata = {
        gmailMessageId: opportunity.message.id,
        gmailThreadId: opportunity.message.threadId,
        from: opportunity.message.from,
        fromEmail: opportunity.message.fromEmail,
        subject: opportunity.message.subject,
        classification: opportunity.classification,
        confidence: opportunity.confidence,
        matchedKeywords: opportunity.matchedKeywords,
        crmPreparationStatus,
        detectedSignalSummary: aiDraft.detectedSignalSummary,
        whyThisMatters: aiDraft.whyThisMatters,
        suggestedAction: aiDraft.suggestedAction,
        expectedOutcome: aiDraft.expectedOutcome,
        riskNotes: aiDraft.riskNotes,
        draftingMetadata: aiDraft.draftingMetadata,
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
        output: { status: crmPreparationStatus, preparedActions, crmPreparation },
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
        preparedActions,
        crmPreparation,
        crmPreparationStatus,
      });

      await insertStep({ supabase, workspaceId, runId, stepKey: "create_approval", title: "Create approval request", output: { approvalId: approval.approvalId } });

      const output = {
        type: "gmail_follow_up_draft",
        source: "gmail_scan",
        draft,
        approvalId: approval.approvalId,
        opportunity: runInput,
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
        metadata: { approvalId: approval.approvalId },
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
        runId,
        approvalId: approval.approvalId,
      });
    }

    const completedAt = new Date().toISOString();
    const scanSummary = {
      type: "gmail_scan_summary",
      status: "completed",
      scanned: listed.length,
      opportunitiesFound: opportunities.length,
      approvalsCreated: created.length,
      skippedCount: skipped.length,
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
      input: { source: "gmail_scan_monitor", maxResults },
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

    return {
      ok: true,
      status: 200,
      body: {
        status: "completed",
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

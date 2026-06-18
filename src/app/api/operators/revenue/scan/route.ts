import { NextRequest, NextResponse } from "next/server";
import { GMAIL_SCAN_REQUIRED_SCOPES, GMAIL_SEND_REQUIRED_SCOPES, GmailApiError, getMessageDetails, getMissingGmailScopes, listRecentMessages, resolveAccessTokenFromCredential, type SafeGmailMessage, type StoredConnectorCredential } from "@/lib/connectors/gmail";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createGmailSendApproval } from "@/lib/operators/executors/gmail";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type ScanBody = {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
  maxResults?: number;
};

type Opportunity = {
  message: SafeGmailMessage;
  matchedKeywords: string[];
  confidence: "high";
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

function skipReason(message: SafeGmailMessage): string | null {
  const text = safeText(message);
  if (!message.fromEmail) return "missing_sender_email";
  for (const item of SKIP_PATTERNS) {
    if (item.pattern.test(text)) return item.reason;
  }
  return null;
}

function detectOpportunity(message: SafeGmailMessage): Opportunity | { skipped: string } {
  const skipped = skipReason(message);
  if (skipped) return { skipped };

  const text = safeText(message);
  const matchedKeywords = OPPORTUNITY_KEYWORDS.filter((keyword) => text.includes(keyword));
  const hasStrongKeyword = matchedKeywords.some((keyword) => STRONG_KEYWORDS.has(keyword));
  if (matchedKeywords.length >= 2 || hasStrongKeyword) {
    return { message, matchedKeywords, confidence: "high" };
  }
  return { skipped: "no_high_confidence_revenue_keywords" };
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

async function insertStep(input: {
  supabase: ReturnType<typeof createSupabaseAdmin>;
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

function gmailErrorResponse(error: unknown) {
  if (error instanceof GmailApiError) {
    return NextResponse.json({
      error: "gmail_scan_failed",
      message: error.message,
      details: error.details,
    }, { status: error.details.status || 502 });
  }
  return NextResponse.json({
    error: "gmail_scan_failed",
    message: error instanceof Error ? error.message : "Gmail scan failed.",
  }, { status: 500 });
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as ScanBody;
  const workspaceId = body.workspaceId?.trim() || "";
  const userEmail = body.userEmail?.trim().toLowerCase() || "";
  const userId = body.userId?.trim() || "";

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const readiness = await getOperatorReadiness({ workspaceId: context.workspaceId, operatorKey: "revenue" });
  if (!readiness) {
    return NextResponse.json({ error: "Revenue Operator readiness was not found." }, { status: 404 });
  }
  if (readiness.status === "missing_connector") {
    return NextResponse.json({ status: "missing_gmail", message: "Connect Gmail to scan for revenue opportunities.", readiness }, { status: 409 });
  }
  if (readiness.status === "upgrade_required") {
    return NextResponse.json({ status: "upgrade_required", message: readiness.reason, readiness }, { status: 402 });
  }
  if (!readiness.canRunManual || (readiness.status !== "ready" && readiness.status !== "draft_only")) {
    return NextResponse.json({ status: readiness.status, message: readiness.reason, readiness }, { status: 409 });
  }

  const credentialRes = await supabase
    .from("os_connector_credentials")
    .select("id,workspace_id,connector_key,provider_account_id,provider_email,encrypted_access_token,encrypted_refresh_token,token_expires_at,scopes,status,metadata")
    .eq("workspace_id", context.workspaceId)
    .eq("connector_key", "gmail")
    .maybeSingle();

  if (credentialRes.error) {
    return NextResponse.json({ error: credentialRes.error.message }, { status: 500 });
  }
  if (!credentialRes.data) {
    return NextResponse.json({ status: "missing_gmail", message: "Connect Gmail to scan for revenue opportunities." }, { status: 409 });
  }

  const credential = credentialRes.data as StoredConnectorCredential;
  const missingSendScopes = getMissingGmailScopes(credential.scopes, GMAIL_SEND_REQUIRED_SCOPES);
  if (missingSendScopes.length > 0) {
    return NextResponse.json({
      status: "requires_gmail_send_scope",
      message: "Reconnect Gmail to enable approval-gated sending.",
      missingScopes: missingSendScopes,
      reconnectRequired: true,
    }, { status: 409 });
  }

  const missingScanScopes = getMissingGmailScopes(credential.scopes, GMAIL_SCAN_REQUIRED_SCOPES);
  if (missingScanScopes.length > 0) {
    return NextResponse.json({
      status: "requires_gmail_read_scope",
      message: "Reconnect Gmail to enable opportunity scanning.",
      missingScopes: missingScanScopes,
      reconnectRequired: true,
    }, { status: 409 });
  }

  try {
    const accessToken = await resolveAccessTokenFromCredential(credential);
    const maxResults = Math.min(Math.max(Number(body.maxResults) || 15, 1), 20);
    const listed = await listRecentMessages(accessToken, { maxResults, query: "newer_than:30d" });
    const skipped: { messageId: string; subject?: string; from?: string; reason: string }[] = [];
    const opportunities: Opportunity[] = [];

    for (const item of listed) {
      const message = await getMessageDetails(accessToken, item.id);
      const detected = detectOpportunity(message);
      if ("skipped" in detected) {
        skipped.push({ messageId: message.id || item.id, subject: message.subject, from: message.from, reason: detected.skipped });
      } else {
        opportunities.push(detected);
      }
    }

    const created: {
      messageId: string;
      from: string;
      subject: string;
      matchedKeywords: string[];
      runId: string;
      approvalId: string;
    }[] = [];

    for (const opportunity of opportunities) {
      const runId = operatorRuntimeId("oprun-revenue-scan");
      const draft = buildDraftFromOpportunity(opportunity);
      const runInput = {
        source: "gmail_scan",
        gmailMessageId: opportunity.message.id,
        gmailThreadId: opportunity.message.threadId,
        from: opportunity.message.from,
        fromEmail: opportunity.message.fromEmail,
        subject: opportunity.message.subject,
        snippet: opportunity.message.snippet,
        matchedKeywords: opportunity.matchedKeywords,
      };

      const runInsert = await supabase.from("os_operator_runs").insert({
        id: runId,
        workspace_id: context.workspaceId,
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
        workspaceId: context.workspaceId,
        runId,
        eventType: "gmail.scan.opportunity_detected",
        message: `Detected revenue opportunity from ${opportunity.message.fromEmail}.`,
        metadata: { messageId: opportunity.message.id, matchedKeywords: opportunity.matchedKeywords },
      });
      await insertStep({ supabase, workspaceId: context.workspaceId, runId, stepKey: "scan_gmail", title: "Scan recent Gmail messages", output: { messageId: opportunity.message.id } });
      await insertStep({ supabase, workspaceId: context.workspaceId, runId, stepKey: "detect_opportunity", title: "Detect revenue opportunity", output: { matchedKeywords: opportunity.matchedKeywords, confidence: opportunity.confidence } });
      await insertStep({ supabase, workspaceId: context.workspaceId, runId, stepKey: "prepare_follow_up", title: "Prepare follow-up email", output: draft });

      const approval = await createGmailSendApproval({
        supabase,
        workspaceId: context.workspaceId,
        runId,
        to: draft.to,
        subject: draft.subject,
        body: draft.body,
        policyReason: "External email send requires human approval before Gmail execution.",
      });

      await insertStep({ supabase, workspaceId: context.workspaceId, runId, stepKey: "create_approval", title: "Create approval request", output: { approvalId: approval.approvalId } });

      const output = {
        type: "gmail_follow_up_draft",
        source: "gmail_scan",
        draft,
        approvalId: approval.approvalId,
        opportunity: runInput,
      };
      const outputInsert = await supabase.from("os_operator_outputs").insert({
        id: operatorRuntimeId("opout"),
        workspace_id: context.workspaceId,
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
      }).eq("id", runId).eq("workspace_id", context.workspaceId);
      if (runUpdate.error) throw new Error(runUpdate.error.message);

      await logOperatorEvent({
        supabase,
        workspaceId: context.workspaceId,
        runId,
        eventType: "approval.created",
        message: `Created Gmail send approval ${approval.approvalId}.`,
        metadata: { approvalId: approval.approvalId },
      });

      created.push({
        messageId: opportunity.message.id,
        from: opportunity.message.fromEmail,
        subject: opportunity.message.subject,
        matchedKeywords: opportunity.matchedKeywords,
        runId,
        approvalId: approval.approvalId,
      });
    }

    return NextResponse.json({
      status: "completed",
      scanned: listed.length,
      opportunitiesFound: opportunities.length,
      approvalsCreated: created.length,
      opportunities: created,
      skipped,
    });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}

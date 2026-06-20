import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type GmailContinuationPayload = {
  kind?: string;
  workspaceId?: string;
  operatorRunId?: string;
  operatorKey?: string;
  to?: string;
  subject?: string;
  body?: string;
  preparedActions?: string[];
  crmPreparationStatus?: string;
  sourceMetadata?: Record<string, unknown> | null;
  crmPreparation?: {
    contactEmail?: string;
    contactName?: string | null;
    companyName?: string | null;
    classification?: string;
    confidence?: string;
    summary?: string;
    suggestedNextStep?: string;
    suggestedDealStage?: string;
    suggestedFollowUpTask?: string;
    matchedKeywords?: string[];
  } | null;
};

function asPayload(value: unknown): GmailContinuationPayload {
  return value && typeof value === "object" ? value as GmailContinuationPayload : {};
}

function preview(value: string | undefined, max = 1200): string | null {
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

function approvalReason(continuation: GmailContinuationPayload, policyReason: string | null): string {
  if (policyReason) return policyReason;
  if (continuation.kind === "gmail.send_after_approval") return "External email send requires human approval before Gmail execution.";
  return "Operator action requires human approval.";
}

function crmStatusText(status: string | undefined): string | null {
  if (status === "hubspot_not_connected") return "CRM update not prepared because HubSpot is not connected.";
  if (status === "hubspot_execution_not_ready") return "HubSpot actions are prepared but not executed yet.";
  return null;
}

function expectedOutcome(continuation: GmailContinuationPayload): string | null {
  const sourceMetadata = continuation.sourceMetadata && typeof continuation.sourceMetadata === "object" ? continuation.sourceMetadata : {};
  const aiExpectedOutcome = stringValue(sourceMetadata.expectedOutcome);
  if (aiExpectedOutcome) return aiExpectedOutcome;
  if (continuation.kind !== "gmail.send_after_approval") return null;
  if (continuation.crmPreparationStatus === "hubspot_execution_not_ready") {
    return "Send the approved Gmail follow-up now. HubSpot actions remain prepared only until CRM execution is implemented.";
  }
  if (continuation.crmPreparationStatus === "hubspot_not_connected") {
    return "Send the approved Gmail follow-up now. CRM updates are skipped because HubSpot is not connected.";
  }
  return "Send the approved Gmail follow-up now and record the approval decision.";
}

function afterApprovalText(continuation: GmailContinuationPayload): string | null {
  if (continuation.kind !== "gmail.send_after_approval") return null;
  const crmText = crmStatusText(continuation.crmPreparationStatus);
  return [
    "Gmail sends this exact draft using the connected workspace Gmail account.",
    crmText,
    "The run, logs and operator memory are updated with the approval decision.",
  ].filter(Boolean).join(" ");
}

function mapApproval(row: Record<string, unknown>) {
  const continuation = asPayload(row.continuation_payload);
  const runId = typeof row.run_id === "string" ? row.run_id : null;
  const sourceMetadata = continuation.sourceMetadata && typeof continuation.sourceMetadata === "object" ? continuation.sourceMetadata : {};
  const classification = stringValue(sourceMetadata.classification) ?? stringValue(continuation.crmPreparation?.classification);
  const confidence = stringValue(sourceMetadata.confidence) ?? stringValue(continuation.crmPreparation?.confidence);
  const sourceEmail = stringValue(sourceMetadata.fromEmail) ?? stringValue(sourceMetadata.from) ?? null;
  const sourceSubject = stringValue(sourceMetadata.subject) ?? null;
  const matchedKeywords = stringList(sourceMetadata.matchedKeywords).length > 0
    ? stringList(sourceMetadata.matchedKeywords)
    : stringList(continuation.crmPreparation?.matchedKeywords);
  const why = stringValue(sourceMetadata.whyThisMatters)
    ?? continuation.crmPreparation?.summary
    ?? (matchedKeywords.length > 0 ? `Matched revenue intent keywords: ${matchedKeywords.join(", ")}.` : null);
  const detectedSignal = stringValue(sourceMetadata.detectedSignalSummary) ?? sourceSubject ?? continuation.subject ?? null;
  const policyReason = typeof row.policy_reason === "string" ? row.policy_reason : null;
  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "Approval required",
    description: typeof row.body === "string" ? row.body : "",
    status: typeof row.status === "string" ? row.status : "pending",
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    resolved_at: typeof row.resolved_at === "string" ? row.resolved_at : null,
    resolved_by: typeof row.resolved_by === "string" ? row.resolved_by : null,
    approval_type: typeof row.type === "string" ? row.type : "action",
    category: continuation.kind === "gmail.send_after_approval" ? "follow-up" : typeof row.type === "string" ? row.type : "action",
    continuation_kind: continuation.kind ?? null,
    run_id: runId,
    linked_run_id: continuation.operatorRunId ?? runId,
    agent_id: typeof row.agent_id === "string" ? row.agent_id : null,
    agent_mark: typeof row.agent_mark === "string" ? row.agent_mark : null,
    agent_color: typeof row.agent_color === "string" ? row.agent_color : null,
    policy_reason: policyReason,
    payload_preview: {
      to: continuation.to ?? null,
      subject: continuation.subject ?? null,
      body: preview(continuation.body),
      operatorKey: continuation.operatorKey ?? null,
      preparedActions: Array.isArray(continuation.preparedActions) ? continuation.preparedActions.filter((item): item is string => typeof item === "string") : [],
      crmPreparationStatus: continuation.crmPreparationStatus ?? null,
      crmPreparation: continuation.crmPreparation ?? null,
      sourceMetadata,
      detectedSignal,
      sourceEmail,
      classification,
      confidence,
      matchedKeywords,
      whyThisMatters: why,
      riskLevel: continuation.kind === "gmail.send_after_approval" ? "medium" : "low",
      riskNotes: stringValue(sourceMetadata.riskNotes),
      expectedOutcome: expectedOutcome(continuation),
      approvalReason: approvalReason(continuation, policyReason),
      whatHappensAfterApproval: afterApprovalText(continuation),
      crmStatusText: crmStatusText(continuation.crmPreparationStatus),
    },
  };
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
  const status = (req.nextUrl.searchParams.get("status") || "").trim();

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  let query = supabase
    .from("os_approvals")
    .select("id,workspace_id,type,title,body,agent_id,agent_mark,agent_color,run_id,status,created_at,resolved_at,resolved_by,continuation_payload,policy_reason")
    .eq("workspace_id", context.workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) {
    query = query.eq("status", status);
  }

  const approvals = await query;
  if (approvals.error) {
    return NextResponse.json({ error: approvals.error.message }, { status: 500 });
  }

  const data = (approvals.data ?? []).map((row) => mapApproval(row as Record<string, unknown>));
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const stats = {
    pending: data.filter((approval) => approval.status === "pending").length,
    approvedToday: data.filter((approval) => approval.status === "approved" && approval.resolved_at?.startsWith(todayKey)).length,
    rejectedToday: data.filter((approval) => approval.status === "rejected" && approval.resolved_at?.startsWith(todayKey)).length,
    total: data.length,
  };

  return NextResponse.json({ approvals: data, stats });
}

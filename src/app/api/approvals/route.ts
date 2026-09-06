import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { evaluatePolicy } from "@/lib/policies/evaluate";
import { buildPolicyInputFromContinuation, loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import type { PolicyWorkspaceSettings } from "@/lib/policies/types";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type GmailContinuationPayload = {
  kind?: string;
  workspaceId?: string;
  operatorRunId?: string;
  operatorKey?: string;
  to?: string;
  channelId?: string;
  subject?: string;
  text?: string;
  body?: string;
  draftSubject?: string;
  draftBody?: string;
  originalDraftSubject?: string;
  originalDraftBody?: string;
  editedDraftSubject?: string | null;
  editedDraftBody?: string | null;
  wasEdited?: boolean;
  editedAt?: string | null;
  editedBy?: string | null;
  dedupeKey?: string | null;
  dedupeMetadata?: Record<string, unknown> | null;
  preparedActions?: string[];
  crmPreparationStatus?: string;
  sourceMetadata?: Record<string, unknown> | null;
  crmPreparation?: {
    contactEmail?: string;
    contactName?: string | null;
    companyName?: string | null;
    sourceSubject?: string;
    classification?: string;
    confidence?: string;
    summary?: string;
    suggestedNextStep?: string;
    suggestedDealStage?: string;
    suggestedFollowUpTask?: string;
    matchedKeywords?: string[];
    personalizationSource?: string;
    signatureCandidateRaw?: string | null;
    signatureCandidateAccepted?: string | null;
  } | null;
  preparedHubSpotActions?: {
    contact?: Record<string, unknown>;
    deal?: Record<string, unknown>;
    note?: Record<string, unknown>;
    task?: Record<string, unknown>;
    executionStatus?: string;
  } | null;
  executionResult?: Record<string, unknown> | null;
  preparedSlackAction?: Record<string, unknown> | null;
  preparedTrelloAction?: Record<string, unknown> | null;
  operations?: Record<string, unknown> | null;
  policy?: Record<string, unknown> | null;
  preparedAction?: {
    id?: string;
    actionType?: string;
    connectorKey?: string;
    capability?: string;
    riskLevel?: string;
    requiresApproval?: boolean;
    title?: string;
    summary?: string;
    input?: Record<string, unknown>;
    preview?: {
      label?: string;
      fields?: Array<{ label: string; value: string }>;
      bodyPreview?: string | null;
    };
  } | null;
  customerEmailPolicy?: {
    mode?: string;
    customerEmail?: string;
    humanReview?: string;
    crmUpdate?: string;
    slackAlert?: string;
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

function effectiveDraft(continuation: GmailContinuationPayload) {
  const subject = continuation.editedDraftSubject || continuation.draftSubject || continuation.subject || null;
  const body = continuation.editedDraftBody || continuation.draftBody || continuation.body || null;
  return {
    subject,
    body,
    wasEdited: Boolean(continuation.wasEdited || continuation.editedDraftSubject || continuation.editedDraftBody),
  };
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

function isEmailKind(kind: GmailContinuationPayload["kind"] | undefined): boolean {
  return kind === "gmail.send_after_approval" || kind === "microsoft.send_after_approval";
}

function approvalReason(continuation: GmailContinuationPayload, policyReason: string | null): string {
  if (policyReason) return policyReason;
  if (continuation.kind === "gmail.send_after_approval") return "External email send requires human approval before Gmail execution.";
  if (continuation.kind === "microsoft.send_after_approval") return "External email send requires human approval before Microsoft 365 execution.";
  if (continuation.kind === "slack.send_after_approval") return "Slack message sends require human approval before posting.";
  if (continuation.kind === "operations.execute_after_approval") return "Operations actions require human approval before any Slack message or Trello change.";
  return "Operator action requires human approval.";
}

function crmStatusText(status: string | undefined): string | null {
  if (status === "hubspot_not_connected") return "CRM update not prepared because HubSpot is not connected.";
  if (status === "hubspot_execution_not_ready") return "HubSpot actions are prepared but not executed yet.";
  if (status === "hubspot_execution_enabled") return "HubSpot contact and deal updates will execute after approval. Notes and tasks remain prepared only.";
  if (status === "hubspot_execution_completed") return "HubSpot contact and deal updates completed after approval.";
  if (status === "hubspot_execution_failed") return "The email was sent, but HubSpot execution failed.";
  return null;
}

function expectedOutcome(continuation: GmailContinuationPayload): string | null {
  const sourceMetadata = continuation.sourceMetadata && typeof continuation.sourceMetadata === "object" ? continuation.sourceMetadata : {};
  const aiExpectedOutcome = stringValue(sourceMetadata.expectedOutcome);
  if (aiExpectedOutcome) return aiExpectedOutcome;
  if (continuation.kind === "slack.send_after_approval") return "Post the approved Slack message and record the approval decision.";
  if (continuation.kind === "shared_action.execute_after_approval") return "Execute the approved action through the selected connector and record the result.";
  if (!isEmailKind(continuation.kind)) return null;
  const provider = continuation.kind === "microsoft.send_after_approval" ? "Microsoft 365" : "Gmail";
  if (continuation.crmPreparationStatus === "hubspot_execution_enabled") {
    return `Send the approved ${provider} follow-up now, then create or update the HubSpot contact/deal. CRM notes and tasks remain prepared only.`;
  }
  if (continuation.crmPreparationStatus === "hubspot_execution_not_ready") {
    return `Send the approved ${provider} follow-up now. HubSpot actions remain prepared only until CRM execution is implemented.`;
  }
  if (continuation.crmPreparationStatus === "hubspot_not_connected") {
    return `Send the approved ${provider} follow-up now. CRM updates are skipped because HubSpot is not connected.`;
  }
  return `Send the approved ${provider} follow-up now and record the approval decision.`;
}

function afterApprovalText(continuation: GmailContinuationPayload): string | null {
  if (continuation.kind === "shared_action.execute_after_approval") {
    return "Auterim executes this prepared action through the connected Trello account after approval.";
  }
  if (continuation.kind === "slack.send_after_approval") {
    return "Slack posts this exact message to the selected channel using the connected workspace Slack account.";
  }
  if (continuation.kind === "operations.execute_after_approval") {
    return "Auterim posts the internal Slack update and applies the prepared Trello change after approval. Nothing runs before approval.";
  }
  if (!isEmailKind(continuation.kind)) return null;
  const crmText = crmStatusText(continuation.crmPreparationStatus);
  const provider = continuation.kind === "microsoft.send_after_approval" ? "Microsoft 365" : "Gmail";
  return [
    `${provider} sends this exact draft using the connected workspace ${provider} account.`,
    crmText,
    "The run, logs and operator memory are updated with the approval decision.",
  ].filter(Boolean).join(" ");
}

function mapApproval(row: Record<string, unknown>, livePolicy: PolicyWorkspaceSettings) {
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
  const draft = effectiveDraft(continuation);

  // Live policy decision (evaluated against current workspace policy, never the
  // stored snapshot) so the card always shows what would happen right now.
  const policyInput = continuation.kind
    ? buildPolicyInputFromContinuation({ workspaceId: String(row.workspace_id ?? ""), kind: continuation.kind, continuation: (row.continuation_payload as Record<string, unknown>) ?? {} })
    : null;
  const livePolicyDecision = policyInput ? evaluatePolicy(policyInput, livePolicy) : null;

  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "Approval required",
    description: typeof row.body === "string" ? row.body : "",
    status: typeof row.status === "string" ? row.status : "pending",
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    resolved_at: typeof row.resolved_at === "string" ? row.resolved_at : null,
    resolved_by: typeof row.resolved_by === "string" ? row.resolved_by : null,
    approval_type: typeof row.type === "string" ? row.type : "action",
    category: isEmailKind(continuation.kind) ? "follow-up" : continuation.kind === "slack.send_after_approval" ? "slack-message" : continuation.kind === "shared_action.execute_after_approval" ? "task-action" : continuation.kind === "operations.execute_after_approval" ? "operations" : typeof row.type === "string" ? row.type : "action",
    continuation_kind: continuation.kind ?? null,
    run_id: runId,
    linked_run_id: continuation.operatorRunId ?? runId,
    agent_id: typeof row.agent_id === "string" ? row.agent_id : null,
    agent_mark: typeof row.agent_mark === "string" ? row.agent_mark : null,
    agent_color: typeof row.agent_color === "string" ? row.agent_color : null,
    policy_reason: policyReason,
    payload_preview: {
      to: continuation.to ?? null,
      channelId: continuation.channelId ?? null,
      subject: draft.subject,
      text: continuation.text ?? null,
      body: preview(draft.body ?? undefined),
      fullBody: draft.body,
      draftSubject: continuation.draftSubject ?? continuation.subject ?? null,
      draftBody: continuation.draftBody ?? continuation.body ?? null,
      originalDraftSubject: continuation.originalDraftSubject ?? continuation.subject ?? null,
      originalDraftBody: continuation.originalDraftBody ?? continuation.body ?? null,
      editedDraftSubject: continuation.editedDraftSubject ?? null,
      editedDraftBody: continuation.editedDraftBody ?? null,
      wasEdited: draft.wasEdited,
      editedAt: continuation.editedAt ?? null,
      editedBy: continuation.editedBy ?? null,
      operatorKey: continuation.operatorKey ?? null,
      dedupeKey: continuation.dedupeKey ?? (typeof row.dedupe_key === "string" ? row.dedupe_key : null),
      dedupeMetadata: continuation.dedupeMetadata ?? null,
      preparedActions: Array.isArray(continuation.preparedActions) ? continuation.preparedActions.filter((item): item is string => typeof item === "string") : [],
      crmPreparationStatus: continuation.crmPreparationStatus ?? null,
      crmPreparation: continuation.crmPreparation ?? null,
      preparedHubSpotActions: continuation.preparedHubSpotActions ?? null,
      executionResult: continuation.executionResult ?? null,
      preparedAction: continuation.preparedAction ?? null,
      preparedSlackAction: continuation.preparedSlackAction ?? null,
      preparedTrelloAction: continuation.preparedTrelloAction ?? null,
      operations: continuation.operations ?? null,
      operationsPolicy: continuation.policy ?? null,
      livePolicyDecision,
      customerEmailPolicy: continuation.customerEmailPolicy ?? {
        mode: "approval_required",
        customerEmail: "Customer emails require approval before sending.",
        humanReview: "Required",
        crmUpdate: "Approval required",
        slackAlert: "Disabled",
      },
      sourceMetadata,
      detectedSignal,
      sourceEmail,
      classification,
      confidence,
      matchedKeywords,
      whyThisMatters: why,
      riskLevel: isEmailKind(continuation.kind) || continuation.kind === "slack.send_after_approval" || continuation.kind === "shared_action.execute_after_approval" ? "medium" : "low",
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

  const livePolicy = await loadPolicyWorkspaceSettings({ supabase, workspaceId: context.workspaceId });
  const data = (approvals.data ?? []).map((row) => mapApproval(row as Record<string, unknown>, livePolicy));
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const stats = {
    pending: data.filter((approval) => approval.status === "pending").length,
    approvedToday: data.filter((approval) => ["approved", "partially_completed"].includes(approval.status) && approval.resolved_at?.startsWith(todayKey)).length,
    rejectedToday: data.filter((approval) => approval.status === "rejected" && approval.resolved_at?.startsWith(todayKey)).length,
    total: data.length,
  };

  return NextResponse.json({ approvals: data, stats });
}

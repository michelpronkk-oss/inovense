import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { evaluatePolicy } from "@/lib/policies/evaluate";
import { buildPolicyInputFromContinuation, loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import type { PolicyWorkspaceSettings } from "@/lib/policies/types";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import {
  asPayload,
  preview,
  stringValue,
  stringList,
  effectiveDraft,
  isEmailKind,
  approvalReason,
  crmStatusText,
  expectedOutcome,
  afterApprovalText,
} from "@/lib/approvals/presentation";

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
  const storedPolicyEvidence = continuation.policyEvidence ?? row.policy_evidence ?? null;
  const groupedPolicyEvidence = storedPolicyEvidence && typeof storedPolicyEvidence === "object"
    && ("email" in storedPolicyEvidence || "hubspot" in storedPolicyEvidence || "slack" in storedPolicyEvidence || "trello" in storedPolicyEvidence)
    ? storedPolicyEvidence as Record<string, unknown>
    : null;

  // Live policy decision (evaluated against current workspace policy, never the
  // stored snapshot) so the card always shows what would happen right now.
  const policyInput = continuation.kind
    ? buildPolicyInputFromContinuation({ workspaceId: String(row.workspace_id ?? ""), kind: continuation.kind, continuation: (row.continuation_payload as Record<string, unknown>) ?? {} })
    : null;
  const livePolicyDecision = policyInput ? evaluatePolicy(policyInput, livePolicy) : null;
  const primaryPolicyEvidence = groupedPolicyEvidence?.email ?? groupedPolicyEvidence?.slack ?? groupedPolicyEvidence?.trello ?? storedPolicyEvidence ?? livePolicyDecision?.evidence ?? null;
  const approvalScopes = continuation.approvalScopes
    && typeof continuation.approvalScopes === "object"
    ? continuation.approvalScopes
    : continuation.approvalScope ?? row.approval_scope ?? null;

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
      workflow: {
        id: stringValue(continuation.workflowId),
        objective: stringValue(continuation.workflowObjective),
        stepId: stringValue(continuation.workflowStepId),
        stepOrder: typeof continuation.workflowStepOrder === "number" ? continuation.workflowStepOrder : null,
        stepCount: typeof continuation.workflowStepCount === "number" ? continuation.workflowStepCount : null,
        stepReason: stringValue(continuation.workflowStepReason),
      },
      dedupeKey: continuation.dedupeKey ?? (typeof row.dedupe_key === "string" ? row.dedupe_key : null),
      dedupeMetadata: continuation.dedupeMetadata ?? null,
      preparedActions: Array.isArray(continuation.preparedActions) ? continuation.preparedActions.filter((item): item is string => typeof item === "string") : [],
      crmPreparationStatus: continuation.crmPreparationStatus ?? null,
      crmPreparation: continuation.crmPreparation ?? null,
      preparedHubSpotActions: continuation.preparedHubSpotActions ?? null,
      executionResult: continuation.executionResult ?? null,
      approvalScope: approvalScopes,
      approvalScopes,
      policyEvidence: primaryPolicyEvidence,
      policyEvidenceByAction: groupedPolicyEvidence,
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
    .select("id,workspace_id,type,title,body,agent_id,agent_mark,agent_color,run_id,status,created_at,resolved_at,resolved_by,continuation_payload,policy_reason,approval_scope,policy_evidence")
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

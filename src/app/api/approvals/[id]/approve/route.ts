import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { executePreparedActionAfterApproval } from "@/lib/actions/execute";
import type { PreparedAction } from "@/lib/actions/types";
import { createGmailDraft, GmailApiError, getMissingGmailScopes, hasGmailSendScope, resolveAccessTokenFromCredential, sendGmailDraft, sendGmailMessage, type StoredConnectorCredential } from "@/lib/connectors/gmail";
import { executeHubSpotRevenueActions, HubSpotExecutionError, type HubSpotExecutionResult, type PreparedHubSpotActions } from "@/lib/operators/executors/hubspot";
import { sendSlackMessageAfterApproval, SlackExecutionError, type PreparedSlackMessageAction } from "@/lib/operators/executors/slack";
import { TrelloExecutionError } from "@/lib/operators/executors/trello";
import { sendSlackApprovalNotification } from "@/lib/notifications/slack";
import { logOperatorEvent, recordOperatorUsage } from "@/lib/operators/logging";
import { createOperatorMemory } from "@/lib/operators/memory";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type ApproveBody = {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
};

type GmailContinuationPayload = {
  kind: "gmail.send_after_approval";
  workspaceId: string;
  operatorRunId?: string;
  operatorKey?: string;
  to: string;
  subject: string;
  body: string;
  draftSubject?: string;
  draftBody?: string;
  originalDraftSubject?: string;
  originalDraftBody?: string;
  editedDraftSubject?: string | null;
  editedDraftBody?: string | null;
  wasEdited?: boolean;
  editedAt?: string | null;
  editedBy?: string | null;
  preparedActions?: string[];
  dedupeKey?: string | null;
  dedupeMetadata?: Record<string, unknown> | null;
  crmPreparationStatus?: string | null;
  crmPreparation?: Record<string, unknown> | null;
  preparedHubSpotActions?: PreparedHubSpotActions | null;
  sourceMetadata?: Record<string, unknown> | null;
  clientFlowTrelloAction?: PreparedAction | null;
  clientFlow?: Record<string, unknown> | null;
  customerEmailPolicy?: {
    mode?: string;
    customerEmail?: string;
    humanReview?: string;
    crmUpdate?: string;
    trelloTask?: string;
    slackAlert?: string;
  } | null;
};

type SlackContinuationPayload = PreparedSlackMessageAction;

type SharedActionContinuationPayload = {
  kind: "shared_action.execute_after_approval";
  workspaceId: string;
  operatorKey?: string;
  preparedAction: PreparedAction;
};

type InvalidPayloadDetail = {
  field: string;
  issue: string;
};

function toTs(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function effectiveDraft(payload: GmailContinuationPayload): {
  subject: string;
  body: string;
  usedEditedDraft: boolean;
  bodyPreview: string;
  bodyHash: string;
} {
  const editedSubject = stringValue(payload.editedDraftSubject);
  const editedBody = stringValue(payload.editedDraftBody);
  const draftSubject = stringValue(payload.draftSubject);
  const draftBody = stringValue(payload.draftBody);
  const subject = editedSubject ?? draftSubject ?? payload.subject;
  const body = editedBody ?? draftBody ?? payload.body;
  return {
    subject,
    body,
    usedEditedDraft: Boolean(editedSubject || editedBody || payload.wasEdited),
    bodyPreview: body.length > 240 ? `${body.slice(0, 240)}...` : body,
    bodyHash: crypto.createHash("sha256").update(body).digest("hex"),
  };
}

function learningMetadata(input: {
  approvalId: string;
  runId: string;
  payload: GmailContinuationPayload;
  messageId?: string | null;
  sendEndpoint?: string | null;
}) {
  const sourceMetadata = input.payload.sourceMetadata ?? {};
  const classification = stringValue(sourceMetadata.classification) ?? stringValue(input.payload.crmPreparation?.classification);
  const confidence = stringValue(sourceMetadata.confidence) ?? stringValue(input.payload.crmPreparation?.confidence);
  return {
    approvalId: input.approvalId,
    runId: input.runId,
    decision: "approved",
    signal: "positive",
    actionType: "gmail_follow_up",
    recipient: input.payload.to,
    subject: effectiveDraft(input.payload).subject,
    classification,
    confidence,
    crmPreparationStatus: input.payload.crmPreparationStatus ?? null,
    dedupeKey: input.payload.dedupeKey ?? null,
    dedupeMetadata: input.payload.dedupeMetadata ?? null,
    preparedActions: input.payload.preparedActions ?? ["send_gmail_follow_up"],
    preparedHubSpotActions: input.payload.preparedHubSpotActions ?? null,
    sourceMetadata,
    messageId: input.messageId ?? null,
    sendEndpoint: input.sendEndpoint ?? null,
  };
}

function validateGmailPayload(value: unknown): { ok: true; payload: GmailContinuationPayload } | { ok: false; details: InvalidPayloadDetail[] } {
  const details: InvalidPayloadDetail[] = [];
  if (!value || typeof value !== "object") {
    return { ok: false, details: [{ field: "continuation_payload", issue: "Must be an object." }] };
  }
  const rec = value as Record<string, unknown>;
  if (rec.kind !== "gmail.send_after_approval") details.push({ field: "kind", issue: "Must equal gmail.send_after_approval." });
  if (typeof rec.workspaceId !== "string" || !rec.workspaceId.trim()) details.push({ field: "workspaceId", issue: "Required." });
  if (typeof rec.to !== "string" || !rec.to.trim()) {
    details.push({ field: "to", issue: "Required." });
  } else if (!isEmail(rec.to)) {
    details.push({ field: "to", issue: "Must be a valid-looking email address." });
  }
  if (typeof rec.subject !== "string" || !rec.subject.trim()) details.push({ field: "subject", issue: "Required." });
  if (typeof rec.body !== "string" || !rec.body.trim()) details.push({ field: "body", issue: "Required." });
  if (details.length > 0) return { ok: false, details };
  return {
    ok: true,
    payload: {
      kind: "gmail.send_after_approval",
      workspaceId: String(rec.workspaceId).trim(),
      operatorRunId: typeof rec.operatorRunId === "string" ? rec.operatorRunId : undefined,
      operatorKey: typeof rec.operatorKey === "string" ? rec.operatorKey : undefined,
      to: String(rec.to).trim().toLowerCase(),
      subject: String(rec.subject).trim(),
      body: String(rec.body).trim(),
      draftSubject: typeof rec.draftSubject === "string" ? rec.draftSubject.trim() : undefined,
      draftBody: typeof rec.draftBody === "string" ? rec.draftBody.trim() : undefined,
      originalDraftSubject: typeof rec.originalDraftSubject === "string" ? rec.originalDraftSubject.trim() : undefined,
      originalDraftBody: typeof rec.originalDraftBody === "string" ? rec.originalDraftBody.trim() : undefined,
      editedDraftSubject: typeof rec.editedDraftSubject === "string" ? rec.editedDraftSubject.trim() : null,
      editedDraftBody: typeof rec.editedDraftBody === "string" ? rec.editedDraftBody.trim() : null,
      wasEdited: rec.wasEdited === true,
      editedAt: typeof rec.editedAt === "string" ? rec.editedAt : null,
      editedBy: typeof rec.editedBy === "string" ? rec.editedBy : null,
      preparedActions: Array.isArray(rec.preparedActions) ? rec.preparedActions.filter((item): item is string => typeof item === "string") : undefined,
      dedupeKey: typeof rec.dedupeKey === "string" ? rec.dedupeKey : null,
      dedupeMetadata: rec.dedupeMetadata && typeof rec.dedupeMetadata === "object" ? rec.dedupeMetadata as Record<string, unknown> : null,
      crmPreparationStatus: typeof rec.crmPreparationStatus === "string" ? rec.crmPreparationStatus : null,
      crmPreparation: rec.crmPreparation && typeof rec.crmPreparation === "object" ? rec.crmPreparation as Record<string, unknown> : null,
      preparedHubSpotActions: rec.preparedHubSpotActions && typeof rec.preparedHubSpotActions === "object" ? rec.preparedHubSpotActions as PreparedHubSpotActions : null,
      sourceMetadata: rec.sourceMetadata && typeof rec.sourceMetadata === "object" ? rec.sourceMetadata as Record<string, unknown> : null,
      clientFlowTrelloAction: rec.clientFlowTrelloAction && typeof rec.clientFlowTrelloAction === "object" ? rec.clientFlowTrelloAction as PreparedAction : null,
      clientFlow: rec.clientFlow && typeof rec.clientFlow === "object" ? rec.clientFlow as Record<string, unknown> : null,
      customerEmailPolicy: rec.customerEmailPolicy && typeof rec.customerEmailPolicy === "object" ? rec.customerEmailPolicy as GmailContinuationPayload["customerEmailPolicy"] : null,
    },
  };
}

/**
 * Client Flow can bundle a prepared Trello task into a Gmail approval. The
 * Trello action stays approval-gated and only runs after the human approves.
 * Failures are non-fatal: the email/draft result is preserved and the Trello
 * failure is surfaced in the execution result. Gated on operatorKey so Revenue
 * approvals are never affected.
 */
async function executeClientFlowTrelloAction(input: {
  payload: GmailContinuationPayload;
  approvalId: string;
  canRunRealActions: boolean;
}): Promise<Record<string, unknown> | null> {
  if (input.payload.operatorKey !== "client_flow") return null;
  const action = input.payload.clientFlowTrelloAction;
  if (!action || action.connectorKey !== "trello") return null;
  if (!input.canRunRealActions) {
    return { status: "skipped", reason: "real_execution_requires_active_plan", actionType: action.actionType };
  }
  try {
    const result = await executePreparedActionAfterApproval({ action, approvalId: input.approvalId });
    return { status: "executed", action: result };
  } catch (error) {
    const errorPayload = error instanceof TrelloExecutionError
      ? { message: error.message, details: error.details }
      : { message: error instanceof Error ? error.message : "Trello action execution failed.", details: null };
    return { status: "failed", error: errorPayload, actionType: action.actionType };
  }
}

function validateSlackPayload(value: unknown): { ok: true; payload: SlackContinuationPayload } | { ok: false; details: InvalidPayloadDetail[] } {
  const details: InvalidPayloadDetail[] = [];
  if (!value || typeof value !== "object") {
    return { ok: false, details: [{ field: "continuation_payload", issue: "Must be an object." }] };
  }
  const rec = value as Record<string, unknown>;
  if (rec.kind !== "slack.send_after_approval") details.push({ field: "kind", issue: "Must equal slack.send_after_approval." });
  if (typeof rec.workspaceId !== "string" || !rec.workspaceId.trim()) details.push({ field: "workspaceId", issue: "Required." });
  if (typeof rec.channelId !== "string" || !rec.channelId.trim()) details.push({ field: "channelId", issue: "Required." });
  if (typeof rec.text !== "string" || !rec.text.trim()) details.push({ field: "text", issue: "Required." });
  if (details.length > 0) return { ok: false, details };
  return {
    ok: true,
    payload: {
      kind: "slack.send_after_approval",
      workspaceId: String(rec.workspaceId).trim(),
      channelId: String(rec.channelId).trim(),
      text: String(rec.text).trim(),
      operatorRunId: typeof rec.operatorRunId === "string" ? rec.operatorRunId : undefined,
      operatorKey: typeof rec.operatorKey === "string" ? rec.operatorKey : undefined,
      context: rec.context && typeof rec.context === "object" ? rec.context as Record<string, unknown> : null,
    },
  };
}

function validateSharedActionPayload(value: unknown): { ok: true; payload: SharedActionContinuationPayload } | { ok: false; details: InvalidPayloadDetail[] } {
  const details: InvalidPayloadDetail[] = [];
  if (!value || typeof value !== "object") {
    return { ok: false, details: [{ field: "continuation_payload", issue: "Must be an object." }] };
  }
  const rec = value as Record<string, unknown>;
  const action = rec.preparedAction && typeof rec.preparedAction === "object" ? rec.preparedAction as Record<string, unknown> : null;
  if (rec.kind !== "shared_action.execute_after_approval") details.push({ field: "kind", issue: "Must equal shared_action.execute_after_approval." });
  if (typeof rec.workspaceId !== "string" || !rec.workspaceId.trim()) details.push({ field: "workspaceId", issue: "Required." });
  if (!action) details.push({ field: "preparedAction", issue: "Required." });
  if (action && action.connectorKey !== "trello") details.push({ field: "preparedAction.connectorKey", issue: "Only Trello actions are executable in this pass." });
  if (action && !["create_task", "move_task", "add_task_comment"].includes(String(action.actionType))) details.push({ field: "preparedAction.actionType", issue: "Unsupported action type." });
  if (details.length > 0) return { ok: false, details };
  return {
    ok: true,
    payload: {
      kind: "shared_action.execute_after_approval",
      workspaceId: String(rec.workspaceId).trim(),
      operatorKey: typeof rec.operatorKey === "string" ? rec.operatorKey : undefined,
      preparedAction: action as PreparedAction,
    },
  };
}

function shouldExecuteHubSpot(payload: GmailContinuationPayload): boolean {
  const actions = payload.preparedActions ?? [];
  const hasHubSpotAction = actions.some((action) => action.includes("hubspot"));
  return Boolean(
    hasHubSpotAction
    && payload.crmPreparationStatus !== "hubspot_not_connected"
    && payload.preparedHubSpotActions?.executionStatus === "execution_enabled"
  );
}

function customerEmailMode(payload: GmailContinuationPayload): "approval_required" | "draft_only" | "auto_send_low_risk" {
  const mode = payload.customerEmailPolicy?.mode;
  if (mode === "draft_only" || mode === "auto_send_low_risk" || mode === "approval_required") return mode;
  return "approval_required";
}

function hubspotErrorPayload(error: unknown) {
  if (error instanceof HubSpotExecutionError) {
    return {
      error: "hubspot_execution_failed",
      message: error.message,
      details: error.details,
    };
  }
  return {
    error: "hubspot_execution_failed",
    message: error instanceof Error ? error.message : "HubSpot execution failed.",
    details: null,
  };
}

async function markGmailFailure(input: {
  supabase: ReturnType<typeof createSupabaseAdmin>;
  approvalId: string;
  workspaceId: string;
  resolvedBy: string;
  approvalRow: Record<string, unknown>;
  payload: GmailContinuationPayload;
  error: unknown;
}) {
  const errorPayload = input.error instanceof GmailApiError
    ? { message: input.error.message, details: input.error.details }
    : { message: input.error instanceof Error ? input.error.message : "Gmail execution failed.", details: null };
  const continuation = input.approvalRow.continuation_payload && typeof input.approvalRow.continuation_payload === "object"
    ? input.approvalRow.continuation_payload as Record<string, unknown>
    : {};
  const executionResult = {
    gmailStatus: "failed",
    hubspotStatus: "not_attempted",
    error: errorPayload,
  };

  await input.supabase.from("os_approvals").update({
    status: "failed",
    resolved_at: new Date().toISOString(),
    resolved_by: input.resolvedBy,
    continuation_payload: { ...continuation, executionResult },
  }).eq("id", input.approvalId).eq("workspace_id", input.workspaceId);

  const operatorRunId = input.payload.operatorRunId || (typeof input.approvalRow.run_id === "string" ? input.approvalRow.run_id : "");
  if (operatorRunId) {
    await input.supabase.from("os_operator_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      output: {
        gmail: executionResult,
        crmPreparationStatus: input.payload.crmPreparationStatus ?? null,
        crmPreparation: input.payload.crmPreparation ?? null,
        preparedActions: input.payload.preparedActions ?? ["send_gmail_follow_up"],
        preparedHubSpotActions: input.payload.preparedHubSpotActions ?? null,
      },
      error: errorPayload.message,
    }).eq("id", operatorRunId).eq("workspace_id", input.workspaceId);
  }
}

async function markDraftOnlyReviewed(input: {
  supabase: ReturnType<typeof createSupabaseAdmin>;
  approvalId: string;
  workspaceId: string;
  resolvedBy: string;
  approvalRow: Record<string, unknown>;
  payload: GmailContinuationPayload;
  canRunRealActions: boolean;
}) {
  const finalDraft = effectiveDraft(input.payload);
  const continuation = input.approvalRow.continuation_payload && typeof input.approvalRow.continuation_payload === "object"
    ? input.approvalRow.continuation_payload as Record<string, unknown>
    : {};
  // Trello task is independent of the email send policy. It stays approval-gated
  // and runs even when the customer email is draft-only.
  const clientFlowTrello = await executeClientFlowTrelloAction({
    payload: input.payload,
    approvalId: input.approvalId,
    canRunRealActions: input.canRunRealActions,
  });
  const executionResult = {
    gmailStatus: "draft_only_not_sent",
    hubspotStatus: "not_attempted",
    clientFlowTrello,
    usedEditedDraft: finalDraft.usedEditedDraft,
    finalSubject: finalDraft.subject,
    finalBodyPreview: finalDraft.bodyPreview,
    finalBodyHash: finalDraft.bodyHash,
  };
  const update = await input.supabase.from("os_approvals").update({
    status: "approved",
    resolved_at: new Date().toISOString(),
    resolved_by: input.resolvedBy,
    continuation_payload: { ...continuation, executionResult },
  }).eq("id", input.approvalId).eq("workspace_id", input.workspaceId);
  if (update.error) {
    return NextResponse.json({ error: "approval_update_failed", message: update.error.message }, { status: 500 });
  }

  const operatorRunId = input.payload.operatorRunId || (typeof input.approvalRow.run_id === "string" ? input.approvalRow.run_id : "");
  if (operatorRunId) {
    await input.supabase.from("os_operator_runs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      output: {
        gmail: executionResult,
        crmPreparationStatus: input.payload.crmPreparationStatus ?? null,
        crmPreparation: input.payload.crmPreparation ?? null,
        preparedActions: input.payload.preparedActions ?? ["send_gmail_follow_up"],
        preparedHubSpotActions: input.payload.preparedHubSpotActions ?? null,
      },
      error: null,
    }).eq("id", operatorRunId).eq("workspace_id", input.workspaceId).eq("approval_id", input.approvalId);

    await optionalStep([], "os_operator_run_logs.customer_email_draft_only", () => logOperatorEvent({
      supabase: input.supabase,
      workspaceId: input.workspaceId,
      runId: operatorRunId,
      eventType: "customer_email_draft_only",
      message: "Customer email policy is draft-only. No Gmail message was sent.",
      metadata: { approvalId: input.approvalId, to: input.payload.to, subject: finalDraft.subject },
    }).then((res) => {
      if (res.error) throw new Error(res.error.message);
      return res;
    }));

    if (input.payload.operatorKey === "client_flow") {
      await optionalStep([], "os_operator_run_logs.client_flow_draft_only", () => logOperatorEvent({
        supabase: input.supabase,
        workspaceId: input.workspaceId,
        runId: operatorRunId,
        eventType: "client_flow_draft_only",
        message: "Client Flow email policy is draft-only. The client reply was reviewed but not sent.",
        metadata: { approvalId: input.approvalId, to: input.payload.to, subject: finalDraft.subject },
      }));
      if (clientFlowTrello?.status === "executed") {
        await optionalStep([], "os_operator_run_logs.client_flow_trello_task_created", () => logOperatorEvent({
          supabase: input.supabase,
          workspaceId: input.workspaceId,
          runId: operatorRunId,
          eventType: "client_flow_trello_task_created",
          message: "Client Flow Trello task created after approval.",
          metadata: { approvalId: input.approvalId, clientFlowTrello },
        }));
      } else if (clientFlowTrello?.status === "failed") {
        await optionalStep([], "os_operator_run_logs.client_flow_execution_failed", () => logOperatorEvent({
          supabase: input.supabase,
          workspaceId: input.workspaceId,
          runId: operatorRunId,
          level: "warn",
          eventType: "client_flow_execution_failed",
          message: "Client Flow Trello task execution failed after approval.",
          metadata: { approvalId: input.approvalId, clientFlowTrello },
        }));
      }
    }
  }

  await optionalStep([], "os_execution_logs.customer_email_draft_only", () => input.supabase.from("os_execution_logs").insert({
    id: `log-customer-email-draft-only-${Date.now()}`,
    ts: toTs(),
    run_id: input.approvalRow.run_id || "manual",
    agent_id: input.approvalRow.agent_id || "system",
    agent_mark: input.approvalRow.agent_mark || "OS",
    agent_color: input.approvalRow.agent_color || "#4DE8E1",
    event: "customer_email_draft_only",
    message: `Reviewed draft-only customer email to ${input.payload.to}. No message was sent.`,
    duration: "-",
    status: "ok",
  }).then((res) => {
    if (res.error) throw new Error(res.error.message);
    return res;
  }));

  await optionalStep([], "slack_notification.approval_approved", () => sendSlackApprovalNotification({
    supabase: input.supabase,
    workspaceId: input.workspaceId,
    approvalId: input.approvalId,
    runId: operatorRunId,
    eventType: "approval_approved",
    operatorKey: input.payload.operatorKey || "revenue",
    title: "Approval approved.",
    summary: "Draft-only customer email was reviewed. No Gmail message was sent.",
    approvalUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.inovense.com"}/app/approvals`,
    metadata: { customerEmailMode: "draft_only" },
  }));

  return NextResponse.json({ ok: true, status: "draft_only_reviewed", executionResult });
}

function gmailErrorResponse(error: unknown) {
  if (error instanceof GmailApiError) {
    return NextResponse.json({
      error: error.details.step === "gmail.draft.create" ? "gmail_draft_failed" : "gmail_send_failed",
      message: error.message,
      details: error.details,
    }, { status: 502 });
  }

  const message = error instanceof Error ? error.message : "Gmail execution failed.";
  return NextResponse.json({
    error: "gmail_send_failed",
    message,
    details: { step: "gmail.execution", status: null, statusText: null, responseBody: null },
  }, { status: 502 });
}

async function optionalStep<T>(warnings: string[], label: string, fn: () => PromiseLike<T> | Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown optional step failure.";
    warnings.push(`${label}: ${message}`);
    return null;
  }
}

function alreadyResolvedResponse(approvalRow: Record<string, unknown>) {
  const continuation = approvalRow.continuation_payload && typeof approvalRow.continuation_payload === "object"
    ? approvalRow.continuation_payload as Record<string, unknown>
    : {};
  const executionResult = continuation.executionResult && typeof continuation.executionResult === "object"
    ? continuation.executionResult as Record<string, unknown>
    : null;
  const gmail = executionResult?.gmail && typeof executionResult.gmail === "object"
    ? executionResult.gmail as Record<string, unknown>
    : null;
  return NextResponse.json({
    ok: true,
    status: "already_resolved",
    alreadyResolved: true,
    message: "Approval was already resolved. No action was executed again.",
    approvalStatus: typeof approvalRow.status === "string" ? approvalRow.status : null,
    resolvedAt: typeof approvalRow.resolved_at === "string" ? approvalRow.resolved_at : null,
    messageId: typeof gmail?.messageId === "string" ? gmail.messageId : null,
    sendEndpoint: typeof gmail?.sendEndpoint === "string" ? gmail.sendEndpoint : null,
    executionResult,
  });
}

function slackErrorResponse(error: unknown) {
  if (error instanceof SlackExecutionError) {
    return NextResponse.json({
      error: error.details.code || "slack_send_failed",
      message: error.message,
      details: error.details,
    }, { status: error.details.status ?? 502 });
  }

  return NextResponse.json({
    error: "slack_send_failed",
    message: error instanceof Error ? error.message : "Slack execution failed.",
  }, { status: 502 });
}

function sharedActionErrorResponse(error: unknown) {
  if (error instanceof TrelloExecutionError) {
    return NextResponse.json({
      error: error.details.code || "trello_action_failed",
      message: error.message,
      details: error.details,
    }, { status: error.details.status ?? 502 });
  }
  return NextResponse.json({
    error: "shared_action_failed",
    message: error instanceof Error ? error.message : "Shared action execution failed.",
  }, { status: 502 });
}

async function executeSharedActionApproval(input: {
  supabase: ReturnType<typeof createSupabaseAdmin>;
  approvalId: string;
  approvalRow: Record<string, unknown>;
  payload: SharedActionContinuationPayload;
  resolvedBy: string;
}) {
  const continuation = input.approvalRow.continuation_payload && typeof input.approvalRow.continuation_payload === "object"
    ? input.approvalRow.continuation_payload as Record<string, unknown>
    : {};
  if (continuation.executionResult && typeof continuation.executionResult === "object") {
    return alreadyResolvedResponse(input.approvalRow);
  }

  const executionClaim = await input.supabase
    .from("os_approvals")
    .update({ status: "executing", resolved_by: input.resolvedBy })
    .eq("id", input.approvalId)
    .eq("workspace_id", input.payload.workspaceId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (executionClaim.error || !executionClaim.data) {
    return NextResponse.json({
      error: "approval_execution_in_progress",
      message: executionClaim.error?.message || "Could not claim approval for execution.",
    }, { status: 409 });
  }

  try {
    const actionResult = await executePreparedActionAfterApproval({
      action: input.payload.preparedAction,
      approvalId: input.approvalId,
    });
    const executionResult = {
      status: "executed",
      action: actionResult,
      executedAt: new Date().toISOString(),
    };
    const approvalUpdate = await input.supabase.from("os_approvals").update({
      status: "approved",
      resolved_at: new Date().toISOString(),
      resolved_by: input.resolvedBy,
      continuation_payload: { ...continuation, executionResult },
    }).eq("id", input.approvalId).eq("workspace_id", input.payload.workspaceId);
    if (approvalUpdate.error) return NextResponse.json({ error: "approval_update_failed", message: approvalUpdate.error.message }, { status: 500 });

    const actionType = input.payload.preparedAction.actionType;
    const trelloEvent = actionType === "move_task" ? "trello_card_moved" : actionType === "add_task_comment" ? "trello_comment_added" : "trello_card_created";
    await optionalStep([], "os_execution_logs.shared_action", () => input.supabase.from("os_execution_logs").insert([
      {
        id: `log-action-executed-${Date.now()}`,
        ts: toTs(),
        run_id: input.approvalRow.run_id || "manual",
        agent_id: input.approvalRow.agent_id || input.payload.preparedAction.operatorKey,
        agent_mark: input.approvalRow.agent_mark || "OP",
        agent_color: input.approvalRow.agent_color || "#51D88A",
        event: "action_executed",
        message: `Executed ${actionType} through Trello after approval.`,
        duration: "-",
        status: "ok",
      },
      {
        id: `log-${trelloEvent}-${Date.now() + 1}`,
        ts: toTs(),
        run_id: input.approvalRow.run_id || "manual",
        agent_id: input.approvalRow.agent_id || input.payload.preparedAction.operatorKey,
        agent_mark: input.approvalRow.agent_mark || "OP",
        agent_color: input.approvalRow.agent_color || "#51D88A",
        event: trelloEvent,
        message: input.payload.preparedAction.title,
        duration: "-",
        status: "ok",
      },
    ]).then((res) => {
      if (res.error) throw new Error(res.error.message);
      return res;
    }));

    await optionalStep([], "slack_notification.approval_approved", () => sendSlackApprovalNotification({
      supabase: input.supabase,
      workspaceId: input.payload.workspaceId,
      approvalId: input.approvalId,
      runId: typeof input.approvalRow.run_id === "string" ? input.approvalRow.run_id : "manual",
      eventType: "approval_approved",
      operatorKey: input.payload.preparedAction.operatorKey,
      title: "Approval approved.",
      summary: `Trello action executed: ${input.payload.preparedAction.title}.`,
      approvalUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.inovense.com"}/app/approvals`,
      metadata: { actionType, connectorKey: "trello" },
    }));

    return NextResponse.json({ ok: true, executionResult });
  } catch (error) {
    const errorPayload = error instanceof TrelloExecutionError
      ? { message: error.message, details: error.details }
      : { message: error instanceof Error ? error.message : "Shared action execution failed.", details: null };
    await input.supabase.from("os_approvals").update({
      status: "failed",
      resolved_at: new Date().toISOString(),
      resolved_by: input.resolvedBy,
      continuation_payload: {
        ...continuation,
        executionResult: { status: "failed", error: errorPayload },
      },
    }).eq("id", input.approvalId).eq("workspace_id", input.payload.workspaceId);
    await optionalStep([], "slack_notification.execution_failed", () => sendSlackApprovalNotification({
      supabase: input.supabase,
      workspaceId: input.payload.workspaceId,
      approvalId: input.approvalId,
      runId: typeof input.approvalRow.run_id === "string" ? input.approvalRow.run_id : "manual",
      eventType: "execution_failed",
      operatorKey: input.payload.preparedAction.operatorKey,
      title: "Execution failed.",
      summary: "Trello action execution failed. Review the approval logs in Inovense.",
      approvalUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.inovense.com"}/app/approvals`,
      metadata: { actionType: input.payload.preparedAction.actionType, connectorKey: "trello" },
    }));
    return sharedActionErrorResponse(error);
  }
}

async function executeSlackApproval(input: {
  supabase: ReturnType<typeof createSupabaseAdmin>;
  approvalId: string;
  approvalRow: Record<string, unknown>;
  payload: SlackContinuationPayload;
  resolvedBy: string;
}) {
  const executionClaim = await input.supabase
    .from("os_approvals")
    .update({
      status: "executing",
      resolved_by: input.resolvedBy,
    })
    .eq("id", input.approvalId)
    .eq("workspace_id", input.payload.workspaceId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (executionClaim.error || !executionClaim.data) {
    return NextResponse.json({
      error: "approval_execution_in_progress",
      message: executionClaim.error?.message || "Could not claim approval for execution.",
    }, { status: 409 });
  }

  try {
    const sent = await sendSlackMessageAfterApproval({
      workspaceId: input.payload.workspaceId,
      channelId: input.payload.channelId,
      text: input.payload.text,
      approvalId: input.approvalId,
      context: input.payload.context,
    });
    const executionResult = {
      slackStatus: "sent",
      channelId: sent.channelId,
      messageTs: sent.messageTs ?? null,
    };

    const approvalUpdate = await input.supabase.from("os_approvals").update({
      status: "approved",
      resolved_at: new Date().toISOString(),
      resolved_by: input.resolvedBy,
      continuation_payload: {
        ...(input.approvalRow.continuation_payload && typeof input.approvalRow.continuation_payload === "object" ? input.approvalRow.continuation_payload as Record<string, unknown> : {}),
        executionResult,
      },
    }).eq("id", input.approvalId).eq("workspace_id", input.payload.workspaceId);
    if (approvalUpdate.error) {
      return NextResponse.json({ error: "approval_update_failed", message: approvalUpdate.error.message }, { status: 500 });
    }

    await optionalStep([], "os_execution_logs.insert", () => input.supabase.from("os_execution_logs").insert({
      id: `log-slack-send-${Date.now()}`,
      ts: toTs(),
      run_id: input.approvalRow.run_id || "manual",
      agent_id: input.approvalRow.agent_id || "system",
      agent_mark: input.approvalRow.agent_mark || "OS",
      agent_color: input.approvalRow.agent_color || "#4DE8E1",
      event: "slack.message_sent_after_approval",
      message: `Sent approved Slack message to ${sent.channelId}${sent.messageTs ? ` (${sent.messageTs})` : ""}`,
      duration: "-",
      status: "ok",
    }).then((res) => {
      if (res.error) throw new Error(res.error.message);
      return res;
    }));

    return NextResponse.json({ ok: true, slackStatus: "sent", executionResult });
  } catch (error) {
    const errorPayload = error instanceof SlackExecutionError
      ? { message: error.message, details: error.details }
      : { message: error instanceof Error ? error.message : "Slack execution failed.", details: null };
    await input.supabase.from("os_approvals").update({
      status: "failed",
      resolved_at: new Date().toISOString(),
      resolved_by: input.resolvedBy,
      continuation_payload: {
        ...(input.approvalRow.continuation_payload && typeof input.approvalRow.continuation_payload === "object" ? input.approvalRow.continuation_payload as Record<string, unknown> : {}),
        executionResult: {
          slackStatus: "failed",
          error: errorPayload,
        },
      },
    }).eq("id", input.approvalId).eq("workspace_id", input.payload.workspaceId);
    return slackErrorResponse(error);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as ApproveBody;
  const userEmail = body.userEmail?.toLowerCase() || "";
  const userId = body.userId || "";
  const workspaceId = body.workspaceId || "";
  if (!id || !workspaceId) {
    return NextResponse.json({ error: "approval id and workspaceId are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const approvalRes = await supabase
    .from("os_approvals")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();

  if (approvalRes.error) {
    return NextResponse.json({ error: approvalRes.error.message }, { status: 500 });
  }
  const approvalRow = approvalRes.data;
  if (!approvalRow) {
    return NextResponse.json({ error: "Approval not found." }, { status: 404 });
  }
  if (approvalRow.status !== "pending") {
    const continuationRecord = approvalRow.continuation_payload && typeof approvalRow.continuation_payload === "object"
      ? approvalRow.continuation_payload as Record<string, unknown>
      : {};
    const existingExecution = continuationRecord.executionResult && typeof continuationRecord.executionResult === "object"
      ? continuationRecord.executionResult as Record<string, unknown>
      : null;
    if (
      approvalRow.status === "approved"
      || approvalRow.status === "partially_completed"
      || approvalRow.resolved_at
      || existingExecution
    ) {
      return alreadyResolvedResponse(approvalRow as Record<string, unknown>);
    }
    if (approvalRow.status === "executing") {
      return NextResponse.json({
        error: "approval_execution_in_progress",
        message: "Approval execution is already in progress. Gmail was not sent again.",
      }, { status: 409 });
    }
    return NextResponse.json({ error: "Approval is already resolved." }, { status: 409 });
  }

  const continuation = approvalRow.continuation_payload;
  const continuationKind = continuation && typeof continuation === "object"
    ? (continuation as Record<string, unknown>).kind
    : null;

  if (continuationKind === "shared_action.execute_after_approval") {
    const payloadValidation = validateSharedActionPayload(continuation);
    if (!payloadValidation.ok) {
      return NextResponse.json({
        error: "invalid_payload",
        message: "Approval has an invalid shared action continuation payload.",
        details: payloadValidation.details,
      }, { status: 400 });
    }
    const sharedPayload = payloadValidation.payload;
    if (sharedPayload.workspaceId !== context.workspaceId || approvalRow.workspace_id !== context.workspaceId) {
      return NextResponse.json({ error: "Workspace mismatch for approval payload." }, { status: 403 });
    }
    const ws = await supabase
      .from("os_workspaces")
      .select("billing_status, can_run_real_actions")
      .eq("id", context.workspaceId)
      .single();
    if (ws.error || !ws.data) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (!ws.data.can_run_real_actions || ws.data.billing_status === "preview") {
      return NextResponse.json({ error: "Real execution requires an active plan." }, { status: 402 });
    }

    return executeSharedActionApproval({
      supabase,
      approvalId: id,
      approvalRow: approvalRow as Record<string, unknown>,
      payload: sharedPayload,
      resolvedBy: context.userEmail || context.userId || userEmail || userId,
    });
  }

  if (continuationKind === "slack.send_after_approval") {
    const payloadValidation = validateSlackPayload(continuation);
    if (!payloadValidation.ok) {
      return NextResponse.json({
        error: "invalid_payload",
        message: "Approval has an invalid Slack continuation payload.",
        details: payloadValidation.details,
      }, { status: 400 });
    }
    const slackPayload = payloadValidation.payload;
    if (slackPayload.workspaceId !== context.workspaceId || approvalRow.workspace_id !== context.workspaceId) {
      return NextResponse.json({ error: "Workspace mismatch for approval payload." }, { status: 403 });
    }

    const ws = await supabase
      .from("os_workspaces")
      .select("billing_status, can_run_real_actions")
      .eq("id", context.workspaceId)
      .single();
    if (ws.error || !ws.data) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (!ws.data.can_run_real_actions || ws.data.billing_status === "preview") {
      return NextResponse.json({ error: "Real execution requires an active plan." }, { status: 402 });
    }

    return executeSlackApproval({
      supabase,
      approvalId: id,
      approvalRow: approvalRow as Record<string, unknown>,
      payload: slackPayload,
      resolvedBy: context.userEmail || context.userId || userEmail || userId,
    });
  }

  const payloadValidation = validateGmailPayload(continuation);
  if (!payloadValidation.ok) {
    return NextResponse.json({
      error: "invalid_payload",
      message: "Approval has an invalid Gmail continuation payload.",
      details: payloadValidation.details,
    }, { status: 400 });
  }
  const gmailPayload = payloadValidation.payload;
  if (gmailPayload.workspaceId !== context.workspaceId || approvalRow.workspace_id !== context.workspaceId) {
    return NextResponse.json({ error: "Workspace mismatch for approval payload." }, { status: 403 });
  }
  const finalDraft = effectiveDraft(gmailPayload);

  const ws = await supabase
    .from("os_workspaces")
    .select("billing_status, can_run_real_actions")
    .eq("id", context.workspaceId)
    .single();
  if (ws.error || !ws.data) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (customerEmailMode(gmailPayload) === "draft_only") {
    return markDraftOnlyReviewed({
      supabase,
      approvalId: id,
      workspaceId: context.workspaceId,
      resolvedBy: context.userEmail || context.userId || userEmail || userId,
      approvalRow: approvalRow as Record<string, unknown>,
      payload: gmailPayload,
      canRunRealActions: Boolean(ws.data.can_run_real_actions) && ws.data.billing_status !== "preview",
    });
  }
  if (!ws.data.can_run_real_actions || ws.data.billing_status === "preview") {
    return NextResponse.json({ error: "Real execution requires an active plan." }, { status: 402 });
  }

  const credentialRes = await supabase
    .from("os_connector_credentials")
    .select("*")
    .eq("workspace_id", approvalRow.workspace_id)
    .eq("connector_key", "gmail")
    .maybeSingle();
  if (credentialRes.error || !credentialRes.data) {
    return NextResponse.json({
      error: "missing_gmail_credentials",
      message: "Gmail credentials are missing for this workspace.",
    }, { status: 409 });
  }

  console.info("[gmail-approval] starting", {
    approvalId: id,
    workspaceId: context.workspaceId,
    kind: gmailPayload.kind,
    to: gmailPayload.to,
    step: "gmail.execution",
  });

  const credential = credentialRes.data as StoredConnectorCredential;
  const missingScopes = getMissingGmailScopes(credential.scopes);
  if (missingScopes.length > 0 || !hasGmailSendScope(credential.scopes)) {
    return NextResponse.json({
      error: "gmail_reconnect_required",
      message: "Reconnect Gmail to grant send permission.",
      details: {
        step: "gmail.scope_check",
        missingScopes,
        reconnectRequired: true,
      },
    }, { status: 409 });
  }

  const executionClaim = await supabase
    .from("os_approvals")
    .update({
      status: "executing",
      resolved_by: context.userEmail || context.userId || userEmail || userId,
    })
    .eq("id", id)
    .eq("workspace_id", context.workspaceId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (executionClaim.error || !executionClaim.data) {
    const latest = await supabase
      .from("os_approvals")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", context.workspaceId)
      .maybeSingle();
    if (latest.data) {
      const latestRow = latest.data as Record<string, unknown>;
      if (latestRow.status === "approved" || latestRow.status === "partially_completed" || latestRow.resolved_at) {
        return alreadyResolvedResponse(latestRow);
      }
      return NextResponse.json({
        error: "approval_execution_in_progress",
        message: "Approval execution is already in progress. Gmail was not sent again.",
      }, { status: 409 });
    }
    return NextResponse.json({
      error: "approval_claim_failed",
      message: executionClaim.error?.message || "Could not claim approval for execution.",
    }, { status: 409 });
  }

  let draft: { draftId: string; messageId?: string; raw: string; draftCreateStatus: number };
  let sent: { messageId?: string; sendEndpoint: "drafts/send" | "messages/send"; googleResponseBody: unknown };
  let draftSendFailure: unknown = null;
  try {
    const accessToken = await resolveAccessTokenFromCredential(credential);
    console.info("[gmail-approval] gmail.draft.create", { approvalId: id, workspaceId: context.workspaceId, to: gmailPayload.to });
    draft = await createGmailDraft(accessToken, {
      to: gmailPayload.to,
      subject: finalDraft.subject,
      body: finalDraft.body,
    });
    console.info("[gmail-approval] gmail.draft.created", {
      approvalId: id,
      workspaceId: context.workspaceId,
      to: gmailPayload.to,
      draftCreateStatus: draft.draftCreateStatus,
      draftId: draft.draftId,
      messageId: draft.messageId ?? null,
    });
    try {
      console.info("[gmail-approval] gmail.draft.send", {
        approvalId: id,
        workspaceId: context.workspaceId,
        to: gmailPayload.to,
        draftId: draft.draftId,
      });
      sent = await sendGmailDraft(accessToken, draft.draftId, {
        draftCreateStatus: draft.draftCreateStatus,
        draftMessageId: draft.messageId,
      });
    } catch (error) {
      draftSendFailure = error;
      console.warn("[gmail-approval] gmail.draft.send failed, trying messages.send", {
        approvalId: id,
        workspaceId: context.workspaceId,
        to: gmailPayload.to,
        draftId: draft.draftId,
        error: error instanceof Error ? error.message : "Unknown Gmail draft send error",
      });
      sent = await sendGmailMessage(accessToken, draft.raw, {
        draftCreateStatus: draft.draftCreateStatus,
        draftId: draft.draftId,
        draftMessageId: draft.messageId,
      });
    }
  } catch (error) {
    console.warn("[gmail-approval] failed", {
      approvalId: id,
      workspaceId: context.workspaceId,
      to: gmailPayload.to,
      error: error instanceof Error ? error.message : "Unknown Gmail error",
    });
    await markGmailFailure({
      supabase,
      approvalId: id,
      workspaceId: context.workspaceId,
      resolvedBy: context.userEmail || context.userId || userEmail || userId,
      approvalRow: approvalRow as Record<string, unknown>,
      payload: gmailPayload,
      error,
    });
    await optionalStep([], "slack_notification.execution_failed", () => sendSlackApprovalNotification({
      supabase,
      workspaceId: context.workspaceId,
      approvalId: id,
      runId: gmailPayload.operatorRunId || (typeof approvalRow.run_id === "string" ? approvalRow.run_id : null),
      eventType: "execution_failed",
      operatorKey: gmailPayload.operatorKey || "revenue",
      title: "Execution failed.",
      summary: "Gmail execution failed before the customer email could be sent.",
      approvalUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.inovense.com"}/app/approvals`,
      metadata: { to: gmailPayload.to, error: error instanceof Error ? error.message : "Unknown Gmail error" },
    }));
    return gmailErrorResponse(error);
  }

  const warnings: string[] = [];
  let hubspotResult: HubSpotExecutionResult | null = null;
  if (shouldExecuteHubSpot(gmailPayload)) {
    try {
      console.info("[approval] hubspot.execution.starting", {
        approvalId: id,
        workspaceId: context.workspaceId,
        to: gmailPayload.to,
      });
      hubspotResult = await executeHubSpotRevenueActions(context.workspaceId, {
        to: gmailPayload.to,
        subject: finalDraft.subject,
        crmPreparation: gmailPayload.crmPreparation,
        preparedHubSpotActions: gmailPayload.preparedHubSpotActions,
      });
      console.info("[approval] hubspot.execution.completed", {
        approvalId: id,
        workspaceId: context.workspaceId,
        status: hubspotResult.status,
        contactId: hubspotResult.contactId ?? null,
        dealId: hubspotResult.dealId ?? null,
      });
    } catch (error) {
      const safeError = hubspotErrorPayload(error);
      hubspotResult = {
        status: "failed",
        error: safeError,
        note: { status: "prepared_not_enabled", reason: "HubSpot note execution is intentionally not enabled in v1.6." },
        task: { status: "prepared_not_enabled", reason: "HubSpot task execution is intentionally not enabled in v1.6." },
      };
      warnings.push("hubspot_execution_failed");
      console.warn("[approval] hubspot.execution.failed", {
        approvalId: id,
        workspaceId: context.workspaceId,
        to: gmailPayload.to,
        error: safeError.message,
        details: safeError.details,
      });
    }
  } else if (gmailPayload.crmPreparationStatus === "hubspot_not_connected") {
    hubspotResult = { status: "skipped", error: { code: "hubspot_not_connected" } };
    warnings.push("hubspot_not_connected");
  } else if (gmailPayload.preparedActions?.some((action) => action.includes("hubspot"))) {
    hubspotResult = { status: "skipped", error: { code: "hubspot_execution_not_enabled" } };
    warnings.push("hubspot_execution_not_enabled");
  }

  // Client Flow can bundle a prepared Trello task. Reaching here means billing
  // already allows real execution. The task stays approval-gated and failures
  // are non-fatal to the completed email send.
  const clientFlowTrello = await executeClientFlowTrelloAction({
    payload: gmailPayload,
    approvalId: id,
    canRunRealActions: true,
  });
  if (clientFlowTrello?.status === "failed") warnings.push("client_flow_trello_failed");

  const hubspotFailed = hubspotResult?.status === "failed";
  const finalStatus = hubspotFailed ? "partially_completed" : "approved";
  const runFinalStatus = hubspotFailed ? "partially_completed" : "completed";
  const executionResult = {
    gmailStatus: "sent",
    hubspotStatus: hubspotResult?.status ?? "not_applicable",
    hubspotContactId: hubspotResult?.contactId ?? null,
    hubspotDealId: hubspotResult?.dealId ?? null,
    clientFlowTrello,
    gmail: {
      draftId: draft.draftId,
      messageId: sent.messageId ?? null,
      to: gmailPayload.to,
      subject: finalDraft.subject,
      sendEndpoint: sent.sendEndpoint,
    },
    usedEditedDraft: finalDraft.usedEditedDraft,
    finalSubject: finalDraft.subject,
    finalBodyPreview: finalDraft.bodyPreview,
    finalBodyHash: finalDraft.bodyHash,
    hubspot: hubspotResult,
  };

  const approvalUpdate = await supabase.from("os_approvals").update({
    status: finalStatus,
    resolved_at: new Date().toISOString(),
    resolved_by: context.userEmail || context.userId || userEmail || userId,
    continuation_payload: {
      ...(approvalRow.continuation_payload && typeof approvalRow.continuation_payload === "object" ? approvalRow.continuation_payload as Record<string, unknown> : {}),
      executionResult,
    },
  }).eq("id", id).eq("workspace_id", context.workspaceId);
  if (approvalUpdate.error) {
    return NextResponse.json({ error: "approval_update_failed", message: approvalUpdate.error.message }, { status: 500 });
  }

  await optionalStep(warnings, "os_execution_logs.insert", () => supabase.from("os_execution_logs").insert([
    {
      id: `log-gmail-draft-${Date.now()}`,
      ts: toTs(),
      run_id: approvalRow.run_id || "manual",
      agent_id: approvalRow.agent_id || "system",
      agent_mark: approvalRow.agent_mark || "OS",
      agent_color: approvalRow.agent_color || "#4DE8E1",
      event: "gmail.draft_created",
      message: `Draft ${draft.draftId} created for ${gmailPayload.to}`,
      duration: "-",
      status: "ok",
    },
    {
      id: `log-gmail-send-${Date.now() + 1}`,
      ts: toTs(),
      run_id: approvalRow.run_id || "manual",
      agent_id: approvalRow.agent_id || "system",
      agent_mark: approvalRow.agent_mark || "OS",
      agent_color: approvalRow.agent_color || "#4DE8E1",
      event: "gmail.draft_sent",
      message: `Sent approved Gmail message to ${gmailPayload.to}${sent.messageId ? ` (${sent.messageId})` : ""} via ${sent.sendEndpoint}`,
      duration: "-",
      status: "ok",
    },
    {
      id: `log-approval-approved-${Date.now() + 2}`,
      ts: toTs(),
      run_id: approvalRow.run_id || "manual",
      agent_id: approvalRow.agent_id || "system",
      agent_mark: approvalRow.agent_mark || "OS",
      agent_color: approvalRow.agent_color || "#4DE8E1",
      event: "approval.approved",
      message: hubspotFailed ? "Approval approved, Gmail send completed, HubSpot execution failed" : "Approval approved and Gmail send completed",
      duration: "-",
      status: hubspotFailed ? "warn" : "ok",
    },
    {
      id: `log-customer-email-sent-${Date.now() + 3}`,
      ts: toTs(),
      run_id: approvalRow.run_id || "manual",
      agent_id: approvalRow.agent_id || "system",
      agent_mark: approvalRow.agent_mark || "OS",
      agent_color: approvalRow.agent_color || "#4DE8E1",
      event: "customer_email_sent_after_approval",
      message: `Customer email sent after approval to ${gmailPayload.to}`,
      duration: "-",
      status: "ok",
    },
  ]).then((res) => {
    if (res.error) throw new Error(res.error.message);
    return res;
  }));

  const operatorRunId = typeof gmailPayload.operatorRunId === "string" ? gmailPayload.operatorRunId : approvalRow.run_id;

  if (gmailPayload.operatorKey === "client_flow" && operatorRunId) {
    await optionalStep(warnings, "os_operator_run_logs.client_flow_email_sent", () => logOperatorEvent({
      supabase,
      workspaceId: context.workspaceId,
      runId: operatorRunId,
      eventType: "client_flow_email_sent_after_approval",
      message: `Client reply sent after approval to ${gmailPayload.to}.`,
      metadata: { approvalId: id, to: gmailPayload.to, subject: finalDraft.subject, clientFlowTrello },
    }));
    if (clientFlowTrello?.status === "executed") {
      await optionalStep(warnings, "os_operator_run_logs.client_flow_trello_task_created", () => logOperatorEvent({
        supabase,
        workspaceId: context.workspaceId,
        runId: operatorRunId,
        eventType: "client_flow_trello_task_created",
        message: "Client Flow Trello task created after approval.",
        metadata: { approvalId: id, clientFlowTrello },
      }));
    } else if (clientFlowTrello?.status === "failed") {
      await optionalStep(warnings, "os_operator_run_logs.client_flow_execution_failed", () => logOperatorEvent({
        supabase,
        workspaceId: context.workspaceId,
        runId: operatorRunId,
        level: "warn",
        eventType: "client_flow_execution_failed",
        message: "Client Flow Trello task execution failed after the client reply was sent.",
        metadata: { approvalId: id, clientFlowTrello },
      }));
    }
  }

  if (operatorRunId) {
    const approvalLearning = {
      ...learningMetadata({
        approvalId: id,
        runId: operatorRunId,
        payload: gmailPayload,
        messageId: sent.messageId ?? null,
        sendEndpoint: sent.sendEndpoint,
      }),
      hubspotStatus: hubspotResult?.status ?? null,
      hubspotContactId: hubspotResult?.contactId ?? null,
      hubspotDealId: hubspotResult?.dealId ?? null,
      executionResult,
    };

    await optionalStep(warnings, "os_operator_runs.update", () => supabase.from("os_operator_runs").update({
      status: runFinalStatus,
      completed_at: new Date().toISOString(),
      output: {
        gmail: executionResult.gmail,
        hubspot: hubspotResult,
        executionResult,
        crmPreparationStatus: gmailPayload.crmPreparationStatus ?? null,
        crmPreparation: gmailPayload.crmPreparation ?? null,
        preparedHubSpotActions: gmailPayload.preparedHubSpotActions ?? null,
        preparedActions: gmailPayload.preparedActions ?? ["send_gmail_follow_up"],
        approvalLearning,
      },
      error: hubspotFailed ? "HubSpot execution failed after Gmail send." : null,
    }).eq("id", operatorRunId).eq("workspace_id", context.workspaceId).eq("approval_id", id).then((res) => {
      if (res.error) throw new Error(res.error.message);
      return res;
    }));

    await optionalStep(warnings, "os_operator_run_logs.insert", () => logOperatorEvent({
        supabase,
        workspaceId: context.workspaceId,
        runId: operatorRunId,
        eventType: hubspotFailed ? "approval.partially_completed" : "gmail.send.completed",
        message: hubspotFailed
          ? `Gmail message sent to ${gmailPayload.to}, but HubSpot execution failed.`
          : `Approved Gmail message sent to ${gmailPayload.to}.`,
        metadata: { ...approvalLearning, draftId: draft.draftId, executionResult },
      }).then((res) => {
        if (res.error) throw new Error(res.error.message);
        return res;
      }));
    if (hubspotResult) {
      await optionalStep(warnings, "os_operator_run_logs.hubspot.insert", () => logOperatorEvent({
          supabase,
          workspaceId: context.workspaceId,
          runId: operatorRunId,
          eventType: hubspotFailed ? "hubspot.execution.failed" : `hubspot.execution.${hubspotResult.status}`,
          message: hubspotFailed
            ? "HubSpot contact/deal execution failed after Gmail send."
            : `HubSpot execution status: ${hubspotResult.status}.`,
          metadata: hubspotResult,
        }).then((res) => {
          if (res.error) throw new Error(res.error.message);
          return res;
        }));
    }
    await optionalStep(warnings, "os_operator_run_logs.learning.insert", () => logOperatorEvent({
        supabase,
        workspaceId: context.workspaceId,
        runId: operatorRunId,
        eventType: "revenue.approval.learning",
        message: `Positive approval signal recorded for ${gmailPayload.to}.`,
        metadata: approvalLearning,
      }).then((res) => {
        if (res.error) throw new Error(res.error.message);
        return res;
      }));
    await optionalStep(warnings, "os_operator_usage_events.insert", () => recordOperatorUsage({
        supabase,
        workspaceId: context.workspaceId,
        runId: operatorRunId,
        operatorKey: gmailPayload.operatorKey || "revenue",
        eventType: "gmail.send",
        quantity: 1,
        metadata: approvalLearning,
      }).then((res) => {
        if (res.error) throw new Error(res.error.message);
        return res;
      }));
    await optionalStep(warnings, "os_operator_memory.insert", () => createOperatorMemory({
        supabase,
        workspaceId: context.workspaceId,
        operatorKey: gmailPayload.operatorKey || "revenue",
        memoryType: "revenue_approval_learning",
        title: `Approved Revenue follow-up to ${gmailPayload.to}`,
        content: `Positive approval signal. Subject: ${finalDraft.subject}`,
        metadata: approvalLearning,
        sourceRunId: operatorRunId,
        approvalStatus: "approved",
      }).then((res) => {
        if (res.error) throw new Error(res.error.message);
        return res;
      }));
  }

  await optionalStep(warnings, hubspotFailed ? "slack_notification.execution_failed" : "slack_notification.approval_approved", () => sendSlackApprovalNotification({
    supabase,
    workspaceId: context.workspaceId,
    approvalId: id,
    runId: operatorRunId || (typeof approvalRow.run_id === "string" ? approvalRow.run_id : null),
    eventType: hubspotFailed ? "execution_failed" : "approval_approved",
    operatorKey: gmailPayload.operatorKey || "revenue",
    title: hubspotFailed ? "Execution failed." : "Approval approved.",
    summary: hubspotFailed
      ? "Gmail was sent, but HubSpot execution failed. Review the approval logs in Inovense."
      : "Revenue Operator sent the email and updated the run.",
    approvalUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.inovense.com"}/app/approvals`,
    metadata: { to: gmailPayload.to, hubspotStatus: hubspotResult?.status ?? null },
  }));

  const draftSendDetails = draftSendFailure instanceof GmailApiError ? draftSendFailure.details : null;
  return NextResponse.json({
    ok: true,
    draftId: draft.draftId,
    draftMessageId: draft.messageId ?? null,
    messageId: sent.messageId,
    sendEndpoint: sent.sendEndpoint,
    gmailDebug: {
      draftCreateStatus: draft.draftCreateStatus,
      draftId: draft.draftId,
      messageId: draft.messageId ?? null,
      sendEndpoint: sent.sendEndpoint,
      draftSendFailure: draftSendDetails,
      googleResponseBody: sent.googleResponseBody,
    },
    warnings,
    crmPreparationStatus: gmailPayload.crmPreparationStatus ?? null,
    gmailStatus: executionResult.gmailStatus,
    hubspotStatus: executionResult.hubspotStatus,
    hubspotContactId: executionResult.hubspotContactId,
    hubspotDealId: executionResult.hubspotDealId,
    executionResult,
  });
}

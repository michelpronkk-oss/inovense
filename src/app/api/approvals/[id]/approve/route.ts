import { NextRequest, NextResponse } from "next/server";
import { createGmailDraft, GmailApiError, getMissingGmailScopes, hasGmailSendScope, resolveAccessTokenFromCredential, sendGmailDraft, sendGmailMessage, type StoredConnectorCredential } from "@/lib/connectors/gmail";
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
  preparedActions?: string[];
  crmPreparationStatus?: string | null;
  crmPreparation?: Record<string, unknown> | null;
  sourceMetadata?: Record<string, unknown> | null;
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
    subject: input.payload.subject,
    classification,
    confidence,
    crmPreparationStatus: input.payload.crmPreparationStatus ?? null,
    preparedActions: input.payload.preparedActions ?? ["send_gmail_follow_up"],
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
      preparedActions: Array.isArray(rec.preparedActions) ? rec.preparedActions.filter((item): item is string => typeof item === "string") : undefined,
      crmPreparationStatus: typeof rec.crmPreparationStatus === "string" ? rec.crmPreparationStatus : null,
      crmPreparation: rec.crmPreparation && typeof rec.crmPreparation === "object" ? rec.crmPreparation as Record<string, unknown> : null,
      sourceMetadata: rec.sourceMetadata && typeof rec.sourceMetadata === "object" ? rec.sourceMetadata as Record<string, unknown> : null,
    },
  };
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
    return NextResponse.json({ error: "Approval is already resolved." }, { status: 409 });
  }

  const continuation = approvalRow.continuation_payload;
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

  const ws = await supabase
    .from("os_workspaces")
    .select("billing_status, can_run_real_actions")
    .eq("id", context.workspaceId)
    .single();
  if (ws.error || !ws.data) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
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

  let draft: { draftId: string; messageId?: string; raw: string; draftCreateStatus: number };
  let sent: { messageId?: string; sendEndpoint: "drafts/send" | "messages/send"; googleResponseBody: unknown };
  let draftSendFailure: unknown = null;
  try {
    const accessToken = await resolveAccessTokenFromCredential(credential);
    console.info("[gmail-approval] gmail.draft.create", { approvalId: id, workspaceId: context.workspaceId, to: gmailPayload.to });
    draft = await createGmailDraft(accessToken, {
      to: gmailPayload.to,
      subject: gmailPayload.subject,
      body: gmailPayload.body,
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
    return gmailErrorResponse(error);
  }

  const approvalUpdate = await supabase.from("os_approvals").update({
    status: "approved",
    resolved_at: new Date().toISOString(),
    resolved_by: context.userEmail || context.userId || userEmail || userId,
  }).eq("id", id).eq("workspace_id", context.workspaceId);
  if (approvalUpdate.error) {
    return NextResponse.json({ error: "approval_update_failed", message: approvalUpdate.error.message }, { status: 500 });
  }

  const warnings: string[] = [];
  if (gmailPayload.crmPreparationStatus === "hubspot_execution_not_ready") {
    warnings.push("hubspot_execution_not_ready");
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
      message: "Approval approved and Gmail send completed",
      duration: "-",
      status: "ok",
    },
  ]).then((res) => {
    if (res.error) throw new Error(res.error.message);
    return res;
  }));

  const operatorRunId = typeof gmailPayload.operatorRunId === "string" ? gmailPayload.operatorRunId : approvalRow.run_id;
  if (operatorRunId) {
    const approvalLearning = learningMetadata({
      approvalId: id,
      runId: operatorRunId,
      payload: gmailPayload,
      messageId: sent.messageId ?? null,
      sendEndpoint: sent.sendEndpoint,
    });

    await optionalStep(warnings, "os_operator_runs.update", () => supabase.from("os_operator_runs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      output: {
        gmail: {
          draftId: draft.draftId,
          messageId: sent.messageId ?? null,
          to: gmailPayload.to,
          subject: gmailPayload.subject,
          sendEndpoint: sent.sendEndpoint,
        },
        crmPreparationStatus: gmailPayload.crmPreparationStatus ?? null,
        crmPreparation: gmailPayload.crmPreparation ?? null,
        preparedActions: gmailPayload.preparedActions ?? ["send_gmail_follow_up"],
        approvalLearning,
      },
    }).eq("id", operatorRunId).eq("workspace_id", context.workspaceId).eq("approval_id", id).then((res) => {
      if (res.error) throw new Error(res.error.message);
      return res;
    }));

    await optionalStep(warnings, "os_operator_run_logs.insert", () => logOperatorEvent({
        supabase,
        workspaceId: context.workspaceId,
        runId: operatorRunId,
        eventType: "gmail.send.completed",
        message: `Approved Gmail message sent to ${gmailPayload.to}.`,
        metadata: { ...approvalLearning, draftId: draft.draftId },
      }).then((res) => {
        if (res.error) throw new Error(res.error.message);
        return res;
      }));
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
        content: `Positive approval signal. Subject: ${gmailPayload.subject}`,
        metadata: approvalLearning,
        sourceRunId: operatorRunId,
        approvalStatus: "approved",
      }).then((res) => {
        if (res.error) throw new Error(res.error.message);
        return res;
      }));
  }

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
  });
}

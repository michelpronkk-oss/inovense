import { NextRequest, NextResponse } from "next/server";
import { sendSlackApprovalNotification } from "@/lib/notifications/slack";
import { logOperatorEvent } from "@/lib/operators/logging";
import { createOperatorMemory } from "@/lib/operators/memory";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { AuthorizationError, requireWorkspaceRoleForIdentity } from "@/lib/server/workspace-access";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppUrl } from "@/lib/urls";

type RejectBody = {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
  reason?: string;
};

type RejectionContinuationPayload = {
  operatorRunId?: string;
  operatorKey?: string;
  to?: string;
  subject?: string;
  preparedActions?: string[];
  crmPreparationStatus?: string | null;
  crmPreparation?: Record<string, unknown> | null;
  sourceMetadata?: Record<string, unknown> | null;
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asContinuationPayload(value: unknown): RejectionContinuationPayload {
  if (!value || typeof value !== "object") return {};
  const rec = value as Record<string, unknown>;
  return {
    operatorRunId: stringValue(rec.operatorRunId) ?? undefined,
    operatorKey: stringValue(rec.operatorKey) ?? undefined,
    to: stringValue(rec.to) ?? undefined,
    subject: stringValue(rec.subject) ?? undefined,
    preparedActions: Array.isArray(rec.preparedActions) ? rec.preparedActions.filter((item): item is string => typeof item === "string") : undefined,
    crmPreparationStatus: stringValue(rec.crmPreparationStatus),
    crmPreparation: rec.crmPreparation && typeof rec.crmPreparation === "object" ? rec.crmPreparation as Record<string, unknown> : null,
    sourceMetadata: rec.sourceMetadata && typeof rec.sourceMetadata === "object" ? rec.sourceMetadata as Record<string, unknown> : null,
  };
}

async function optionalLearningStep(label: string, fn: () => PromiseLike<unknown> | Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    console.warn("[approval-reject] optional learning step failed", {
      label,
      error: error instanceof Error ? error.message : "Unknown optional learning failure",
    });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as RejectBody;
  const workspaceId = body.workspaceId?.trim() || "";
  const userEmail = body.userEmail?.trim().toLowerCase() || "";
  const userId = body.userId?.trim() || "";

  if (!id || !workspaceId) {
    return NextResponse.json({ error: "approval id and workspaceId are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }
  try {
    await requireWorkspaceRoleForIdentity(context, context.workspaceId, ["owner", "admin", "reviewer"], supabase);
  } catch (error) {
    const message = error instanceof AuthorizationError ? error.message : "Could not verify approval permissions.";
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const approval = await supabase
    .from("os_approvals")
    .select("id,workspace_id,status,run_id,continuation_payload,agent_id,agent_mark,agent_color")
    .eq("id", id)
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();

  if (approval.error) {
    return NextResponse.json({ error: approval.error.message }, { status: 500 });
  }
  if (!approval.data) {
    return NextResponse.json({ error: "Approval not found." }, { status: 404 });
  }
  if (approval.data.status !== "pending") {
    return NextResponse.json({ error: "Approval is already resolved." }, { status: 409 });
  }

  const resolvedBy = context.userEmail || context.userId || userEmail || userId;
  const rejectionReason = body.reason?.trim() || "Needs manual review";
  const update = await supabase.from("os_approvals").update({
    status: "rejected",
    resolved_at: new Date().toISOString(),
    resolved_by: resolvedBy,
  }).eq("id", id).eq("workspace_id", context.workspaceId);

  if (update.error) {
    return NextResponse.json({ error: update.error.message }, { status: 500 });
  }

  const continuation = asContinuationPayload(approval.data.continuation_payload);
  const operatorRunId = continuation?.operatorRunId || approval.data.run_id;
  if (operatorRunId) {
    const sourceMetadata = continuation.sourceMetadata ?? {};
    const learningMetadata = {
      approvalId: id,
      runId: operatorRunId,
      decision: "rejected",
      signal: "negative",
      actionType: "gmail_follow_up",
      recipient: continuation.to ?? null,
      subject: continuation.subject ?? null,
      rejectionReason,
      classification: stringValue(sourceMetadata.classification) ?? stringValue(continuation.crmPreparation?.classification),
      confidence: stringValue(sourceMetadata.confidence) ?? stringValue(continuation.crmPreparation?.confidence),
      crmPreparationStatus: continuation.crmPreparationStatus ?? null,
      preparedActions: continuation.preparedActions ?? ["send_gmail_follow_up"],
      sourceMetadata,
      resolvedBy,
    };

    await supabase.from("os_operator_runs").update({
      status: "blocked",
      error: rejectionReason,
      completed_at: new Date().toISOString(),
    }).eq("id", operatorRunId).eq("workspace_id", context.workspaceId).eq("approval_id", id);

    await logOperatorEvent({
      supabase,
      workspaceId: context.workspaceId,
      runId: operatorRunId,
      level: "warn",
      eventType: "approval.rejected",
      message: rejectionReason,
      metadata: learningMetadata,
    });

    await optionalLearningStep("os_operator_run_logs.learning.insert", () => logOperatorEvent({
      supabase,
      workspaceId: context.workspaceId,
      runId: operatorRunId,
      level: "warn",
      eventType: "revenue.rejection.learning",
      message: `Negative approval signal recorded: ${rejectionReason}`,
      metadata: learningMetadata,
    }).then((res) => {
      if (res.error) throw new Error(res.error.message);
      return res;
    }));

    await optionalLearningStep("os_operator_memory.insert", () => createOperatorMemory({
      supabase,
      workspaceId: context.workspaceId,
      operatorKey: continuation.operatorKey || "revenue",
      memoryType: "revenue_rejection_learning",
      title: `Rejected Revenue follow-up${continuation.to ? ` to ${continuation.to}` : ""}`,
      content: `Negative approval signal: ${rejectionReason}${continuation.subject ? ` | Subject: ${continuation.subject}` : ""}`,
      metadata: learningMetadata,
      sourceRunId: operatorRunId,
      approvalStatus: "rejected",
    }).then((res) => {
      if (res.error) throw new Error(res.error.message);
      return res;
    }));
  }

  await supabase.from("os_execution_logs").insert({
    id: `log-approval-rejected-${Date.now()}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: approval.data.run_id || "manual",
    agent_id: approval.data.agent_id || "system",
    agent_mark: approval.data.agent_mark || "OS",
    agent_color: approval.data.agent_color || "#4DE8E1",
    event: "approval.rejected",
    message: rejectionReason,
    duration: "-",
    status: "warn",
  });

  await optionalLearningStep("slack_notification.approval_rejected", () => sendSlackApprovalNotification({
    supabase,
    workspaceId: context.workspaceId,
    approvalId: id,
    runId: operatorRunId,
    eventType: "approval_rejected",
    operatorKey: continuation.operatorKey || "revenue",
    title: "Approval rejected.",
    summary: rejectionReason,
    approvalUrl: `${getAppUrl()}/app/approvals`,
    metadata: { reason: rejectionReason, to: continuation.to ?? null },
  }));

  return NextResponse.json({ ok: true });
}

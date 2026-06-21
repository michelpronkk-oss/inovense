import { NextRequest, NextResponse } from "next/server";
import { logOperatorEvent } from "@/lib/operators/logging";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type PatchBody = {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
  draftSubject?: string;
  draftBody?: string;
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const workspaceId = body.workspaceId?.trim() || "";
  const userEmail = body.userEmail?.trim().toLowerCase() || "";
  const userId = body.userId?.trim() || "";
  const draftSubject = body.draftSubject?.trim() || "";
  const draftBody = body.draftBody?.trim() || "";

  if (!id || !workspaceId) {
    return NextResponse.json({ error: "approval id and workspaceId are required." }, { status: 400 });
  }
  if (!draftSubject) {
    return NextResponse.json({ error: "invalid_draft_subject", message: "Draft subject cannot be empty." }, { status: 400 });
  }
  if (!draftBody) {
    return NextResponse.json({ error: "invalid_draft_body", message: "Draft body cannot be empty." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
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
    return NextResponse.json({ error: "Only pending approvals can be edited." }, { status: 409 });
  }

  const continuation = asRecord(approval.data.continuation_payload);
  if (continuation.kind !== "gmail.send_after_approval") {
    return NextResponse.json({ error: "unsupported_approval_type", message: "Only Gmail draft approvals can be edited." }, { status: 409 });
  }

  const editedAt = new Date().toISOString();
  const editedBy = context.userEmail || context.userId || userEmail || userId;
  const updatedPayload = {
    ...continuation,
    draftSubject,
    draftBody,
    editedDraftSubject: draftSubject,
    editedDraftBody: draftBody,
    wasEdited: true,
    editedAt,
    editedBy,
  };

  const update = await supabase.from("os_approvals").update({
    continuation_payload: updatedPayload,
  }).eq("id", id).eq("workspace_id", context.workspaceId).select("id,status,run_id,continuation_payload").single();

  if (update.error) {
    return NextResponse.json({ error: update.error.message }, { status: 500 });
  }

  const runId = stringValue(continuation.operatorRunId) ?? approval.data.run_id;
  if (runId) {
    await logOperatorEvent({
      supabase,
      workspaceId: context.workspaceId,
      runId,
      eventType: "revenue.approval.draft_edited",
      message: "Approval draft subject/body edited before execution.",
      metadata: {
        approvalId: id,
        editedAt,
        editedBy,
        subjectChanged: stringValue(continuation.draftSubject) !== draftSubject && stringValue(continuation.subject) !== draftSubject,
        bodyChanged: stringValue(continuation.draftBody) !== draftBody && stringValue(continuation.body) !== draftBody,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    approval: {
      id: update.data.id,
      status: update.data.status,
      run_id: update.data.run_id,
      continuation_payload: update.data.continuation_payload,
    },
  });
}

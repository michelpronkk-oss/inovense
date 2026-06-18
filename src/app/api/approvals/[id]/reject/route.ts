import { NextRequest, NextResponse } from "next/server";
import { logOperatorEvent } from "@/lib/operators/logging";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type RejectBody = {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
  reason?: string;
};

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
  const update = await supabase.from("os_approvals").update({
    status: "rejected",
    resolved_at: new Date().toISOString(),
    resolved_by: resolvedBy,
  }).eq("id", id).eq("workspace_id", context.workspaceId);

  if (update.error) {
    return NextResponse.json({ error: update.error.message }, { status: 500 });
  }

  const continuation = approval.data.continuation_payload as { operatorRunId?: string; operatorKey?: string } | null;
  const operatorRunId = continuation?.operatorRunId || approval.data.run_id;
  if (operatorRunId) {
    await supabase.from("os_operator_runs").update({
      status: "blocked",
      error: body.reason || "Approval rejected.",
      completed_at: new Date().toISOString(),
    }).eq("id", operatorRunId).eq("workspace_id", context.workspaceId).eq("approval_id", id);

    await logOperatorEvent({
      supabase,
      workspaceId: context.workspaceId,
      runId: operatorRunId,
      level: "warn",
      eventType: "approval.rejected",
      message: body.reason || "Approval rejected by reviewer.",
      metadata: { approvalId: id, resolvedBy },
    });
  }

  await supabase.from("os_execution_logs").insert({
    id: `log-approval-rejected-${Date.now()}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: approval.data.run_id || "manual",
    agent_id: approval.data.agent_id || "system",
    agent_mark: approval.data.agent_mark || "OS",
    agent_color: approval.data.agent_color || "#4DE8E1",
    event: "approval.rejected",
    message: body.reason || "Approval rejected by reviewer.",
    duration: "-",
    status: "warn",
  });

  return NextResponse.json({ ok: true });
}

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
};

function asPayload(value: unknown): GmailContinuationPayload {
  return value && typeof value === "object" ? value as GmailContinuationPayload : {};
}

function preview(value: string | undefined, max = 1200): string | null {
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function mapApproval(row: Record<string, unknown>) {
  const continuation = asPayload(row.continuation_payload);
  const runId = typeof row.run_id === "string" ? row.run_id : null;
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
    policy_reason: typeof row.policy_reason === "string" ? row.policy_reason : null,
    payload_preview: {
      to: continuation.to ?? null,
      subject: continuation.subject ?? null,
      body: preview(continuation.body),
      operatorKey: continuation.operatorKey ?? null,
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

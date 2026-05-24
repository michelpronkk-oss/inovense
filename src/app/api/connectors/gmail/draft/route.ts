import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type DraftBody = {
  workspaceId?: string;
  userEmail?: string;
  runId?: string;
  agentId?: string;
  to?: string;
  subject?: string;
  body?: string;
};

function required(v: string | undefined, name: string): string {
  if (!v) throw new Error(`${name} is required`);
  return v;
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  try {
    const payload = (await req.json()) as DraftBody;
    const workspaceId = required(payload.workspaceId, "workspaceId");
    const userEmail = required(payload.userEmail?.toLowerCase(), "userEmail");
    const to = required(payload.to, "to");
    const subject = required(payload.subject, "subject");
    const body = required(payload.body, "body");

    const supabase = createSupabaseAdmin();
    const member = await supabase
      .from("os_workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("email", userEmail)
      .maybeSingle();

    if (!member.data) return NextResponse.json({ error: "Workspace membership not found." }, { status: 403 });

    const ws = await supabase
      .from("os_workspaces")
      .select("can_run_real_actions, billing_status")
      .eq("id", workspaceId)
      .single();
    if (ws.error || !ws.data) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (!ws.data.can_run_real_actions || ws.data.billing_status === "preview") {
      return NextResponse.json({ error: "Real execution requires an active plan." }, { status: 402 });
    }

    const approvalId = `appr-gmail-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const approvalInsert = await supabase.from("os_approvals").insert({
      id: approvalId,
      type: "email",
      title: "Approval required before sending",
      body: `Proposed outbound Gmail message to ${to}.`,
      agent_id: payload.agentId || "system",
      agent_mark: "RV",
      agent_color: "#4DE8E1",
      run_id: payload.runId || "manual",
      status: "pending",
      created_at: nowIso,
      continuation_payload: {
        kind: "gmail.send_after_approval",
        to,
        subject,
        body,
        workspaceId,
      },
      policy_reason: "Outbound communication policy requires approval.",
    });

    if (approvalInsert.error) {
      return NextResponse.json({ error: approvalInsert.error.message }, { status: 500 });
    }

    await supabase.from("os_execution_logs").insert({
      id: `log-gmail-approval-${Date.now()}`,
      ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      run_id: payload.runId || "manual",
      agent_id: payload.agentId || "system",
      agent_mark: "RV",
      agent_color: "#4DE8E1",
      event: "policy.approval_required",
      message: `Approval required before sending to ${to}`,
      duration: "-",
      status: "waiting",
    });

    return NextResponse.json({
      status: "approval_required",
      approvalId,
      message: "Approval required before sending",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create approval";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

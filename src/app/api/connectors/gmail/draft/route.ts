import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { allowRateLimit, clientAddress, requestBodyWithinLimit } from "@/lib/server/request-guards";

type DraftBody = {
  workspaceId?: string;
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
  if (!requestBodyWithinLimit(req, 64 * 1024)) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }
  try {
    const payload = (await req.json()) as DraftBody;
    const workspaceId = required(payload.workspaceId, "workspaceId");
    const to = required(payload.to, "to");
    const subject = required(payload.subject, "subject");
    const body = required(payload.body, "body");

    if (workspaceId.length > 120 || to.length > 320 || subject.length > 300 || body.length > 20_000) {
      return NextResponse.json({ error: "One or more fields exceed the allowed length." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: "A valid recipient is required." }, { status: 400 });
    }

    const user = await getVerifiedSupabaseUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseAdmin();
    const membership = await supabase
      .from("os_workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .eq("active", true)
      .neq("status", "pending")
      .maybeSingle();
    if (membership.error || !membership.data) return NextResponse.json({ error: "Workspace membership not found." }, { status: 403 });
    if (!allowRateLimit(`gmail-draft:${workspaceId}:${user.id}:${clientAddress(req)}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Please wait before creating another approval." }, { status: 429 });
    }

    const ws = await supabase
      .from("os_workspaces")
      .select("can_run_real_actions, billing_status")
      .eq("id", workspaceId)
      .single();
    if (ws.error || !ws.data) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (!ws.data.can_run_real_actions || ws.data.billing_status === "preview") {
      return NextResponse.json({ error: "Real execution requires an active plan." }, { status: 402 });
    }

    const approvalId = `appr-gmail-${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();
    const approvalInsert = await supabase.from("os_approvals").insert({
      id: approvalId,
      workspace_id: workspaceId,
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
  } catch {
    return NextResponse.json({ error: "Failed to create approval." }, { status: 400 });
  }
}

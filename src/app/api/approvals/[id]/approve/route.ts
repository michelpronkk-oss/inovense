import { NextRequest, NextResponse } from "next/server";
import { createGmailDraft, resolveAccessTokenFromCredential, sendGmailDraft, type StoredConnectorCredential } from "@/lib/connectors/gmail";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type ApproveBody = {
  workspaceId?: string;
  userEmail?: string;
};

type GmailContinuationPayload = {
  kind: "gmail.send_after_approval";
  workspaceId: string;
  to: string;
  subject: string;
  body: string;
};

function toTs(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isGmailPayload(value: unknown): value is GmailContinuationPayload {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return rec.kind === "gmail.send_after_approval"
    && typeof rec.workspaceId === "string"
    && typeof rec.to === "string"
    && typeof rec.subject === "string"
    && typeof rec.body === "string";
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as ApproveBody;
  const userEmail = body.userEmail?.toLowerCase() || "";
  const workspaceId = body.workspaceId || "";
  if (!id || !workspaceId || !userEmail) {
    return NextResponse.json({ error: "approval id, workspaceId and userEmail are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  const member = await supabase
    .from("os_workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("email", userEmail)
    .maybeSingle();
  if (!member.data) return NextResponse.json({ error: "Workspace membership not found." }, { status: 403 });

  const approvalRes = await supabase
    .from("os_approvals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  let approvalRow = approvalRes.data;
  if (!approvalRow) {
    const snapshot = await supabase
      .from("os_state_snapshots")
      .select("state")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const state = snapshot.data?.state as { approvals?: Array<Record<string, unknown>> } | undefined;
    const found = state?.approvals?.find((item) => item.id === id);
    if (!found) return NextResponse.json({ error: "Approval not found." }, { status: 404 });
    approvalRow = {
      id,
      status: String(found.status ?? "pending"),
      run_id: String(found.runId ?? "manual"),
      agent_id: String(found.agentId ?? "system"),
      agent_mark: String(found.agentMark ?? "OS"),
      agent_color: String(found.agentColor ?? "#4DE8E1"),
      continuation_payload: found.continuationPayload ?? null,
    };
  }
  if (approvalRow.status !== "pending") return NextResponse.json({ error: "Approval is already resolved." }, { status: 409 });

  const continuation = approvalRow.continuation_payload;
  if (!isGmailPayload(continuation)) {
    return NextResponse.json({ error: "Approval has no Gmail continuation payload." }, { status: 400 });
  }
  if (continuation.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Workspace mismatch for approval payload." }, { status: 403 });
  }

  const ws = await supabase
    .from("os_workspaces")
    .select("billing_status, can_run_real_actions")
    .eq("id", workspaceId)
    .single();
  if (ws.error || !ws.data) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!ws.data.can_run_real_actions || ws.data.billing_status === "preview") {
    return NextResponse.json({ error: "Real execution requires an active plan." }, { status: 402 });
  }

  const credentialRes = await supabase
    .from("os_connector_credentials")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "gmail")
    .maybeSingle();
  if (credentialRes.error || !credentialRes.data) {
    return NextResponse.json({ error: "Gmail is not connected for this workspace." }, { status: 409 });
  }

  const credential = credentialRes.data as StoredConnectorCredential;
  const accessToken = await resolveAccessTokenFromCredential(credential);
  const draft = await createGmailDraft(accessToken, {
    to: continuation.to,
    subject: continuation.subject,
    body: continuation.body,
  });
  const sent = await sendGmailDraft(accessToken, draft.draftId);

  await supabase.from("os_approvals").update({
    status: "approved",
    resolved_at: new Date().toISOString(),
    resolved_by: userEmail,
  }).eq("id", id);

  await supabase.from("os_execution_logs").insert([
    {
      id: `log-gmail-draft-${Date.now()}`,
      ts: toTs(),
      run_id: approvalRow.run_id || "manual",
      agent_id: approvalRow.agent_id || "system",
      agent_mark: approvalRow.agent_mark || "OS",
      agent_color: approvalRow.agent_color || "#4DE8E1",
      event: "gmail.draft_created",
      message: `Draft ${draft.draftId} created for ${continuation.to}`,
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
      message: `Sent approved draft to ${continuation.to}${sent.messageId ? ` (${sent.messageId})` : ""}`,
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
  ]);

  return NextResponse.json({ ok: true, draftId: draft.draftId, messageId: sent.messageId });
}

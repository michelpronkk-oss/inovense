import { NextRequest, NextResponse } from "next/server";
import { prepareAction } from "@/lib/actions/execute";
import type { ActionType } from "@/lib/actions/types";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";

type PrepareBody = {
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
  operatorKey?: string;
  actionType?: ActionType;
  connectorKey?: string;
  title?: string;
  summary?: string;
  input?: Record<string, unknown>;
  source?: string;
  metadata?: Record<string, unknown>;
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as PrepareBody;
  const workspaceId = body.workspaceId?.trim() || "";
  const userId = body.userId?.trim() || "";
  const userEmail = body.userEmail?.trim().toLowerCase() || "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });

  const actionType = body.actionType || "create_task";
  if (!["create_task", "move_task", "add_task_comment"].includes(actionType)) {
    return NextResponse.json({ error: "unsupported_action_type", message: "This prepare endpoint only enables approval-gated Trello task actions in v1." }, { status: 400 });
  }

  const settings = await loadWorkspacePolicySettings({ supabase, workspaceId: context.workspaceId });
  const rawInput = body.input ?? {};
  const input = {
    ...rawInput,
    boardId: stringValue(rawInput.boardId) ?? settings.trello.defaultBoardId,
    boardName: stringValue(rawInput.boardName) ?? settings.trello.defaultBoardName,
    listId: stringValue(rawInput.listId) ?? settings.trello.defaultListId,
    listName: stringValue(rawInput.listName) ?? settings.trello.defaultListName,
  };
  if (actionType === "create_task" && (!input.boardId || !input.listId)) {
    return NextResponse.json({
      error: "trello_setup_incomplete",
      message: "Select a default Trello board and list before preparing Trello task approvals.",
    }, { status: 409 });
  }

  const preparedAction = prepareAction({
    workspaceId: context.workspaceId,
    operatorKey: body.operatorKey || "operations",
    actionType,
    connectorKey: body.connectorKey || "trello",
    capability: actionType === "move_task" ? "pm.tasks.update_after_approval" : actionType === "add_task_comment" ? "pm.comments.write_after_approval" : "pm.tasks.write_after_approval",
    title: body.title || (actionType === "create_task" ? "Create Trello card" : "Trello task action"),
    summary: body.summary || "Prepared Trello action. Execution requires approval.",
    input,
    dedupeKey: stringValue(rawInput.dedupeKey) ?? null,
    source: body.source || "manual_demo",
    metadata: body.metadata ?? {},
  }, { customerEmailMode: settings.customerEmailMode });

  const approvalId = operatorRuntimeId("appr-action");
  const insert = await supabase.from("os_approvals").insert({
    id: approvalId,
    workspace_id: context.workspaceId,
    type: "action",
    title: preparedAction.title,
    body: preparedAction.summary,
    agent_id: preparedAction.operatorKey,
    agent_mark: preparedAction.operatorKey === "revenue" ? "RV" : "OP",
    agent_color: preparedAction.operatorKey === "revenue" ? "#4DE8E1" : "#51D88A",
    run_id: null,
    status: "pending",
    dedupe_key: preparedAction.dedupeKey,
    created_at: new Date().toISOString(),
    continuation_payload: {
      kind: "shared_action.execute_after_approval",
      workspaceId: context.workspaceId,
      operatorKey: preparedAction.operatorKey,
      preparedAction,
    },
    policy_reason: "Trello task actions require approval before execution.",
  });
  if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 });

  await logOperatorEvent({
    supabase,
    workspaceId: context.workspaceId,
    runId: "manual",
    eventType: "action.prepared",
    message: `Prepared ${preparedAction.actionType} approval ${approvalId}.`,
    metadata: { approvalId, actionType: preparedAction.actionType, connectorKey: preparedAction.connectorKey },
  });

  return NextResponse.json({ ok: true, approvalId, preparedAction });
}

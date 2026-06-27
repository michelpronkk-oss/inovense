import { NextRequest, NextResponse } from "next/server";
import { listTrelloBoards, listTrelloLists, TrelloExecutionError } from "@/lib/operators/executors/trello";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { loadWorkspacePolicySettings, saveTrelloProjectSettings, type TrelloProjectSettings } from "@/lib/settings/workspace-policy";

type PatchBody = Partial<TrelloProjectSettings> & {
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
};

function stringOrNull(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return undefined;
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  const settings = await loadWorkspacePolicySettings({ supabase, workspaceId: context.workspaceId });
  return NextResponse.json({ settings: settings.trello });
}

export async function PATCH(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const workspaceId = body.workspaceId?.trim() || "";
  const userId = body.userId?.trim() || "";
  const userEmail = body.userEmail?.trim().toLowerCase() || "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });

  const patch: Partial<TrelloProjectSettings> = {};
  const boardId = stringOrNull(body.defaultBoardId);
  const boardName = stringOrNull(body.defaultBoardName);
  const listId = stringOrNull(body.defaultListId);
  const listName = stringOrNull(body.defaultListName);
  if (boardId !== undefined) patch.defaultBoardId = boardId;
  if (boardName !== undefined) patch.defaultBoardName = boardName;
  if (listId !== undefined) patch.defaultListId = listId;
  if (listName !== undefined) patch.defaultListName = listName;

  try {
    if (patch.defaultBoardId) {
      const boards = await listTrelloBoards(context.workspaceId);
      const selectedBoard = boards.find((board) => board.id === patch.defaultBoardId);
      if (!selectedBoard) return NextResponse.json({ error: "trello_board_not_found", message: "Trello board was not found or is not accessible." }, { status: 404 });
      patch.defaultBoardName = selectedBoard.name;
    }
    if (patch.defaultBoardId && patch.defaultListId) {
      const lists = await listTrelloLists(context.workspaceId, patch.defaultBoardId);
      const selectedList = lists.find((list) => list.id === patch.defaultListId);
      if (!selectedList) return NextResponse.json({ error: "trello_list_not_found", message: "Trello list was not found or is not accessible." }, { status: 404 });
      patch.defaultListName = selectedList.name;
    }
  } catch (error) {
    if (error instanceof TrelloExecutionError) {
      return NextResponse.json({ error: error.details.code || "trello_settings_validation_failed", message: error.message, details: error.details }, { status: error.details.status ?? 502 });
    }
    return NextResponse.json({ error: "trello_settings_validation_failed", message: "Could not validate Trello settings." }, { status: 502 });
  }

  const settings = await saveTrelloProjectSettings({ supabase, workspaceId: context.workspaceId, patch });
  return NextResponse.json({ settings });
}

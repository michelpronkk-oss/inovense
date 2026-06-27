import { NextRequest, NextResponse } from "next/server";
import { listTrelloBoards, TrelloExecutionError } from "@/lib/operators/executors/trello";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  try {
    return NextResponse.json({ boards: await listTrelloBoards(context.workspaceId) });
  } catch (error) {
    if (error instanceof TrelloExecutionError) {
      return NextResponse.json({ error: error.details.code || "trello_boards_failed", message: error.message, details: error.details }, { status: error.details.status ?? 502 });
    }
    return NextResponse.json({ error: "trello_boards_failed", message: error instanceof Error ? error.message : "Could not load Trello boards." }, { status: 502 });
  }
}

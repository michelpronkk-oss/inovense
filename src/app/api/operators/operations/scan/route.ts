import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { scanOperationsSignals } from "@/lib/operators/operations/scan";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type ScanBody = {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
};

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as ScanBody;
  const workspaceId = body.workspaceId?.trim() || "";
  const userEmail = body.userEmail?.trim().toLowerCase() || "";
  const userId = body.userId?.trim() || "";

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const result = await scanOperationsSignals({
    workspaceId: context.workspaceId,
    sourceMode: "manual",
    supabase,
  });

  // When no signals are found, offer safe ways to see the operator work. We
  // never create test cards automatically.
  if (result.ok && result.body.status === "completed" && (result.body.signalsFound ?? 0) === 0) {
    return NextResponse.json({
      ...result.body,
      suggestions: [
        "Create a Trello card with a due date in the past.",
        "Create a card with \"blocked\" in the title.",
        "Leave a card without a description.",
        "Create many open cards in one list.",
      ],
    }, { status: result.status });
  }

  return NextResponse.json(result.body, { status: result.status });
}

import { NextRequest, NextResponse } from "next/server";
import { listSlackChannels, SlackExecutionError } from "@/lib/operators/executors/slack";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  try {
    const channels = await listSlackChannels(context.workspaceId);
    return NextResponse.json({ channels });
  } catch (error) {
    if (error instanceof SlackExecutionError) {
      return NextResponse.json({
        error: error.details.code || "slack_channels_failed",
        message: error.message,
        details: error.details,
      }, { status: error.details.status ?? 502 });
    }
    return NextResponse.json({
      error: "slack_channels_failed",
      message: error instanceof Error ? error.message : "Could not load Slack channels.",
    }, { status: 502 });
  }
}

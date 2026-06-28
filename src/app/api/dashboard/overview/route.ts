import { NextRequest, NextResponse } from "next/server";
import { getDashboardOverview } from "@/lib/dashboard/overview";
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
    const overview = await getDashboardOverview({ workspaceId: context.workspaceId, supabase });
    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json({
      error: "dashboard_overview_failed",
      message: error instanceof Error ? error.message : "Could not load dashboard overview.",
    }, { status: 500 });
  }
}

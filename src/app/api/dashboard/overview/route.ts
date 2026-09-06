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
    console.warn("[dashboard-overview] workspace access rejected", { code: context.code, status: context.status });
    const message = context.status === 403
      ? "You don’t have access to this workspace."
      : context.status === 401
        ? "Your session could not be verified. Please sign in again."
        : context.status === 404
          ? "This workspace is no longer available."
          : "The dashboard request was incomplete.";
    return NextResponse.json({ message }, { status: context.status });
  }

  try {
    const overview = await getDashboardOverview({ workspaceId: context.workspaceId, supabase });
    return NextResponse.json(overview);
  } catch (error) {
    console.error("[dashboard-overview] load failed", { workspaceId: context.workspaceId, error });
    return NextResponse.json({ message: "We couldn’t load your dashboard. Refresh to try again." }, { status: 500 });
  }
}

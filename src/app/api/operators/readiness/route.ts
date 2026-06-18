import { NextRequest, NextResponse } from "next/server";
import { getOperatorReadiness, getWorkspaceOperatorReadiness } from "@/lib/operators/readiness";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
  const operatorKey = (req.nextUrl.searchParams.get("operatorKey") || "").trim();

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  if (operatorKey) {
    const readiness = await getOperatorReadiness({ workspaceId: context.workspaceId, operatorKey });
    if (!readiness) {
      return NextResponse.json({ error: "Unknown operatorKey." }, { status: 404 });
    }
    return NextResponse.json({ readiness });
  }

  const readiness = await getWorkspaceOperatorReadiness({ workspaceId: context.workspaceId });
  return NextResponse.json({ readiness });
}

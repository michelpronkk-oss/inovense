import { NextRequest, NextResponse } from "next/server";
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

  if (!workspaceId || (!userEmail && !userId)) {
    return NextResponse.json({ error: "workspaceId and user identity are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  let query = supabase
    .from("os_operator_runs")
    .select("id,workspace_id,operator_key,trigger_type,status,input,output,readiness,risk_level,approval_id,error,started_at,completed_at,created_at,updated_at")
    .eq("workspace_id", context.workspaceId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (operatorKey) {
    query = query.eq("operator_key", operatorKey);
  }

  const runs = await query;
  if (runs.error) {
    return NextResponse.json({ error: runs.error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: runs.data ?? [] });
}

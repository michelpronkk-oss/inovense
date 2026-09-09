import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { scanSupportSignals } from "@/lib/operators/support/scan";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({})) as { workspaceId?: string; userId?: string; userEmail?: string; maxResults?: number };
  const workspaceId = body.workspaceId?.trim() || "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId: body.userId?.trim() || "", userEmail: body.userEmail?.trim().toLowerCase() || "", supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  const result = await scanSupportSignals({ workspaceId: context.workspaceId, maxResults: body.maxResults, sourceMode: "manual", supabase });
  return NextResponse.json(result.body, { status: result.status });
}

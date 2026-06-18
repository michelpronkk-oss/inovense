import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { runRevenueOperator, type RevenueOperatorRunInput } from "@/lib/operators/runOperator";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type RunBody = {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
  operatorKey?: string;
  input?: RevenueOperatorRunInput;
};

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as RunBody;
  const workspaceId = body.workspaceId?.trim() || "";
  const userEmail = body.userEmail?.trim().toLowerCase() || "";
  const userId = body.userId?.trim() || "";
  const operatorKey = body.operatorKey?.trim() || "";

  if (!workspaceId || !operatorKey || !body.input) {
    return NextResponse.json({ error: "workspaceId, operatorKey and input are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const result = await runRevenueOperator({
    workspaceId: context.workspaceId,
    operatorKey,
    input: body.input,
    supabase,
  });

  if (!result.ok) {
    return NextResponse.json({
      error: result.error,
      readiness: "readiness" in result ? result.readiness : undefined,
    }, { status: result.status });
  }

  return NextResponse.json({
    run: result.run,
    output: result.output,
    approval: result.approval,
  });
}

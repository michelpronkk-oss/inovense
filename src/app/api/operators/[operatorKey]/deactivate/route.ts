import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { getOperatorDefinition } from "@/lib/operators/registry";
import { setOperatorActivationState } from "@/lib/operators/activation";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type DeactivateBody = {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
};

// Workspace-scoped, membership-verified deactivation of an operator's
// unattended scheduled cron - see activate/route.ts for the activation
// counterpart and the full explanation of what this flag does and does not
// gate.
export async function POST(req: NextRequest, ctx: { params: Promise<{ operatorKey: string }> }) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { operatorKey } = await ctx.params;
  const operator = getOperatorDefinition(operatorKey);
  if (!operator) {
    return NextResponse.json({ error: "Unknown operator." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as DeactivateBody;
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

  const result = await setOperatorActivationState({
    workspaceId: context.workspaceId,
    operatorKey: operator.key,
    activated: false,
    actorEmail: context.memberEmail ?? context.userEmail ?? null,
    supabase,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: result.state });
}

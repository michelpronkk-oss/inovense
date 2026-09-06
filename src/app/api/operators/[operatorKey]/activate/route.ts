import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { getOperatorDefinition } from "@/lib/operators/registry";
import { getOperatorActivationState, setOperatorActivationState } from "@/lib/operators/activation";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type ActivateBody = {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
};

// Workspace-scoped, membership-verified activation of an operator's
// unattended scheduled cron. Setting this to true does NOT itself run
// anything or bypass approvals - it only changes whether the daily
// Trigger.dev fanout is allowed to include this workspace for this operator
// (see getOperatorActivationState() usage in src/trigger/*-operator-scan.ts).
// Manual/on-demand scans remain available regardless of this flag.
export async function POST(req: NextRequest, ctx: { params: Promise<{ operatorKey: string }> }) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { operatorKey } = await ctx.params;
  const operator = getOperatorDefinition(operatorKey);
  if (!operator) {
    return NextResponse.json({ error: "Unknown operator." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as ActivateBody;
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
    activated: true,
    actorEmail: context.memberEmail ?? context.userEmail ?? null,
    supabase,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: result.state });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ operatorKey: string }> }) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { operatorKey } = await ctx.params;
  const operator = getOperatorDefinition(operatorKey);
  if (!operator) {
    return NextResponse.json({ error: "Unknown operator." }, { status: 404 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspaceId")?.trim() || "";
  const userEmail = req.nextUrl.searchParams.get("userEmail")?.trim().toLowerCase() || "";
  const userId = req.nextUrl.searchParams.get("userId")?.trim() || "";

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const state = await getOperatorActivationState({ workspaceId: context.workspaceId, operatorKey: operator.key, supabase });
  return NextResponse.json({ ok: true, state });
}

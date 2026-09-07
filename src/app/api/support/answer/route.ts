import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceOperatorProductStates } from "@/lib/operators/product-state";
import { answerSupportQuestion } from "@/lib/support/answer";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

const attempts = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
function allowedAttempt(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((at) => at > now - WINDOW_MS);
  if (recent.length >= 12) return false;
  attempts.set(key, [...recent, now]);
  return true;
}
function text(value: unknown, maximum: number) { return typeof value === "string" ? value.trim().slice(0, maximum) : ""; }

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Support is temporarily unavailable." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const workspaceId = text(body.workspaceId, 120);
  const question = text(body.question, 1001);
  if (!workspaceId || !question) return NextResponse.json({ error: "Ask a short support question." }, { status: 400 });
  if (question.length > 1000) return NextResponse.json({ error: "Questions must be 1,000 characters or fewer." }, { status: 400 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: "Sign in to ask Auterim." }, { status: context.status });
  if (!allowedAttempt(`${context.workspaceId}:${context.userId ?? context.userEmail ?? "member"}`)) return NextResponse.json({ error: "Please wait a few minutes before asking again." }, { status: 429 });
  try {
    const states = await getWorkspaceOperatorProductStates({ workspaceId: context.workspaceId, supabase });
    return NextResponse.json(answerSupportQuestion(question, states));
  } catch (error) {
    console.error("[support.answer_failed]", { workspaceId: context.workspaceId, reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Auterim could not check your workspace right now. You can still contact support." }, { status: 503 });
  }
}

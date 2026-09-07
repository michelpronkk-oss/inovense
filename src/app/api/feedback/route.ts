import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { AUTERIM_EMAILS } from "@/lib/brand";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

const TYPES = new Set(["general", "connector_request", "operator_request", "feature_request", "bug"]);
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, number[]>();

function allowedAttempt(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((at) => at > now - WINDOW_MS);
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  attempts.set(key, recent);
  return true;
}

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Feedback is temporarily unavailable." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const workspaceId = text(body.workspaceId, 120);
  const feedbackType = text(body.feedbackType, 40);
  const message = text(body.message, 5001);
  const pagePath = text(body.pagePath, 512);
  const requestedSystem = text(body.requestedSystem, 200);
  const requestedWork = text(body.requestedWork, 500);
  if (!workspaceId || !TYPES.has(feedbackType)) return NextResponse.json({ error: "Choose a feedback type." }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Tell us what would make this better." }, { status: 400 });
  if (message.length > 5000) return NextResponse.json({ error: "Feedback must be 5,000 characters or fewer." }, { status: 400 });
  if (!pagePath.startsWith("/")) return NextResponse.json({ error: "Feedback could not be submitted from this page." }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: "Sign in to send feedback." }, { status: context.status });
  if (!allowedAttempt(`${context.workspaceId}:${context.userId ?? context.userEmail ?? "member"}`)) {
    return NextResponse.json({ error: "Thanks — please wait a few minutes before sending more feedback." }, { status: 429 });
  }

  const workspace = await supabase.from("os_workspaces").select("name,plan_tier,plan").eq("id", context.workspaceId).maybeSingle();
  const submittedAt = new Date().toISOString();
  const metadata = {
    planTier: workspace.data?.plan_tier ?? workspace.data?.plan ?? null,
    appVersion: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  };
  const insert = await supabase.from("os_feedback").insert({
    workspace_id: context.workspaceId,
    user_id: context.userId ?? null,
    user_email: context.userEmail,
    feedback_type: feedbackType,
    message,
    requested_system: feedbackType === "connector_request" ? requestedSystem || null : null,
    requested_work: feedbackType === "operator_request" ? requestedWork || null : null,
    page_path: pagePath,
    metadata,
  }).select("id").single();
  if (insert.error || !insert.data) {
    console.error("[feedback.persist_failed]", { code: insert.error?.code, workspaceId: context.workspaceId });
    return NextResponse.json({ error: "Feedback could not be saved. Please try again." }, { status: 500 });
  }

  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("resend_not_configured");
    const labels: Record<string, string> = { general: "General feedback", connector_request: "Connector request", operator_request: "Operator request", feature_request: "Feature request", bug: "Bug report" };
    const subject = `[Auterim Feedback] ${labels[feedbackType]}`;
    const details = [
      `Type: ${labels[feedbackType]}`,
      `Message: ${message}`,
      requestedSystem ? `Requested system: ${requestedSystem}` : "",
      requestedWork ? `Requested work: ${requestedWork}` : "",
      `User: ${context.userEmail ?? "Unavailable"}`,
      `Workspace: ${workspace.data?.name ?? context.workspaceId}`,
      `Page: ${pagePath}`,
      `Submitted: ${submittedAt}`,
    ].filter(Boolean).join("\n");
    const sent = await new Resend(key).emails.send({ from: process.env.RESEND_FROM_EMAIL ?? "Auterim <onboarding@resend.dev>", to: AUTERIM_EMAILS.support, subject, text: details });
    if (sent.error) throw new Error(sent.error.message || "resend_failed");
  } catch (error) {
    console.error("[feedback.notification_failed]", { feedbackId: insert.data.id, reason: error instanceof Error ? error.message : "unknown" });
  }
  return NextResponse.json({ ok: true });
}

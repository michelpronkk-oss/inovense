import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { AUTERIM_EMAILS } from "@/lib/brand";
import { getWorkspaceOperatorProductStates } from "@/lib/operators/product-state";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

const TOPICS = new Set(["account", "connector", "operator", "billing", "bug", "other"]);
const attempts = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
function allowedAttempt(key: string) { const now = Date.now(); const recent = (attempts.get(key) ?? []).filter((at) => at > now - WINDOW_MS); if (recent.length >= 5) return false; attempts.set(key, [...recent, now]); return true; }
function text(value: unknown, maximum: number) { return typeof value === "string" ? value.trim().slice(0, maximum) : ""; }

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Support is temporarily unavailable." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const workspaceId = text(body.workspaceId, 120);
  const topic = text(body.topic, 40);
  const message = text(body.message, 5001);
  const pagePath = text(body.pagePath, 512);
  if (!workspaceId || !TOPICS.has(topic) || !message || !pagePath.startsWith("/")) return NextResponse.json({ error: "Add a topic and message before sending." }, { status: 400 });
  if (message.length > 5000) return NextResponse.json({ error: "Messages must be 5,000 characters or fewer." }, { status: 400 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: "Sign in to contact support." }, { status: context.status });
  if (!allowedAttempt(`${context.workspaceId}:${context.userId ?? context.userEmail ?? "member"}`)) return NextResponse.json({ error: "Thanks — please wait a few minutes before sending another request." }, { status: 429 });
  const [workspace, connectors, operators] = await Promise.all([
    supabase.from("os_workspaces").select("name,plan_tier,plan").eq("id", context.workspaceId).maybeSingle(),
    getConnectorTruth({ workspaceId: context.workspaceId, supabase }),
    getWorkspaceOperatorProductStates({ workspaceId: context.workspaceId, supabase }),
  ]);
  const metadata = {
    planTier: workspace.data?.plan_tier ?? workspace.data?.plan ?? null,
    connectors: connectors.map((row) => ({ key: row.connectorKey, status: row.status })),
    operators: operators.map((row) => ({ key: row.operatorKey, state: row.state })),
    appVersion: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  };
  const inserted = await supabase.from("os_support_requests").insert({ workspace_id: context.workspaceId, user_id: context.userId ?? null, user_email: context.userEmail, topic, message, page_path: pagePath, metadata }).select("id").single();
  if (inserted.error || !inserted.data) {
    console.error("[support.persist_failed]", { code: inserted.error?.code, workspaceId: context.workspaceId });
    return NextResponse.json({ error: "Your request could not be saved. Please try again." }, { status: 500 });
  }
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("resend_not_configured");
    const details = [`Topic: ${topic}`, `Message: ${message}`, `User: ${context.userEmail ?? "Unavailable"}`, `Workspace: ${workspace.data?.name ?? context.workspaceId}`, `Page: ${pagePath}`, `Connector summary: ${metadata.connectors.map((row) => `${row.key} (${row.status})`).join(", ") || "None"}`, `Operator summary: ${metadata.operators.map((row) => `${row.key} (${row.state})`).join(", ") || "None"}`].join("\n");
    const sent = await new Resend(apiKey).emails.send({ from: process.env.RESEND_FROM_EMAIL ?? "Auterim <onboarding@resend.dev>", to: AUTERIM_EMAILS.support, subject: `[Auterim Support] ${topic}`, text: details });
    if (sent.error) throw new Error(sent.error.message || "resend_failed");
  } catch (error) {
    console.error("[support.notification_failed]", { requestId: inserted.data.id, reason: error instanceof Error ? error.message : "unknown" });
  }
  return NextResponse.json({ ok: true, followUpEmail: context.userEmail ?? null });
}

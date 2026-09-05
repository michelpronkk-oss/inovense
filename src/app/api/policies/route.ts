import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { AuthorizationError, requireWorkspaceRoleForIdentity } from "@/lib/server/workspace-access";
import { loadPolicyWorkspaceSettings, savePolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import type { WorkspaceAutonomyMode } from "@/lib/policies/types";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type PatchBody = {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
  autonomyMode?: string;
  emergencyStopEnabled?: boolean;
  customerEmailMode?: string;
  dailyBriefAllowed?: boolean;
};

function autonomyMode(value: unknown): WorkspaceAutonomyMode | undefined {
  return value === "safe" || value === "assisted" || value === "managed" ? value : undefined;
}

function customerEmailMode(value: unknown): "approval_required" | "draft_only" | "auto_send_low_risk" | undefined {
  return value === "approval_required" || value === "draft_only" || value === "auto_send_low_risk" ? value : undefined;
}

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
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const policy = await loadPolicyWorkspaceSettings({ supabase, workspaceId: context.workspaceId });
  return NextResponse.json({ policy });
}

export async function PATCH(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const workspaceId = body.workspaceId?.trim() || "";
  const userId = body.userId?.trim() || "";
  const userEmail = body.userEmail?.trim().toLowerCase() || "";
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  try {
    await requireWorkspaceRoleForIdentity(context, context.workspaceId, ["owner", "admin"], supabase);
  } catch (error) {
    const message = error instanceof AuthorizationError ? error.message : "Could not verify workspace permissions.";
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const patch: Parameters<typeof savePolicyWorkspaceSettings>[0]["patch"] = {};
  const mode = autonomyMode(body.autonomyMode);
  if (mode) patch.autonomyMode = mode;
  if (typeof body.emergencyStopEnabled === "boolean") patch.emergencyStopEnabled = body.emergencyStopEnabled;
  const email = customerEmailMode(body.customerEmailMode);
  // auto_send_low_risk is not enabled in v1; reject it explicitly.
  if (email === "auto_send_low_risk") {
    return NextResponse.json({ error: "auto_send_low_risk is not enabled in v1." }, { status: 400 });
  }
  if (email) patch.customerEmailMode = email;
  if (typeof body.dailyBriefAllowed === "boolean") patch.dailyBriefAllowed = body.dailyBriefAllowed;

  const policy = await savePolicyWorkspaceSettings({ supabase, workspaceId: context.workspaceId, patch });
  return NextResponse.json({ policy });
}

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { setActiveWorkspace, AuthorizationError, listActiveMemberships } from "@/lib/server/workspace-access";

/**
 * Authoritative workspace switching. The requested workspaceId is only ever
 * accepted after verifying the signed-in user actually has membership in
 * it - never a bare client-supplied id.
 */
export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const user = await getVerifiedSupabaseUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue.", code: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as { workspaceId?: string }));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required.", code: "invalid_params" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  try {
    const membership = await setActiveWorkspace(user.id, workspaceId, admin);
    return NextResponse.json({ ok: true, workspaceId: membership.workspace_id, roleKey: membership.role_key });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not switch workspace." }, { status: 500 });
  }
}

export async function GET() {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const user = await getVerifiedSupabaseUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue.", code: "unauthenticated" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const memberships = await listActiveMemberships(user.id, admin);
  return NextResponse.json({ memberships });
}

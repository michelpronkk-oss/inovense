import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceMember, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getWorkspaceNotifications } from "@/lib/notifications/workspace-notifications";

async function context() {
  const user = await getVerifiedSupabaseUser();
  if (!user) return null;
  const workspaceId = await resolveActiveWorkspaceId(user.id);
  if (!workspaceId) return null;
  await requireWorkspaceMember(user.id, workspaceId);
  return { user, workspaceId };
}

export async function GET() {
  try {
    const value = await context();
    if (!value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(await getWorkspaceNotifications(value.workspaceId));
  } catch (error) {
    console.error("[notifications] load failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Notifications are temporarily unavailable." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const value = await context();
    if (!value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => null) as { action?: string; id?: string } | null;
    if (!body || !["read", "read_all", "dismiss"].includes(body.action ?? "")) return NextResponse.json({ error: "Invalid notification action." }, { status: 400 });
    const supabase = createSupabaseAdmin();
    if (body.action === "read_all") {
      const result = await supabase.from("os_notifications").update({ read_at: new Date().toISOString() }).eq("workspace_id", value.workspaceId).eq("status", "open").is("dismissed_at", null).is("read_at", null);
      if (result.error) throw new Error(result.error.message);
    } else {
      if (!body.id) return NextResponse.json({ error: "Notification id is required." }, { status: 400 });
      const notification = await supabase.from("os_notifications").select("id,severity,status").eq("id", body.id).eq("workspace_id", value.workspaceId).maybeSingle();
      if (notification.error || !notification.data) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
      if (body.action === "dismiss" && notification.data.severity === "critical") return NextResponse.json({ error: "Critical notifications remain visible until resolved." }, { status: 409 });
      const patch = body.action === "dismiss" ? { dismissed_at: new Date().toISOString(), read_at: new Date().toISOString() } : { read_at: new Date().toISOString() };
      const result = await supabase.from("os_notifications").update(patch).eq("id", notification.data.id).eq("workspace_id", value.workspaceId);
      if (result.error) throw new Error(result.error.message);
    }
    return NextResponse.json(await getWorkspaceNotifications(value.workspaceId));
  } catch (error) {
    console.error("[notifications] update failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Notification could not be updated." }, { status: 500 });
  }
}

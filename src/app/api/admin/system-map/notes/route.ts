import { NextRequest, NextResponse } from "next/server";
import { requireInternalAdmin } from "@/lib/admin/auth";
import { getSystemMapLiveData } from "@/lib/admin/system-map-live";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

async function scope() {
  const live = await getSystemMapLiveData();
  return live.workspaceId;
}

export async function GET() {
  await requireInternalAdmin();
  const workspaceId = await scope();
  if (!workspaceId || !hasSupabaseAdminConfig()) return NextResponse.json({ notes: [], workspaceId: null });
  const result = await createSupabaseAdmin().from("os_admin_system_map_notes").select("id,node_id,title,body,updated_at").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(100);
  if (result.error) return NextResponse.json({ error: "Notes are temporarily unavailable." }, { status: 503 });
  return NextResponse.json({ notes: result.data ?? [], workspaceId });
}

export async function POST(request: NextRequest) {
  const admin = await requireInternalAdmin();
  const workspaceId = await scope();
  const body = await request.json().catch(() => ({}));
  const title = clean(body.title, 120); const text = clean(body.body, 1000); const nodeId = clean(body.nodeId, 160) || null;
  if (!workspaceId) return NextResponse.json({ error: "No workspace is available for note storage." }, { status: 409 });
  if (!title || !text) return NextResponse.json({ error: "A title and note are required." }, { status: 400 });
  const result = await createSupabaseAdmin().from("os_admin_system_map_notes").insert({ id: crypto.randomUUID(), workspace_id: workspaceId, node_id: nodeId, title, body: text, created_by: admin.userId }).select("id,node_id,title,body,updated_at").single();
  if (result.error) return NextResponse.json({ error: "Could not save the note." }, { status: 500 });
  return NextResponse.json({ note: result.data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  await requireInternalAdmin();
  const workspaceId = await scope(); const body = await request.json().catch(() => ({}));
  const id = clean(body.id, 160); const title = clean(body.title, 120); const text = clean(body.body, 1000);
  if (!workspaceId || !id || !title || !text) return NextResponse.json({ error: "A note id, title, and note are required." }, { status: 400 });
  const result = await createSupabaseAdmin().from("os_admin_system_map_notes").update({ title, body: text }).eq("workspace_id", workspaceId).eq("id", id).select("id,node_id,title,body,updated_at").single();
  if (result.error) return NextResponse.json({ error: "Could not update the note." }, { status: 500 });
  return NextResponse.json({ note: result.data });
}

export async function DELETE(request: NextRequest) {
  await requireInternalAdmin();
  const workspaceId = await scope(); const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!workspaceId || !id) return NextResponse.json({ error: "A note id is required." }, { status: 400 });
  const result = await createSupabaseAdmin().from("os_admin_system_map_notes").delete().eq("workspace_id", workspaceId).eq("id", id);
  if (result.error) return NextResponse.json({ error: "Could not delete the note." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

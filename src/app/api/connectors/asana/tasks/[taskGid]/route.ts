import { NextRequest, NextResponse } from "next/server";
import { getAsanaTask, getStoredAsanaCredential, resolveAsanaAccessToken } from "@/lib/connectors/asana";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";

export async function GET(req: NextRequest, { params }: { params: Promise<{ taskGid: string }> }) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const taskGid = (await params).taskGid?.trim();
  if (!taskGid) return NextResponse.json({ error: "taskGid is required." }, { status: 400 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  try {
    const credential = await getStoredAsanaCredential(context.workspaceId, supabase);
    if (!credential) return NextResponse.json({ error: "Asana is not connected." }, { status: 404 });
    const token = await resolveAsanaAccessToken({ workspaceId: context.workspaceId, credential, supabase });
    return NextResponse.json({ task: await getAsanaTask(token, taskGid) });
  } catch { return NextResponse.json({ error: "Could not load the Asana task." }, { status: 502 }); }
}

import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceMember, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { getWorkflowPresentations } from "@/lib/workflows/presentation";

export async function GET(request: NextRequest) {
  const user = await getVerifiedSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await resolveActiveWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "Workspace unavailable" }, { status: 404 });
  try {
    await requireWorkspaceMember(user.id, workspaceId);
    const workflowId = request.nextUrl.searchParams.get("workflow")?.trim() || null;
    const operatorKey = request.nextUrl.searchParams.get("operatorKey")?.trim() || null;
    const workflows = await getWorkflowPresentations({ workspaceId, workflowId, operatorKey });
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("[workflows] query failed", { workspaceId, message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Workflows are temporarily unavailable." }, { status: 500 });
  }
}

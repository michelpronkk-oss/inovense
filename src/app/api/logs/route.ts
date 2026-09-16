import { NextResponse } from "next/server";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceMember, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { getExecutionLogPage } from "@/lib/execution-logs/query";
import { boundedLimit } from "@/lib/server/pagination";

export async function GET(request: Request) {
  const user = await getVerifiedSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await resolveActiveWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "Workspace unavailable" }, { status: 404 });
  try {
    await requireWorkspaceMember(user.id, workspaceId);
    const url = new URL(request.url);
    return NextResponse.json(await getExecutionLogPage({
      workspaceId,
      limit: boundedLimit(url.searchParams.get("limit"), 200, 500),
      cursor: url.searchParams.get("cursor"),
    }));
  } catch (error) {
    console.error("[logs] query failed", { workspaceId, message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Execution logs are temporarily unavailable." }, { status: 500 });
  }
}

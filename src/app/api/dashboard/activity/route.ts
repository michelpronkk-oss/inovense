import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceMember, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { getWorkforceActivityChart } from "@/lib/activity/query";
import { isWorkforceActivityRange } from "@/lib/dashboard/workforce-activity-range";

/** Dashboard-only chart projection. Workspace identity comes from the verified session. */
export async function GET(request: NextRequest) {
  const user = await getVerifiedSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestedRange = request.nextUrl.searchParams.get("range");
  if (!isWorkforceActivityRange(requestedRange)) {
    return NextResponse.json({ error: "range must be 24h, 7d, or 30d." }, { status: 400 });
  }

  const workspaceId = await resolveActiveWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "Workspace unavailable" }, { status: 404 });

  try {
    await requireWorkspaceMember(user.id, workspaceId);
    return NextResponse.json(await getWorkforceActivityChart({ workspaceId, range: requestedRange }), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[dashboard-activity] query failed", { workspaceId, range: requestedRange, message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Workforce activity is temporarily unavailable." }, { status: 500 });
  }
}

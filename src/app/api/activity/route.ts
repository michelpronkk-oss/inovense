import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceMember, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { getWorkforceActivity } from "@/lib/activity/query";

function range(value: string | null): "24h" | "7d" | "30d" { return value === "24h" || value === "30d" ? value : "7d"; }

export async function GET(request: NextRequest) {
  const user = await getVerifiedSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await resolveActiveWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "Workspace unavailable" }, { status: 404 });
  try {
    await requireWorkspaceMember(user.id, workspaceId);
    return NextResponse.json(await getWorkforceActivity({ workspaceId, range: range(request.nextUrl.searchParams.get("range")), limit: 80 }));
  } catch (error) {
    console.error("[activity] query failed", { workspaceId, message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Workforce activity is temporarily unavailable." }, { status: 500 });
  }
}

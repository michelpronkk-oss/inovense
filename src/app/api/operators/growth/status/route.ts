import { NextRequest, NextResponse } from "next/server";
import { listGrowthStatus } from "@/lib/operators/growth/runtime";
import { websiteAccess, websiteErrorResponse } from "@/lib/connectors/website-route-auth";
import { hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const access = await websiteAccess({ workspaceId: request.nextUrl.searchParams.get("workspaceId") ?? undefined, admin: false });
    return NextResponse.json(await listGrowthStatus({ workspaceId: access.workspaceId, supabase: access.supabase }));
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

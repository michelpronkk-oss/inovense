import { NextRequest, NextResponse } from "next/server";
import { prepareGrowthCampaign } from "@/lib/operators/growth/runtime";
import { websiteAccess, websiteErrorResponse, readWebsiteJson } from "@/lib/connectors/website-route-auth";
import { hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readWebsiteJson(request);
    if (!body) return NextResponse.json({ error: "Invalid or oversized request." }, { status: 400 });
    const access = await websiteAccess({ workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined, admin: true });
    const opportunityId = typeof body.opportunityId === "string" ? body.opportunityId.trim() : "";
    const objective = typeof body.objective === "string" ? body.objective : "";
    if (!opportunityId) return NextResponse.json({ error: "opportunityId is required." }, { status: 400 });
    return NextResponse.json(await prepareGrowthCampaign({ workspaceId: access.workspaceId, opportunityId, objective, actor: access.userEmail ?? access.userId ?? "workspace-admin", supabase: access.supabase }), { status: 201 });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { recordGrowthOutcome } from "@/lib/operators/growth/runtime";
import { websiteAccess, websiteErrorResponse, readWebsiteJson } from "@/lib/connectors/website-route-auth";
import { hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readWebsiteJson(request);
    if (!body) return NextResponse.json({ error: "Invalid or oversized request." }, { status: 400 });
    const access = await websiteAccess({ workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined, admin: true });
    const required = ["campaignId", "channel", "outcomeType", "attributionLevel", "attributionSource"];
    if (required.some((key) => typeof body[key] !== "string" || !(body[key] as string).trim())) return NextResponse.json({ error: "campaignId, channel, outcomeType, attributionLevel and attributionSource are required." }, { status: 400 });
    return NextResponse.json(await recordGrowthOutcome({ workspaceId: access.workspaceId, campaignId: body.campaignId as string, revisionId: typeof body.revisionId === "string" ? body.revisionId : undefined, channel: body.channel as string, outcomeType: body.outcomeType as string, value: typeof body.value === "number" ? body.value : null, attributionLevel: body.attributionLevel as string, attributionSource: body.attributionSource as string, evidence: Array.isArray(body.evidence) ? body.evidence.filter((item): item is string => typeof item === "string") : [], actor: access.userEmail ?? access.userId ?? "workspace-admin", supabase: access.supabase }));
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { websiteAccess, websiteErrorResponse, readWebsiteJson } from "@/lib/connectors/website-route-auth";
import { disconnectWebsiteSource } from "@/lib/connectors/website-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readWebsiteJson(request);
    if (!body) return NextResponse.json({ error: "Invalid or oversized request." }, { status: 400 });
    const access = await websiteAccess({ workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined, admin: true });
    await disconnectWebsiteSource({ workspaceId: access.workspaceId, sourceId: String(body.sourceId ?? ""), retainObservations: body.retainObservations !== false, supabase: access.supabase });
    return NextResponse.json({ ok: true });
  } catch (error) { return websiteErrorResponse(error); }
}

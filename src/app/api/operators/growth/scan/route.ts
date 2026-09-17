import { NextRequest, NextResponse } from "next/server";
import { growthOperatorScan } from "@/trigger/growth-operator-scan";
import { queueGrowthScan } from "@/lib/operators/growth/runtime";
import { websiteAccess, websiteErrorResponse, readWebsiteJson } from "@/lib/connectors/website-route-auth";
import { hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readWebsiteJson(request);
    if (!body) return NextResponse.json({ error: "Invalid or oversized request." }, { status: 400 });
    const access = await websiteAccess({ workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined, admin: true });
    const queued = await queueGrowthScan({ workspaceId: access.workspaceId, actor: access.userEmail ?? access.userId ?? "workspace-admin", supabase: access.supabase });
    if (!queued.reused) {
      try {
        await growthOperatorScan.trigger({ workspaceId: access.workspaceId, runId: queued.runId }, { idempotencyKey: `growth-manual:${queued.runId}`, idempotencyKeyTTL: "7d", concurrencyKey: access.workspaceId });
      } catch (error) {
        console.warn("[growth] Trigger dispatch deferred", { workspaceId: access.workspaceId, runId: queued.runId, error: error instanceof Error ? error.message : "unknown" });
      }
    }
    return NextResponse.json({ ok: true, runId: queued.runId, reused: queued.reused, state: queued.state, message: queued.reused ? "Growth scan already queued." : "Growth scan queued." }, { status: 202 });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

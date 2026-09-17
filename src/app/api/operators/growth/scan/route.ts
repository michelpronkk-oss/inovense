import { NextRequest, NextResponse } from "next/server";
import { queueGrowthScan } from "@/lib/operators/growth/runtime";
import { dispatchGrowthRun } from "@/lib/operators/growth/dispatch";
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
    const dispatched = await dispatchGrowthRun({ runId: queued.runId, force: true, supabase: access.supabase });
    if (!dispatched.accepted) return NextResponse.json({ ok: false, runId: queued.runId, state: dispatched.dispatchStatus, retryable: true, error: "The Growth scan could not be accepted by the worker. It will be retried automatically." }, { status: 503 });
    return NextResponse.json({ ok: true, runId: queued.runId, reused: queued.reused, state: dispatched.dispatchStatus, message: dispatched.reused ? "Growth scan is already active." : "Growth scan accepted by the worker queue." }, { status: 202 });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

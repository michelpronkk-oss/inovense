import { NextRequest, NextResponse } from "next/server";
import { websiteAccess, websiteErrorResponse, readWebsiteJson } from "@/lib/connectors/website-route-auth";
import { createWebsiteCrawlRun, getWebsiteSource } from "@/lib/connectors/website-sync";
import { websiteSyncRun } from "@/trigger/website-sync-run";
import { allowRateLimit, clientAddress } from "@/lib/server/request-guards";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await readWebsiteJson(request);
    if (!body) return NextResponse.json({ error: "Invalid or oversized request." }, { status: 400 });
    const access = await websiteAccess({ workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined, admin: true });
    if (!allowRateLimit(`website-sync:${access.workspaceId}:${clientAddress(request)}`, 2, 60_000)) return NextResponse.json({ error: "Website sync requests are temporarily rate-limited." }, { status: 429 });
    if (typeof body.sourceId !== "string" || !body.sourceId.trim()) return NextResponse.json({ error: "A website source is required before synchronizing." }, { status: 400 });
    const sourceId = body.sourceId.trim();
    const source = await getWebsiteSource({ workspaceId: access.workspaceId, sourceId, supabase: access.supabase });
    if (!source) return NextResponse.json({ error: "Website source not found." }, { status: 404 });
    const run = await createWebsiteCrawlRun({ workspaceId: access.workspaceId, sourceId: source.id, triggerType: "manual", supabase: access.supabase });
    try {
      await websiteSyncRun.trigger({ runId: run.runId }, { idempotencyKey: `website-manual:${run.runId}`, idempotencyKeyTTL: "7d", concurrencyKey: access.workspaceId });
    } catch {
      return NextResponse.json({ ok: true, runId: run.runId, reused: run.reused, state: run.reused ? "already_queued" : "queued", workerDispatch: "deferred", message: "Sync queued. The scheduler will recover worker dispatch." }, { status: 202 });
    }
    return NextResponse.json({ ok: true, runId: run.runId, reused: run.reused, state: run.reused ? "already_queued" : "queued", workerDispatch: "dispatched" }, { status: 202 });
  } catch (error) { return websiteErrorResponse(error); }
}

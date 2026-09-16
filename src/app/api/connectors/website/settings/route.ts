import { NextRequest, NextResponse } from "next/server";
import { websiteAccess, websiteErrorResponse, readWebsiteJson } from "@/lib/connectors/website-route-auth";
import { configureWebsiteSource, createWebsiteCrawlRun, getWebsiteSummary } from "@/lib/connectors/website-sync";
import { websiteSyncRun } from "@/trigger/website-sync-run";
import { allowRateLimit, clientAddress } from "@/lib/server/request-guards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? undefined;
    const access = await websiteAccess({ workspaceId, admin: false });
    return NextResponse.json(await getWebsiteSummary({ workspaceId: access.workspaceId, supabase: access.supabase }));
  } catch (error) { return websiteErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readWebsiteJson(request);
    if (!body) return NextResponse.json({ error: "Invalid or oversized request." }, { status: 400 });
    const access = await websiteAccess({ workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined, admin: true });
    const action = typeof body.action === "string" ? body.action : "configure";
    if (!allowRateLimit(`website-settings:${access.workspaceId}:${clientAddress(request)}`, action === "sync" ? 2 : 20, action === "sync" ? 60_000 : 60_000)) return NextResponse.json({ error: "Website sync requests are temporarily rate-limited." }, { status: 429 });
    if (action === "sync") {
      const source = await getWebsiteSummary({ workspaceId: access.workspaceId, supabase: access.supabase });
      if (!source.source) return NextResponse.json({ error: "Configure and verify a website before synchronizing it." }, { status: 400 });
      const run = await createWebsiteCrawlRun({ workspaceId: access.workspaceId, sourceId: source.source.id, triggerType: "manual", supabase: access.supabase });
      try { await websiteSyncRun.trigger({ runId: run.runId }, { idempotencyKey: `website-manual:${run.runId}`, idempotencyKeyTTL: "7d", concurrencyKey: access.workspaceId }); }
      catch { return NextResponse.json({ error: "The sync was queued but the worker could not be reached. The scheduler will recover it." }, { status: 202 }); }
      return NextResponse.json({ ok: true, runId: run.runId, reused: run.reused }, { status: 202 });
    }
    if (action !== "configure") return NextResponse.json({ error: "Unsupported website settings action." }, { status: 400 });
    if (typeof body.origin !== "string") return NextResponse.json({ error: "A canonical website origin is required." }, { status: 400 });
    const source = await configureWebsiteSource({ workspaceId: access.workspaceId, origin: body.origin, allowedSubdomains: Array.isArray(body.allowedSubdomains) ? body.allowedSubdomains.filter((item): item is string => typeof item === "string") : [], syncEnabled: body.syncEnabled === true, cadence: body.cadence === "manual" || body.cadence === "daily" || body.cadence === "weekly" || body.cadence === "monthly" ? body.cadence : "weekly", includePaths: Array.isArray(body.includePaths) ? body.includePaths.filter((item): item is string => typeof item === "string") : [], excludePaths: Array.isArray(body.excludePaths) ? body.excludePaths.filter((item): item is string => typeof item === "string") : [], maxPages: typeof body.maxPages === "number" ? body.maxPages : undefined, supabase: access.supabase });
    return NextResponse.json({ ok: true, source });
  } catch (error) { return websiteErrorResponse(error); }
}

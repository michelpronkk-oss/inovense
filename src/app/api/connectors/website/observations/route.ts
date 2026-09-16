import { NextResponse } from "next/server";
import { websiteAccess, websiteErrorResponse, readWebsiteJson } from "@/lib/connectors/website-route-auth";
import { reviewWebsiteObservation, getWebsiteSource } from "@/lib/connectors/website-sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const access = await websiteAccess({ workspaceId: params.get("workspaceId") ?? undefined, admin: false });
    const source = await getWebsiteSource({ workspaceId: access.workspaceId, sourceId: params.get("sourceId") ?? undefined, supabase: access.supabase });
    if (!source) return NextResponse.json({ observations: [] });
    const result = await access.supabase.from("os_website_observations").select("id,page_id,canonical_source_url,observation_type,observation_key,observation_value,evidence_excerpt,observed_at,confidence,freshness_status,conflict_status,review_status,memory_entry_id").eq("workspace_id", access.workspaceId).eq("source_id", source.id).order("updated_at", { ascending: false }).limit(100);
    if (result.error) return NextResponse.json({ error: "Website review items are temporarily unavailable." }, { status: 503 });
    return NextResponse.json({ observations: (result.data ?? []).map((row) => ({ id: row.id, pageId: row.page_id, canonicalSourceUrl: row.canonical_source_url, observationType: row.observation_type, observationKey: row.observation_key, observationValue: row.observation_value, evidenceExcerpt: row.evidence_excerpt, observedAt: row.observed_at, confidence: row.confidence, freshnessStatus: row.freshness_status, conflictStatus: row.conflict_status, reviewStatus: row.review_status, memoryEntryId: row.memory_entry_id })) });
  } catch (error) { return websiteErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const body = await readWebsiteJson(request);
    if (!body) return NextResponse.json({ error: "Invalid or oversized request." }, { status: 400 });
    const access = await websiteAccess({ workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined, admin: true });
    const action = body.action;
    if (!["confirm", "keep_observed", "edit_confirm", "dismiss", "ignore", "resolve_conflict"].includes(String(action))) return NextResponse.json({ error: "Unsupported review action." }, { status: 400 });
    await reviewWebsiteObservation({ workspaceId: access.workspaceId, observationId: String(body.observationId ?? ""), action: action as "confirm" | "keep_observed" | "edit_confirm" | "dismiss" | "ignore" | "resolve_conflict", editedValue: typeof body.editedValue === "string" ? body.editedValue : undefined, supabase: access.supabase });
    return NextResponse.json({ ok: true });
  } catch (error) { return websiteErrorResponse(error); }
}

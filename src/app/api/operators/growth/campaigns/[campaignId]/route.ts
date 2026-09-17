import { NextRequest, NextResponse } from "next/server";
import { sha256 } from "@/lib/operators/growth/runtime";
import { websiteAccess, websiteErrorResponse, readWebsiteJson } from "@/lib/connectors/website-route-auth";
import { operatorRuntimeId } from "@/lib/operators/logging";
import { hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readWebsiteJson(request);
    if (!body) return NextResponse.json({ error: "Invalid or oversized request." }, { status: 400 });
    const access = await websiteAccess({ workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined, admin: true });
    const { campaignId } = await context.params;
    const content = body.content && typeof body.content === "object" && !Array.isArray(body.content) ? body.content : null;
    if (!content) return NextResponse.json({ error: "content is required." }, { status: 400 });
    const campaign = await access.supabase.from("os_growth_campaigns").select("id,opportunity_id,status").eq("id", campaignId).eq("workspace_id", access.workspaceId).maybeSingle();
    if (campaign.error || !campaign.data) return NextResponse.json({ error: "Growth campaign not found." }, { status: 404 });
    if (campaign.data.status === "approved" || campaign.data.status === "exported") return NextResponse.json({ error: "Approved campaign content cannot be edited; create a new revision instead." }, { status: 409 });
    const latest = await access.supabase.from("os_growth_campaign_revisions").select("id,revision,approval_id,status").eq("campaign_id", campaignId).eq("workspace_id", access.workspaceId).order("revision", { ascending: false }).limit(1).maybeSingle();
    if (latest.error) throw new Error("Growth revision state is temporarily unavailable.");
    const nextRevision = Number(latest.data?.revision ?? 0) + 1;
    const contentHash = sha256(content);
    if (latest.data?.approval_id) await access.supabase.from("os_approvals").update({ status: "stale", resolved_at: new Date().toISOString(), resolved_by: "system:growth_revision_changed" }).eq("id", latest.data.approval_id).eq("workspace_id", access.workspaceId).eq("status", "pending");
    if (latest.data?.id) await access.supabase.from("os_growth_campaign_revisions").update({ status: "superseded" }).eq("id", latest.data.id).eq("workspace_id", access.workspaceId).in("status", ["draft", "pending_approval", "rejected"]);
    const revision = await access.supabase.from("os_growth_campaign_revisions").insert({ workspace_id: access.workspaceId, campaign_id: campaignId, revision: nextRevision, content, content_hash: contentHash, status: "pending_approval", created_by: access.userEmail ?? access.userId ?? "workspace-admin" }).select("id").single();
    if (revision.error || !revision.data) throw new Error("Growth revision could not be saved.");
    const approvalId = operatorRuntimeId("growth-approval");
    const approval = await access.supabase.from("os_approvals").insert({
      id: approvalId, workspace_id: access.workspaceId, type: "growth_content_review", title: "Review updated Growth campaign", body: "This edited revision supersedes the previous approval. Review the new content hash before export.", agent_id: "growth", agent_mark: "GR", agent_color: "#A78BFA", status: "pending", dedupe_key: `growth:${campaignId}:${contentHash}`,
      continuation_payload: { kind: "growth.content_review", workspaceId: access.workspaceId, operatorKey: "growth", campaignId, revisionId: revision.data.id, contentHash, growthContent: content, publication: "manual_export_only", websiteContentTrust: "observed_untrusted" },
      policy_reason: "Edited Growth content requires a fresh review before export.",
    });
    if (approval.error) throw new Error("Growth approval could not be recreated.");
    await access.supabase.from("os_growth_campaign_revisions").update({ approval_id: approvalId }).eq("id", revision.data.id).eq("workspace_id", access.workspaceId);
    await access.supabase.from("os_growth_campaigns").update({ status: "pending_approval" }).eq("id", campaignId).eq("workspace_id", access.workspaceId);
    return NextResponse.json({ ok: true, campaignId, revisionId: revision.data.id, approvalId, contentHash, status: "pending_approval" });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const access = await websiteAccess({ workspaceId: request.nextUrl.searchParams.get("workspaceId") ?? undefined, admin: false });
    const { campaignId } = await context.params;
    const campaign = await access.supabase.from("os_growth_campaigns").select("id,status").eq("id", campaignId).eq("workspace_id", access.workspaceId).maybeSingle();
    if (campaign.error || !campaign.data) return NextResponse.json({ error: "Growth campaign not found." }, { status: 404 });
    const revision = await access.supabase.from("os_growth_campaign_revisions").select("id,revision,content,content_hash,status,created_at").eq("campaign_id", campaignId).eq("workspace_id", access.workspaceId).eq("status", "approved").order("revision", { ascending: false }).limit(1).maybeSingle();
    if (revision.error) throw new Error("Growth export is temporarily unavailable.");
    if (!revision.data) return NextResponse.json({ error: "Campaign is not approved for export." }, { status: 409 });
    return NextResponse.json({ ok: true, campaignId, revisionId: revision.data.id, contentHash: revision.data.content_hash, content: revision.data.content, publication: "manual_export_only" });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const access = await websiteAccess({ workspaceId: request.nextUrl.searchParams.get("workspaceId") ?? undefined, admin: false });
    const { campaignId } = await context.params;
    const approved = await access.supabase.from("os_growth_campaign_revisions").select("id,content_hash").eq("campaign_id", campaignId).eq("workspace_id", access.workspaceId).eq("status", "approved").order("revision", { ascending: false }).limit(1).maybeSingle();
    if (approved.error) throw new Error("Growth export is temporarily unavailable.");
    if (!approved.data) return NextResponse.json({ error: "Campaign is not approved for export." }, { status: 409 });
    const updated = await access.supabase.from("os_growth_campaigns").update({ status: "exported", exported_at: new Date().toISOString() }).eq("id", campaignId).eq("workspace_id", access.workspaceId).eq("status", "approved");
    if (updated.error) throw new Error("Growth export could not be recorded.");
    return NextResponse.json({ ok: true, campaignId, revisionId: approved.data.id, contentHash: approved.data.content_hash, publication: "manual_export_only" });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

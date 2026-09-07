import { NextRequest, NextResponse } from "next/server";
import { buildIntercomAuthorizationUrl, getIntercomConfigStatus, normalizeIntercomRegion } from "@/lib/connectors/intercom";
import { createIntercomOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { AuthorizationError, requireWorkspaceAdmin } from "@/lib/server/workspace-access";
import { getAppUrl } from "@/lib/urls";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!getIntercomConfigStatus().configured) return NextResponse.json({ error: "Intercom is not configured yet. Contact support." }, { status: 503 });
  let region: "us" | "eu" | "au";
  try { region = normalizeIntercomRegion(req.nextUrl.searchParams.get("region")); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Select a supported Intercom region." }, { status: 400 }); }
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.userEmail) return NextResponse.json({ error: "A verified account email is required to connect Intercom." }, { status: 400 });
  try { await requireWorkspaceAdmin(context.userId, context.workspaceId, supabase); } catch (error) { return NextResponse.json({ error: error instanceof AuthorizationError ? error.message : "Could not verify workspace permissions." }, { status: error instanceof AuthorizationError ? error.status : 500 }); }
  const workspace = await supabase.from("os_workspaces").select("billing_status,can_use_real_connectors").eq("id", context.workspaceId).single();
  if (workspace.error || !workspace.data) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!workspace.data.can_use_real_connectors || workspace.data.billing_status === "preview") return NextResponse.redirect(new URL("/pricing?gate=connectors&source=intercom", getAppUrl()));
  return NextResponse.redirect(buildIntercomAuthorizationUrl(region, createIntercomOAuthState(context.workspaceId, context.userEmail, region)));
}

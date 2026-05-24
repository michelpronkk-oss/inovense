import { NextRequest, NextResponse } from "next/server";
import { createNangoConnectSession } from "@/lib/integrations/nango";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceMembership } from "@/lib/server/workspace-membership";
import { getEntitlements } from "@/lib/os/entitlements";
import type { Workspace } from "@/lib/os/types";

type SessionBody = {
  workspaceId?: string;
  connectorKey?: string;
  userEmail?: string;
  userId?: string;
};

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await req.json()) as SessionBody;
    const workspaceId = (body.workspaceId || "").trim();
    const connectorKey = (body.connectorKey || "").trim();
    const userEmail = (body.userEmail || "").trim().toLowerCase();
    const userId = (body.userId || "").trim();

    if (!workspaceId || !connectorKey) {
      return NextResponse.json({ error: "workspaceId and connectorKey are required.", code: "invalid_params" }, { status: 400 });
    }
    if (connectorKey !== "hubspot") {
      return NextResponse.json({ error: "Only HubSpot is supported in this pass.", code: "unsupported_connector" }, { status: 400 });
    }
    if (!userEmail) {
      return NextResponse.json({ error: "userEmail is required.", code: "not_authenticated" }, { status: 400 });
    }

    // Resolve membership: checks by user_id OR email, with bootstrap fallback.
    const membership = await resolveWorkspaceMembership({ workspaceId, userId, email: userEmail });
    if (!membership.found) {
      return NextResponse.json({
        error: "Workspace membership not found. Make sure your account is linked to this workspace.",
        code: "workspace_membership_not_found",
      }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const workspaceRes = await supabase
      .from("os_workspaces")
      .select("id,name,environment,region,plan,plan_tier,billing_status,trial_ends_at")
      .eq("id", workspaceId)
      .single();

    if (workspaceRes.error || !workspaceRes.data) {
      return NextResponse.json({ error: "Workspace not found.", code: "workspace_not_found" }, { status: 404 });
    }

    const workspace: Workspace = {
      id: workspaceRes.data.id,
      name: workspaceRes.data.name,
      environment: workspaceRes.data.environment,
      region: workspaceRes.data.region,
      plan: workspaceRes.data.plan,
      planTier: workspaceRes.data.plan_tier,
      billingStatus: workspaceRes.data.billing_status,
      trialEndsAt: workspaceRes.data.trial_ends_at ?? undefined,
    };

    const entitlements = getEntitlements(workspace);
    if (!entitlements.canUseRealConnectors) {
      return NextResponse.json({
        error: "Activate Starter to connect real accounts.",
        code: "billing_required",
      }, { status: 402 });
    }

    const tags = {
      workspace_id: workspaceId,
      connector_key: connectorKey,
      end_user_id: userId || userEmail,
      end_user_email: userEmail,
    };

    const session = await createNangoConnectSession({
      connectorKey: "hubspot",
      endUserId: userId || userEmail,
      endUserEmail: userEmail,
      tags,
    });

    return NextResponse.json({ sessionToken: session.sessionToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start secure connector setup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createNangoConnectSession, NangoConnectSessionError } from "@/lib/integrations/nango";
import { isSupportedNangoConnector } from "@/lib/connectors/registry";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { getEntitlements } from "@/lib/os/entitlements";
import type { Workspace } from "@/lib/os/types";

type SessionBody = {
  workspaceId?: string;
  connectorKey?: string;
};

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await req.json()) as SessionBody;
    const requestedWorkspaceId = (body.workspaceId || "").trim() || undefined;
    const connectorKey = (body.connectorKey || "").trim();

    if (!connectorKey) {
      return NextResponse.json({ error: "connectorKey is required.", code: "invalid_params" }, { status: 400 });
    }
    if (!isSupportedNangoConnector(connectorKey)) {
      return NextResponse.json({ error: "This connector is not available to connect yet.", code: "unsupported_connector" }, { status: 400 });
    }

    // Identity always comes from the verified session. workspaceId in the
    // body is only a hint; membership in that exact workspace is enforced.
    const supabase = createSupabaseAdmin();
    const context = await resolveWorkspaceContext({ workspaceId: requestedWorkspaceId, supabase });
    if (!context.ok) {
      return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
    }
    if (!context.userEmail) {
      return NextResponse.json({ error: "A verified account email is required to connect this tool.", code: "email_required" }, { status: 400 });
    }

    const workspaceId = context.workspaceId;
    const userEmail = context.userEmail;
    const userId = context.userId;

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
      end_user_display_name: userEmail,
    };

    const session = await createNangoConnectSession({
      connectorKey,
      endUserId: userId || userEmail,
      endUserEmail: userEmail,
      tags,
    });

    return NextResponse.json({
      token: session.token,
      connectLink: session.connectLink,
      expiresAt: session.expiresAt,
      providerConfigKey: session.providerConfigKey,
    });
  } catch (error) {
    if (error instanceof NangoConnectSessionError) {
      return NextResponse.json({
        error: "nango_connect_session_failed",
        message: error.message,
        providerConfigKey: error.details.providerConfigKey,
        endpoint: error.details.endpoint,
        ...(process.env.NODE_ENV !== "production" ? {
          debug: {
            status: error.details.status,
            statusText: error.details.statusText,
            responseBody: error.details.responseBody,
            validationErrors: error.details.validationErrors,
          },
        } : {}),
      }, { status: error.details.status ?? 502 });
    }
    const message = error instanceof Error ? error.message : "Could not start secure connector setup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

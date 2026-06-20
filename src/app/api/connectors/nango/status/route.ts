import { NextRequest, NextResponse } from "next/server";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const connectorKey = (req.nextUrl.searchParams.get("connectorKey") || "").trim();
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
  if (!workspaceId || !connectorKey) {
    return NextResponse.json({ error: "workspaceId and connectorKey are required." }, { status: 400 });
  }
  if (connectorKey !== "hubspot") {
    return NextResponse.json({ error: "Only HubSpot is supported in this pass." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const truth = await getConnectorTruth({ workspaceId: context.workspaceId, supabase });
  const hubspot = truth.find((connector) => connector.connectorKey === "hubspot");

  return NextResponse.json({
    status: hubspot?.status ?? "not_connected",
    provider_config_key: hubspot?.providerConfigKey ?? null,
    nango_connection_id: hubspot?.nangoConnectionId ?? null,
    provider_email: hubspot?.accountEmail ?? null,
    connected_at: hubspot?.connectedAt ?? null,
  });
}

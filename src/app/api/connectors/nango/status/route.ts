import { NextRequest, NextResponse } from "next/server";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { isSupportedNangoConnector } from "@/lib/connectors/registry";
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
  if (!isSupportedNangoConnector(connectorKey)) {
    return NextResponse.json({ error: "This connector is not available to connect yet." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const truth = await getConnectorTruth({ workspaceId: context.workspaceId, supabase });
  const connector = truth.find((row) => row.connectorKey === connectorKey);

  return NextResponse.json({
    status: connector?.status ?? "not_connected",
    provider_config_key: connector?.providerConfigKey ?? null,
    nango_connection_id: connector?.nangoConnectionId ?? null,
    provider_email: connector?.accountEmail ?? null,
    connected_at: connector?.connectedAt ?? null,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const connectorKey = (req.nextUrl.searchParams.get("connectorKey") || "").trim();
  if (!workspaceId || !connectorKey) {
    return NextResponse.json({ error: "workspaceId and connectorKey are required." }, { status: 400 });
  }
  if (connectorKey !== "hubspot") {
    return NextResponse.json({ error: "Only HubSpot is supported in this pass." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const row = await supabase
    .from("os_connectors")
    .select("status, provider_config_key, provider_email, connected_at")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", connectorKey)
    .maybeSingle();

  if (row.error) {
    return NextResponse.json({ error: row.error.message }, { status: 500 });
  }

  if (!row.data) {
    return NextResponse.json({
      status: "pending",
      provider_config_key: "hubspot-inovense",
      provider_email: null,
      connected_at: null,
    });
  }

  return NextResponse.json({
    status: row.data.status || "pending",
    provider_config_key: row.data.provider_config_key || "hubspot-inovense",
    provider_email: row.data.provider_email,
    connected_at: row.data.connected_at,
  });
}


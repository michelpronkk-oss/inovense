import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export type ConnectedAccount = {
  connectorKey: string;
  displayName: string;
  authType: "native" | "managed";
  status: "connected" | "not_connected" | "error";
  accountEmail: string | null;
  connectedAt: string | null;
  scopes: string[];
  permissionsLabel: string[];
  canReconnect: boolean;
  canDisconnect: boolean;
};

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Gmail: select only safe columns — never tokens
  const gmailRes = await supabase
    .from("os_connector_credentials")
    .select("connector_key, provider_email, scopes, status, created_at")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "gmail")
    .maybeSingle();

  // HubSpot: select only safe columns from os_connectors
  const hubspotRes = await supabase
    .from("os_connectors")
    .select("connector_key, provider_email, status, connected_at")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "hubspot")
    .maybeSingle();

  const gmailStatus: ConnectedAccount["status"] =
    gmailRes.data?.status === "connected" ? "connected"
    : gmailRes.data ? "error"
    : "not_connected";

  const hubspotStatus: ConnectedAccount["status"] =
    hubspotRes.data?.status === "connected" ? "connected"
    : hubspotRes.data?.status === "error" ? "error"
    : "not_connected";

  const accounts: ConnectedAccount[] = [
    {
      connectorKey: "gmail",
      displayName: "Gmail",
      authType: "native",
      status: gmailStatus,
      accountEmail: gmailRes.data?.provider_email ?? null,
      connectedAt: gmailRes.data?.created_at ?? null,
      scopes: gmailRes.data?.scopes ?? [],
      permissionsLabel: ["Create email drafts", "Send approved emails"],
      canReconnect: true,
      canDisconnect: false,
    },
    {
      connectorKey: "hubspot",
      displayName: "HubSpot",
      authType: "managed",
      status: hubspotStatus,
      accountEmail: hubspotRes.data?.provider_email ?? null,
      connectedAt: hubspotRes.data?.connected_at ?? null,
      scopes: [],
      permissionsLabel: ["Contacts, companies, deals and owners"],
      canReconnect: true,
      canDisconnect: false,
    },
  ];

  return NextResponse.json(accounts);
}

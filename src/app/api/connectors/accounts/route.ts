import { NextRequest, NextResponse } from "next/server";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
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
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const truth = await getConnectorTruth({ workspaceId: context.workspaceId, supabase });
  const accounts: ConnectedAccount[] = truth.map((connector) => ({
    connectorKey: connector.connectorKey,
    displayName: connector.displayName,
    authType: connector.authType,
    status: connector.status,
    accountEmail: connector.accountEmail,
    connectedAt: connector.connectedAt,
    scopes: connector.scopes,
    permissionsLabel: connector.connectorKey === "gmail"
      ? ["Create email drafts", "Send approved emails"]
      : ["Contacts, companies, deals and owners"],
    canReconnect: true,
    canDisconnect: false,
  }));

  return NextResponse.json(accounts);
}

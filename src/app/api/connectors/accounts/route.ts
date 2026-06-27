import { NextRequest, NextResponse } from "next/server";
import { getConnectorTruth, type ConnectorTruthStatus } from "@/lib/connectors/truth";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export type ConnectedAccount = {
  connectorKey: string;
  displayName: string;
  authType: "native" | "managed";
  status: ConnectorTruthStatus;
  accountEmail: string | null;
  connectedAt: string | null;
  scopes: string[];
  missingScopes: string[];
  reconnectRequired: boolean;
  executable: boolean;
  statusMessage: string | null;
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
    missingScopes: connector.missingScopes ?? [],
    reconnectRequired: Boolean(connector.reconnectRequired),
    executable: Boolean(connector.executable),
    statusMessage: connector.statusMessage ?? null,
    permissionsLabel: connector.connectorKey === "gmail"
      ? [
        "Compose access",
        connector.scopes.includes("https://www.googleapis.com/auth/gmail.send") ? "Send access" : "Send access missing",
        connector.scopes.includes("https://www.googleapis.com/auth/gmail.readonly") ? "Inbox scan access" : "Inbox scan access missing",
        "Approval required for external email",
      ]
      : getConnectorDefinition(connector.connectorKey)?.readActions.concat(getConnectorDefinition(connector.connectorKey)?.writeActions ?? []) ?? ["Managed connector access"],
    canReconnect: true,
    canDisconnect: false,
  }));

  return NextResponse.json(accounts);
}

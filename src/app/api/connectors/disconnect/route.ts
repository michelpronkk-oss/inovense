import { NextRequest, NextResponse } from "next/server";
import { decryptToken } from "@/lib/connectors/crypto";
import { getConnectorDefinition, isSupportedNangoConnector } from "@/lib/connectors/registry";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, AuthorizationError } from "@/lib/server/workspace-access";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type DisconnectBody = {
  workspaceId?: string;
  connectorKey?: string;
};

function nangoHost() {
  return (process.env.NANGO_HOST || "https://api.nango.dev").replace(/\/+$/, "");
}

async function revokeGmailAccess(encryptedAccessToken: string) {
  try {
    const token = decryptToken(encryptedAccessToken);
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      cache: "no-store",
    });
  } catch {
    // Deleting the encrypted credential below always removes Auterim's
    // access. Google revocation is best effort because tokens can already
    // have expired or been revoked externally.
  }
}

async function revokeNangoConnection(input: { providerConfigKey: string | null; connectionId: string | null }) {
  if (!input.providerConfigKey || !input.connectionId || !process.env.NANGO_SECRET_KEY) return;
  try {
    const url = new URL(`${nangoHost()}/connection/${encodeURIComponent(input.connectionId)}`);
    url.searchParams.set("provider_config_key", input.providerConfigKey);
    await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${process.env.NANGO_SECRET_KEY}` },
      cache: "no-store",
    });
  } catch {
    // The local record is still removed below, which blocks all Auterim
    // access even if the upstream provider is temporarily unavailable.
  }
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as DisconnectBody;
  const workspaceId = body.workspaceId?.trim() || "";
  const connectorKey = body.connectorKey?.trim() || "";
  if (!workspaceId || (connectorKey !== "gmail" && connectorKey !== "microsoft" && connectorKey !== "salesforce" && !isSupportedNangoConnector(connectorKey))) {
    return NextResponse.json({ error: "A workspace and supported connector are required." }, { status: 400 });
  }

  const user = await getVerifiedSupabaseUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage connectors." }, { status: 401 });

  const supabase = createSupabaseAdmin();
  try {
    await requireWorkspaceAdmin(user.id, workspaceId, supabase);
  } catch (error) {
    const message = error instanceof AuthorizationError ? error.message : "Could not verify workspace permissions.";
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }

  if (connectorKey === "gmail") {
    const credential = await supabase
      .from("os_connector_credentials")
      .select("encrypted_access_token")
      .eq("workspace_id", workspaceId)
      .eq("connector_key", "gmail")
      .maybeSingle();
    if (credential.error) return NextResponse.json({ error: credential.error.message }, { status: 500 });
    if (credential.data?.encrypted_access_token) await revokeGmailAccess(credential.data.encrypted_access_token);

    const removed = await supabase
      .from("os_connector_credentials")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("connector_key", "gmail");
    if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 500 });
  } else if (connectorKey === "microsoft") {
    // Microsoft and Salesforce-side revocation are not implemented here.
    // Removing the workspace-scoped encrypted credential blocks Auterim access.
    // Microsoft does not expose a public "revoke my own app's tokens"
    // endpoint for delegated permissions the way Google does - deleting the
    // stored credential below is what actually removes Auterim's access.
    // (/me/revokeSignInSessions revokes ALL of a user's app sessions
    // platform-wide, which is out of scope and not something Auterim should
    // do on a workspace's behalf.)
    const removed = await supabase
      .from("os_connector_credentials")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("connector_key", "microsoft");
    if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 500 });
  } else if (connectorKey === "salesforce") {
    // Salesforce-side token revocation is not implemented yet. Removing this
    // workspace-scoped encrypted credential immediately blocks Auterim access.
    const removed = await supabase
      .from("os_connector_credentials")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("connector_key", "salesforce");
    if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 500 });
  } else {
    const connection = await supabase
      .from("os_connectors")
      .select("provider_config_key,nango_connection_id")
      .eq("workspace_id", workspaceId)
      .eq("connector_key", connectorKey)
      .maybeSingle();
    if (connection.error) return NextResponse.json({ error: connection.error.message }, { status: 500 });
    await revokeNangoConnection({
      providerConfigKey: connection.data?.provider_config_key ?? null,
      connectionId: connection.data?.nango_connection_id ?? null,
    });

    const removed = await supabase
      .from("os_connectors")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("connector_key", connectorKey);
    if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 500 });
  }

  const displayName = getConnectorDefinition(connectorKey)?.displayName ?? connectorKey;
  await supabase.from("os_execution_logs").insert({
    id: `log-${connectorKey}-disconnected-${Date.now()}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: "connector",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "connector.disconnected",
    message: `${displayName} disconnected by ${user.email ?? "workspace admin"}`,
    duration: "-",
    status: "ok",
  });

  return NextResponse.json({ ok: true });
}

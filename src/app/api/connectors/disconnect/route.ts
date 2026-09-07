import { NextRequest, NextResponse } from "next/server";
import { decryptToken } from "@/lib/connectors/crypto";
import { revokeAsanaToken } from "@/lib/connectors/asana";
import { revokeJiraToken } from "@/lib/connectors/jira";
import { revokeZendeskToken } from "@/lib/connectors/zendesk";
import { MICROSOFT_TEAMS_CONNECTOR_KEY, writeMicrosoftTeamsSettings } from "@/lib/connectors/microsoft-teams";
import { getConnectorDefinition, isSupportedNangoConnector } from "@/lib/connectors/registry";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, AuthorizationError } from "@/lib/server/workspace-access";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { writeGoogleDriveSettings } from "@/lib/connectors/google-drive";

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
  if (!workspaceId || (connectorKey !== "gmail" && connectorKey !== "google_drive" && connectorKey !== "microsoft" && connectorKey !== MICROSOFT_TEAMS_CONNECTOR_KEY && connectorKey !== "salesforce" && connectorKey !== "asana" && connectorKey !== "jira" && connectorKey !== "zendesk" && connectorKey !== "intercom" && !isSupportedNangoConnector(connectorKey))) {
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
  } else if (connectorKey === "google_drive") {
    // Drive shares the Gmail credential. Disabling Drive must leave Gmail
    // access and its refresh token intact.
    const credential = await supabase.from("os_connector_credentials").select("metadata").eq("workspace_id", workspaceId).eq("connector_key", "gmail").maybeSingle();
    if (credential.error) return NextResponse.json({ error: credential.error.message }, { status: 500 });
    if (credential.data) {
      const metadata = writeGoogleDriveSettings(credential.data.metadata as Record<string, unknown>, { enabled: false, folders: [], driveId: null, syncCursor: null, lastSyncAt: null });
      const updated = await supabase.from("os_connector_credentials").update({ metadata }).eq("workspace_id", workspaceId).eq("connector_key", "gmail");
      if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
    }
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
  } else if (connectorKey === MICROSOFT_TEAMS_CONNECTOR_KEY) {
    // Microsoft Teams shares ONE Microsoft credential with Microsoft 365 mail
    // and calendar. Disconnecting Teams therefore disables the Teams
    // capability and clears its destination, and deliberately does NOT delete
    // the credential - deleting it would silently break Outlook mail and
    // calendar for a workspace that only wanted to turn Teams off. Removing
    // Microsoft entirely is a separate, explicit "microsoft" disconnect.
    const credential = await supabase
      .from("os_connector_credentials")
      .select("metadata")
      .eq("workspace_id", workspaceId)
      .eq("connector_key", "microsoft")
      .maybeSingle();
    if (credential.error) return NextResponse.json({ error: credential.error.message }, { status: 500 });
    if (credential.data) {
      const metadata = writeMicrosoftTeamsSettings((credential.data.metadata ?? null) as Record<string, unknown> | null, {
        enabled: false,
        defaultTeamId: null,
        defaultTeamName: null,
        defaultChannelId: null,
        defaultChannelName: null,
        defaultChannelMembershipType: null,
        cursors: {},
      });
      const updated = await supabase
        .from("os_connector_credentials")
        .update({ metadata })
        .eq("workspace_id", workspaceId)
        .eq("connector_key", "microsoft");
      if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
    }
  } else if (connectorKey === "salesforce") {
    // Salesforce-side token revocation is not implemented yet. Removing this
    // workspace-scoped encrypted credential immediately blocks Auterim access.
    const removed = await supabase
      .from("os_connector_credentials")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("connector_key", "salesforce");
    if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 500 });
  } else if (connectorKey === "asana") {
    const credential = await supabase.from("os_connector_credentials").select("encrypted_access_token").eq("workspace_id", workspaceId).eq("connector_key", "asana").maybeSingle();
    if (credential.error) return NextResponse.json({ error: credential.error.message }, { status: 500 });
    if (credential.data?.encrypted_access_token) { try { await revokeAsanaToken(decryptToken(credential.data.encrypted_access_token)); } catch { /* local deletion still blocks access */ } }
    const removed = await supabase.from("os_connector_credentials").delete().eq("workspace_id", workspaceId).eq("connector_key", "asana");
    if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 500 });
  } else if (connectorKey === "jira") {
    const credential = await supabase.from("os_connector_credentials").select("encrypted_access_token").eq("workspace_id", workspaceId).eq("connector_key", "jira").maybeSingle();
    if (credential.error) return NextResponse.json({ error: credential.error.message }, { status: 500 });
    if (credential.data?.encrypted_access_token) { try { await revokeJiraToken(decryptToken(credential.data.encrypted_access_token)); } catch { /* local deletion still blocks access */ } }
    const removed = await supabase.from("os_connector_credentials").delete().eq("workspace_id", workspaceId).eq("connector_key", "jira");
    if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 500 });
  } else if (connectorKey === "zendesk") {
    const credential = await supabase.from("os_connector_credentials").select("encrypted_access_token,metadata").eq("workspace_id", workspaceId).eq("connector_key", "zendesk").maybeSingle();
    if (credential.error) return NextResponse.json({ error: credential.error.message }, { status: 500 });
    const metadata = (credential.data?.metadata ?? {}) as Record<string, unknown>;
    const subdomain = typeof metadata.subdomain === "string" ? metadata.subdomain : null;
    if (credential.data?.encrypted_access_token && subdomain) { try { await revokeZendeskToken(subdomain, decryptToken(credential.data.encrypted_access_token)); } catch { /* local deletion still blocks access */ } }
    const removed = await supabase.from("os_connector_credentials").delete().eq("workspace_id", workspaceId).eq("connector_key", "zendesk");
    if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 500 });
  } else if (connectorKey === "intercom") {
    // Intercom does not expose a safe workspace-scoped revoke operation in the
    // REST surface used by this connector. Removing the encrypted credential
    // immediately blocks Auterim access; the workspace admin can also revoke
    // the app from Intercom's own settings when required.
    const removed = await supabase.from("os_connector_credentials").delete().eq("workspace_id", workspaceId).eq("connector_key", "intercom");
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

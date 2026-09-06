import type { Connector, OSState } from "@/lib/os/types";
import { GMAIL_COMPOSE_SCOPE, GMAIL_READONLY_SCOPE, GMAIL_SCAN_REQUIRED_SCOPES, GMAIL_SEND_SCOPE, getMissingGmailScopes } from "@/lib/connectors/gmail";
import { MICROSOFT_REQUIRED_SCOPES, getMissingMicrosoftScopes } from "@/lib/connectors/microsoft";
import { getSalesforceConfigStatus } from "@/lib/connectors/salesforce";
import { getConnectorDefinition, listSupportedNangoConnectors } from "@/lib/connectors/registry";
import { verifyNangoConnection } from "@/lib/integrations/nango";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type ConnectorTruthStatus = "connected" | "healthy" | "disabled" | "reconnect_required" | "missing" | "not_connected" | "not_configured" | "error";

export type SafeConnectorTruth = {
  connectorKey: string;
  displayName: string;
  authType: "native" | "managed";
  status: ConnectorTruthStatus;
  accountEmail: string | null;
  connectedAt: string | null;
  scopes: string[];
  missingScopes?: string[];
  reconnectRequired?: boolean;
  executable?: boolean;
  statusMessage?: string;
  providerConfigKey?: string | null;
  nangoConnectionId?: string | null;
  source?: "native" | "nango";
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function getConnectorTruth(input: {
  workspaceId: string;
  supabase?: SupabaseAdmin;
}): Promise<SafeConnectorTruth[]> {
  const supabase = input.supabase ?? createSupabaseAdmin();

  const supportedNangoKeys = listSupportedNangoConnectors().map((def) => def.connectorKey);
  const [gmailRes, microsoftRes, salesforceRes, nangoRes] = await Promise.all([
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_email, scopes, status, created_at")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", "gmail")
      .maybeSingle(),
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_email, scopes, status, created_at")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", "microsoft")
      .maybeSingle(),
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_email, scopes, status, created_at")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", "salesforce")
      .maybeSingle(),
    supabase
      .from("os_connectors")
      .select("connector_key, provider_email, status, connected_at, provider_config_key, nango_connection_id")
      .eq("workspace_id", input.workspaceId)
      .in("connector_key", supportedNangoKeys),
  ]);

  const gmailRow = gmailRes.data;
  const gmailScopes = asStringArray(gmailRow?.scopes);
  const gmailMissingSendScopes = gmailRow ? getMissingGmailScopes(gmailScopes) : [];
  const gmailMissingScanScopes = gmailRow ? getMissingGmailScopes(gmailScopes, GMAIL_SCAN_REQUIRED_SCOPES) : [];
  const gmailMissingScopes = Array.from(new Set([...gmailMissingSendScopes, ...gmailMissingScanScopes]));
  const gmailSendReconnectRequired = Boolean(gmailRow && gmailMissingSendScopes.length > 0);
  const gmailScanReconnectRequired = Boolean(gmailRow && gmailMissingScanScopes.length > 0);

  const microsoftRow = microsoftRes.data;
  const microsoftScopes = asStringArray(microsoftRow?.scopes);
  // "needs_attention" is written by resolveMicrosoftAccessToken() when
  // Microsoft reports the refresh token itself is dead (revoked/expired).
  const microsoftNeedsAttention = microsoftRow?.status === "needs_attention";
  const microsoftMissingScopes = microsoftRow ? getMissingMicrosoftScopes(microsoftScopes, MICROSOFT_REQUIRED_SCOPES) : [];
  const microsoftReconnectRequired = Boolean(microsoftRow && (microsoftNeedsAttention || microsoftMissingScopes.length > 0));
  const salesforceRow = salesforceRes.data;
  const nangoRows = Array.isArray(nangoRes.data) ? nangoRes.data : [];
  const nangoTruth: SafeConnectorTruth[] = await Promise.all(supportedNangoKeys.map(async (connectorKey) => {
    const def = getConnectorDefinition(connectorKey);
    const row = nangoRows.find((item) => item.connector_key === connectorKey);
    const hasStoredConnection = Boolean(row && row.status === "connected" && row.provider_config_key && row.nango_connection_id);
    const verification = hasStoredConnection && row?.provider_config_key && row.nango_connection_id
      ? await verifyNangoConnection({
        connectorKey,
        providerConfigKey: row.provider_config_key,
        connectionId: row.nango_connection_id,
      })
      : null;
    const connected = hasStoredConnection && verification?.ok === true;
    const reconnectRequired = hasStoredConnection && verification?.ok === false;
    const status = nangoRes.error
      ? "error"
      : connected
        ? "connected"
        : reconnectRequired
          ? "reconnect_required"
          : row?.status === "error" ? "error" : "not_connected";
    return {
      connectorKey,
      displayName: def?.displayName ?? connectorKey,
      authType: "managed",
      status,
      accountEmail: row?.provider_email ?? null,
      connectedAt: row?.connected_at ?? null,
      scopes: [],
      providerConfigKey: row?.provider_config_key ?? null,
      nangoConnectionId: row?.nango_connection_id ?? null,
      reconnectRequired: reconnectRequired || undefined,
      source: connected ? "nango" : undefined,
      statusMessage: connected
        ? "Connected through Nango"
        : reconnectRequired
          ? "Reconnect required: provider credentials could not be verified"
          : status === "error" ? "Connection error" : "Not connected",
    };
  }));

  return [
    {
      connectorKey: "gmail",
      displayName: "Gmail",
      authType: "native",
      status: gmailRes.error ? "error" : gmailSendReconnectRequired ? "reconnect_required" : gmailRow ? "healthy" : "missing",
      accountEmail: gmailRow?.provider_email ?? null,
      connectedAt: gmailRow?.created_at ?? null,
      scopes: gmailScopes,
      missingScopes: gmailMissingScopes,
      reconnectRequired: gmailSendReconnectRequired || gmailScanReconnectRequired,
      executable: Boolean(gmailRow && !gmailSendReconnectRequired),
      statusMessage: gmailSendReconnectRequired
        ? "Reconnect required to enable send permissions"
        : gmailScanReconnectRequired
          ? "Reconnect required to enable opportunity scanning"
          : gmailRow
          ? "Ready for approval-gated Gmail sends"
          : "Not connected",
      source: gmailRow ? "native" : undefined,
    },
    {
      connectorKey: "microsoft",
      displayName: "Microsoft 365",
      authType: "native",
      status: microsoftRes.error ? "error" : microsoftReconnectRequired ? "reconnect_required" : microsoftRow ? "healthy" : "missing",
      accountEmail: microsoftRow?.provider_email ?? null,
      connectedAt: microsoftRow?.created_at ?? null,
      scopes: microsoftScopes,
      missingScopes: microsoftMissingScopes,
      reconnectRequired: microsoftReconnectRequired,
      executable: Boolean(microsoftRow && !microsoftReconnectRequired),
      statusMessage: microsoftReconnectRequired
        ? "Reconnect required to restore Microsoft 365 access"
        : microsoftRow
          ? "Ready for approval-gated Outlook mail and calendar actions"
          : "Not connected",
      source: microsoftRow ? "native" : undefined,
    },
    {
      connectorKey: "salesforce",
      displayName: "Salesforce",
      authType: "native",
      status: salesforceRes.error ? "error" : salesforceRow?.status === "needs_attention" ? "reconnect_required" : salesforceRow ? "connected" : getSalesforceConfigStatus().configured ? "not_connected" : "not_configured",
      accountEmail: salesforceRow?.provider_email ?? null,
      connectedAt: salesforceRow?.created_at ?? null,
      scopes: asStringArray(salesforceRow?.scopes),
      reconnectRequired: salesforceRow?.status === "needs_attention",
      executable: false,
      statusMessage: salesforceRow?.status === "needs_attention"
        ? "Reconnect required to restore Salesforce access"
        : salesforceRow
          ? "Connected. Revenue CRM capabilities are not enabled yet."
          : getSalesforceConfigStatus().configured ? "Ready to connect" : "Salesforce is not configured yet",
      source: salesforceRow ? "native" : undefined,
    },
    ...nangoTruth,
  ];
}

function applyTruth(connector: Connector, truth: SafeConnectorTruth): Connector {
  if (truth.connectorKey === "gmail") {
    const hasCredential = truth.status !== "missing" && truth.status !== "not_connected" && truth.status !== "error";
    const reconnectRequired = truth.status === "reconnect_required";
    const scanReconnectRequired = Boolean(hasCredential && truth.missingScopes?.includes(GMAIL_READONLY_SCOPE));
    return {
      ...connector,
      isConnected: hasCredential,
      status: hasCredential ? "connected" : truth.status === "error" ? "error" : "available",
      health: reconnectRequired || !hasCredential ? "disabled" : "healthy",
      lastSync: "-",
      lastSynced: truth.connectedAt ?? "",
      syncMode: "manual",
      syncFreq: "Approval-gated",
      permissions: ["Compose approved emails", "Send approved emails", "Scan recent inbox metadata"],
      readScopes: [
        `Compose access: ${truth.scopes.includes(GMAIL_COMPOSE_SCOPE) ? "granted" : "missing"}`,
        `Send access: ${truth.scopes.includes(GMAIL_SEND_SCOPE) ? "granted" : "missing"}`,
        `Inbox scan access: ${truth.scopes.includes(GMAIL_READONLY_SCOPE) ? "granted" : "missing"}`,
        "Approval required for external email",
      ],
      writeScopes: truth.scopes.filter((scope) => scope === GMAIL_COMPOSE_SCOPE || scope === GMAIL_SEND_SCOPE),
      approvalRequiredFor: ["External email send"],
      blockedActions: truth.scopes.includes(GMAIL_READONLY_SCOPE)
        ? ["Store full inbox", "Read labels", "Send without approval"]
        : ["Scan inbox until Gmail readonly is granted", "Read labels", "Send without approval"],
      operatorsAllowed: ["Revenue Operator", "Client Flow Operator"],
      records: reconnectRequired
        ? "Reconnect required to enable send permissions"
        : scanReconnectRequired
          ? "Reconnect required to enable opportunity scanning"
        : truth.accountEmail
          ? `Real account connected: ${truth.accountEmail}`
          : hasCredential
            ? "Real account connected"
            : "Not connected",
      eventsSynced: 0,
      recentSyncEvents: [],
      authErrors: reconnectRequired || truth.status === "error" ? 1 : 0,
      source: hasCredential ? truth.source : undefined,
    };
  }

  if (truth.connectorKey === "microsoft") {
    const hasCredential = truth.status !== "missing" && truth.status !== "not_connected" && truth.status !== "error";
    const reconnectRequired = truth.status === "reconnect_required";
    return {
      ...connector,
      isConnected: hasCredential,
      status: hasCredential ? "connected" : truth.status === "error" ? "error" : "available",
      health: reconnectRequired || !hasCredential ? "disabled" : "healthy",
      lastSync: "-",
      lastSynced: truth.connectedAt ?? "",
      syncMode: "manual",
      syncFreq: "Approval-gated",
      permissions: ["Read recent mail", "Read calendar events", "Send approved emails", "Create/update calendar events after approval"],
      readScopes: [
        `Mail read access: ${truth.scopes.some((scope) => scope.toLowerCase() === "mail.read") ? "granted" : "missing"}`,
        `Mail send access: ${truth.scopes.some((scope) => scope.toLowerCase() === "mail.send") ? "granted" : "missing"}`,
        `Calendar access: ${truth.scopes.some((scope) => scope.toLowerCase() === "calendars.readwrite") ? "granted" : "missing"}`,
        "Approval required for external email and calendar writes",
      ],
      writeScopes: truth.scopes.filter((scope) => ["mail.send", "calendars.readwrite"].includes(scope.toLowerCase())),
      approvalRequiredFor: ["External email send", "Calendar event create/update/delete"],
      blockedActions: ["Send without approval", "Modify calendar without approval"],
      operatorsAllowed: ["Revenue Operator", "Client Flow Operator"],
      records: reconnectRequired
        ? "Reconnect required to restore Microsoft 365 access"
        : truth.accountEmail
          ? `Real account connected: ${truth.accountEmail}`
          : hasCredential
            ? "Real account connected"
            : "Not connected",
      eventsSynced: 0,
      recentSyncEvents: [],
      authErrors: reconnectRequired || truth.status === "error" ? 1 : 0,
      source: hasCredential ? truth.source : undefined,
    };
  }

  if (truth.connectorKey === "salesforce") {
    const connected = truth.status === "connected" || truth.status === "reconnect_required";
    return {
      ...connector,
      isConnected: connected,
      status: connected ? "connected" : truth.status === "error" ? "error" : "available",
      health: connected && truth.status !== "reconnect_required" ? "healthy" : "disabled",
      lastSync: "-", lastSynced: truth.connectedAt ?? "", syncMode: "manual", syncFreq: "Not enabled",
      permissions: [], readScopes: [], writeScopes: [],
      approvalRequiredFor: ["Future Salesforce record changes require approval"],
      blockedActions: ["Revenue CRM reads and writes are not enabled yet"], operatorsAllowed: ["Revenue Operator (future)"],
      records: truth.statusMessage ?? "Not connected", eventsSynced: 0, recentSyncEvents: [], authErrors: truth.status === "error" || truth.status === "reconnect_required" ? 1 : 0,
      source: connected ? truth.source : undefined,
    };
  }

  if (truth.status !== "connected" && truth.status !== "healthy") {
    return {
      ...connector,
      isConnected: false,
      status: truth.status === "error" ? "error" : "available",
      health: "disabled",
      lastSync: "-",
      lastSynced: "",
      eventsSynced: 0,
      records: truth.status === "error"
        ? "Connection error"
        : truth.status === "reconnect_required" ? "Reconnect required" : "Not connected",
      source: undefined,
    };
  }

  return {
    ...connector,
    isConnected: true,
    status: "connected",
    health: "disabled",
    lastSync: "-",
    lastSynced: truth.connectedAt ?? "",
    eventsSynced: 0,
    records: truth.accountEmail ? `Real account connected: ${truth.accountEmail}` : "Real account connected",
    source: truth.source,
  };
}

function isTruthConnectorKey(connectorId: string): connectorId is SafeConnectorTruth["connectorKey"] {
  return connectorId === "gmail" || connectorId === "microsoft" || connectorId === "salesforce" || listSupportedNangoConnectors().some((def) => def.connectorKey === connectorId);
}

export function applyConnectorTruthToState(state: OSState, truthRows: SafeConnectorTruth[]): OSState {
  const byKey = new Map(truthRows.map((truth) => [truth.connectorKey, truth]));
  return {
    ...state,
    connectors: state.connectors.map((connector) => {
      if (!isTruthConnectorKey(connector.id)) return connector;
      const truth = byKey.get(connector.id);
      return truth ? applyTruth(connector, truth) : connector;
    }),
  };
}

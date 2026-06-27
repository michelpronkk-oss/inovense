import type { Connector, OSState } from "@/lib/os/types";
import { GMAIL_COMPOSE_SCOPE, GMAIL_READONLY_SCOPE, GMAIL_SCAN_REQUIRED_SCOPES, GMAIL_SEND_SCOPE, getMissingGmailScopes } from "@/lib/connectors/gmail";
import { getConnectorDefinition, listSupportedNangoConnectors } from "@/lib/connectors/registry";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type ConnectorTruthStatus = "connected" | "healthy" | "disabled" | "reconnect_required" | "missing" | "not_connected" | "error";

export type SafeConnectorTruth = {
  connectorKey: "gmail" | "hubspot" | "slack";
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
  const [gmailRes, nangoRes] = await Promise.all([
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_email, scopes, status, created_at")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", "gmail")
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
  const nangoRows = Array.isArray(nangoRes.data) ? nangoRes.data : [];
  const nangoTruth: SafeConnectorTruth[] = supportedNangoKeys.map((connectorKey) => {
    const def = getConnectorDefinition(connectorKey);
    const row = nangoRows.find((item) => item.connector_key === connectorKey);
    const connected = Boolean(row && row.status === "connected" && row.provider_config_key && row.nango_connection_id);
    return {
      connectorKey: connectorKey as SafeConnectorTruth["connectorKey"],
      displayName: def?.displayName ?? connectorKey,
      authType: "managed",
      status: nangoRes.error ? "error" : connected ? "connected" : row?.status === "error" ? "error" : "not_connected",
      accountEmail: row?.provider_email ?? null,
      connectedAt: row?.connected_at ?? null,
      scopes: [],
      providerConfigKey: row?.provider_config_key ?? null,
      nangoConnectionId: row?.nango_connection_id ?? null,
      source: connected ? "nango" : undefined,
      statusMessage: connected ? "Connected through Nango" : "Not connected",
    };
  });

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

  if (truth.status !== "connected" && truth.status !== "healthy") {
    return {
      ...connector,
      isConnected: false,
      status: truth.status === "error" ? "error" : "available",
      health: "disabled",
      lastSync: "-",
      lastSynced: "",
      eventsSynced: 0,
      records: truth.status === "error" ? "Connection error" : "Not connected",
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
  return connectorId === "gmail" || connectorId === "hubspot" || connectorId === "slack";
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

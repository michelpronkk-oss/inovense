import type { Connector, OSState } from "@/lib/os/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type ConnectorTruthStatus = "connected" | "not_connected" | "error";

export type SafeConnectorTruth = {
  connectorKey: "gmail" | "hubspot";
  displayName: string;
  authType: "native" | "managed";
  status: ConnectorTruthStatus;
  accountEmail: string | null;
  connectedAt: string | null;
  scopes: string[];
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

  const [gmailRes, hubspotRes] = await Promise.all([
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
      .eq("connector_key", "hubspot")
      .maybeSingle(),
  ]);

  const gmailRow = gmailRes.data;
  const hubspotRow = hubspotRes.data;
  const hubspotConnected = Boolean(
    hubspotRow
      && hubspotRow.status === "connected"
      && hubspotRow.provider_config_key
      && hubspotRow.nango_connection_id
  );

  return [
    {
      connectorKey: "gmail",
      displayName: "Gmail",
      authType: "native",
      status: gmailRes.error ? "error" : gmailRow ? "connected" : "not_connected",
      accountEmail: gmailRow?.provider_email ?? null,
      connectedAt: gmailRow?.created_at ?? null,
      scopes: asStringArray(gmailRow?.scopes),
      source: gmailRow ? "native" : undefined,
    },
    {
      connectorKey: "hubspot",
      displayName: "HubSpot",
      authType: "managed",
      status: hubspotRes.error ? "error" : hubspotConnected ? "connected" : hubspotRow?.status === "error" ? "error" : "not_connected",
      accountEmail: hubspotRow?.provider_email ?? null,
      connectedAt: hubspotRow?.connected_at ?? null,
      scopes: [],
      providerConfigKey: hubspotRow?.provider_config_key ?? null,
      nangoConnectionId: hubspotRow?.nango_connection_id ?? null,
      source: hubspotConnected ? "nango" : undefined,
    },
  ];
}

function applyTruth(connector: Connector, truth: SafeConnectorTruth): Connector {
  if (truth.status !== "connected") {
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

export function applyConnectorTruthToState(state: OSState, truthRows: SafeConnectorTruth[]): OSState {
  const byKey = new Map(truthRows.map((truth) => [truth.connectorKey, truth]));
  return {
    ...state,
    connectors: state.connectors.map((connector) => {
      if (connector.id !== "gmail" && connector.id !== "hubspot") return connector;
      const truth = byKey.get(connector.id);
      return truth ? applyTruth(connector, truth) : connector;
    }),
  };
}

import type { ConnectorTruthStatus, SafeConnectorTruth } from "@/lib/connectors/truth";

/** Client-safe Salesforce catalog metadata. No OAuth, secrets, tokens, or I/O. */
export const SALESFORCE_CONNECTOR_KEY = "salesforce" as const;
export const SALESFORCE_DISPLAY_NAME = "Salesforce" as const;
export const SALESFORCE_AUTH_TYPE = "native" as const;
export const SALESFORCE_CAPABILITIES = ["crm.contacts.read", "crm.deals.read"] as const;
export const SALESFORCE_READ_ACTIONS = ["Read contacts/leads", "Read accounts", "Read open opportunities"] as const;
export const SALESFORCE_BLOCKED_ACTIONS = ["Revenue CRM reads and writes are not enabled yet"] as const;

export type SalesforceTruthInput = {
  hasError: boolean;
  hasCredential: boolean;
  credentialStatus: string | null | undefined;
  accountEmail: string | null;
  connectedAt: string | null;
  scopes: string[];
  configured: boolean;
};

/** Pure status/copy projection. Runtime config inspection stays server-side. */
export function buildSalesforceTruth(input: SalesforceTruthInput): SafeConnectorTruth {
  const reconnectRequired = input.credentialStatus === "needs_attention";
  const status: ConnectorTruthStatus = input.hasError
    ? "error"
    : reconnectRequired
      ? "reconnect_required"
      : input.hasCredential
        ? "connected"
        : input.configured
          ? "not_connected"
          : "not_configured";

  return {
    connectorKey: SALESFORCE_CONNECTOR_KEY,
    displayName: SALESFORCE_DISPLAY_NAME,
    authType: SALESFORCE_AUTH_TYPE,
    status,
    accountEmail: input.accountEmail,
    connectedAt: input.connectedAt,
    scopes: input.scopes,
    reconnectRequired,
    executable: false,
    statusMessage: reconnectRequired
      ? "Reconnect required to restore Salesforce access"
      : input.hasCredential
        ? "Connected. Revenue CRM capabilities are not enabled yet."
        : input.configured
          ? "Ready to connect"
          : "Salesforce is not configured yet",
    source: input.hasCredential ? "native" : undefined,
  };
}

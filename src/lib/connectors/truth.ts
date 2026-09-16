import type { Connector, OSState } from "@/lib/os/types";
import { getConnectorDefinition, listSupportedNangoConnectors } from "@/lib/connectors/registry";
import { liveOperatorNames } from "@/lib/operators/registry";
import { SALESFORCE_CONNECTOR_KEY } from "@/lib/connectors/salesforce-truth";

const GMAIL_COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GOOGLE_DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const MICROSOFT_TEAMS_CONNECTOR_KEY = "microsoft_teams";
const HUBSPOT_CONNECTOR_KEY = "hubspot";
const SLACK_CONNECTOR_KEY = "slack";
const TRELLO_CONNECTOR_KEY = "trello";
const TRELLO_WRITE_SCOPE = "write:board:trello";

export type ConnectorTruthStatus = "connected" | "healthy" | "disabled" | "reconnect_required" | "permission_required" | "configuration_required" | "missing" | "not_connected" | "not_configured" | "error";

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
  /** Repeated transient provider failures, kept separate from auth truth. */
  operationalDegraded?: boolean;
  providerConfigKey?: string | null;
  nangoConnectionId?: string | null;
  source?: "native" | "nango";
  /**
   * True only for a connector that has migrated to direct provider auth but
   * where this workspace still has the pre-migration Nango row and no direct
   * credential. Safe to surface in admin/support diagnostics: it carries no
   * token material, only "this workspace owes one reconnect".
   */
  legacyNangoConnection?: boolean;
};

/**
 * Operator badges are derived, never hardcoded: the connector registry says
 * which operators use a connector, and liveOperatorNames() drops everything
 * that is not actually live in production. That is what stops the connector UI
 * advertising roadmap operators (Marketing, Knowledge & Memory, SEO
 * Implementation, Proposal & Quote, Review & Proof and the rest) as if a
 * connector were already wired into them.
 */
function operatorBadges(connectorKey: string): string[] {
  return liveOperatorNames(getConnectorDefinition(connectorKey)?.usedByOperators ?? []);
}
function applyTruth(connector: Connector, truth: SafeConnectorTruth): Connector {
  if (truth.connectorKey === "website") {
    const configured = truth.status !== "not_configured";
    const connected = configured && !["error", "configuration_required"].includes(truth.status);
    const healthy = truth.status === "healthy";
    return {
      ...connector,
      isConnected: connected,
      status: connected ? "connected" : truth.status === "error" ? "error" : "available",
      health: healthy ? "healthy" : connected ? "degraded" : "disabled",
      lastSync: "-",
      lastSynced: truth.connectedAt ?? "",
      syncMode: "scheduled",
      syncFreq: "Weekly by default",
      permissions: ["Verify one public company website", "Read bounded public HTML", "Prepare observed Memory context for review"],
      readScopes: ["HTTPS only", "Robots rules respected", "Sitemap-first and same-origin discovery"],
      writeScopes: [],
      approvalRequiredFor: ["Confirm website observation as owner context"],
      blockedActions: ["Crawl private pages", "Execute JavaScript", "Edit or publish website content", "Promote website text without review"],
      operatorsAllowed: operatorBadges(truth.connectorKey),
      records: truth.statusMessage ?? "Not configured",
      eventsSynced: 0,
      recentSyncEvents: [],
      authErrors: truth.status === "error" || truth.status === "reconnect_required" ? 1 : 0,
      source: connected ? truth.source : undefined,
    };
  }

  if (truth.connectorKey === HUBSPOT_CONNECTOR_KEY) {
    const connected = truth.status === "healthy" || truth.status === "reconnect_required" || truth.status === "permission_required";
    const degraded = truth.status !== "healthy";
    return {
      ...connector,
      isConnected: connected,
      status: connected ? "connected" : truth.status === "error" ? "error" : "available",
      health: truth.status === "healthy" ? "healthy" : "disabled",
      lastSync: "-",
      lastSynced: truth.connectedAt ?? "",
      syncMode: "manual",
      syncFreq: "Approval-gated",
      permissions: ["Read CRM contacts, deals, and properties", "Create and update CRM records after approval", "Create notes and tasks after approval"],
      readScopes: truth.missingScopes?.length ? [`Missing HubSpot permissions: ${truth.missingScopes.join(", ")}`] : ["HubSpot CRM read access granted"],
      writeScopes: truth.executable ? ["contacts:write", "deals:write", "notes:write", "tasks:write"] : [],
      approvalRequiredFor: ["HubSpot contact and deal changes", "HubSpot notes and task creation"],
      blockedActions: truth.executable ? [] : [truth.statusMessage ?? "Reconnect HubSpot to enable CRM actions"],
      operatorsAllowed: operatorBadges(truth.connectorKey),
      records: truth.statusMessage ?? "Not connected",
      eventsSynced: 0,
      recentSyncEvents: [],
      authErrors: degraded || truth.status === "error" ? 1 : 0,
      source: connected ? truth.source : undefined,
    };
  }

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
      operatorsAllowed: operatorBadges(truth.connectorKey),
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
      operatorsAllowed: operatorBadges(truth.connectorKey),
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

  if (truth.connectorKey === "google_drive") {
    // Drive shares Gmail's credential, but its capability has its own setup
    // state. A granted Drive scope with no selected folder remains a real
    // connected Google capability so it stays visible in Connected tools with
    // a truthful "Choose a folder" state.
    const connected = truth.status === "healthy" || truth.status === "configuration_required" || truth.status === "not_connected" || truth.status === "reconnect_required" || truth.status === "permission_required";
    return {
      ...connector,
      isConnected: truth.status === "healthy" || truth.status === "configuration_required" || truth.status === "not_connected",
      accountEmail: truth.accountEmail,
      status: connected ? "connected" : truth.status === "error" ? "error" : "available",
      health: truth.status === "healthy" ? "healthy" : "disabled",
      lastSync: "-",
      lastSynced: truth.connectedAt ?? "",
      syncMode: "manual",
      syncFreq: "Bounded polling",
      permissions: ["Read selected Drive folders", "Read file metadata", "Extract bounded document context"],
      readScopes: [truth.scopes.includes(GOOGLE_DRIVE_READONLY_SCOPE) ? "Drive read access: granted" : "Drive read access: missing"],
      writeScopes: [],
      approvalRequiredFor: [],
      blockedActions: ["Upload, edit, delete, move, share, or change permissions"],
      operatorsAllowed: operatorBadges(truth.connectorKey),
      records: truth.statusMessage ?? "Not connected",
      eventsSynced: 0,
      recentSyncEvents: [],
      authErrors: truth.status === "error" || truth.status === "reconnect_required" || truth.status === "permission_required" ? 1 : 0,
      source: connected ? truth.source : undefined,
    };
  }

  if (truth.connectorKey === MICROSOFT_TEAMS_CONNECTOR_KEY) {
    // "Connected" for Teams means the workspace explicitly enabled Teams on
    // its Microsoft connection - never merely that Microsoft 365 mail works.
    const enabled = truth.status === "healthy" || truth.status === "reconnect_required" || truth.status === "permission_required";
    const degraded = truth.status === "reconnect_required" || truth.status === "permission_required";
    const readGranted = truth.status === "healthy";
    const sendGranted = truth.executable === true || (readGranted && !truth.missingScopes?.some((scope) => scope.toLowerCase() === "channelmessage.send"));
    return {
      ...connector,
      isConnected: enabled,
      status: enabled ? "connected" : truth.status === "error" ? "error" : "available",
      health: degraded || !enabled ? "disabled" : "healthy",
      lastSync: "-",
      lastSynced: truth.connectedAt ?? "",
      syncMode: "manual",
      syncFreq: "Approval-gated",
      permissions: ["Read joined teams", "Read channels", "Read recent channel messages", "Send approved Teams messages"],
      readScopes: [
        `Team list access: ${truth.missingScopes?.some((scope) => scope.toLowerCase() === "team.readbasic.all") ? "missing" : "granted"}`,
        `Channel list access: ${truth.missingScopes?.some((scope) => scope.toLowerCase() === "channel.readbasic.all") ? "missing" : "granted"}`,
        `Channel message read access: ${truth.missingScopes?.some((scope) => scope.toLowerCase() === "channelmessage.read.all") ? "missing" : "granted"}`,
        "Approval required for every Teams message",
      ],
      writeScopes: sendGranted ? ["Send approved Teams channel message"] : [],
      approvalRequiredFor: ["Teams channel message send"],
      blockedActions: ["Send without approval", "Read chats or attachments", "Delete or edit existing Teams messages"],
      operatorsAllowed: operatorBadges(truth.connectorKey),
      records: truth.statusMessage ?? "Not connected",
      eventsSynced: 0,
      recentSyncEvents: [],
      authErrors: degraded || truth.status === "error" ? 1 : 0,
      source: enabled ? truth.source : undefined,
    };
  }

  if (truth.connectorKey === SALESFORCE_CONNECTOR_KEY) {
    const connected = truth.status === "connected" || truth.status === "reconnect_required";
    return {
      ...connector,
      isConnected: connected,
      status: connected ? "connected" : truth.status === "error" ? "error" : "available",
      health: connected && truth.status !== "reconnect_required" ? "healthy" : "disabled",
      lastSync: "-", lastSynced: truth.connectedAt ?? "", syncMode: "manual", syncFreq: "Not enabled",
      permissions: [], readScopes: [], writeScopes: [],
      approvalRequiredFor: ["Future Salesforce record changes require approval"],
      blockedActions: ["Revenue CRM reads and writes are not enabled yet"], operatorsAllowed: operatorBadges(truth.connectorKey),
      records: truth.statusMessage ?? "Not connected", eventsSynced: 0, recentSyncEvents: [], authErrors: truth.status === "error" || truth.status === "reconnect_required" ? 1 : 0,
      source: connected ? truth.source : undefined,
    };
  }

  if (truth.connectorKey === "asana") {
    const connected = truth.status === "healthy" || truth.status === "reconnect_required" || truth.status === "permission_required";
    return { ...connector, isConnected: connected, status: connected ? "connected" : truth.status === "error" ? "error" : "available", health: truth.status === "healthy" ? "healthy" : "disabled", lastSync: "-", lastSynced: truth.connectedAt ?? "", syncMode: "manual", syncFreq: "On demand", permissions: ["Read Asana workspaces", "Read selected projects and tasks", "Create/update tasks after approval", "Add comments after approval"], readScopes: ["Workspace and project reads", "Task detail reads"], writeScopes: truth.executable ? ["tasks:write", "stories:write"] : [], approvalRequiredFor: ["Asana task creation", "Asana task updates", "Asana comments"], blockedActions: truth.executable ? [] : ["Asana writes until write scopes and a configured project are ready"], operatorsAllowed: operatorBadges(truth.connectorKey), records: truth.statusMessage ?? "Not connected", eventsSynced: 0, recentSyncEvents: [], authErrors: truth.status === "error" || truth.status === "reconnect_required" || truth.status === "permission_required" ? 1 : 0, source: connected ? truth.source : undefined };
  }

  if (truth.connectorKey === "jira") {
    const connected = truth.status === "healthy" || truth.status === "reconnect_required" || truth.status === "permission_required";
    return { ...connector, isConnected: connected, status: connected ? "connected" : truth.status === "error" ? "error" : "available", health: truth.status === "healthy" ? "healthy" : "disabled", lastSync: "-", lastSynced: truth.connectedAt ?? "", syncMode: "manual", syncFreq: "On demand", permissions: ["Read Jira projects and issues", "Create issues after approval", "Update issues after approval", "Add comments after approval"], readScopes: ["Jira work and project reads", "Jira user reads"], writeScopes: truth.executable ? ["write:jira-work"] : [], approvalRequiredFor: ["Jira issue creation", "Jira issue updates", "Jira comments"], blockedActions: truth.executable ? ["Delete Jira issues", "Change workflow status without a validated transition"] : ["Jira writes until a selected project and write scope are ready"], operatorsAllowed: operatorBadges(truth.connectorKey), records: truth.statusMessage ?? "Not connected", eventsSynced: 0, recentSyncEvents: [], authErrors: truth.status === "error" || truth.status === "reconnect_required" || truth.status === "permission_required" ? 1 : 0, source: connected ? truth.source : undefined };
  }

  if (truth.connectorKey === "zendesk") {
    const connected = truth.status === "healthy" || truth.status === "reconnect_required" || truth.status === "permission_required";
    return { ...connector, isConnected: connected, status: connected ? "connected" : truth.status === "error" ? "error" : "available", health: truth.status === "healthy" ? "healthy" : "disabled", lastSync: "-", lastSynced: truth.connectedAt ?? "", syncMode: "manual", syncFreq: "Incremental polling", permissions: ["Read tickets and bounded comments", "Read requester, assignee, and organization context", "Send public replies after approval", "Add internal notes after approval", "Update ticket fields after approval"], readScopes: ["tickets:read", "users:read", "organizations:read"], writeScopes: truth.executable ? ["tickets:write"] : [], approvalRequiredFor: ["Public Zendesk replies", "Internal notes", "Status, priority, and assignee updates"], blockedActions: truth.executable ? ["Delete tickets", "Manage users, organizations, macros, triggers, or automations"] : ["Zendesk writes until tickets:write and a healthy connection are ready"], operatorsAllowed: operatorBadges(truth.connectorKey), records: truth.statusMessage ?? "Not connected", eventsSynced: 0, recentSyncEvents: [], authErrors: truth.status === "error" || truth.status === "reconnect_required" || truth.status === "permission_required" ? 1 : 0, source: connected ? truth.source : undefined };
  }

  if (truth.connectorKey === "intercom") {
    const connected = truth.status === "healthy" || truth.status === "reconnect_required" || truth.status === "permission_required";
    return {
      ...connector,
      isConnected: connected,
      status: connected ? "connected" : truth.status === "error" ? "error" : "available",
      health: truth.status === "healthy" ? "healthy" : "disabled",
      lastSync: "-",
      lastSynced: truth.connectedAt ?? "",
      syncMode: "manual",
      syncFreq: "Bounded polling",
      permissions: ["Read bounded conversations", "Read contact and company context", "Read workspace admins", "Reply after approval", "Close, reopen, or assign after approval"],
      readScopes: ["users:read", "companies:read", "conversations:read", "admins:read"],
      writeScopes: truth.executable ? ["conversations:write"] : [],
      approvalRequiredFor: ["Intercom replies", "Conversation close/reopen/assignment"],
      blockedActions: truth.executable ? ["Bulk or campaign messaging", "Manage users, companies, tags, or content"] : ["Intercom writes until conversations:write and a healthy connection are ready"],
      operatorsAllowed: operatorBadges(truth.connectorKey),
      records: truth.statusMessage ?? "Not connected",
      eventsSynced: 0,
      recentSyncEvents: [],
      authErrors: truth.status === "error" || truth.status === "reconnect_required" || truth.status === "permission_required" ? 1 : 0,
      source: connected ? truth.source : undefined,
    };
  }

  if (truth.connectorKey === SLACK_CONNECTOR_KEY || truth.connectorKey === TRELLO_CONNECTOR_KEY) {
    const connected = truth.status === "healthy" || truth.status === "reconnect_required" || truth.status === "permission_required";
    return {
      ...connector,
      isConnected: connected,
      status: connected ? "connected" : truth.status === "error" ? "error" : "available",
      health: truth.status === "healthy" ? "healthy" : "disabled",
      lastSync: "-",
      lastSynced: truth.connectedAt ?? "",
      syncMode: "manual",
      syncFreq: truth.connectorKey === SLACK_CONNECTOR_KEY ? "Approval-gated" : "On demand",
      permissions: truth.connectorKey === SLACK_CONNECTOR_KEY
        ? ["Read channels", "Read bounded channel context", "Send approved internal messages"]
        : ["Read boards and lists", "Create and update cards after approval"],
      readScopes: truth.missingScopes?.length ? [`Missing provider access: ${truth.missingScopes.join(", ")}`] : ["Provider read access granted"],
      writeScopes: truth.executable ? [truth.connectorKey === SLACK_CONNECTOR_KEY ? "chat:write" : TRELLO_WRITE_SCOPE] : [],
      approvalRequiredFor: truth.connectorKey === SLACK_CONNECTOR_KEY ? ["Slack internal message send"] : ["Trello card changes"],
      blockedActions: truth.executable ? [] : [truth.statusMessage ?? "Reconnect to enable approved actions"],
      operatorsAllowed: operatorBadges(truth.connectorKey),
      records: truth.statusMessage ?? "Not connected",
      eventsSynced: 0,
      recentSyncEvents: [],
      authErrors: truth.status === "error" || truth.status === "reconnect_required" || truth.status === "permission_required" ? 1 : 0,
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
  return connectorId === "website" || connectorId === HUBSPOT_CONNECTOR_KEY || connectorId === "gmail" || connectorId === "google_drive" || connectorId === "microsoft" || connectorId === MICROSOFT_TEAMS_CONNECTOR_KEY || connectorId === SALESFORCE_CONNECTOR_KEY || connectorId === "asana" || connectorId === "jira" || connectorId === "zendesk" || connectorId === "intercom" || connectorId === SLACK_CONNECTOR_KEY || connectorId === TRELLO_CONNECTOR_KEY || listSupportedNangoConnectors().some((def) => def.connectorKey === connectorId);
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

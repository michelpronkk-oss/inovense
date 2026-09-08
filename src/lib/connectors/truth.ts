import type { Connector, OSState } from "@/lib/os/types";
import { GMAIL_COMPOSE_SCOPE, GMAIL_READONLY_SCOPE, GMAIL_SCAN_REQUIRED_SCOPES, GMAIL_SEND_SCOPE, getMissingGmailScopes, type StoredConnectorCredential } from "@/lib/connectors/gmail";
import { GOOGLE_DRIVE_READONLY_SCOPE } from "@/lib/connectors/gmail";
import { defaultGoogleDriveSettings, getGoogleDriveFileMetadata, hasGoogleDriveScope, GoogleDriveError, GoogleDriveReconnectionRequiredError, resolveGoogleDriveAccessToken } from "@/lib/connectors/google-drive";
import { MICROSOFT_REQUIRED_SCOPES, getMissingMicrosoftScopes } from "@/lib/connectors/microsoft";
import {
  MICROSOFT_TEAMS_CONNECTOR_KEY,
  getMicrosoftTeamsScopeState,
  readMicrosoftTeamsSettings,
} from "@/lib/connectors/microsoft-teams";
import { getSalesforceConfigStatus } from "@/lib/connectors/salesforce";
import { ASANA_WRITE_SCOPES, getAsanaConfigStatus, getStoredAsanaCredential, listAsanaProjects, resolveAsanaAccessToken, verifyAsanaConnection } from "@/lib/connectors/asana";
import { JIRA_READ_SCOPES, JIRA_WRITE_SCOPES, getJiraConfigStatus, getJiraProject, getStoredJiraCredential, getAccessibleJiraResources, resolveJiraAccessToken, fetchJiraIdentity } from "@/lib/connectors/jira";
import { ZENDESK_READ_SCOPES, ZENDESK_WRITE_SCOPES, ZendeskExecutionError, ZendeskReconnectionRequiredError, getZendeskConfigStatus, getStoredZendeskCredential, normalizeZendeskSubdomain, resolveZendeskAccessToken, verifyZendeskConnection } from "@/lib/connectors/zendesk";
import { INTERCOM_PERMISSIONS, IntercomExecutionError, IntercomReconnectionRequiredError, getIntercomConfigStatus, getStoredIntercomCredential, normalizeIntercomRegion, resolveIntercomAccessToken, verifyIntercomConnection, type IntercomRegion } from "@/lib/connectors/intercom";
import { getConnectorDefinition, listSupportedNangoConnectors } from "@/lib/connectors/registry";
import { getLegacyNangoConnection } from "@/lib/connectors/legacy-nango";
import { decryptToken } from "@/lib/connectors/crypto";
import {
  SLACK_CONNECTOR_KEY,
  SLACK_READ_SCOPES,
  SLACK_SEND_SCOPES,
  getMissingSlackScopes,
  getSlackConfigStatus,
  getStoredSlackCredential,
  hasSlackSendScope,
  resolveSlackAccessToken,
  verifySlackConnection,
} from "@/lib/connectors/slack";
import {
  TRELLO_CONNECTOR_KEY,
  TRELLO_OAUTH_SCOPES,
  TRELLO_WRITE_SCOPE,
  getStoredTrelloCredential,
  getTrelloConfigStatus,
  verifyTrelloConnection,
} from "@/lib/connectors/trello";
import { liveOperatorNames } from "@/lib/operators/registry";
import { getHubSpotConfigStatus, getMissingHubSpotScopes, getStoredHubSpotCredential, HUBSPOT_CONNECTOR_KEY, verifyHubSpotConnection, HubSpotConnectorError, HubSpotReconnectionRequiredError } from "@/lib/connectors/hubspot";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getProviderFailureSnapshot } from "@/lib/runtime/provider-health";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

// "permission_required" is distinct from "reconnect_required": the underlying
// provider account is still valid, but a specific capability's scopes were
// never granted (or were revoked). Microsoft Teams was the first connector to
// use it - a healthy Microsoft 365 mail connection must never be reported as
// a healthy Teams connection. Google Drive uses it the same way on top of the
// shared Google credential.
//
// "configuration_required" is distinct again: authorization is complete and the
// provider works, but the workspace has not yet chosen the scope the capability
// operates on (a Drive folder, a Slack alert channel, a Trello board/list).
// That is a setup step, never an auth failure, and must never be shown as
// "Reconnect".
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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Truthful Microsoft Teams health, derived from the shared Microsoft
 * credential plus real Teams consent. The ladder is deliberate:
 *
 *   no Microsoft credential      -> missing              (connect Microsoft first)
 *   credential, Teams not enabled-> not_connected        (offer "Enable Teams")
 *   enabled, read scopes missing -> permission_required  (re-consent needed)
 *   enabled, refresh token dead  -> reconnect_required
 *   enabled + scopes granted     -> healthy
 *
 * `executable` additionally requires the send scope and a chosen destination,
 * so the execution policy engine can never authorize a Teams write into a
 * connection that cannot actually perform one.
 */
function buildMicrosoftTeamsTruth(input: {
  hasMicrosoftCredential: boolean;
  microsoftError: boolean;
  microsoftNeedsAttention: boolean;
  connectedAt: string | null;
  accountEmail: string | null;
  enabled: boolean;
  destinationSelected: boolean;
  scopeState: { readGranted: boolean; sendGranted: boolean; missingScopes: string[] };
  scopes: string[];
}): SafeConnectorTruth {
  const base = {
    connectorKey: MICROSOFT_TEAMS_CONNECTOR_KEY,
    displayName: "Microsoft Teams",
    authType: "native" as const,
    accountEmail: input.accountEmail,
    connectedAt: input.connectedAt,
    scopes: input.scopes.filter((scope) => /^(Team|Channel)/i.test(scope)),
    missingScopes: input.scopeState.missingScopes,
  };

  if (input.microsoftError) {
    return { ...base, status: "error", executable: false, statusMessage: "Connection error" };
  }
  if (!input.hasMicrosoftCredential) {
    return { ...base, status: "missing", executable: false, connectedAt: null, accountEmail: null, statusMessage: "Not connected" };
  }
  if (!input.enabled) {
    return {
      ...base,
      status: "not_connected",
      executable: false,
      statusMessage: "Microsoft account connected. Grant Teams permissions to enable Microsoft Teams.",
    };
  }
  if (!input.scopeState.readGranted) {
    return {
      ...base,
      status: "permission_required",
      reconnectRequired: true,
      executable: false,
      statusMessage: "Additional Microsoft Teams permissions are required.",
      source: "native",
    };
  }
  if (input.microsoftNeedsAttention) {
    return {
      ...base,
      status: "reconnect_required",
      reconnectRequired: true,
      executable: false,
      statusMessage: "Reconnect required to restore Microsoft Teams access.",
      source: "native",
    };
  }
  return {
    ...base,
    status: "healthy",
    executable: input.scopeState.sendGranted && input.destinationSelected,
    statusMessage: input.scopeState.sendGranted
      ? input.destinationSelected
        ? "Ready for Teams channel monitoring and approval-gated Teams messages"
        : "Teams channel monitoring is ready. Select a default team and channel to enable approved Teams messages."
      : "Teams channel monitoring is ready. Message sending permission has not been granted.",
    source: "native",
  };
}

export async function getConnectorTruth(input: {
  workspaceId: string;
  supabase?: SupabaseAdmin;
}): Promise<SafeConnectorTruth[]> {
  const supabase = input.supabase ?? createSupabaseAdmin();

  const [gmailRes, microsoftRes, salesforceRes, asanaRes, jiraRes, zendeskRes, intercomRes, hubspotRes, slackRes, trelloRes, legacyHubspotRes] = await Promise.all([
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_email, scopes, status, created_at, token_expires_at, encrypted_access_token, encrypted_refresh_token, metadata")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", "gmail")
      .maybeSingle(),
    supabase
      .from("os_connector_credentials")
      // metadata carries the Teams capability settings that live on the same
      // shared Microsoft credential row (see connectors/microsoft-teams.ts).
      .select("connector_key, provider_email, scopes, status, created_at, metadata")
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
      .from("os_connector_credentials")
      .select("connector_key, provider_email, scopes, status, created_at, token_expires_at, encrypted_access_token, encrypted_refresh_token, metadata")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", "asana")
      .maybeSingle(),
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_email, scopes, status, created_at, token_expires_at, encrypted_access_token, encrypted_refresh_token, metadata")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", "jira")
      .maybeSingle(),
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_email, scopes, status, created_at, token_expires_at, encrypted_access_token, encrypted_refresh_token, metadata")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", "zendesk")
      .maybeSingle(),
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_email, scopes, status, created_at, token_expires_at, encrypted_access_token, encrypted_refresh_token, metadata")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", "intercom")
      .maybeSingle(),
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_account_id, provider_email, scopes, status, created_at, token_expires_at, encrypted_access_token, encrypted_refresh_token, metadata")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", HUBSPOT_CONNECTOR_KEY)
      .maybeSingle(),
    // Slack and Trello now read the same canonical encrypted credential store
    // as every other direct connector. There is no second Slack/Trello source.
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_account_id, provider_email, scopes, status, created_at, token_expires_at, encrypted_access_token, encrypted_refresh_token, metadata")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", SLACK_CONNECTOR_KEY)
      .maybeSingle(),
    supabase
      .from("os_connector_credentials")
      .select("connector_key, provider_account_id, provider_email, scopes, status, created_at, token_expires_at, encrypted_access_token, encrypted_refresh_token, metadata")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", TRELLO_CONNECTOR_KEY)
      .maybeSingle(),
    supabase
      .from("os_connectors")
      .select("connector_key, provider_email, status, connected_at, provider_config_key, nango_connection_id")
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", HUBSPOT_CONNECTOR_KEY)
      .maybeSingle(),
  ]);

  const gmailRow = gmailRes.data;
  const gmailScopes = asStringArray(gmailRow?.scopes);
  const gmailMissingSendScopes = gmailRow ? getMissingGmailScopes(gmailScopes) : [];
  const gmailMissingScanScopes = gmailRow ? getMissingGmailScopes(gmailScopes, GMAIL_SCAN_REQUIRED_SCOPES) : [];
  const gmailMissingScopes = Array.from(new Set([...gmailMissingSendScopes, ...gmailMissingScanScopes]));
  const gmailSendReconnectRequired = Boolean(gmailRow && gmailMissingSendScopes.length > 0);
  const gmailScanReconnectRequired = Boolean(gmailRow && gmailMissingScanScopes.length > 0);

  const hubspotRow = hubspotRes.data;
  const hubspotScopes = asStringArray(hubspotRow?.scopes);
  const hubspotMissingScopes = getMissingHubSpotScopes(hubspotScopes);
  const hubspotConfig = getHubSpotConfigStatus();
  let hubspotStatus: ConnectorTruthStatus = hubspotRes.error ? "error" : hubspotConfig.configured ? "not_connected" : "not_configured";
  let hubspotIdentityEmail: string | null = hubspotRow?.provider_email ?? null;
  let hubspotLegacy = false;
  if (!hubspotRow && !hubspotRes.error && legacyHubspotRes.data?.status === "connected" && legacyHubspotRes.data.nango_connection_id) {
    hubspotLegacy = true;
    hubspotStatus = "reconnect_required";
  } else if (hubspotRow) {
    if (hubspotMissingScopes.length > 0) hubspotStatus = "permission_required";
    else {
      try {
        const credential = await getStoredHubSpotCredential(input.workspaceId, supabase);
        if (!credential) hubspotStatus = "not_connected";
        else {
          const identity = await verifyHubSpotConnection({ workspaceId: input.workspaceId, credential, supabase });
          hubspotIdentityEmail = identity.userEmail ?? hubspotIdentityEmail;
          hubspotStatus = "healthy";
        }
      } catch (error) {
        hubspotStatus = error instanceof HubSpotReconnectionRequiredError
          ? "reconnect_required"
          : error instanceof HubSpotConnectorError && (error.status === 403 || error.code.includes("permission") || error.code.includes("scope"))
            ? "permission_required"
            : "reconnect_required";
      }
    }
  }

  // ── Google Drive: a capability of the shared Google credential ────────
  //
  // Drive has no connection of its own. It reads the exact os_connector_
  // credentials row Gmail owns (connector_key "gmail"), so there is never a
  // second Google account, a second credential, or a Nango Drive auth. The
  // ladder is deliberate, and each rung maps to a different customer action:
  //
  //   no Google credential            -> missing                (Connect Google account)
  //   credential, drive scope absent  -> permission_required    (Grant Drive access)
  //   scope granted, no folder chosen -> configuration_required (Select a folder)
  //   folders chosen, provider check fails on auth -> reconnect_required
  //   folders chosen, provider check passes        -> healthy
  //
  // Drive is only ever "healthy" after a real Drive API call against the
  // selected folders succeeds. A missing Drive scope says nothing about Gmail:
  // the Gmail truth row below is computed independently from Gmail's own
  // scopes, so Drive permission_required can never make Gmail look unhealthy.
  const gmailCredential = gmailRow as StoredConnectorCredential | null;
  const driveIdentityEmail = gmailCredential?.provider_email ?? null;
  const driveSettings = defaultGoogleDriveSettings(gmailCredential?.metadata);
  const driveFolderCount = driveSettings.folders.length;
  const driveScopeGranted = hasGoogleDriveScope(gmailScopes);
  const driveFoldersSelected = driveSettings.enabled && driveFolderCount > 0;
  let driveStatus: ConnectorTruthStatus = gmailRes.error
    ? "error"
    : !gmailCredential
      ? "missing"
      : !driveScopeGranted
        ? "permission_required"
        : "configuration_required";
  if (gmailCredential && driveScopeGranted) {
    try {
      const token = await resolveGoogleDriveAccessToken({ workspaceId: input.workspaceId, credential: gmailCredential, supabase });
      if (driveFoldersSelected) {
        for (const folder of driveSettings.folders.slice(0, 5)) await getGoogleDriveFileMetadata(token, folder.folderId);
        driveStatus = "healthy";
      }
    } catch (error) {
      driveStatus = error instanceof GoogleDriveReconnectionRequiredError
        ? "reconnect_required"
        : error instanceof GoogleDriveError && (error.code === "permission_required" || error.code === "drive_scope_missing")
          ? "permission_required"
          : "error";
    }
  }

  const microsoftRow = microsoftRes.data;
  const microsoftScopes = asStringArray(microsoftRow?.scopes);
  // "needs_attention" is written by resolveMicrosoftAccessToken() when
  // Microsoft reports the refresh token itself is dead (revoked/expired).
  const microsoftNeedsAttention = microsoftRow?.status === "needs_attention";
  const microsoftMissingScopes = microsoftRow ? getMissingMicrosoftScopes(microsoftScopes, MICROSOFT_REQUIRED_SCOPES) : [];
  const microsoftReconnectRequired = Boolean(microsoftRow && (microsoftNeedsAttention || microsoftMissingScopes.length > 0));

  // Microsoft Teams shares the one Microsoft connection but is a separate
  // capability surface with its own consent. It is NEVER reported healthy
  // just because Microsoft 365 mail works.
  const teamsSettings = readMicrosoftTeamsSettings((microsoftRow?.metadata ?? null) as Record<string, unknown> | null);
  const teamsScopeState = getMicrosoftTeamsScopeState(microsoftScopes);
  const teamsTruth = buildMicrosoftTeamsTruth({
    hasMicrosoftCredential: Boolean(microsoftRow),
    microsoftError: Boolean(microsoftRes.error),
    microsoftNeedsAttention,
    connectedAt: microsoftRow?.created_at ?? null,
    accountEmail: microsoftRow?.provider_email ?? null,
    enabled: teamsSettings.enabled,
    destinationSelected: Boolean(teamsSettings.defaultTeamId && teamsSettings.defaultChannelId),
    scopeState: teamsScopeState,
    scopes: microsoftScopes,
  });

  const salesforceRow = salesforceRes.data;
  const asanaRow = asanaRes.data;
  let asanaStatus: ConnectorTruthStatus = asanaRes.error ? "error" : getAsanaConfigStatus().configured ? "not_connected" : "not_configured";
  let asanaIdentityEmail: string | null = asanaRow?.provider_email ?? null;
  let asanaScopeSummary = "";
  let asanaWriteScopesGranted = false;
  let asanaSelectedProject = false;
  if (asanaRow) {
    try {
      const credential = await getStoredAsanaCredential(input.workspaceId, supabase);
      if (!credential) asanaStatus = "not_connected";
      else {
        const token = await resolveAsanaAccessToken({ workspaceId: input.workspaceId, credential, supabase });
        const identity = await verifyAsanaConnection(token);
        asanaIdentityEmail = identity.email ?? asanaIdentityEmail;
        const metadata = credential.metadata ?? {};
        const selectedWorkspaceId = typeof metadata.selectedWorkspaceId === "string" ? metadata.selectedWorkspaceId : null;
        const selectedProjectId = typeof metadata.selectedProjectId === "string" ? metadata.selectedProjectId : null;
        const selectedWorkspaceName = typeof metadata.selectedWorkspaceName === "string" ? metadata.selectedWorkspaceName : null;
        const selectedProjectName = typeof metadata.selectedProjectName === "string" ? metadata.selectedProjectName : null;
        asanaScopeSummary = selectedWorkspaceName && selectedProjectName ? ` Scope: ${selectedWorkspaceName} / ${selectedProjectName}.` : " Scope not selected yet.";
        asanaSelectedProject = Boolean(selectedWorkspaceId && selectedProjectId);
        const grantedScopes = new Set(asStringArray(credential.scopes).map((scope) => scope.toLowerCase()));
        asanaWriteScopesGranted = ASANA_WRITE_SCOPES.every((scope) => grantedScopes.has(scope));
        if (selectedWorkspaceId && selectedProjectId) {
          const selectedProject = (await listAsanaProjects(token, selectedWorkspaceId)).some((project) => project.gid === selectedProjectId);
          asanaStatus = selectedProject ? "healthy" : "permission_required";
        } else asanaStatus = "healthy";
      }
    } catch { asanaStatus = "reconnect_required"; }
  }
  const jiraRow = jiraRes.data;
  let jiraStatus: ConnectorTruthStatus = jiraRes.error ? "error" : getJiraConfigStatus().configured ? "not_connected" : "not_configured";
  let jiraIdentityEmail: string | null = jiraRow?.provider_email ?? null;
  let jiraScopeSummary = "";
  let jiraWriteScopesGranted = false;
  let jiraReadScopesGranted = false;
  let jiraSelectedProject = false;
  if (jiraRow) {
    try {
      const credential = await getStoredJiraCredential(input.workspaceId, supabase);
      if (!credential) jiraStatus = "not_connected";
      else {
        const token = await resolveJiraAccessToken({ workspaceId: input.workspaceId, credential, supabase });
        const metadata = credential.metadata ?? {};
        const cloudId = typeof metadata.cloudId === "string" ? metadata.cloudId : null;
        const selectedProjectId = typeof metadata.selectedProjectId === "string" ? metadata.selectedProjectId : null;
        const selectedProjectName = typeof metadata.selectedProjectName === "string" ? metadata.selectedProjectName : null;
        jiraScopeSummary = selectedProjectName ? ` Scope: ${selectedProjectName}.` : " Scope not selected yet.";
        jiraSelectedProject = Boolean(cloudId && selectedProjectId);
        const granted = new Set(asStringArray(credential.scopes).map((scope) => scope.toLowerCase()));
        jiraReadScopesGranted = JIRA_READ_SCOPES.every((scope) => granted.has(scope));
        jiraWriteScopesGranted = JIRA_WRITE_SCOPES.every((scope) => granted.has(scope));
        const identity = await fetchJiraIdentity(token); jiraIdentityEmail = identity.emailAddress ?? jiraIdentityEmail;
        if (!jiraReadScopesGranted || !cloudId || !(await getAccessibleJiraResources(token)).some((resource) => resource.id === cloudId)) jiraStatus = "permission_required";
        else if (selectedProjectId) { await getJiraProject(token, cloudId, selectedProjectId); jiraStatus = "healthy"; }
        else jiraStatus = "healthy";
      }
    } catch { jiraStatus = "reconnect_required"; }
  }
  const zendeskRow = zendeskRes.data;
  let zendeskStatus: ConnectorTruthStatus = zendeskRes.error ? "error" : getZendeskConfigStatus().configured ? "not_connected" : "not_configured";
  let zendeskIdentityEmail: string | null = zendeskRow?.provider_email ?? null;
  let zendeskReadScopesGranted = false;
  let zendeskWriteScopesGranted = false;
  let zendeskSubdomain: string | null = null;
  if (zendeskRow) {
    try {
      const credential = await getStoredZendeskCredential(input.workspaceId, supabase);
      if (!credential) zendeskStatus = "not_connected";
      else {
        const metadata = credential.metadata ?? {};
        const rawSubdomain = typeof metadata.subdomain === "string" ? metadata.subdomain : null;
        zendeskSubdomain = rawSubdomain ? normalizeZendeskSubdomain(rawSubdomain).subdomain : null;
        const granted = new Set(asStringArray(credential.scopes).map((scope) => scope.toLowerCase()));
        zendeskReadScopesGranted = ZENDESK_READ_SCOPES.every((scope) => granted.has(scope));
        zendeskWriteScopesGranted = ZENDESK_WRITE_SCOPES.every((scope) => granted.has(scope));
        if (!zendeskSubdomain || !zendeskReadScopesGranted) zendeskStatus = "permission_required";
        else {
          const token = await resolveZendeskAccessToken({ workspaceId: input.workspaceId, credential, supabase });
          const identity = await verifyZendeskConnection(token, zendeskSubdomain);
          zendeskIdentityEmail = identity.email ?? zendeskIdentityEmail;
          zendeskStatus = "healthy";
        }
      }
    } catch (error) {
      zendeskStatus = error instanceof ZendeskReconnectionRequiredError
        ? "reconnect_required"
        : error instanceof ZendeskExecutionError && (error.code === "permission_required" || error.code === "read_scope_missing")
          ? "permission_required"
          : "reconnect_required";
    }
  }
  const intercomRow = intercomRes.data;
  let intercomStatus: ConnectorTruthStatus = intercomRes.error ? "error" : getIntercomConfigStatus().configured ? "not_connected" : "not_configured";
  let intercomIdentityEmail: string | null = intercomRow?.provider_email ?? null;
  let intercomRegion: IntercomRegion | null = null;
  let intercomWriteScopesGranted = false;
  if (intercomRow) {
    try {
      const credential = await getStoredIntercomCredential(input.workspaceId, supabase);
      if (!credential) intercomStatus = "not_connected";
      else {
        intercomRegion = normalizeIntercomRegion(typeof credential.metadata?.region === "string" ? credential.metadata.region : null);
        const granted = new Set(asStringArray(credential.scopes).map((scope) => scope.toLowerCase()));
        intercomWriteScopesGranted = granted.has("conversations:write");
        const token = await resolveIntercomAccessToken({ workspaceId: input.workspaceId, credential, supabase });
        const identity = await verifyIntercomConnection(token, intercomRegion);
        intercomIdentityEmail = identity.email ?? intercomIdentityEmail;
        intercomStatus = "healthy";
      }
    } catch (error) {
      intercomStatus = error instanceof IntercomReconnectionRequiredError
        ? "reconnect_required"
        : error instanceof IntercomExecutionError && (error.code === "permission_required" || error.code === "write_scope_missing")
          ? "permission_required"
          : "reconnect_required";
    }
  }
  // ── Slack (direct OAuth) ──────────────────────────────────────────────
  //
  //   platform not configured        -> not_configured
  //   no direct credential, legacy Nango row present -> reconnect_required
  //   no direct credential at all    -> not_connected
  //   credential, read scope missing -> permission_required
  //   credential, provider rejects it-> reconnect_required
  //   credential verified with Slack -> healthy
  //
  // `executable` additionally requires chat:write, so the execution policy can
  // never authorize a Slack post into an install that cannot perform one. The
  // chosen alert channel is workspace policy, checked by its own callers.
  const slackRow = slackRes.data;
  const slackScopes = asStringArray(slackRow?.scopes);
  const slackConfig = getSlackConfigStatus();
  let slackStatus: ConnectorTruthStatus = slackRes.error ? "error" : slackConfig.configured ? "not_connected" : "not_configured";
  let slackLegacy = false;
  let slackSendGranted = false;
  const slackMissingScopes = slackRow ? getMissingSlackScopes(slackScopes, [...SLACK_READ_SCOPES, ...SLACK_SEND_SCOPES]) : [];
  if (!slackRow && !slackRes.error) {
    const legacy = await getLegacyNangoConnection({ workspaceId: input.workspaceId, connectorKey: SLACK_CONNECTOR_KEY, supabase });
    if (legacy.present) {
      slackLegacy = true;
      slackStatus = "reconnect_required";
    }
  } else if (slackRow) {
    slackSendGranted = hasSlackSendScope(slackScopes);
    if (getMissingSlackScopes(slackScopes, SLACK_READ_SCOPES).length > 0) slackStatus = "permission_required";
    else if (slackRow.status === "needs_attention") slackStatus = "reconnect_required";
    else {
      try {
        const credential = await getStoredSlackCredential(input.workspaceId, supabase);
        if (!credential) slackStatus = "not_connected";
        else {
          const token = await resolveSlackAccessToken({ workspaceId: input.workspaceId, credential, supabase });
          await verifySlackConnection(token);
          slackStatus = "healthy";
        }
      } catch {
        slackStatus = "reconnect_required";
      }
    }
  }

  // ── Trello (direct OAuth 1.0a) ────────────────────────────────────────
  // Same ladder as Slack. Trello tokens are issued with expiration=never, so
  // there is no expiry rung: a dead token surfaces as a failed provider check.
  const trelloRow = trelloRes.data;
  const trelloScopes = asStringArray(trelloRow?.scopes);
  const trelloConfig = getTrelloConfigStatus();
  let trelloStatus: ConnectorTruthStatus = trelloRes.error ? "error" : trelloConfig.configured ? "not_connected" : "not_configured";
  let trelloLegacy = false;
  let trelloIdentityEmail: string | null = trelloRow?.provider_email ?? null;
  const trelloWriteGranted = trelloScopes.map((scope) => scope.toLowerCase()).includes(TRELLO_WRITE_SCOPE);
  if (!trelloRow && !trelloRes.error) {
    const legacy = await getLegacyNangoConnection({ workspaceId: input.workspaceId, connectorKey: TRELLO_CONNECTOR_KEY, supabase });
    if (legacy.present) {
      trelloLegacy = true;
      trelloStatus = "reconnect_required";
    }
  } else if (trelloRow) {
    try {
      const credential = await getStoredTrelloCredential(input.workspaceId, supabase);
      if (!credential) trelloStatus = "not_connected";
      else {
        const identity = await verifyTrelloConnection(decryptToken(credential.encrypted_access_token));
        trelloIdentityEmail = identity.email ?? identity.username ?? trelloIdentityEmail;
        trelloStatus = "healthy";
      }
    } catch {
      trelloStatus = "reconnect_required";
    }
  }

  // All production connectors now use direct provider OAuth. Legacy Nango
  // rows are surfaced only as migration hints on the individual connector
  // truth objects above; they are never verified through a runtime client.
  const nangoTruth: SafeConnectorTruth[] = [];

  const rows: SafeConnectorTruth[] = [
    {
      connectorKey: HUBSPOT_CONNECTOR_KEY,
      displayName: "HubSpot",
      authType: "native",
      status: hubspotStatus,
      accountEmail: hubspotIdentityEmail,
      connectedAt: hubspotRow?.created_at ?? legacyHubspotRes.data?.connected_at ?? null,
      scopes: hubspotScopes,
      missingScopes: hubspotMissingScopes,
      reconnectRequired: hubspotStatus === "reconnect_required" || hubspotStatus === "permission_required",
      executable: hubspotStatus === "healthy" && hubspotMissingScopes.length === 0,
      legacyNangoConnection: hubspotLegacy || undefined,
      statusMessage: hubspotStatus === "healthy"
        ? "Connected. HubSpot CRM context and approval-gated updates are ready."
        : hubspotStatus === "permission_required"
          ? "HubSpot permissions are incomplete. Reconnect HubSpot to grant the required CRM scopes."
          : hubspotLegacy
            ? "HubSpot was connected through the previous managed OAuth provider. Reconnect HubSpot once to move to direct authorization."
            : hubspotStatus === "reconnect_required"
              ? "Reconnect required to restore HubSpot access."
              : hubspotStatus === "not_configured"
                ? "HubSpot is not configured yet."
                : "Ready to connect",
      source: hubspotRow ? "native" : undefined,
    },
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
      connectorKey: "google_drive",
      displayName: "Google Drive",
      authType: "native",
      status: driveStatus,
      accountEmail: driveIdentityEmail,
      connectedAt: gmailRow?.created_at ?? null,
      scopes: driveScopeGranted ? [GOOGLE_DRIVE_READONLY_SCOPE] : [],
      missingScopes: driveScopeGranted ? undefined : [GOOGLE_DRIVE_READONLY_SCOPE],
      reconnectRequired: driveStatus === "reconnect_required" || driveStatus === "permission_required",
      executable: false,
      statusMessage: driveStatus === "healthy"
        ? `Drive ready. Monitoring ${driveFolderCount} selected folder${driveFolderCount === 1 ? "" : "s"}.`
        : driveStatus === "configuration_required"
          ? "Drive access is ready. Select a folder to enable document context."
          : driveStatus === "permission_required"
            ? "Google account connected. Grant Drive access to continue."
            : driveStatus === "reconnect_required"
              ? "Reconnect Google to restore Drive access."
              : driveStatus === "error"
                ? "Google Drive needs attention."
                : "Connect Google to enable Drive context.",
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
    teamsTruth,
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
    {
      connectorKey: "asana",
      displayName: "Asana",
      authType: "native",
      status: asanaStatus,
      accountEmail: asanaIdentityEmail,
      connectedAt: asanaRow?.created_at ?? null,
      scopes: asStringArray(asanaRow?.scopes),
      reconnectRequired: asanaStatus === "reconnect_required" || asanaStatus === "permission_required",
      executable: asanaStatus === "healthy" && asanaSelectedProject && asanaWriteScopesGranted,
      missingScopes: asanaWriteScopesGranted ? undefined : ASANA_WRITE_SCOPES.filter((scope) => !asStringArray(asanaRow?.scopes).map((item) => item.toLowerCase()).includes(scope)),
      statusMessage: asanaStatus === "healthy" ? `Connected. Asana project reads are ready.${asanaScopeSummary}${asanaWriteScopesGranted ? " Write actions are approval-gated." : " Reconnect to grant approved write permissions."}` : asanaStatus === "permission_required" ? "The selected Asana project is no longer accessible. Choose another project." : asanaStatus === "reconnect_required" ? "Reconnect required to restore Asana access" : asanaStatus === "not_configured" ? "Asana is not configured yet" : "Ready to connect",
      source: asanaRow ? "native" : undefined,
    },
    {
      connectorKey: "jira",
      displayName: "Jira",
      authType: "native",
      status: jiraStatus,
      accountEmail: jiraIdentityEmail,
      connectedAt: jiraRow?.created_at ?? null,
      scopes: asStringArray(jiraRow?.scopes),
      reconnectRequired: jiraStatus === "reconnect_required" || jiraStatus === "permission_required",
      executable: jiraStatus === "healthy" && jiraSelectedProject && jiraWriteScopesGranted,
      missingScopes: [...JIRA_READ_SCOPES, ...JIRA_WRITE_SCOPES].filter((scope) => !asStringArray(jiraRow?.scopes).map((item) => item.toLowerCase()).includes(scope)),
      statusMessage: jiraStatus === "healthy" ? `Connected. Jira issue reads are ready.${jiraScopeSummary}${jiraWriteScopesGranted && jiraSelectedProject ? " Write actions are approval-gated." : " Select a project and reconnect if write scopes are missing."}` : jiraStatus === "permission_required" ? "The authorized Jira site or selected project is no longer accessible." : jiraStatus === "reconnect_required" ? "Reconnect required to restore Jira access" : jiraStatus === "not_configured" ? "Jira is not configured yet" : "Ready to connect",
      source: jiraRow ? "native" : undefined,
    },
    {
      connectorKey: "zendesk",
      displayName: "Zendesk",
      authType: "native",
      status: zendeskStatus,
      accountEmail: zendeskIdentityEmail,
      connectedAt: zendeskRow?.created_at ?? null,
      scopes: asStringArray(zendeskRow?.scopes),
      reconnectRequired: zendeskStatus === "reconnect_required" || zendeskStatus === "permission_required",
      executable: zendeskStatus === "healthy" && zendeskWriteScopesGranted,
      missingScopes: [...ZENDESK_READ_SCOPES, ...ZENDESK_WRITE_SCOPES].filter((scope) => !asStringArray(zendeskRow?.scopes).map((item) => item.toLowerCase()).includes(scope)),
      statusMessage: zendeskStatus === "healthy" ? `Connected. Zendesk ticket reads are ready.${zendeskSubdomain ? ` Workspace: ${zendeskSubdomain}.` : ""}${zendeskWriteScopesGranted ? " Approval-gated ticket actions are enabled." : " Reconnect to grant ticket write permissions."}` : zendeskStatus === "permission_required" ? "Zendesk read permissions or workspace identity are missing. Reconnect Zendesk." : zendeskStatus === "reconnect_required" ? "Reconnect required to restore Zendesk access" : zendeskStatus === "not_configured" ? "Zendesk is not configured yet" : "Ready to connect",
      source: zendeskRow ? "native" : undefined,
    },
    {
      connectorKey: "intercom",
      displayName: "Intercom",
      authType: "native",
      status: intercomStatus,
      accountEmail: intercomIdentityEmail,
      connectedAt: intercomRow?.created_at ?? null,
      scopes: asStringArray(intercomRow?.scopes),
      reconnectRequired: intercomStatus === "reconnect_required" || intercomStatus === "permission_required",
      executable: intercomStatus === "healthy" && intercomWriteScopesGranted,
      missingScopes: INTERCOM_PERMISSIONS.filter((scope) => !asStringArray(intercomRow?.scopes).map((item) => item.toLowerCase()).includes(scope.toLowerCase())),
      statusMessage: intercomStatus === "healthy" ? `Connected in ${intercomRegion?.toUpperCase() ?? "selected"} region. Conversation reads are ready.${intercomWriteScopesGranted ? " Approval-gated replies and updates are enabled." : " Reconnect to grant conversation write permission."}` : intercomStatus === "permission_required" ? "Intercom permissions are incomplete. Reconnect Intercom." : intercomStatus === "reconnect_required" ? "Reconnect required to restore Intercom access" : intercomStatus === "not_configured" ? "Intercom is not configured yet" : "Ready to connect. Public installation remains pending Intercom review.",
      source: intercomRow ? "native" : undefined,
    },
    {
      connectorKey: SLACK_CONNECTOR_KEY,
      displayName: "Slack",
      authType: "native",
      status: slackStatus,
      // A Slack bot install identifies a Slack workspace, not a person, so this
      // carries the team name rather than inventing an account email.
      accountEmail: slackRow?.provider_email ?? null,
      connectedAt: slackRow?.created_at ?? null,
      scopes: slackScopes,
      missingScopes: slackMissingScopes.length ? slackMissingScopes : undefined,
      reconnectRequired: slackStatus === "reconnect_required" || slackStatus === "permission_required",
      executable: slackStatus === "healthy" && slackSendGranted,
      legacyNangoConnection: slackLegacy || undefined,
      statusMessage: slackStatus === "healthy"
        ? slackSendGranted
          ? "Connected. Channel reads are ready and Slack messages are approval-gated."
          : "Connected. Reconnect Slack to grant the message permission."
        : slackStatus === "permission_required"
          ? "Slack channel read permission is missing. Reconnect Slack."
          : slackLegacy
            ? "Slack was connected through the previous managed OAuth provider. Reconnect Slack once to move to Auterim's direct Slack app."
            : slackStatus === "reconnect_required"
              ? "Reconnect required to restore Slack access"
              : slackStatus === "not_configured"
                ? "Slack is not configured yet"
                : "Ready to connect",
      source: slackRow ? "native" : undefined,
    },
    {
      connectorKey: TRELLO_CONNECTOR_KEY,
      displayName: "Trello",
      authType: "native",
      status: trelloStatus,
      accountEmail: trelloIdentityEmail,
      connectedAt: trelloRow?.created_at ?? null,
      scopes: trelloScopes,
      missingScopes: TRELLO_OAUTH_SCOPES.filter((scope) => !trelloScopes.map((item) => item.toLowerCase()).includes(scope)),
      reconnectRequired: trelloStatus === "reconnect_required",
      executable: trelloStatus === "healthy" && trelloWriteGranted,
      legacyNangoConnection: trelloLegacy || undefined,
      statusMessage: trelloStatus === "healthy"
        ? trelloWriteGranted
          ? "Connected. Board reads are ready and card actions are approval-gated."
          : "Connected. Reconnect Trello to grant approved write permission."
        : trelloLegacy
          ? "Trello was connected through the previous managed OAuth provider. Reconnect Trello once to move to Auterim's direct authorization."
          : trelloStatus === "reconnect_required"
            ? "Reconnect required to restore Trello access"
            : trelloStatus === "not_configured"
              ? "Trello is not configured yet"
              : "Ready to connect",
      source: trelloRow ? "native" : undefined,
    },
    ...nangoTruth,
  ];

  // Provider operation counters are operational evidence, not authorization
  // state. Keep the auth status truthful while carrying the signal into the
  // connector health model so dashboards and readiness checks can explain a
  // transient outage without incorrectly asking the customer to reconnect.
  const providerFailures = await getProviderFailureSnapshot({ workspaceId: input.workspaceId, supabase });
  const degraded = new Set(providerFailures.degradedConnectors);
  return rows.map((row) => degraded.has(row.connectorKey)
    ? {
      ...row,
      operationalDegraded: true,
      statusMessage: `${row.statusMessage ?? "Connected."} Provider is experiencing repeated transient failures; retries continue.`,
    }
    : row);
}

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
  return connectorId === HUBSPOT_CONNECTOR_KEY || connectorId === "gmail" || connectorId === "google_drive" || connectorId === "microsoft" || connectorId === MICROSOFT_TEAMS_CONNECTOR_KEY || connectorId === "salesforce" || connectorId === "asana" || connectorId === "jira" || connectorId === "zendesk" || connectorId === "intercom" || connectorId === SLACK_CONNECTOR_KEY || connectorId === TRELLO_CONNECTOR_KEY || listSupportedNangoConnectors().some((def) => def.connectorKey === connectorId);
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

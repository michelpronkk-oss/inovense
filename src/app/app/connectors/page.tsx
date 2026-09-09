"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { LinkIcon, PlusIcon } from "@/components/dashboard/icons";
import type { Connector } from "@/lib/os/types";
import { UsageBanner } from "@/components/upgrade-prompt";
import { getEntitlements } from "@/lib/os/entitlements";
import { UpgradeModal } from "@/components/upgrade-modal";
import { isRealConnectedConnector } from "@/lib/os/truth";
import {
  isConnectorAvailableForAuth,
  getConnectorDefinition,
} from "@/lib/connectors/registry";
import { getAvailableConnectors } from "@/lib/connectors/capabilities";
import { CONNECTOR_CATEGORY_LABELS, connectorCategoryLabel } from "@/lib/connectors/registry";
import { connectorDefinitionToSeedConnector } from "@/lib/os/seed";
import { LOGOS as IntegrationLogos } from "@/components/home-v3/integrations-grid";
import { getUnconnectedOnboardingSystems, unlockMessageForConnector } from "@/lib/operators/unlock-copy";
import { humanizeOperatorActions } from "@/lib/operators/action-labels";
import { humanizeCapabilities } from "@/lib/operators/capability-labels";
import { getWorkspaceConnectorImpact } from "@/lib/operators/connector-requirements";
import { getOperatorDefinition } from "@/lib/operators/registry";
import { getRealWorkspaceSuggestedWorkflows } from "@/lib/os/workflow-recommendations";
import {
  CONNECTOR_DISCOVERY_CATEGORIES,
  filterConnectorDiscovery,
  type ConnectorDiscoveryCategory,
} from "@/lib/connectors/discovery";

type SlackChannel = {
  id: string;
  name: string;
  isPrivate: boolean;
  isArchived: boolean;
  isMember: boolean;
};

type SlackAlertSettings = {
  slackNotificationsEnabled: boolean;
  slackApprovalAlertsEnabled: boolean;
  slackDefaultChannelId: string | null;
  slackDefaultChannelName: string | null;
  notifyOnRevenueApprovalCreated: boolean;
  notifyOnApprovalApproved: boolean;
  notifyOnApprovalRejected: boolean;
  notifyOnExecutionFailed: boolean;
};

type TrelloBoard = {
  id: string;
  name: string;
  url?: string | null;
};

type TrelloList = {
  id: string;
  name: string;
  boardId?: string | null;
};

type TrelloSettings = {
  defaultBoardId: string | null;
  defaultBoardName: string | null;
  defaultListId: string | null;
  defaultListName: string | null;
};
type AsanaWorkspace = { gid: string; name: string };
type AsanaProject = { gid: string; name: string };
type AsanaSettings = { selectedWorkspaceId: string | null; selectedWorkspaceName: string | null; selectedProjectId: string | null; selectedProjectName: string | null };
type JiraProject = { id: string; key: string; name: string };
type JiraIssueType = { id: string; name: string; subtask?: boolean; createable?: boolean };
type JiraSettings = { cloudId: string | null; siteName: string | null; siteUrl: string | null; selectedProjectId: string | null; selectedProjectKey: string | null; selectedProjectName: string | null; selectedIssueTypeId: string | null; selectedIssueTypeName: string | null };
type ZendeskSettings = { subdomain: string | null; baseUrl: string | null; siteUrl: string | null; syncCursor: string | null };
type DriveFolder = { folderId: string; folderName: string; driveId: string | null };
type DriveSettings = { enabled: boolean; folders: DriveFolder[]; driveId: string | null; lastSyncAt: string | null; syncCursor: string | null };

type TeamsSettings = {
  microsoftConnected: boolean;
  enabled: boolean;
  readGranted: boolean;
  sendGranted: boolean;
  missingScopes: string[];
  defaultTeamId: string | null;
  defaultTeamName: string | null;
  defaultChannelId: string | null;
  defaultChannelName: string | null;
  defaultChannelMembershipType: string | null;
};

type TeamsTeam = { id: string; displayName: string };
type TeamsChannel = { id: string; displayName: string; membershipType: string; isPotentiallyExternal: boolean };

// Seed connector ids use hyphens (e.g. "google-calendar"); catalog keys use
// underscores (e.g. "google_calendar"). Normalize before catalog lookups.
function normalizeConnectorKey(id: string): string {
  return id.replace(/-/g, "_");
}

function connectorCapabilities(connectorId: string): string[] {
  const def = getConnectorDefinition(connectorId);
  return def ? humanizeCapabilities(def.capabilities) : ["Connect account"];
}

function connectorOperatorNames(connectorId: string): string[] {
  const realOperatorKeys = new Set(["revenue", "client_flow", "operations", "support"]);
  return (getConnectorDefinition(connectorId)?.usedByOperators ?? [])
    .filter((key) => realOperatorKeys.has(key))
    .map((key) => getOperatorDefinition(key)?.name)
    .filter((name): name is string => Boolean(name));
}

function connectorDiscoveryState(connector: Connector): { status: string; action: "Connect" | "Manage" | "Reconnect"; color: string } {
  const connected = isRealConnectedConnector(connector);
  const needsReconnect = connector.records.includes("Reconnect required") || (connected && connector.health !== "healthy");
  if (needsReconnect) return { status: "Needs attention", action: "Reconnect", color: "var(--amber)" };
  if (connected) return { status: "Connected", action: "Manage", color: "#8df5cf" };
  return { status: "Not connected", action: "Connect", color: "var(--cyan)" };
}

function connectorSafetyNotes(connectorId: string): string[] {
  if (connectorId === "gmail") return ["External customer emails require approval before sending.", "Auterim never sends from Gmail without a reviewed approval."];
  if (connectorId === "microsoft") return ["External customer emails require approval before sending.", "Calendar event creation, updates and deletion require approval.", "Auterim never sends from Outlook or changes your calendar without a reviewed approval."];
  if (connectorId === "salesforce") return ["Salesforce CRM actions are not enabled yet.", "Future record changes will require approval."];
  if (connectorId === "hubspot") return ["CRM changes require approval.", "Customer records are updated only through approved actions."];
  if (connectorId === "slack") return ["Slack alerts are internal.", "Customer-facing Slack messages are not sent automatically."];
  if (connectorId === "microsoft_teams") return [
    "Microsoft Teams uses the same Microsoft sign-in as Microsoft 365, with separate Teams permissions.",
    "Auterim reads only the team and channel you select, and never stores full message history.",
    "Every Teams message requires approval before it is sent, including messages to internal channels.",
    "Turning Teams off leaves your Microsoft 365 mail and calendar access untouched.",
  ];
  if (connectorId === "trello") return ["Trello task changes require approval.", "Cards, moves and comments execute only after review."];
  if (connectorId === "asana") return ["Asana task creation, updates and comments require approval.", "Auterim writes only inside the selected project scope."];
  if (connectorId === "jira") return ["Jira issue creation, updates and comments require approval.", "Auterim writes only inside the selected Jira project scope."];
  if (connectorId === "zendesk") return ["Public replies, internal notes, and ticket changes require approval.", "Auterim only accesses the Zendesk workspace you authorize."];
  return ["Approval rules stay enforced for risky actions."];
}

function shortOperatorLabel(label: string): string {
  return label
    .replace(" Operator", "")
    .replace("Approval Risk", "Approval & Risk")
    .replace("Automation Architect", "Automation");
}

function connectorStatusLabel(input: {
  connector: Connector;
  isRealConnected: boolean;
  slackReady?: boolean;
  trelloReady?: boolean;
  asanaReady?: boolean;
  jiraReady?: boolean;
}): { label: string; color: string; background: string; border: string } {
  if (!input.isRealConnected) return { label: "Not connected", color: "#b8c5c8", background: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.12)" };
  const warning = { color: "var(--amber)", background: "rgba(245,194,107,0.08)", border: "rgba(245,194,107,0.24)" };
  if (input.connector.id === "google_drive" && input.connector.records.includes("Grant Drive access")) return { label: "Permission required", ...warning };
  if (input.connector.id === "google_drive" && (input.connector.records.includes("Select a folder") || input.connector.records.includes("Select folders"))) return { label: "Needs setup", ...warning };
  if (input.connector.id === "slack" && !input.slackReady) return { label: "Needs setup", ...warning };
  if (input.connector.id === "trello" && !input.trelloReady) return { label: "Needs setup", ...warning };
  if (input.connector.id === "asana" && !input.asanaReady) return { label: "Needs setup", ...warning };
  if (input.connector.id === "jira" && !input.jiraReady) return { label: "Needs setup", ...warning };
  if (input.connector.records.toLowerCase().includes("permission") || input.connector.records.toLowerCase().includes("grant access")) return { label: "Permission required", ...warning };
  if (input.connector.records.includes("Reconnect required") || input.connector.records.includes("Reconnect Google")) return { label: "Reconnect required", ...warning };
  if (input.connector.status === "error" || input.connector.records.toLowerCase().includes("needs attention")) return { label: "Needs attention", ...warning };
  if (input.connector.health === "disabled") return { label: "Disabled", ...warning };
  if (input.connector.health !== "healthy") return { label: "Needs attention", ...warning };
  return { label: "Ready", color: "#8df5cf", background: "rgba(81,216,138,0.08)", border: "rgba(81,216,138,0.24)" };
}

function connectorCapabilityItems(connectorId: string): string[] {
  if (connectorId === "google_drive") return ["Read selected Drive documents", "Use document context in operator reasoning"];
  return connectorCapabilities(connectorId);
}

function connectorTrustCopy(connectorId: string): { title: string; lines: string[] } {
  if (connectorId === "google_drive") return {
    title: "Read-only access",
    lines: ["Auterim can read files inside the selected folder.", "It cannot edit, move, delete, or share Drive files."],
  };
  if (connectorId === "slack") return { title: "Channel access", lines: ["Internal messages remain approval-gated before sending."] };
  if (connectorId === "jira") return { title: "Project access", lines: ["Issue actions remain approval-gated within the selected project."] };
  if (connectorId === "gmail") return { title: "Inbox access", lines: ["Inbox monitoring is read-only; outbound email remains approval-gated."] };
  return { title: "Access & safety", lines: connectorSafetyNotes(connectorId) };
}

const CAPABILITY_PRIORITY = [
  "Inbound email monitoring",
  "Approval-gated email sending",
  "Follow-up drafting",
  "Document context",
  "Search Google Drive files",
  "Team channel visibility",
  "Approval-gated team messages",
];

function orderCapabilitySummary(items: string[]): string[] {
  return Array.from(new Set(items)).sort((a, b) => {
    const aIndex = CAPABILITY_PRIORITY.indexOf(a);
    const bIndex = CAPABILITY_PRIORITY.indexOf(b);
    return (aIndex === -1 ? CAPABILITY_PRIORITY.length : aIndex) - (bIndex === -1 ? CAPABILITY_PRIORITY.length : bIndex) || a.localeCompare(b);
  });
}

export default function ConnectorsPage() {
  const {
    state,
    connectConnector,
    disconnectConnector,
    testConnector,
    resyncConnector,
  } = useOS();

  const router = useRouter();
  const searchParams = useSearchParams();

  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [discoveryCategory, setDiscoveryCategory] = useState<ConnectorDiscoveryCategory>("all");
  const [setupConnectorId, setSetupConnectorId] = useState<string | null>(null);
  const [drawerConnectorId, setDrawerConnectorId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [disconnectingConnectorId, setDisconnectingConnectorId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [slackChannelsLoading, setSlackChannelsLoading] = useState(false);
  const [slackSettingsLoading, setSlackSettingsLoading] = useState(false);
  const [slackSettingsSaving, setSlackSettingsSaving] = useState(false);
  const [slackSetupError, setSlackSetupError] = useState("");
  const [slackChannelStatus, setSlackChannelStatus] = useState("");
  const [slackAlertSettings, setSlackAlertSettings] = useState<SlackAlertSettings>({
    slackNotificationsEnabled: false,
    slackApprovalAlertsEnabled: false,
    slackDefaultChannelId: null,
    slackDefaultChannelName: null,
    notifyOnRevenueApprovalCreated: true,
    notifyOnApprovalApproved: true,
    notifyOnApprovalRejected: true,
    notifyOnExecutionFailed: true,
  });
  const [trelloBoards, setTrelloBoards] = useState<TrelloBoard[]>([]);
  const [trelloLists, setTrelloLists] = useState<TrelloList[]>([]);
  const [trelloLoading, setTrelloLoading] = useState(false);
  const [trelloSaving, setTrelloSaving] = useState(false);
  const [trelloSetupError, setTrelloSetupError] = useState("");
  const [trelloSettings, setTrelloSettings] = useState<TrelloSettings>({
    defaultBoardId: null,
    defaultBoardName: null,
    defaultListId: null,
    defaultListName: null,
  });
  const [asanaWorkspaces, setAsanaWorkspaces] = useState<AsanaWorkspace[]>([]);
  const [asanaProjects, setAsanaProjects] = useState<AsanaProject[]>([]);
  const [asanaLoading, setAsanaLoading] = useState(false);
  const [asanaSaving, setAsanaSaving] = useState(false);
  const [asanaSetupError, setAsanaSetupError] = useState("");
  const [asanaSettings, setAsanaSettings] = useState<AsanaSettings>({ selectedWorkspaceId: null, selectedWorkspaceName: null, selectedProjectId: null, selectedProjectName: null });
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [jiraIssueTypes, setJiraIssueTypes] = useState<JiraIssueType[]>([]);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraSaving, setJiraSaving] = useState(false);
  const [jiraSetupError, setJiraSetupError] = useState("");
  const [jiraSettings, setJiraSettings] = useState<JiraSettings>({ cloudId: null, siteName: null, siteUrl: null, selectedProjectId: null, selectedProjectKey: null, selectedProjectName: null, selectedIssueTypeId: null, selectedIssueTypeName: null });
  const [zendeskSettings, setZendeskSettings] = useState<ZendeskSettings>({ subdomain: null, baseUrl: null, siteUrl: null, syncCursor: null });
  const [zendeskSubdomain, setZendeskSubdomain] = useState("");
  const [zendeskSetupError, setZendeskSetupError] = useState("");
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [driveSettings, setDriveSettings] = useState<DriveSettings>({ enabled: false, folders: [], driveId: null, lastSyncAt: null, syncCursor: null });
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveSetupError, setDriveSetupError] = useState("");
  const [teamsSettings, setTeamsSettings] = useState<TeamsSettings | null>(null);
  const [teamsTeams, setTeamsTeams] = useState<TeamsTeam[]>([]);
  const [teamsChannels, setTeamsChannels] = useState<TeamsChannel[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsSaving, setTeamsSaving] = useState(false);
  const [teamsSetupError, setTeamsSetupError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [capabilitiesExpanded, setCapabilitiesExpanded] = useState(false);
  const [operatorReadiness, setOperatorReadiness] = useState<{ operatorKey: string; status: string; canRunManual: boolean; availableActions: string[]; availableBusinessActions?: string[] }[]>([]);

  // Real connected means authenticated through a provider's direct OAuth flow.
  const realConnectedConnectors = useMemo(
    () => state.connectors.filter((c) => isRealConnectedConnector(c)),
    [state.connectors]
  );
  const availableCatalogConnectors = useMemo(() => {
    return getAvailableConnectors().flatMap((def) => {
      const connector = state.connectors.find((c) => normalizeConnectorKey(c.id) === def.connectorKey)
        ?? connectorDefinitionToSeedConnector(def);
      return [connector];
    });
  }, [state.connectors]);


  const healthyCount = useMemo(
    () => realConnectedConnectors.filter((c) => c.health === "healthy").length,
    [realConnectedConnectors]
  );

  const filteredAvailable = useMemo(() => {
    return filterConnectorDiscovery(getAvailableConnectors(), {
      query: search,
      category: discoveryCategory,
      onboardingSystems: state.workspace.onboardingSystems ?? [],
    }).flatMap((definition) => {
      const connector = availableCatalogConnectors.find((item) => normalizeConnectorKey(item.id) === definition.connectorKey);
      return connector ? [connector] : [];
    });
  }, [availableCatalogConnectors, discoveryCategory, search, state.workspace.onboardingSystems]);

  // What onboarding said this workspace already uses, that is not yet
  // actually connected (real OAuth truth, never the onboarding
  // selection itself). Never fabricated - falls back to an empty list when
  // onboarding recorded nothing or everything is already connected.
  const connectedConnectorKeys = useMemo(
    () => realConnectedConnectors.map((c) => normalizeConnectorKey(c.id)),
    [realConnectedConnectors]
  );
  const onboardingHighlightKeys = useMemo(() => getUnconnectedOnboardingSystems({
    onboardingSystems: state.workspace.onboardingSystems ?? [],
    connectedConnectorKeys,
  }), [state.workspace.onboardingSystems, connectedConnectorKeys]);
  const onboardingHighlightConnectors = useMemo(
    () => onboardingHighlightKeys
      .map((key) => availableCatalogConnectors.find((c) => normalizeConnectorKey(c.id) === key))
      .filter((c): c is Connector => Boolean(c)),
    [onboardingHighlightKeys, availableCatalogConnectors]
  );

  const setupConnector = availableCatalogConnectors.find((c) => c.id === setupConnectorId) ?? null;
  const drawerConnector = state.connectors.find((c) => c.id === drawerConnectorId) ?? null;
  const drawerSlackReady = Boolean(slackAlertSettings.slackNotificationsEnabled && slackAlertSettings.slackApprovalAlertsEnabled && slackAlertSettings.slackDefaultChannelId);
  const drawerTrelloReady = Boolean(trelloSettings.defaultBoardId && trelloSettings.defaultListId);
  const drawerAsanaReady = Boolean(asanaSettings.selectedWorkspaceId && asanaSettings.selectedProjectId);
  const drawerJiraReady = Boolean(jiraSettings.selectedProjectId && jiraSettings.selectedIssueTypeId);

  const entitlements = getEntitlements(state.workspace);
  const isPreview = entitlements.billingStatus === "preview";

  const realConnectedCount = realConnectedConnectors.length;
  const connectorLimit = typeof entitlements.connectorsLimit === "number" ? entitlements.connectorsLimit : null;
  const atConnectorLimit = connectorLimit !== null && realConnectedCount >= connectorLimit;
  const planLabel = entitlements.planTier.charAt(0).toUpperCase() + entitlements.planTier.slice(1);

  const startRealGmailOAuth = () => {
    const qs = new URLSearchParams({
      workspaceId: state.workspace.id,
      userEmail: state.currentUser.email,
      userId: state.currentUser.id,
    });
    window.location.href = `/api/connectors/gmail/auth?${qs.toString()}`;
  };
  const startGoogleDriveConsent = () => {
    window.location.href = `/api/connectors/google-drive/auth?workspaceId=${encodeURIComponent(state.workspace.id)}`;
  };
  const startDirectConnectorOAuth = (connectorId: "hubspot" | "slack" | "trello") => {
    window.location.href = `/api/connectors/${connectorId}/auth?workspaceId=${encodeURIComponent(state.workspace.id)}`;
  };

  const startRealMicrosoftOAuth = () => {
    const qs = new URLSearchParams({
      workspaceId: state.workspace.id,
      userEmail: state.currentUser.email,
      userId: state.currentUser.id,
    });
    window.location.href = `/api/connectors/microsoft/auth?${qs.toString()}`;
  };

  // Microsoft Teams reuses the same Microsoft OAuth route. "capability=teams"
  // asks Microsoft for the extra delegated Teams scopes through incremental
  // consent on the existing connection - it never creates a second Microsoft
  // account. Access tokens never reach this component.
  const startMicrosoftTeamsConsent = () => {
    const qs = new URLSearchParams({ workspaceId: state.workspace.id, capability: "teams" });
    window.location.href = `/api/connectors/microsoft/auth?${qs.toString()}`;
  };

  const startRealSalesforceOAuth = () => {
    const qs = new URLSearchParams({ workspaceId: state.workspace.id, userEmail: state.currentUser.email, userId: state.currentUser.id });
    window.location.href = `/api/connectors/salesforce/auth?${qs.toString()}`;
  };
  const startRealAsanaOAuth = () => {
    const qs = new URLSearchParams({ workspaceId: state.workspace.id });
    window.location.href = `/api/connectors/asana/auth?${qs.toString()}`;
  };
  const startRealJiraOAuth = () => { window.location.href = `/api/connectors/jira/auth?workspaceId=${encodeURIComponent(state.workspace.id)}`; };
  const startRealZendeskOAuth = () => {
    const value = zendeskSubdomain.trim();
    if (!value) { setZendeskSetupError("Enter your Zendesk workspace hostname, for example yourcompany.zendesk.com."); return; }
    window.location.href = `/api/connectors/zendesk/auth?workspaceId=${encodeURIComponent(state.workspace.id)}&subdomain=${encodeURIComponent(value)}`;
  };

  const disconnectRealConnector = async (connector: Connector) => {
    setDisconnectingConnectorId(connector.id);
    setFeedback("");
    try {
      const res = await fetch("/api/connectors/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, connectorKey: normalizeConnectorKey(connector.id) }),
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) {
        setFeedback(json.error || `Could not disconnect ${connector.name}.`);
        return;
      }
      disconnectConnector(connector.id);
      setDrawerConnectorId(null);
      setFeedback(`${connector.name} disconnected. Auterim no longer has access to this account.`);
      void refreshOperatorReadiness();
      router.refresh();
    } catch {
      setFeedback(`Could not disconnect ${connector.name}. Check your connection and try again.`);
    } finally {
      setDisconnectingConnectorId(null);
    }
  };

  useEffect(() => {
    if (drawerConnectorId !== "google_drive") return;
    void fetchDriveSettings();
    void fetchDriveFolders();
    // The picker is server-backed and remains bounded to folder metadata.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerConnectorId, state.workspace.id]);

  // Real, server-computed operator readiness (getWorkspaceOperatorReadiness) -
  // never re-derived client-side - powers the "What Auterim can do now"
  // section below.
  useEffect(() => {
    void refreshOperatorReadiness();
    // The readiness helper is intentionally stable in behavior but recreated
    // with the workspace session; avoid refetching on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.workspace.id, state.currentUser.id, state.currentUser.email]);

  // Only real capabilities from operators that can actually run today
  // (ready or draft_only + canRunManual) - never a fabricated combination.
  const whatAuterimCanDoNow = useMemo(() => {
    const actions = operatorReadiness
      .filter((r) => r.canRunManual && (r.status === "ready" || r.status === "draft_only"))
      .flatMap((r) => r.availableBusinessActions ?? humanizeOperatorActions(r.availableActions ?? []));
    return orderCapabilitySummary(actions);
  }, [operatorReadiness]);
  const visibleCapabilitySummary = capabilitiesExpanded ? whatAuterimCanDoNow : whatAuterimCanDoNow.slice(0, 5);

  // Real-connector-only workflow suggestions (see getRealWorkspaceSuggestedWorkflows,
  // src/lib/os/workflow-recommendations.ts) - never the mock/demo engine.
  const suggestedWorkflows = useMemo(() => getRealWorkspaceSuggestedWorkflows({
    connectedConnectorKeys,
    operatorReadiness: operatorReadiness.map((r) => ({ operatorKey: r.operatorKey, ready: r.status === "ready" || r.status === "draft_only" })),
  }), [connectedConnectorKeys, operatorReadiness]);

  // Connectors that are really connected but currently unhealthy (reconnect
  // required / connection error) - distinct from "never connected". Drives
  // the "Needs attention" degraded-connector section below.
  const degradedConnectors = useMemo(
    () => state.connectors.filter((c) => isRealConnectedConnector(c) && (c.health !== "healthy" || c.records.includes("Reconnect required"))),
    [state.connectors]
  );
  const degradedConnectorImpacts = useMemo(() => degradedConnectors.map((c) => {
    const connectorKey = normalizeConnectorKey(c.id);
    const impact = getWorkspaceConnectorImpact({ connectorKey, workspaceConnectorTruth: connectedConnectorKeys });
    return { connector: c, connectorKey, impact };
  }).filter((entry) => entry.impact.affectedOperators.length > 0), [degradedConnectors, connectedConnectorKeys]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    if (!connected) return;
    const connectedConnector = state.connectors.find((connector) => normalizeConnectorKey(connector.id) === connected);
    if (connected === "google_drive" && (!connectedConnector || connectedConnector.health !== "healthy")) {
      const needsFolder = !connectedConnector
        || connectedConnector.records.includes("Select a folder")
        || connectedConnector.records.includes("Select folders")
        || connectedConnector.records.includes("Drive access is ready");
      setFeedback(needsFolder
        ? "Google Drive access granted. Choose a folder to finish setup."
        : "Google Drive access granted, but verification is still pending. Open Drive setup to review it.");
    } else {
      // Real capability delta, not per-connector hardcoded prose - see
      // unlockMessageForConnector (src/lib/operators/unlock-copy.ts). Passing
      // real operatorReadiness lets it mention only live, genuinely affected
      // operators and workflow suggestions.
      setFeedback(unlockMessageForConnector({
        connectorKey: connected,
        connectedConnectorKeys,
        operatorReadiness: operatorReadiness.map((r) => ({ operatorKey: r.operatorKey, ready: r.status === "ready" || r.status === "draft_only" })),
      }));
    }
    router.replace("/app/connectors");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const oauthStatus = searchParams.get("gmail");
    if (!oauthStatus) return;
    const message = oauthStatus === "oauth_denied"
      ? "Google access was not granted. No connector was changed."
      : oauthStatus === "missing_code"
        ? "Google did not return an authorization code. Try again."
        : oauthStatus === "supabase_missing"
          ? "Google access could not be saved because the workspace connection service is unavailable."
          : "Google connection could not be completed. No success state was recorded.";
    setFeedback(message);
    router.replace("/app/connectors");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const teamsStatus = searchParams.get("microsoft_teams");
    if (!teamsStatus) return;
    setFeedback(teamsStatus === "forbidden"
      ? "Only a workspace owner or admin can enable Microsoft Teams."
      : "Microsoft Teams permissions were not granted. Teams stays unavailable until they are approved.");
    setDrawerConnectorId("microsoft_teams");
    router.replace("/app/connectors");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get("discover") !== "1") return;
    setAddOpen(true);
    setSetupConnectorId(null);
    setSearch(searchParams.get("q") ?? "");
    const requestedCategory = searchParams.get("category") as ConnectorDiscoveryCategory | null;
    setDiscoveryCategory(requestedCategory && CONNECTOR_DISCOVERY_CATEGORIES.some((category) => category.key === requestedCategory) ? requestedCategory : "all");
    router.replace("/app/connectors");
  }, [router, searchParams]);

  useEffect(() => {
    const setup = searchParams.get("setup");
    if (!setup) return;

    const setupMap: Record<string, string> = {
      gmail: "gmail",
      microsoft: "microsoft",
      hubspot: "hubspot",
      microsoft_teams: "microsoft_teams",
      "microsoft-teams": "microsoft_teams",
      slack: "slack",
      trello: "trello",
      asana: "asana",
      jira: "jira",
      google_drive: "google_drive",
      "google-drive": "google_drive",
      zendesk: "zendesk",
      intercom: "intercom",
      "slack-channel": "slack",
      "trello-project": "trello",
      "asana-project": "asana",
      "jira-project": "jira",
      "drive-folders": "google_drive",
    };
    const connectorId = setupMap[setup];
    if (!connectorId) return;

    const existing = state.connectors.find((connector) => normalizeConnectorKey(connector.id) === connectorId);
    const connected = existing && isRealConnectedConnector(existing);
    if (connected) {
      setAddOpen(false);
      setSetupConnectorId(null);
      setDrawerConnectorId(existing.id);
      if (setup === "slack-channel") setFeedback("Choose the Slack channel for internal approval alerts.");
      if (setup === "trello-project") setFeedback("Choose the Trello board and list for approved task updates.");
      if (setup === "asana-project") setFeedback("Choose the Asana project for approved task updates.");
      if (setup === "jira-project") setFeedback("Choose the Jira project for approved issue updates.");
      if (setup === "drive-folders") setFeedback("Choose the Google Drive folders available for document context.");
      return;
    }

    const available = availableCatalogConnectors.find((connector) => normalizeConnectorKey(connector.id) === connectorId);
    if (available) {
      setAddOpen(true);
      setSetupConnectorId(available.id);
      setSearch("");
      if (setup === "slack-channel") setFeedback("Connect Slack first, then choose the alert channel.");
      if (setup === "trello-project") setFeedback("Connect Trello first, then choose the board and list.");
    }
  }, [availableCatalogConnectors, searchParams, state.connectors]);

  useEffect(() => {
    setAdvancedOpen(false);
  }, [drawerConnectorId]);

  useEffect(() => {
    if (!addOpen && !drawerConnectorId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (setupConnectorId) setSetupConnectorId(null);
        else if (addOpen) setAddOpen(false);
        else setDrawerConnectorId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addOpen, drawerConnectorId, setupConnectorId]);

  const slackQueryString = () => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }).toString();

  const refreshOperatorReadiness = async () => {
    if (!state.workspace.id) return;
    const qs = new URLSearchParams({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email });
    try {
      const res = await fetch(`/api/operators/readiness?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { readiness?: { operatorKey: string; status: string; canRunManual: boolean; availableActions: string[]; availableBusinessActions?: string[] }[] };
      setOperatorReadiness(Array.isArray(json.readiness) ? json.readiness : []);
    } catch {
      // Keep the existing readiness projection visible if a background refresh fails.
    }
  };

  const fetchSlackSettings = async () => {
    setSlackSettingsLoading(true);
    setSlackSetupError("");
    try {
      const res = await fetch(`/api/connectors/slack/settings?${slackQueryString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { settings?: SlackAlertSettings; message?: string; error?: string };
      if (!res.ok || !json.settings) {
        setSlackSetupError(json.message || json.error || "Could not load Slack alert settings.");
        return;
      }
      setSlackAlertSettings(json.settings);
    } catch {
      setSlackSetupError("Could not load Slack alert settings.");
    } finally {
      setSlackSettingsLoading(false);
    }
  };

  const fetchSlackChannels = async () => {
    setSlackChannelsLoading(true);
    setSlackSetupError("");
    try {
      const res = await fetch(`/api/connectors/slack/channels?${slackQueryString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { channels?: SlackChannel[]; message?: string; error?: string };
      if (!res.ok || !Array.isArray(json.channels)) {
        setSlackChannels([]);
        setSlackSetupError(json.message || json.error || "Could not load Slack channels.");
        return;
      }
      setSlackChannels(json.channels);
    } catch {
      setSlackChannels([]);
      setSlackSetupError("Could not load Slack channels.");
    } finally {
      setSlackChannelsLoading(false);
    }
  };

  const saveSlackAlertSettings = async (patch: Partial<SlackAlertSettings>) => {
    setSlackSettingsSaving(true);
    setSlackSetupError("");
    const touchesChannel = Object.prototype.hasOwnProperty.call(patch, "slackDefaultChannelId");
    if (touchesChannel) setSlackChannelStatus("");
    try {
      const res = await fetch("/api/connectors/slack/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          userId: state.currentUser.id,
          userEmail: state.currentUser.email,
          ...patch,
        }),
      });
      const json = await res.json().catch(() => ({})) as { settings?: SlackAlertSettings; message?: string; error?: string; channelStatus?: string };
      if (!res.ok || !json.settings) {
        setSlackSetupError(json.message || json.error || "Could not save Slack alert settings.");
        if (touchesChannel && json.channelStatus) setSlackChannelStatus(json.channelStatus);
        return;
      }
      setSlackAlertSettings(json.settings);
      if (touchesChannel) setSlackChannelStatus(json.channelStatus || "");
      setFeedback("Slack alert settings saved.");
      void refreshOperatorReadiness();
    } catch {
      setSlackSetupError("Could not save Slack alert settings.");
    } finally {
      setSlackSettingsSaving(false);
    }
  };

  const fetchTrelloSettings = async () => {
    setTrelloSetupError("");
    try {
      const res = await fetch(`/api/connectors/trello/settings?${slackQueryString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { settings?: TrelloSettings; message?: string; error?: string };
      if (!res.ok || !json.settings) {
        setTrelloSetupError(json.message || json.error || "Could not load Trello settings.");
        return;
      }
      setTrelloSettings(json.settings);
    } catch {
      setTrelloSetupError("Could not load Trello settings.");
    }
  };

  const fetchTrelloBoards = async () => {
    setTrelloLoading(true);
    setTrelloSetupError("");
    try {
      const res = await fetch(`/api/connectors/trello/boards?${slackQueryString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { boards?: TrelloBoard[]; message?: string; error?: string };
      if (!res.ok || !Array.isArray(json.boards)) {
        setTrelloBoards([]);
        setTrelloSetupError(json.message || json.error || "Could not load Trello boards.");
        return;
      }
      setTrelloBoards(json.boards);
    } catch {
      setTrelloBoards([]);
      setTrelloSetupError("Could not load Trello boards.");
    } finally {
      setTrelloLoading(false);
    }
  };

  const fetchTrelloLists = async (boardId: string) => {
    if (!boardId) {
      setTrelloLists([]);
      return;
    }
    setTrelloLoading(true);
    setTrelloSetupError("");
    try {
      const qs = new URLSearchParams(slackQueryString());
      qs.set("boardId", boardId);
      const res = await fetch(`/api/connectors/trello/lists?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { lists?: TrelloList[]; message?: string; error?: string };
      if (!res.ok || !Array.isArray(json.lists)) {
        setTrelloLists([]);
        setTrelloSetupError(json.message || json.error || "Could not load Trello lists.");
        return;
      }
      setTrelloLists(json.lists);
    } catch {
      setTrelloLists([]);
      setTrelloSetupError("Could not load Trello lists.");
    } finally {
      setTrelloLoading(false);
    }
  };

  const saveTrelloSettings = async (patch: Partial<TrelloSettings>) => {
    setTrelloSaving(true);
    setTrelloSetupError("");
    try {
      const res = await fetch("/api/connectors/trello/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          userId: state.currentUser.id,
          userEmail: state.currentUser.email,
          ...patch,
        }),
      });
      const json = await res.json().catch(() => ({})) as { settings?: TrelloSettings; message?: string; error?: string };
      if (!res.ok || !json.settings) {
        setTrelloSetupError(json.message || json.error || "Could not save Trello settings.");
        return;
      }
      setTrelloSettings(json.settings);
      setFeedback("Trello settings saved.");
      void refreshOperatorReadiness();
    } catch {
      setTrelloSetupError("Could not save Trello settings.");
    } finally {
      setTrelloSaving(false);
    }
  };

  const fetchAsanaSettings = async () => {
    setAsanaSetupError("");
    try { const res = await fetch(`/api/connectors/asana/settings?workspaceId=${encodeURIComponent(state.workspace.id)}`, { cache: "no-store" }); const json = await res.json().catch(() => ({})) as AsanaSettings & { error?: string }; if (!res.ok) throw new Error(json.error || "Could not load Asana settings."); setAsanaSettings({ selectedWorkspaceId: json.selectedWorkspaceId ?? null, selectedWorkspaceName: json.selectedWorkspaceName ?? null, selectedProjectId: json.selectedProjectId ?? null, selectedProjectName: json.selectedProjectName ?? null }); } catch (error) { setAsanaSetupError(error instanceof Error ? error.message : "Could not load Asana settings."); }
  };
  const fetchAsanaWorkspaces = async () => {
    setAsanaLoading(true); setAsanaSetupError("");
    try { const res = await fetch(`/api/connectors/asana/workspaces?workspaceId=${encodeURIComponent(state.workspace.id)}`, { cache: "no-store" }); const json = await res.json().catch(() => ({})) as { workspaces?: AsanaWorkspace[]; error?: string }; if (!res.ok || !Array.isArray(json.workspaces)) throw new Error(json.error || "Could not load Asana workspaces."); setAsanaWorkspaces(json.workspaces); } catch (error) { setAsanaSetupError(error instanceof Error ? error.message : "Could not load Asana workspaces."); } finally { setAsanaLoading(false); }
  };
  const fetchAsanaProjects = async (workspaceGid: string) => {
    if (!workspaceGid) { setAsanaProjects([]); return; } setAsanaLoading(true); setAsanaSetupError("");
    try { const res = await fetch(`/api/connectors/asana/projects?workspaceId=${encodeURIComponent(state.workspace.id)}&asanaWorkspaceId=${encodeURIComponent(workspaceGid)}`, { cache: "no-store" }); const json = await res.json().catch(() => ({})) as { projects?: AsanaProject[]; error?: string }; if (!res.ok || !Array.isArray(json.projects)) throw new Error(json.error || "Could not load Asana projects."); setAsanaProjects(json.projects); } catch (error) { setAsanaSetupError(error instanceof Error ? error.message : "Could not load Asana projects."); } finally { setAsanaLoading(false); }
  };
  const saveAsanaSettings = async (next: Partial<AsanaSettings>) => {
    setAsanaSaving(true); setAsanaSetupError("");
    try { const payload = { workspaceId: state.workspace.id, ...asanaSettings, ...next }; const res = await fetch("/api/connectors/asana/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, selectedWorkspaceId: payload.selectedWorkspaceId, selectedWorkspaceName: payload.selectedWorkspaceName, selectedProjectId: payload.selectedProjectId, selectedProjectName: payload.selectedProjectName }) }); const json = await res.json().catch(() => ({})) as AsanaSettings & { error?: string }; if (!res.ok) throw new Error(json.error || "Could not save Asana settings."); setAsanaSettings({ selectedWorkspaceId: json.selectedWorkspaceId ?? null, selectedWorkspaceName: json.selectedWorkspaceName ?? null, selectedProjectId: json.selectedProjectId ?? null, selectedProjectName: json.selectedProjectName ?? null }); setFeedback("Asana settings saved."); void refreshOperatorReadiness(); } catch (error) { setAsanaSetupError(error instanceof Error ? error.message : "Could not save Asana settings."); } finally { setAsanaSaving(false); }
  };
  const fetchJiraSettings = async () => { setJiraSetupError(""); try { const res = await fetch(`/api/connectors/jira/settings?workspaceId=${encodeURIComponent(state.workspace.id)}`, { cache: "no-store" }); const json = await res.json().catch(() => ({})) as JiraSettings & { error?: string }; if (!res.ok) throw new Error(json.error || "Could not load Jira settings."); setJiraSettings({ cloudId: json.cloudId ?? null, siteName: json.siteName ?? null, siteUrl: json.siteUrl ?? null, selectedProjectId: json.selectedProjectId ?? null, selectedProjectKey: json.selectedProjectKey ?? null, selectedProjectName: json.selectedProjectName ?? null, selectedIssueTypeId: json.selectedIssueTypeId ?? null, selectedIssueTypeName: json.selectedIssueTypeName ?? null }); } catch (error) { setJiraSetupError(error instanceof Error ? error.message : "Could not load Jira settings."); } };
  const fetchZendeskSettings = async () => { setZendeskSetupError(""); try { const res = await fetch(`/api/connectors/zendesk/settings?workspaceId=${encodeURIComponent(state.workspace.id)}`, { cache: "no-store" }); const json = await res.json().catch(() => ({})) as ZendeskSettings & { error?: string }; if (!res.ok) throw new Error(json.error || "Could not load Zendesk settings."); setZendeskSettings({ subdomain: json.subdomain ?? null, baseUrl: json.baseUrl ?? null, siteUrl: json.siteUrl ?? null, syncCursor: json.syncCursor ?? null }); setZendeskSubdomain(json.subdomain ?? ""); } catch (error) { setZendeskSetupError(error instanceof Error ? error.message : "Could not load Zendesk settings."); } };
  const fetchDriveSettings = async () => { setDriveSetupError(""); try { const res = await fetch(`/api/connectors/google-drive/settings?workspaceId=${encodeURIComponent(state.workspace.id)}`, { cache: "no-store" }); const json = await res.json().catch(() => ({})) as { settings?: DriveSettings; error?: string }; if (!res.ok || !json.settings) throw new Error(json.error || "Could not load Google Drive settings."); setDriveSettings(json.settings); } catch (error) { setDriveSetupError(error instanceof Error ? error.message : "Could not load Google Drive settings."); } };
  const fetchDriveFolders = async () => { setDriveLoading(true); setDriveSetupError(""); try { const res = await fetch(`/api/connectors/google-drive/folders?workspaceId=${encodeURIComponent(state.workspace.id)}`, { cache: "no-store" }); const json = await res.json().catch(() => ({})) as { folders?: DriveFolder[]; error?: string }; if (!res.ok || !Array.isArray(json.folders)) throw new Error(json.error || "Could not list Google Drive folders."); setDriveFolders(json.folders); } catch (error) { setDriveSetupError(error instanceof Error ? error.message : "Could not list Google Drive folders."); } finally { setDriveLoading(false); } };
  const saveDriveSettings = async (folder: DriveFolder | null) => { setDriveSaving(true); setDriveSetupError(""); try { const folders = folder ? [folder] : []; const res = await fetch("/api/connectors/google-drive/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: state.workspace.id, enabled: Boolean(folder), folders }) }); const json = await res.json().catch(() => ({})) as { settings?: DriveSettings; error?: string }; if (!res.ok || !json.settings) throw new Error(json.error || "Could not save Google Drive settings."); setDriveSettings(json.settings); setFeedback(folder ? "Google Drive folder scope saved." : "Google Drive disabled; Gmail remains connected."); void refreshOperatorReadiness(); } catch (error) { setDriveSetupError(error instanceof Error ? error.message : "Could not save Google Drive settings."); } finally { setDriveSaving(false); } };
  const fetchJiraProjects = async () => { setJiraLoading(true); setJiraSetupError(""); try { const res = await fetch(`/api/connectors/jira/projects?workspaceId=${encodeURIComponent(state.workspace.id)}`, { cache: "no-store" }); const json = await res.json().catch(() => ({})) as { projects?: JiraProject[]; error?: string }; if (!res.ok || !Array.isArray(json.projects)) throw new Error(json.error || "Could not load Jira projects."); setJiraProjects(json.projects); } catch (error) { setJiraSetupError(error instanceof Error ? error.message : "Could not load Jira projects."); } finally { setJiraLoading(false); } };
  const fetchJiraIssueTypes = async (projectId: string) => { if (!projectId) { setJiraIssueTypes([]); return; } setJiraLoading(true); setJiraSetupError(""); try { const res = await fetch(`/api/connectors/jira/metadata?workspaceId=${encodeURIComponent(state.workspace.id)}`, { cache: "no-store" }); const json = await res.json().catch(() => ({})) as { issueTypes?: JiraIssueType[]; error?: string }; if (!res.ok || !Array.isArray(json.issueTypes)) throw new Error(json.error || "Could not load Jira issue types."); setJiraIssueTypes(json.issueTypes.filter((item) => item.subtask !== true && item.createable !== false)); } catch (error) { setJiraSetupError(error instanceof Error ? error.message : "Could not load Jira issue types."); } finally { setJiraLoading(false); } };
  const saveJiraSettings = async (project: JiraProject | null, issueType?: JiraIssueType | null) => { setJiraSaving(true); setJiraSetupError(""); try { const res = await fetch("/api/connectors/jira/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: state.workspace.id, selectedProjectId: project ? project.id : jiraSettings.selectedProjectId, selectedIssueTypeId: issueType === undefined ? jiraSettings.selectedIssueTypeId : issueType?.id ?? null }) }); const json = await res.json().catch(() => ({})) as JiraSettings & { error?: string }; if (!res.ok) throw new Error(json.error || "Could not save Jira settings."); setJiraSettings((current) => ({ ...current, selectedProjectId: json.selectedProjectId ?? null, selectedProjectKey: json.selectedProjectKey ?? null, selectedProjectName: json.selectedProjectName ?? null, selectedIssueTypeId: json.selectedIssueTypeId ?? null, selectedIssueTypeName: json.selectedIssueTypeName ?? null })); setFeedback(issueType === undefined ? "Jira project scope saved." : "Jira issue type saved."); void refreshOperatorReadiness(); } catch (error) { setJiraSetupError(error instanceof Error ? error.message : "Could not save Jira settings."); } finally { setJiraSaving(false); } };

  const fetchTeamsSettings = async () => {
    setTeamsSetupError("");
    try {
      const res = await fetch(`/api/connectors/microsoft/teams/settings?${slackQueryString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { settings?: TeamsSettings; message?: string; error?: string };
      if (!res.ok || !json.settings) {
        setTeamsSetupError(json.message || json.error || "Could not load Microsoft Teams settings.");
        return null;
      }
      setTeamsSettings(json.settings);
      return json.settings;
    } catch {
      setTeamsSetupError("Could not load Microsoft Teams settings.");
      return null;
    }
  };

  const fetchTeamsTeams = async () => {
    setTeamsLoading(true);
    setTeamsSetupError("");
    try {
      const res = await fetch(`/api/connectors/microsoft/teams/channels?${slackQueryString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { teams?: TeamsTeam[]; message?: string; error?: string };
      if (!res.ok || !Array.isArray(json.teams)) {
        setTeamsTeams([]);
        setTeamsSetupError(json.message || json.error || "Could not load your Microsoft Teams teams.");
        return;
      }
      setTeamsTeams(json.teams);
    } catch {
      setTeamsTeams([]);
      setTeamsSetupError("Could not load your Microsoft Teams teams.");
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchTeamsChannels = async (teamId: string) => {
    if (!teamId) {
      setTeamsChannels([]);
      return;
    }
    setTeamsLoading(true);
    setTeamsSetupError("");
    try {
      const qs = new URLSearchParams(slackQueryString());
      qs.set("teamId", teamId);
      const res = await fetch(`/api/connectors/microsoft/teams/channels?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { channels?: TeamsChannel[]; message?: string; error?: string };
      if (!res.ok || !Array.isArray(json.channels)) {
        setTeamsChannels([]);
        setTeamsSetupError(json.message || json.error || "Could not load Microsoft Teams channels.");
        return;
      }
      setTeamsChannels(json.channels);
    } catch {
      setTeamsChannels([]);
      setTeamsSetupError("Could not load Microsoft Teams channels.");
    } finally {
      setTeamsLoading(false);
    }
  };

  const saveTeamsSettings = async (patch: { enabled?: boolean; defaultTeamId?: string | null; defaultChannelId?: string | null }) => {
    setTeamsSaving(true);
    setTeamsSetupError("");
    try {
      const res = await fetch("/api/connectors/microsoft/teams/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, ...patch }),
      });
      const json = await res.json().catch(() => ({})) as { settings?: TeamsSettings; message?: string; error?: string };
      if (!res.ok || !json.settings) {
        setTeamsSetupError(json.message || json.error || "Could not save Microsoft Teams settings.");
        return;
      }
      setTeamsSettings(json.settings);
      setFeedback("Microsoft Teams settings saved.");
      void refreshOperatorReadiness();
      router.refresh();
    } catch {
      setTeamsSetupError("Could not save Microsoft Teams settings.");
    } finally {
      setTeamsSaving(false);
    }
  };

  useEffect(() => {
    if (drawerConnectorId !== "microsoft_teams") return;
    void (async () => {
      const settings = await fetchTeamsSettings();
      if (settings?.enabled && settings.readGranted) {
        await fetchTeamsTeams();
        if (settings.defaultTeamId) await fetchTeamsChannels(settings.defaultTeamId);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerConnectorId]);

  useEffect(() => {
    if (drawerConnectorId !== "slack" || !drawerConnector || !isRealConnectedConnector(drawerConnector)) return;
    void fetchSlackSettings();
    void fetchSlackChannels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerConnectorId]);

  useEffect(() => {
    if (drawerConnectorId !== "trello" || !drawerConnector || !isRealConnectedConnector(drawerConnector)) return;
    void fetchTrelloSettings();
    void fetchTrelloBoards();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerConnectorId]);

  useEffect(() => {
    if (drawerConnectorId !== "trello" || !trelloSettings.defaultBoardId) return;
    void fetchTrelloLists(trelloSettings.defaultBoardId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerConnectorId, trelloSettings.defaultBoardId]);

  useEffect(() => {
    if (drawerConnectorId !== "asana" || !drawerConnector || !isRealConnectedConnector(drawerConnector)) return;
    void fetchAsanaSettings();
    void fetchAsanaWorkspaces();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerConnectorId]);

  useEffect(() => {
    if (drawerConnectorId !== "asana" || !asanaSettings.selectedWorkspaceId) return;
    void fetchAsanaProjects(asanaSettings.selectedWorkspaceId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerConnectorId, asanaSettings.selectedWorkspaceId]);

  useEffect(() => {
    if (drawerConnectorId !== "jira" || !drawerConnector || !isRealConnectedConnector(drawerConnector)) return;
    void fetchJiraSettings(); void fetchJiraProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerConnectorId]);

  useEffect(() => {
    if (drawerConnectorId !== "jira" || !jiraSettings.selectedProjectId) return;
    void fetchJiraIssueTypes(jiraSettings.selectedProjectId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerConnectorId, jiraSettings.selectedProjectId]);

  useEffect(() => {
    if (drawerConnectorId !== "zendesk" || !drawerConnector || !isRealConnectedConnector(drawerConnector)) return;
    void fetchZendeskSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerConnectorId]);

  return (
    <div className="os-page connectors-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Auterim workspace</span>
          <h1>Connect your business</h1>
          <div className="os-page-sub">
            Connect your systems. See what your operators can do.
          </div>
          {isPreview && (
            <div style={{ marginTop: 8, color: "#9DEFEA", fontSize: 12.5 }}>
              Preview connections use sample data. Choose a plan to connect real accounts.
            </div>
          )}
        </div>
        <div className="os-page-actions">
          {atConnectorLimit ? (
            <Link
              href="/plans"
              className="btn btn-sm"
              style={{ background: "rgba(77,232,225,0.08)", color: "#4DE8E1", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.22)" }}
            >
              <PlusIcon size={12} /> Upgrade to add more
            </Link>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setSetupConnectorId(null); setSearch(""); setDiscoveryCategory("all"); }}>
              <PlusIcon size={12} /> Add connector
            </button>
          )}
        </div>
      </div>

      {connectorLimit !== null && (
        <UsageBanner used={realConnectedCount} max={connectorLimit} label="connectors" planLabel={planLabel} />
      )}

      {feedback && <div role="status" style={{ color: "#64ffd7", fontSize: 12 }}>{feedback}</div>}

      {/* Systems this workspace said it already uses during onboarding, not
          yet actually connected. Highlighted first and prioritized over the
          generic catalog, per the onboarding brief - never marked
          "connected" from the onboarding selection alone. */}
      {onboardingHighlightConnectors.length > 0 && (
        <div className="p connector-priorities">
          <div className="p-head">
            <h3>Systems you already use</h3>
            <div className="p-meta">Selected during setup</div>
          </div>
          <div className="connector-priority-grid">
            {onboardingHighlightConnectors.map((c) => (
              <button
                key={c.id}
                onClick={() => { setAddOpen(true); setSetupConnectorId(c.id); setSearch(""); }}
                className="connector-priority-card"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div className="connector-brand-logo" style={{ width: 28, height: 28, borderRadius: 8 }}>{IntegrationLogos[c.name] ?? <span style={{ color: c.color, fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{c.letter}</span>}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>Connect it to bring your team’s work into Auterim.</div>
                <div style={{ marginTop: 8, color: "var(--cyan)", fontSize: 11.5, fontWeight: 600 }}>Connect</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Degraded connectors: a connector that is really connected but
          currently unhealthy, and what that actually costs each real
          operator - never destroys saved configuration, purely descriptive.
          See getWorkspaceConnectorImpact (connector-requirements.ts). */}
      {degradedConnectorImpacts.length > 0 && (
        <div className="p" style={{ borderRadius: 16, background: "rgba(245,194,107,0.045)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.2)" }}>
          <div className="p-head">
            <h3>Needs attention</h3>
            <div className="p-meta">{degradedConnectorImpacts.length} connector{degradedConnectorImpacts.length === 1 ? "" : "s"}</div>
          </div>
          <div style={{ padding: "14px 18px", display: "grid", gap: 14 }}>
            {degradedConnectorImpacts.map(({ connector, impact }) => (
              <div key={connector.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div className="connector-brand-logo" style={{ width: 24, height: 24, borderRadius: 7 }}>{IntegrationLogos[connector.name] ?? <span style={{ color: connector.color, fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{connector.letter}</span>}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{connector.name}</div>
                  <span style={{ fontSize: 11, color: "var(--amber)" }}>Reconnect required</span>
                </div>
                <div style={{ display: "grid", gap: 6, marginLeft: 32 }}>
                  {impact.affectedOperators.map((entry) => (
                    <div key={entry.operatorKey} style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      <strong>{getOperatorDefinition(entry.operatorKey)?.name ?? entry.operatorKey}</strong>
                      {entry.impact === "hard_requirement"
                        ? <> — needs attention: reconnect to resume monitoring.</>
                        : <> — {humanizeCapabilities(entry.lostCapabilities).join(", ")} unavailable{entry.stillAvailableCapabilities.length ? `, still available: ${humanizeCapabilities(entry.stillAvailableCapabilities).join(", ")}` : ""}.</>}
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8, marginLeft: 32 }} onClick={() => setDrawerConnectorId(connector.id)}>Reconnect {connector.name}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real, capability-derived business outcomes - only ever populated from
          operators that can actually run today (see whatAuterimCanDoNow). */}
      {whatAuterimCanDoNow.length > 0 && (
        <div className="p" style={{ borderRadius: 16, background: "linear-gradient(145deg, rgba(77,232,225,0.045), rgba(255,255,255,0.012))" }}>
          <div className="p-head" style={{ alignItems: "flex-start" }}>
            <h3>What Auterim can do now</h3>
            <div className="p-meta">{whatAuterimCanDoNow.length} live {whatAuterimCanDoNow.length === 1 ? "capability" : "capabilities"}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8, padding: "14px 18px 16px" }}>
            {visibleCapabilitySummary.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, padding: "9px 10px", borderRadius: 9, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)", fontSize: 12, color: "var(--text-dim)" }}>
                <span style={{ width: 18, height: 18, flex: "0 0 auto", borderRadius: 999, display: "grid", placeItems: "center", color: "var(--cyan)", background: "rgba(77,232,225,0.08)", fontSize: 11 }}>✓</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item}</span>
              </div>
            ))}
          </div>
          {whatAuterimCanDoNow.length > 5 && (
            <div style={{ padding: "0 18px 14px" }}>
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--text-mute)", fontSize: 11 }} onClick={() => setCapabilitiesExpanded((expanded) => !expanded)}>
                {capabilitiesExpanded ? "Show fewer" : `+${whatAuterimCanDoNow.length - 5} more`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Suggested workflows: real-connector-only combos (see
          getRealWorkspaceSuggestedWorkflows). Never executes a workflow
          directly - only routes to the relevant operator's detail page to
          inspect/configure/activate. */}
      {suggestedWorkflows.length > 0 && (
        <div className="p" style={{ borderRadius: 16 }}>
          <div className="p-head">
            <h3>Suggested workflows</h3>
            <div className="p-meta">Ready to set up</div>
          </div>
          <div className="connector-workflows">
            {suggestedWorkflows.map((workflow) => (
              <div key={workflow.id} className="connector-workflow">
                <div style={{ fontSize: 13, fontWeight: 600 }}>{workflow.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{workflow.description}</div>
                <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{workflow.requiredConnectors.map((key) => getConnectorDefinition(key)?.displayName ?? key).join(" + ")}<br />{getOperatorDefinition(workflow.operatorKey)?.name ?? workflow.operatorKey}</div>
                <Link href={workflow.href} className="lnk-open" style={{ marginTop: 4 }}>View setup</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected tools */}
      <div className="p connectors-list" style={{ borderRadius: 16 }}>
        <div className="p-head">
          <h3><LinkIcon size={13} /> Connected tools</h3>
          <div className="p-meta">
            {realConnectedCount > 0 ? <><span className="dot dot-green" /> {healthyCount}/{realConnectedCount} healthy</> : "None yet"}
          </div>
        </div>
        {realConnectedConnectors.length === 0 ? (
          <div className="os-empty-state">
            <div style={{ color: "var(--text)", fontSize: 17, fontWeight: 600, marginBottom: 7 }}>Connect your first business tool</div>
            <div style={{ marginBottom: 18 }}>Add the systems Auterim should understand and work with.</div>
            <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setSetupConnectorId(null); setSearch(""); setDiscoveryCategory("all"); }}><PlusIcon size={12} /> Add connector</button>
          </div>
        ) : (
          <>
            <div style={{ display: "none" }}>
              <div />
              <div>Connector</div>
              <div>Purpose</div>
              <div>Setup</div>
              <div>Last checked</div>
              <div>Manage</div>
            </div>
            {realConnectedConnectors.map((c) => (
              <button
                key={c.id}
                className="connector-list-row"
                onClick={() => setDrawerConnectorId(c.id)}
                style={{ width: "100%", textAlign: "left", border: "none", background: "none", borderBottom: "1px solid var(--line)", padding: "17px 18px", display: "grid", gridTemplateColumns: "40px 1fr auto", alignItems: "center", gap: 14, cursor: "pointer" }}
              >
                <div className="connector-brand-logo" style={{ width: 34, height: 34, borderRadius: 10 }}>
                  {IntegrationLogos[c.name] ?? <span style={{ color: c.color, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{c.letter}</span>}
                </div>
                <div className="connector-list-copy">
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>{connectorCapabilities(c.id)[0]}</div>
                </div>
                <div className="connector-manage">Manage</div>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Add connector modal */}
      {addOpen && (
        <div className="os-modal-backdrop" onClick={() => { setAddOpen(false); setSetupConnectorId(null); }}>
          <div className={`os-modal ${!setupConnector ? "connector-finder-modal" : ""}`} style={{ width: "min(760px, 94vw)", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            {!setupConnector ? (
              <>
                <div className="os-modal-head">
                  <h3>Find a connector</h3>
                  <button className="appr-btn deny" onClick={() => setAddOpen(false)}>Close</button>
                </div>
                <div className="connector-finder-intro">Choose the systems that give your workforce more context and useful actions.</div>
                <div className="connector-finder-body">
                  <input className="os-input" placeholder="Search systems..." aria-label="Search connector systems" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <div className="connector-discovery-filters" aria-label="Connector categories">
                    {CONNECTOR_DISCOVERY_CATEGORIES.map((category) => (
                      <button
                        type="button"
                        key={category.key}
                        aria-pressed={discoveryCategory === category.key}
                        className={discoveryCategory === category.key ? "on" : ""}
                        onClick={() => setDiscoveryCategory(category.key)}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                  {filteredAvailable.length > 0 ? (
                    <div className="connector-finder-grid">
                      {filteredAvailable.map((c) => {
                        const connectorKey = normalizeConnectorKey(c.id);
                        const definition = getConnectorDefinition(connectorKey);
                        const discoveryState = connectorDiscoveryState(c);
                        const operators = connectorOperatorNames(connectorKey).map(shortOperatorLabel);
                        return (
                          <button className="connector-finder-card" key={c.id} onClick={() => { if (isRealConnectedConnector(c)) { setAddOpen(false); setDrawerConnectorId(c.id); } else setSetupConnectorId(c.id); }}>
                            <div className="connector-finder-card-head">
                              <div className="connector-brand-logo" style={{ width: 30, height: 30, borderRadius: 9 }}>{IntegrationLogos[c.name] ?? <span style={{ color: c.color, fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{c.letter}</span>}</div>
                              <div><strong>{c.name}</strong><span>{definition ? connectorCategoryLabel(definition) : CONNECTOR_CATEGORY_LABELS.custom_api}</span></div>
                            </div>
                            <p>{connectorCapabilities(connectorKey)[0] ?? "Useful workspace context"}</p>
                            {operators.length > 0 && <small>For {operators.join(" · ")}</small>}
                            <div className="connector-finder-card-foot" style={{ color: discoveryState.color }}><span>{discoveryState.status}</span><span>{discoveryState.action} →</span></div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="os-empty-state" style={{ padding: "24px 16px" }}>No live connectors match this search.</div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="os-modal-head">
                  <h3>Setup connector</h3>
                  <button className="appr-btn deny" onClick={() => setSetupConnectorId(null)}>Back</button>
                </div>
                <ConnectorSetupView connector={setupConnector} isRealConnected={false} isPreview={isPreview} />
                {setupConnector.id === "gmail" && (
                  <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>Connect securely with Google</div>
                )}
                {setupConnector.id === "microsoft" && (
                  <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>Connect securely with Microsoft</div>
                )}
                {setupConnector.id === "microsoft_teams" && (
                  <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>
                    Uses your Microsoft sign-in. Microsoft will ask for the extra Teams permissions. Your Microsoft tenant administrator may need to approve reading channel messages.
                  </div>
                )}
                {setupConnector.id === "zendesk" && (
                  <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
                    <label style={{ fontSize: 11.5, color: "var(--text-mute)" }} htmlFor="zendesk-subdomain">Zendesk workspace</label>
                    <input id="zendesk-subdomain" className="os-input" placeholder="yourcompany.zendesk.com" value={zendeskSubdomain} onChange={(event) => { setZendeskSubdomain(event.target.value); setZendeskSetupError(""); }} />
                    <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Use the standard *.zendesk.com workspace hostname. Auterim validates it before redirecting to Zendesk.</div>
                    {zendeskSetupError && <div style={{ fontSize: 11.5, color: "#ffaaaa" }}>{zendeskSetupError}</div>}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSetupConnectorId(null)}>Cancel</button>
                  {isConnectorAvailableForAuth(normalizeConnectorKey(setupConnector.id)) ? (
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      if (isPreview || atConnectorLimit) {
                        setUpgradeOpen(true);
                        return;
                      }
                      if (setupConnector.id === "gmail") {
                        startRealGmailOAuth();
                        return;
                      }
                      if (setupConnector.id === "google_drive") {
                        startGoogleDriveConsent();
                        return;
                      }
                      if (setupConnector.id === "microsoft") {
                        startRealMicrosoftOAuth();
                        return;
                      }
                      if (setupConnector.id === "microsoft_teams") {
                        startMicrosoftTeamsConsent();
                        return;
                      }
                      if (setupConnector.id === "salesforce") {
                        startRealSalesforceOAuth();
                        return;
                      }
                      if (setupConnector.id === "asana") {
                        startRealAsanaOAuth();
                        return;
                      }
                      if (setupConnector.id === "jira") {
                        startRealJiraOAuth();
                        return;
                      }
                      if (setupConnector.id === "zendesk") {
                        startRealZendeskOAuth();
                        return;
                      }
                      if (setupConnector.id === "hubspot") {
                        startDirectConnectorOAuth("hubspot");
                        return;
                      }
                      if (setupConnector.id === "slack" || setupConnector.id === "trello") {
                        startDirectConnectorOAuth(setupConnector.id);
                        return;
                      }
                    }}>Connect real account</button>
                  ) : (
                    <button className="btn btn-sm" disabled title="This connector is not available to connect yet." style={{ opacity: 0.55, cursor: "not-allowed" }}>
                      Coming soon
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Connector detail drawer */}
      {drawerConnector && (
        <div className="os-modal-backdrop" onClick={() => setDrawerConnectorId(null)}>
          <div className="os-modal" style={{ width: "min(820px, 94vw)", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>{drawerConnector.name} details</h3>
              <button className="appr-btn deny" onClick={() => setDrawerConnectorId(null)}>Close</button>
            </div>
            <ConnectorSetupView
              connector={drawerConnector}
              isRealConnected={isRealConnectedConnector(drawerConnector)}
              isPreview={isPreview}
              advancedOpen={advancedOpen}
              onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
              statusMeta={connectorStatusLabel({
                connector: drawerConnector,
                isRealConnected: isRealConnectedConnector(drawerConnector),
                slackReady: drawerSlackReady,
                trelloReady: drawerTrelloReady,
                asanaReady: drawerAsanaReady,
                jiraReady: drawerJiraReady,
              })}
            />
            {drawerConnector.id === "gmail" && drawerConnector.isConnected && (drawerConnector.health !== "healthy" || drawerConnector.records.includes("Reconnect required")) && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(245,194,107,0.08)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.2)", fontSize: 12, color: "var(--amber)" }}>
                {drawerConnector.records.includes("opportunity scanning")
                  ? "Reconnect required to enable opportunity scanning. Existing Gmail credentials do not include Gmail readonly scope."
                  : "Reconnect required to enable send permissions. Existing Gmail credentials do not include Gmail send scope."}
              </div>
            )}
            {drawerConnector.id === "microsoft" && drawerConnector.isConnected && (drawerConnector.health !== "healthy" || drawerConnector.records.includes("Reconnect required")) && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(245,194,107,0.08)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.2)", fontSize: 12, color: "var(--amber)" }}>
                Reconnect required to restore Microsoft 365 access. This can happen if Microsoft permissions were revoked, or if required scopes are missing.
              </div>
            )}
            {drawerConnector.id === "google_drive" && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)", display: "grid", gap: 9 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 650 }}>Document scope</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 3 }}>Auterim only uses files inside this folder.</div>
                </div>
                <label className="lab" htmlFor="drive-folder-select">Selected folder</label>
                <select id="drive-folder-select" className="os-input" value={driveSettings.folders[0]?.folderId ?? ""} disabled={driveLoading || driveSaving} onChange={(event) => { const selected = driveFolders.find((folder) => folder.folderId === event.target.value) ?? null; void saveDriveSettings(selected); }}>
                  <option value="">{driveLoading ? "Loading folders..." : "Select a folder"}</option>
                  {driveFolders.map((folder) => <option key={folder.folderId} value={folder.folderId}>{folder.folderName}</option>)}
                </select>
                <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Google account access is shared with Gmail. Disabling Drive does not disconnect Gmail.</div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {advancedOpen && <button className="btn btn-ghost btn-sm" style={{ color: "var(--text-mute)", fontSize: 11 }} onClick={fetchDriveFolders} disabled={driveLoading}>Refresh folders</button>}
                </div>
                {driveSetupError && <div style={{ fontSize: 11.5, color: "var(--amber)" }}>{driveSetupError}</div>}
              </div>
            )}
            {drawerConnector.id === "slack" && isRealConnectedConnector(drawerConnector) && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>Internal Slack alerts</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2 }}>
                      Customer email still requires approval before sending.
                    </div>
                  </div>
                  <button
                    className={`appr-btn ${slackAlertSettings.slackNotificationsEnabled && slackAlertSettings.slackApprovalAlertsEnabled ? "approve" : "edit"}`}
                    disabled={slackSettingsLoading || slackSettingsSaving}
                    onClick={() => saveSlackAlertSettings({
                      slackNotificationsEnabled: !(slackAlertSettings.slackNotificationsEnabled && slackAlertSettings.slackApprovalAlertsEnabled),
                      slackApprovalAlertsEnabled: !(slackAlertSettings.slackNotificationsEnabled && slackAlertSettings.slackApprovalAlertsEnabled),
                    })}
                  >
                    {slackAlertSettings.slackNotificationsEnabled && slackAlertSettings.slackApprovalAlertsEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                  <select
                    className="os-input"
                    value={slackAlertSettings.slackDefaultChannelId ?? ""}
                    disabled={slackChannelsLoading || slackSettingsSaving}
                    onChange={(event) => {
                      const selected = slackChannels.find((channel) => channel.id === event.target.value) ?? null;
                      void saveSlackAlertSettings({
                        slackDefaultChannelId: selected?.id ?? null,
                        slackDefaultChannelName: selected?.name ?? null,
                      });
                    }}
                  >
                    <option value="">{slackChannelsLoading ? "Loading channels..." : "Select alert channel"}</option>
                    {slackChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.isPrivate ? "private: " : "#"}{channel.name}{channel.isPrivate && !channel.isMember ? " - invite required" : ""}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={fetchSlackChannels} disabled={slackChannelsLoading}>
                    Refresh
                  </button>
                </div>
                {(() => {
                  const selected = slackChannels.find((channel) => channel.id === slackAlertSettings.slackDefaultChannelId) ?? null;
                  const guidance = (() => {
                    if (slackChannelStatus === "reconnect_required") return { text: "Reconnect Slack to allow Auterim to join public channels automatically.", tone: "var(--amber)" };
                    if (!selected) {
                      if (!slackAlertSettings.slackDefaultChannelId) return { text: "No default channel selected. Auterim will not send Slack approval alerts.", tone: "var(--amber)" };
                      return { text: `Default channel: ${slackAlertSettings.slackDefaultChannelName ? `#${slackAlertSettings.slackDefaultChannelName}` : slackAlertSettings.slackDefaultChannelId}`, tone: "#9DEFEA" };
                    }
                    if (selected.isPrivate && !selected.isMember) return { text: "Private channel: invite Auterim to this channel first, then refresh.", tone: "var(--amber)" };
                    if (!selected.isPrivate && !selected.isMember && !slackChannelStatus) return { text: "Auterim will join this public channel automatically when you save.", tone: "var(--text-mute)" };
                    return { text: "Auterim can send internal approval alerts to this channel.", tone: "#9DEFEA" };
                  })();
                  return <div style={{ fontSize: 11.5, color: guidance.tone }}>{guidance.text}</div>;
                })()}
                {slackChannelStatus && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: slackChannelStatus === "channel_ready" || slackChannelStatus === "joined_public" ? "var(--green)" : "var(--amber)" }}>
                    {slackChannelStatus === "joined_public"
                      ? "Joined public channel"
                      : slackChannelStatus === "channel_ready"
                        ? "Channel ready for internal alerts"
                        : slackChannelStatus === "invite_required"
                          ? "Invite required for private channel"
                          : slackChannelStatus === "reconnect_required"
                            ? "Reconnect Slack required"
                            : "Channel not saved"}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    ["notifyOnRevenueApprovalCreated", "Approval created"],
                    ["notifyOnApprovalApproved", "Approved"],
                    ["notifyOnApprovalRejected", "Rejected"],
                    ["notifyOnExecutionFailed", "Execution failed"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      className={`appr-btn ${slackAlertSettings[key as keyof SlackAlertSettings] ? "approve" : "edit"}`}
                      disabled={slackSettingsSaving}
                      onClick={() => saveSlackAlertSettings({ [key]: !slackAlertSettings[key as keyof SlackAlertSettings] } as Partial<SlackAlertSettings>)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {slackSetupError && (
                  <div style={{ fontSize: 11.5, color: "#ffaaaa" }}>{slackSetupError}</div>
                )}
              </div>
            )}
            {drawerConnector.id === "microsoft_teams" && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>Microsoft Teams access</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2 }}>
                      {!teamsSettings?.microsoftConnected
                        ? "Connect Microsoft first, then grant Teams permissions."
                        : !teamsSettings.readGranted
                          ? "Microsoft account connected. Additional Teams permissions are required."
                          : teamsSettings.enabled
                            ? "Teams ready."
                            : "Teams permissions granted. Enable Teams to start using it."}
                    </div>
                  </div>
                  {teamsSettings?.microsoftConnected && !teamsSettings.readGranted && (
                    <button className="btn btn-primary btn-sm" onClick={startMicrosoftTeamsConsent}>Grant Teams access</button>
                  )}
                  {teamsSettings?.readGranted && (
                    <button
                      className={`appr-btn ${teamsSettings.enabled ? "approve" : "edit"}`}
                      disabled={teamsSaving}
                      onClick={() => void saveTeamsSettings({ enabled: !teamsSettings.enabled })}
                    >
                      {teamsSettings.enabled ? "Enabled" : "Disabled"}
                    </button>
                  )}
                </div>
                {teamsSettings?.enabled && teamsSettings.readGranted && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <select
                        className="os-input"
                        value={teamsSettings.defaultTeamId ?? ""}
                        disabled={teamsLoading || teamsSaving}
                        onChange={(event) => {
                          setTeamsChannels([]);
                          const teamId = event.target.value || null;
                          void saveTeamsSettings({ defaultTeamId: teamId, defaultChannelId: null });
                          if (teamId) void fetchTeamsChannels(teamId);
                        }}
                      >
                        <option value="">{teamsLoading ? "Loading teams..." : "Select a team"}</option>
                        {teamsTeams.map((team) => <option key={team.id} value={team.id}>{team.displayName}</option>)}
                      </select>
                      <select
                        className="os-input"
                        value={teamsSettings.defaultChannelId ?? ""}
                        disabled={teamsLoading || teamsSaving || !teamsSettings.defaultTeamId}
                        onChange={(event) => void saveTeamsSettings({ defaultChannelId: event.target.value || null })}
                      >
                        <option value="">{teamsSettings.defaultTeamId ? "Select a channel" : "Select a team first"}</option>
                        {teamsChannels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            {channel.displayName}{channel.isPotentiallyExternal ? " - shared channel" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ fontSize: 11.5, color: teamsSettings.defaultChannelId ? "#9DEFEA" : "var(--amber)" }}>
                      {teamsSettings.defaultChannelId
                        ? `Approved destination: ${teamsSettings.defaultTeamName ?? "Selected team"} / ${teamsSettings.defaultChannelName ?? "Selected channel"}. Auterim can only post here, and only after approval.`
                        : "Teams is connected for reading. Select a team and channel before Auterim can prepare Teams messages."}
                    </div>
                    {!teamsSettings.sendGranted && (
                      <div style={{ fontSize: 11.5, color: "var(--amber)" }}>
                        Message sending permission was not granted. Teams monitoring works, but Auterim cannot prepare Teams messages.
                      </div>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => void fetchTeamsTeams()} disabled={teamsLoading}>Refresh teams</button>
                  </>
                )}
                {teamsSetupError && <div style={{ fontSize: 11.5, color: "#ffaaaa" }}>{teamsSetupError}</div>}
              </div>
            )}
            {drawerConnector.id === "trello" && isRealConnectedConnector(drawerConnector) && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>Trello task execution setup</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2 }}>
                      Cards are created only after approval.
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={fetchTrelloBoards} disabled={trelloLoading}>
                    Refresh boards
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <select
                    className="os-input"
                    value={trelloSettings.defaultBoardId ?? ""}
                    disabled={trelloLoading || trelloSaving}
                    onChange={(event) => {
                      const selected = trelloBoards.find((board) => board.id === event.target.value) ?? null;
                      setTrelloLists([]);
                      void saveTrelloSettings({
                        defaultBoardId: selected?.id ?? null,
                        defaultBoardName: selected?.name ?? null,
                        defaultListId: null,
                        defaultListName: null,
                      });
                    }}
                  >
                    <option value="">{trelloLoading ? "Loading boards..." : "Select default board"}</option>
                    {trelloBoards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
                  </select>
                  <select
                    className="os-input"
                    value={trelloSettings.defaultListId ?? ""}
                    disabled={trelloLoading || trelloSaving || !trelloSettings.defaultBoardId}
                    onChange={(event) => {
                      const selected = trelloLists.find((list) => list.id === event.target.value) ?? null;
                      void saveTrelloSettings({
                        defaultBoardId: trelloSettings.defaultBoardId,
                        defaultListId: selected?.id ?? null,
                        defaultListName: selected?.name ?? null,
                      });
                    }}
                  >
                    <option value="">{trelloSettings.defaultBoardId ? "Select default list" : "Select board first"}</option>
                    {trelloLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 11.5, color: trelloSettings.defaultBoardId && trelloSettings.defaultListId ? "#9DEFEA" : "var(--amber)" }}>
                  {trelloSettings.defaultBoardId && trelloSettings.defaultListId
                    ? `Default target: ${trelloSettings.defaultBoardName || "Selected board"} / ${trelloSettings.defaultListName || "Selected list"}`
                    : "Trello is connected, but task execution setup is incomplete. Select a board and list before creating task approvals."}
                </div>
                {trelloSetupError && <div style={{ fontSize: 11.5, color: "#ffaaaa" }}>{trelloSetupError}</div>}
              </div>
            )}
            {drawerConnector.id === "asana" && isRealConnectedConnector(drawerConnector) && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><div><div style={{ fontSize: 12.5, fontWeight: 600 }}>Asana project scope</div><div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2 }}>Choose the project Operations may monitor and update after approval.</div></div><button className="btn btn-ghost btn-sm" onClick={() => { void fetchAsanaWorkspaces(); }}>Refresh workspaces</button></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <select className="os-input" value={asanaSettings.selectedWorkspaceId ?? ""} disabled={asanaLoading || asanaSaving} onFocus={() => { if (!asanaWorkspaces.length) void fetchAsanaWorkspaces(); }} onChange={(event) => { const selected = asanaWorkspaces.find((item) => item.gid === event.target.value) ?? null; setAsanaProjects([]); setAsanaSettings((current) => ({ ...current, selectedWorkspaceId: selected?.gid ?? null, selectedWorkspaceName: selected?.name ?? null, selectedProjectId: null, selectedProjectName: null })); if (selected) void fetchAsanaProjects(selected.gid); }}><option value="">{asanaLoading ? "Loading workspaces..." : "Select workspace"}</option>{asanaWorkspaces.map((item) => <option key={item.gid} value={item.gid}>{item.name}</option>)}</select>
                  <select className="os-input" value={asanaSettings.selectedProjectId ?? ""} disabled={asanaLoading || asanaSaving || !asanaSettings.selectedWorkspaceId} onFocus={() => { if (asanaSettings.selectedWorkspaceId && !asanaProjects.length) void fetchAsanaProjects(asanaSettings.selectedWorkspaceId); }} onChange={(event) => { const selected = asanaProjects.find((item) => item.gid === event.target.value) ?? null; void saveAsanaSettings({ selectedProjectId: selected?.gid ?? null, selectedProjectName: selected?.name ?? null }); }}><option value="">{asanaSettings.selectedWorkspaceId ? "Select project" : "Select workspace first"}</option>{asanaProjects.map((item) => <option key={item.gid} value={item.gid}>{item.name}</option>)}</select>
                </div>
                <div style={{ fontSize: 11.5, color: drawerAsanaReady ? "#9DEFEA" : "var(--amber)" }}>{drawerAsanaReady ? `Read scope: ${asanaSettings.selectedWorkspaceName} / ${asanaSettings.selectedProjectName}` : "Select a workspace and project to enable Operations reads."}</div>
                {asanaSetupError && <div style={{ fontSize: 11.5, color: "#ffaaaa" }}>{asanaSetupError}</div>}
              </div>
            )}
            {drawerConnector.id === "jira" && isRealConnectedConnector(drawerConnector) && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><div><div style={{ fontSize: 12.5, fontWeight: 600 }}>Jira project scope</div><div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2 }}>{jiraSettings.siteName ? `Site: ${jiraSettings.siteName}. ` : ""}Choose the one project Operations may monitor and update after approval.</div></div><button className="btn btn-ghost btn-sm" onClick={() => { void fetchJiraProjects(); }}>Refresh projects</button></div>
                <select className="os-input" value={jiraSettings.selectedProjectId ?? ""} disabled={jiraLoading || jiraSaving} onChange={(event) => { const selected = jiraProjects.find((project) => project.id === event.target.value) ?? null; void saveJiraSettings(selected); }}><option value="">{jiraLoading ? "Loading projects..." : "Select project"}</option>{jiraProjects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.name}</option>)}</select>
                <select className="os-input" value={jiraSettings.selectedIssueTypeId ?? ""} disabled={jiraLoading || jiraSaving || !jiraSettings.selectedProjectId} onChange={(event) => { const selected = jiraIssueTypes.find((item) => item.id === event.target.value) ?? null; void saveJiraSettings(null, selected); }}><option value="">{jiraSettings.selectedProjectId ? (jiraLoading ? "Loading issue types..." : "Select default issue type") : "Select project first"}</option>{jiraIssueTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <div style={{ fontSize: 11.5, color: drawerJiraReady ? "#9DEFEA" : "var(--amber)" }}>{drawerJiraReady ? `Write scope: ${jiraSettings.selectedProjectKey} · ${jiraSettings.selectedIssueTypeName}` : "Select a project and valid default issue type to enable Jira workflow writes."}</div>
                {jiraSetupError && <div style={{ fontSize: 11.5, color: "#ffaaaa" }}>{jiraSetupError}</div>}
              </div>
            )}
            {drawerConnector.id === "zendesk" && isRealConnectedConnector(drawerConnector) && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Zendesk workspace</div>
                <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>{zendeskSettings.baseUrl ?? (zendeskSettings.subdomain ? `https://${zendeskSettings.subdomain}.zendesk.com` : "Workspace hostname unavailable")}</div>
                <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>Ticket monitoring uses bounded incremental polling. Customer replies and ticket changes remain approval-gated.</div>
                {zendeskSetupError && <div style={{ fontSize: 11.5, color: "#ffaaaa" }}>{zendeskSetupError}</div>}
              </div>
            )}
            {!isRealConnectedConnector(drawerConnector) && drawerConnector.source === "preview" && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(77,232,225,0.06)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.18)", fontSize: 12, color: "var(--cyan)" }}>
                Preview connection only. Connect a real account to sync live data and enable operator actions.
              </div>
            )}
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="lab" style={{ marginBottom: 8 }}>Connection</div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {drawerConnector.id === "google_drive" && driveSettings.enabled && (
                  <button className="btn btn-ghost btn-sm" onClick={() => void saveDriveSettings(null)} disabled={driveSaving}>Disable Drive</button>
                )}
                {advancedOpen && isRealConnectedConnector(drawerConnector) && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      testConnector(drawerConnector.id); setFeedback(`${drawerConnector.name} tested.`);
                    }}>Test connection</button>
                    {drawerConnector.id !== "gmail" && drawerConnector.id !== "microsoft" && drawerConnector.id !== "microsoft_teams" && drawerConnector.id !== "salesforce" && (
                      <button className="btn btn-ghost btn-sm" onClick={() => { resyncConnector(drawerConnector.id); setFeedback(`${drawerConnector.name} resynced.`); }}>Resync</button>
                    )}
                  </>
                )}
                {isRealConnectedConnector(drawerConnector) && drawerConnector.health !== "healthy" && (
                  <>
                    {drawerConnector.id === "gmail" && (
                      <button className="btn btn-primary btn-sm" onClick={startRealGmailOAuth}>Reconnect Gmail</button>
                    )}
                    {drawerConnector.id === "google_drive" && drawerConnector.records.includes("Grant Drive access") && (
                      <button className="btn btn-primary btn-sm" onClick={startGoogleDriveConsent}>Grant Drive access</button>
                    )}
                    {drawerConnector.id === "microsoft" && (
                      <button className="btn btn-primary btn-sm" onClick={startRealMicrosoftOAuth}>Reconnect Microsoft 365</button>
                    )}
                    {drawerConnector.id === "microsoft_teams" && (
                      <button className="btn btn-primary btn-sm" onClick={startMicrosoftTeamsConsent}>Reconnect Microsoft Teams</button>
                    )}
                    {drawerConnector.id === "salesforce" && (
                      <button className="btn btn-primary btn-sm" onClick={startRealSalesforceOAuth}>Reconnect Salesforce</button>
                    )}
                    {drawerConnector.id === "asana" && (
                      <button className="btn btn-primary btn-sm" onClick={startRealAsanaOAuth}>Reconnect Asana</button>
                    )}
                    {drawerConnector.id === "jira" && (
                      <button className="btn btn-primary btn-sm" onClick={startRealJiraOAuth}>Reconnect Jira</button>
                    )}
                    {drawerConnector.id === "zendesk" && (
                      <button className="btn btn-primary btn-sm" onClick={startRealZendeskOAuth}>Reconnect Zendesk</button>
                    )}
                    {(drawerConnector.id === "slack" || drawerConnector.id === "trello") && (
                      <button className="btn btn-primary btn-sm" onClick={() => startDirectConnectorOAuth(drawerConnector.id as "slack" | "trello")}>Reconnect {drawerConnector.name}</button>
                    )}
                    {drawerConnector.id === "hubspot" && (
                      <button className="btn btn-primary btn-sm" onClick={() => startDirectConnectorOAuth("hubspot")}>Reconnect HubSpot</button>
                    )}
                  </>
                )}
              </div>
              {drawerConnector.id !== "google_drive" && isRealConnectedConnector(drawerConnector) && (
                <button className="btn btn-ghost btn-sm" style={{ color: "#f0a5a5", borderColor: "rgba(240,165,165,0.24)" }} disabled={disconnectingConnectorId === drawerConnector.id} onClick={() => void disconnectRealConnector(drawerConnector)}>
                  {disconnectingConnectorId === drawerConnector.id ? "Disconnecting..." : "Disconnect"}
                </button>
              )}
              </div>
              {drawerConnector.id === "google_drive" && <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 8 }}>Google account connection remains available to Gmail.</div>}
            </div>
          </div>
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Activate real connectors"
        body="Preview connectors let you model your stack. Choose a plan to connect real accounts and run operators live."
      />
    </div>
  );
}

function getConnectorSetupMessage({ isPreview, isConnected }: { isPreview: boolean; isConnected: boolean }): string {
  if (isConnected) return "Account connected.";
  if (isPreview) return "Choose a plan to connect real accounts.";
  return "Connect your account to enable this connector.";
}

function ConnectorSetupView({
  connector,
  isRealConnected,
  isPreview,
  advancedOpen = false,
  onToggleAdvanced,
  statusMeta,
}: {
  connector: Connector;
  isRealConnected: boolean;
  isPreview: boolean;
  advancedOpen?: boolean;
  onToggleAdvanced?: () => void;
  statusMeta?: { label: string; color: string; background: string; border: string };
}) {
  const setupMessage = getConnectorSetupMessage({ isPreview, isConnected: isRealConnected });
  const status = statusMeta ?? connectorStatusLabel({ connector, isRealConnected });
  const def = getConnectorDefinition(connector.id);
  const lastChecked = connector.lastSynced ? new Date(connector.lastSynced).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Just now";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 16, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: `${connector.color}18`, boxShadow: `inset 0 0 0 1px ${connector.color}45`, display: "grid", placeItems: "center", color: connector.color, fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 800 }}>{connector.letter}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{connector.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 3 }}>{connector.category}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 5 }}>{connector.id === "google_drive" ? "Document context available" : connectorCapabilities(connector.id)[0]}</div>
            </div>
          </div>
          <span style={{ color: status.color, background: status.background, boxShadow: `inset 0 0 0 1px ${status.border}`, borderRadius: 999, padding: "6px 10px", fontSize: 11.5, fontWeight: 650 }}>
            {status.label}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, color: "var(--text-mute)", fontSize: 12 }}>
          <div><div className="lab">Account</div><div style={{ marginTop: 5, color: "var(--text-dim)" }}>{connector.accountEmail ?? (connector.records.startsWith("Real account connected:") ? connector.records.replace("Real account connected: ", "") : isRealConnected ? (connector.id === "google_drive" ? "Google account connected" : "Account connected") : "Not connected")}</div></div>
          <div><div className="lab">Connected since</div><div style={{ marginTop: 5, color: "var(--text-dim)" }}>{lastChecked}</div></div>
        </div>
        {!isRealConnected && <div style={{ fontSize: 12, color: "#9DEFEA" }}>{setupMessage}</div>}
      </div>

      <SectionBlock title="Available to Auterim">
        <div style={{ display: "grid", gap: 8 }}>
          {connectorCapabilityItems(connector.id).map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-dim)" }}>
              <span style={{ color: "var(--cyan)", fontSize: 13 }}>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title={connectorTrustCopy(connector.id).title}>
        {connectorTrustCopy(connector.id).lines.map((item) => <div key={item} style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>{item}</div>)}
      </SectionBlock>

      <SectionBlock title="Used by">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {(connectorOperatorNames(connector.id).length ? connectorOperatorNames(connector.id) : ["Live operators pending"]).map((item) => (
            <span key={item} style={{ fontSize: 11.5, color: "var(--text-dim)", padding: "6px 9px", borderRadius: 999, background: "rgba(255,255,255,0.04)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
              {shortOperatorLabel(item)}
            </span>
          ))}
        </div>
      </SectionBlock>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 2 }}>
        <button
          type="button"
          onClick={onToggleAdvanced}
          style={{ width: "100%", border: "none", background: "transparent", color: "var(--text)", padding: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: onToggleAdvanced ? "pointer" : "default" }}
        >
          <span style={{ display: "grid", gap: 2, textAlign: "left" }}><span style={{ fontSize: 12.5, fontWeight: 650 }}>Advanced</span><span style={{ fontSize: 11, color: "var(--text-mute)", fontWeight: 400 }}>Technical connection details</span></span>
          <span style={{ fontSize: 12, color: "var(--text-mute)" }}>{advancedOpen ? "Hide" : "Show"}</span>
        </button>
        {advancedOpen && (
          <div style={{ padding: "0 0 6px", display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <TagList title="Required access" items={connector.readScopes.length ? connector.readScopes : connector.permissions} />
              <TagList title="Write access" items={connector.writeScopes.length ? connector.writeScopes : ["None"]} />
              <TagList title="Approval required" items={connector.approvalRequiredFor.length ? connector.approvalRequiredFor : ["None"]} />
              <TagList title="Blocked actions" items={connector.blockedActions.length ? connector.blockedActions : ["None"]} />
              <TagList title="Capabilities" items={humanizeCapabilities(def?.capabilities ?? [])} />
              <TagList title="Recent activity" items={connector.recentSyncEvents.length ? connector.recentSyncEvents : ["No recent activity recorded"]} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
              <Stat label="Health" value={isRealConnected ? connector.health : "Not connected"} />
              <Stat label="Connected since" value={lastChecked} />
              <Stat label="Events synced" value={isRealConnected ? String(connector.eventsSynced) : "-"} />
              <Stat label="Auth errors" value={isRealConnected ? String(connector.authErrors) : "-"} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="lab" style={{ color: "var(--text)" }}>{title}</div>
      {children}
    </div>
  );
}

function TagList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {items.map((it) => <span key={it} className="appr-btn edit" style={{ cursor: "default" }}>{it}</span>)}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

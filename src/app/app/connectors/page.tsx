"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Nango from "@nangohq/frontend";
import type { ConnectUIEvent } from "@nangohq/frontend";
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
import { CONNECTOR_CATEGORY_LABELS, type ConnectorCategory } from "@/lib/connectors/registry";
import { connectorDefinitionToSeedConnector } from "@/lib/os/seed";
import { LOGOS as IntegrationLogos } from "@/components/home-v3/integrations-grid";
import { getUnconnectedOnboardingSystems, unlockMessageForConnector } from "@/lib/operators/unlock-copy";
import { humanizeOperatorActions } from "@/lib/operators/action-labels";
import { humanizeCapabilities } from "@/lib/operators/capability-labels";
import { getWorkspaceConnectorImpact } from "@/lib/operators/connector-requirements";
import { getOperatorDefinition } from "@/lib/operators/registry";
import { getRealWorkspaceSuggestedWorkflows } from "@/lib/os/workflow-recommendations";

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

// Seed connector ids use hyphens (e.g. "google-calendar"); catalog keys use
// underscores (e.g. "google_calendar"). Normalize before catalog lookups.
function normalizeConnectorKey(id: string): string {
  return id.replace(/-/g, "_");
}

function connectorCapabilities(connectorId: string): string[] {
  if (connectorId === "gmail") return ["Read recent inbox metadata", "Draft customer replies", "Send emails after approval"];
  if (connectorId === "microsoft") return ["Read recent Outlook mail", "Read Outlook Calendar events", "Send emails after approval", "Create or update calendar events after approval"];
  if (connectorId === "salesforce") return ["Secure OAuth connection", "Revenue CRM reads and writes are not enabled yet"];
  if (connectorId === "hubspot") return ["Create or update contacts", "Create or update deals", "Link contacts to deals"];
  if (connectorId === "slack") return ["Read available channels", "Send internal approval alerts", "Notify the team after important actions"];
  if (connectorId === "trello") return ["Read boards, lists and cards", "Create cards after approval", "Move cards after approval", "Add comments after approval"];
  const def = getConnectorDefinition(connectorId);
  return def?.writeActions.length ? def.writeActions : def?.readActions ?? ["Connect account"];
}

function connectorSafetyNotes(connectorId: string): string[] {
  if (connectorId === "gmail") return ["External customer emails require approval before sending.", "Auterim never sends from Gmail without a reviewed approval."];
  if (connectorId === "microsoft") return ["External customer emails require approval before sending.", "Calendar event creation, updates and deletion require approval.", "Auterim never sends from Outlook or changes your calendar without a reviewed approval."];
  if (connectorId === "salesforce") return ["Salesforce CRM actions are not enabled yet.", "Future record changes will require approval."];
  if (connectorId === "hubspot") return ["CRM changes require approval.", "Customer records are updated only through approved actions."];
  if (connectorId === "slack") return ["Slack alerts are internal.", "Customer-facing Slack messages are not sent automatically."];
  if (connectorId === "trello") return ["Trello task changes require approval.", "Cards, moves and comments execute only after review."];
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
}): { label: string; color: string; background: string; border: string } {
  if (!input.isRealConnected && input.connector.records.includes("Reconnect required")) return { label: "Reconnect required", color: "var(--amber)", background: "rgba(245,194,107,0.08)", border: "rgba(245,194,107,0.24)" };
  if (!input.isRealConnected) return { label: "Not connected", color: "#b8c5c8", background: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.12)" };
  if (input.connector.id === "slack" && !input.slackReady) return { label: "Setup incomplete", color: "var(--amber)", background: "rgba(245,194,107,0.08)", border: "rgba(245,194,107,0.24)" };
  if (input.connector.id === "trello" && !input.trelloReady) return { label: "Setup incomplete", color: "var(--amber)", background: "rgba(245,194,107,0.08)", border: "rgba(245,194,107,0.24)" };
  return { label: "Connected", color: "#8df5cf", background: "rgba(81,216,138,0.08)", border: "rgba(81,216,138,0.24)" };
}

export default function ConnectorsPage() {
  const {
    state,
    connectConnector,
    disconnectConnector,
    testConnector,
    resyncConnector,
    updateConnectorPermissions,
  } = useOS();

  const router = useRouter();
  const searchParams = useSearchParams();

  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [setupConnectorId, setSetupConnectorId] = useState<string | null>(null);
  const [drawerConnectorId, setDrawerConnectorId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [disconnectingConnectorId, setDisconnectingConnectorId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [nangoConnectLoadingId, setNangoConnectLoadingId] = useState<string | null>(null);
  const [nangoStatuses, setNangoStatuses] = useState<Record<string, {
    status: "connected" | "error" | "pending" | "reconnect_required" | "not_connected";
    provider_email?: string | null;
    connected_at?: string | null;
    provider_config_key?: string | null;
    nango_connection_id?: string | null;
  }>>({});
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [operatorReadiness, setOperatorReadiness] = useState<{ operatorKey: string; status: string; canRunManual: boolean; availableActions: string[] }[]>([]);

  // Real connected = authenticated via native OAuth or managed OAuth integration
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
    return availableCatalogConnectors.filter((c) => {
      const q = search.trim().toLowerCase();
      const bySearch = !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      return bySearch;
    });
  }, [availableCatalogConnectors, search]);

  // Group the real catalog by its declared category (registry.ts) instead of
  // one flat list, so discovery reflects what each system is actually for.
  const groupedAvailable = useMemo(() => {
    const groups = new Map<ConnectorCategory, Connector[]>();
    for (const connector of filteredAvailable) {
      const category = (getConnectorDefinition(normalizeConnectorKey(connector.id))?.category ?? "custom_api") as ConnectorCategory;
      const list = groups.get(category) ?? [];
      list.push(connector);
      groups.set(category, list);
    }
    return Array.from(groups.entries());
  }, [filteredAvailable]);

  // What onboarding said this workspace already uses, that is not yet
  // actually connected (real OAuth/Nango truth, never the onboarding
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

  const startRealMicrosoftOAuth = () => {
    const qs = new URLSearchParams({
      workspaceId: state.workspace.id,
      userEmail: state.currentUser.email,
      userId: state.currentUser.id,
    });
    window.location.href = `/api/connectors/microsoft/auth?${qs.toString()}`;
  };

  const startRealSalesforceOAuth = () => {
    const qs = new URLSearchParams({ workspaceId: state.workspace.id, userEmail: state.currentUser.email, userId: state.currentUser.id });
    window.location.href = `/api/connectors/salesforce/auth?${qs.toString()}`;
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
      router.refresh();
    } catch {
      setFeedback(`Could not disconnect ${connector.name}. Check your connection and try again.`);
    } finally {
      setDisconnectingConnectorId(null);
    }
  };

  const fetchNangoStatus = async (connectorKey: string) => {
    const qs = new URLSearchParams({
      workspaceId: state.workspace.id,
      connectorKey,
      userId: state.currentUser.id,
      userEmail: state.currentUser.email,
    });
    const res = await fetch(`/api/connectors/nango/status?${qs.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      status: "connected" | "error" | "pending" | "reconnect_required" | "not_connected";
      provider_email?: string | null;
      connected_at?: string | null;
      provider_config_key?: string | null;
      nango_connection_id?: string | null;
    };
    setNangoStatuses((prev) => ({ ...prev, [connectorKey]: json }));
    if (json.status === "connected") {
      connectConnector(connectorKey, "real");
    } else {
      disconnectConnector(connectorKey);
    }
    return json;
  };

  const testNangoConnection = async (connectorKey: string) => {
    setFeedback("Checking connection health...");
    try {
      const result = await fetchNangoStatus(connectorKey);
      const status = result?.status;
      if (status === "connected") setFeedback("Connection healthy. Checked just now.");
      else if (status === "reconnect_required") setFeedback("Connection needs attention. Reconnect to restore access.");
      else if (status === "error") setFeedback("Connection check failed. Reconnect and try again.");
      else setFeedback("Connection is not active.");
    } catch {
      setFeedback("Connection check failed. Reconnect and try again.");
    }
  };

  useEffect(() => {
    getAvailableConnectors()
      .filter((connector) => connector.authType === "nango")
      .forEach((connector) => {
        fetchNangoStatus(connector.connectorKey).catch(() => undefined);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.workspace.id]);

  // Real, server-computed operator readiness (getWorkspaceOperatorReadiness) -
  // never re-derived client-side - powers the "What Auterim can do now"
  // section below.
  useEffect(() => {
    if (!state.workspace.id) return;
    const qs = new URLSearchParams({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email });
    fetch(`/api/operators/readiness?${qs.toString()}`, { cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((json: { readiness?: { operatorKey: string; status: string; canRunManual: boolean; availableActions: string[] }[] }) => {
        setOperatorReadiness(Array.isArray(json.readiness) ? json.readiness : []);
      })
      .catch(() => undefined);
  }, [state.workspace.id, state.currentUser.id, state.currentUser.email]);

  // Only real capabilities from operators that can actually run today
  // (ready or draft_only + canRunManual) - never a fabricated combination.
  const whatAuterimCanDoNow = useMemo(() => {
    const actions = operatorReadiness
      .filter((r) => r.canRunManual && (r.status === "ready" || r.status === "draft_only"))
      .flatMap((r) => humanizeOperatorActions(r.availableActions ?? []));
    return Array.from(new Set(actions));
  }, [operatorReadiness]);

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
    // Real capability delta, not per-connector hardcoded prose - see
    // unlockMessageForConnector (src/lib/operators/unlock-copy.ts). Passing
    // real operatorReadiness lets it also mention a workflow suggestion that
    // genuinely newly became available - never shown otherwise.
    setFeedback(unlockMessageForConnector({
      connectorKey: connected,
      connectedConnectorKeys,
      operatorReadiness: operatorReadiness.map((r) => ({ operatorKey: r.operatorKey, ready: r.status === "ready" || r.status === "draft_only" })),
    }));
    router.replace("/connectors");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const setup = searchParams.get("setup");
    if (!setup) return;

    const setupMap: Record<string, string> = {
      gmail: "gmail",
      microsoft: "microsoft",
      hubspot: "hubspot",
      slack: "slack",
      trello: "trello",
      "slack-channel": "slack",
      "trello-project": "trello",
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

  const startNangoConnect = async (connectorKey: string) => {
    const connectorDef = getConnectorDefinition(connectorKey);
    if (!connectorDef || connectorDef.status !== "available" || connectorDef.authType !== "nango") {
      setFeedback("This connector is not available to connect yet.");
      return;
    }
    setNangoConnectLoadingId(connectorKey);
    setFeedback("");
    try {
      const sessionRes = await fetch("/api/connectors/nango/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          connectorKey,
          userEmail: state.currentUser.email,
          userId: state.currentUser.id,
        }),
      });
      const sessionJson = await sessionRes.json() as {
        token?: string;
        sessionToken?: string;
        connectLink?: string | null;
        expiresAt?: string | null;
        providerConfigKey?: string;
        data?: {
          token?: string;
          sessionToken?: string;
          connect_link?: string | null;
          connectLink?: string | null;
          expires_at?: string | null;
          expiresAt?: string | null;
        };
        error?: string;
        message?: string;
      };
      const nangoSessionToken = sessionJson.token || sessionJson.sessionToken || sessionJson.data?.token || sessionJson.data?.sessionToken;
      const nangoConnectLink = sessionJson.connectLink || sessionJson.data?.connectLink || sessionJson.data?.connect_link || null;
      if (!sessionRes.ok || !nangoSessionToken) {
        setFeedback(sessionJson.message || sessionJson.error || (nangoConnectLink
          ? "Nango returned a connect link but no session token for the embedded connector."
          : `Failed to start ${connectorDef.displayName} connect.`));
        return;
      }
      const sessionProviderConfigKey = sessionJson.providerConfigKey || connectorDef.providerConfigKey || connectorKey;

      const nango = new Nango();
      const finalizeNangoConnection = async (event: ConnectUIEvent) => {
        if (event.type !== "connect") return;
        const payload = event.payload as {
          providerConfigKey?: string;
          provider_config_key?: string;
          connectionId?: string;
          connection_id?: string;
        };
        const connectionId = payload.connectionId || payload.connection_id || "";
        if (!connectionId) {
          setFeedback(`${connectorDef.displayName} OAuth succeeded, but Nango did not return a connection id to save.`);
          return;
        }

        const finalizeRes = await fetch("/api/connectors/nango/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: state.workspace.id,
            connectorKey,
            userId: state.currentUser.id,
            userEmail: state.currentUser.email,
            providerConfigKey: payload.providerConfigKey || payload.provider_config_key || sessionProviderConfigKey,
            nangoConnectionId: connectionId,
            providerEmail: state.currentUser.email,
            providerAccountId: state.currentUser.id || state.currentUser.email,
            provider: connectorKey,
            raw: payload,
          }),
        });
        const finalizeJson = await finalizeRes.json().catch(() => ({})) as { error?: string; message?: string; provider_email?: string | null; connected_at?: string | null; provider_config_key?: string | null; nango_connection_id?: string | null };
        if (!finalizeRes.ok) {
          setFeedback(finalizeJson.message || finalizeJson.error || `${connectorDef.displayName} OAuth succeeded, but Auterim could not save the connector.`);
          return;
        }

        setNangoStatuses((prev) => ({ ...prev, [connectorKey]: {
          status: "connected",
          provider_email: finalizeJson.provider_email ?? state.currentUser.email,
          connected_at: finalizeJson.connected_at ?? null,
          provider_config_key: finalizeJson.provider_config_key ?? sessionProviderConfigKey,
          nango_connection_id: finalizeJson.nango_connection_id ?? connectionId,
        } }));
        connectConnector(connectorKey, "real");
        setFeedback(`${connectorDef.displayName} connected.`);
        setAddOpen(false);
        setSetupConnectorId(null);
      };
      const pollStatus = () => {
        let tries = 0;
        const timer = setInterval(() => {
          tries += 1;
          fetchNangoStatus(connectorKey).catch(() => undefined);
          if (tries >= 6) clearInterval(timer);
        }, 1500);
      };

      nango.openConnectUI({
        sessionToken: nangoSessionToken,
        onEvent: async (event) => {
          if (event.type === "connect") {
            await finalizeNangoConnection(event);
            pollStatus();
          } else if (event.type === "error") {
            setFeedback(event.payload.errorMessage || `${connectorDef.displayName} OAuth failed.`);
          } else if (event.type === "close") {
            setFeedback(`${connectorDef.displayName} authorization was not completed. Checking connection status...`);
            pollStatus();
          }
        },
      });
    } catch {
      setFeedback("Could not start secure connector setup.");
    } finally {
      setNangoConnectLoadingId(null);
    }
  };

  const slackQueryString = () => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }).toString();

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
    } catch {
      setTrelloSetupError("Could not save Trello settings.");
    } finally {
      setTrelloSaving(false);
    }
  };

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

  return (
    <div className="os-page connectors-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Auterim workspace</span>
          <h1>Connect your business</h1>
          <div className="os-page-sub">
            Connect the tools your team already uses. Auterim will show what becomes possible.
          </div>
          {isPreview && (
            <div style={{ marginTop: 8, color: "#9DEFEA", fontSize: 12.5 }}>
              Preview mode: connectors run in local mock mode. Choose a plan to connect real accounts.
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
            <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setSetupConnectorId(null); setSearch(""); }}>
              <PlusIcon size={12} /> Add connector
            </button>
          )}
        </div>
      </div>

      {connectorLimit !== null && (
        <UsageBanner used={realConnectedCount} max={connectorLimit} label="connectors" planLabel={planLabel} />
      )}

      {feedback && <div style={{ color: "#64ffd7", fontSize: 12 }}>{feedback}</div>}

      {/* Systems this workspace said it already uses during onboarding, not
          yet actually connected. Highlighted first and prioritized over the
          generic catalog, per the onboarding brief - never marked
          "connected" from the onboarding selection alone. */}
      {onboardingHighlightConnectors.length > 0 && (
        <div className="p" style={{ borderRadius: 16, background: "rgba(77,232,225,0.045)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.16)" }}>
          <div className="p-head">
            <h3>Systems you already use</h3>
            <div className="p-meta">From your onboarding answers</div>
          </div>
          <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {onboardingHighlightConnectors.map((c) => (
              <button
                key={c.id}
                onClick={() => { setAddOpen(true); setSetupConnectorId(c.id); setSearch(""); }}
                style={{ textAlign: "left", border: "none", cursor: "pointer", padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.22)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div className="connector-brand-logo" style={{ width: 28, height: 28, borderRadius: 8 }}>{IntegrationLogos[c.name] ?? <span style={{ color: c.color, fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{c.letter}</span>}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>You said your team uses {c.name} — connect it to add real context.</div>
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
        <div className="p" style={{ borderRadius: 16 }}>
          <div className="p-head">
            <h3>What Auterim can do now</h3>
            <div className="p-meta">Based on your connected systems</div>
          </div>
          <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
            {whatAuterimCanDoNow.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-dim)" }}>
                <span style={{ color: "var(--cyan)", fontSize: 13 }}>✓</span>
                <span style={{ textTransform: "capitalize" }}>{item}</span>
              </div>
            ))}
          </div>
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
            <div className="p-meta">Backed by your connected systems</div>
          </div>
          <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {suggestedWorkflows.map((workflow) => (
              <div key={workflow.id} style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{workflow.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{workflow.description}</div>
                <div style={{ fontSize: 11, color: "var(--text-mute)" }}>Uses: {workflow.requiredConnectors.map((key) => getConnectorDefinition(key)?.displayName ?? key).join(", ")} · {getOperatorDefinition(workflow.operatorKey)?.name ?? workflow.operatorKey}</div>
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
          <div style={{ padding: "44px 18px", textAlign: "center", fontSize: 13, color: "var(--text-faint)" }}>
            <div style={{ color: "var(--text)", fontSize: 17, fontWeight: 600, marginBottom: 7 }}>Connect your first business tool</div>
            <div style={{ marginBottom: 18 }}>Add the systems Auterim should understand and work with.</div>
            <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setSetupConnectorId(null); setSearch(""); }}><PlusIcon size={12} /> Add connector</button>
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
                  <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Adds: {connectorCapabilities(c.id)[0]}{c.operatorsAllowed.length ? ` · Supports: ${shortOperatorLabel(c.operatorsAllowed[0])}${c.operatorsAllowed.length > 1 ? ` +${c.operatorsAllowed.length - 1}` : ""}` : ""}</div>
                </div>
                <div style={{ justifySelf: "start", fontSize: 11.5, color: "#8df5cf", padding: "5px 8px", borderRadius: 999, background: "rgba(81,216,138,0.08)", boxShadow: "inset 0 0 0 1px rgba(81,216,138,0.2)" }}>Manage</div>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Add connector modal */}
      {addOpen && (
        <div className="os-modal-backdrop" onClick={() => { setAddOpen(false); setSetupConnectorId(null); }}>
          <div className="os-modal" style={{ width: "min(980px, 94vw)", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            {!setupConnector ? (
              <>
                <div className="os-modal-head">
                  <h3>Add connector</h3>
                  <button className="appr-btn deny" onClick={() => setAddOpen(false)}>Close</button>
                </div>
                <div style={{ color: "var(--text-mute)", fontSize: 12.5, marginBottom: 4 }}>Connect a system only when it gives your operator useful live context.</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <input className="os-input" placeholder="Search available integrations..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  {groupedAvailable.map(([category, connectors]) => (
                    <div key={category} style={{ display: "grid", gap: 10 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", color: "var(--text-mute)", textTransform: "uppercase", marginTop: 8 }}>{CONNECTOR_CATEGORY_LABELS[category] ?? category}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                        {connectors.map((c) => (
                          <button key={c.id} onClick={() => { if (isRealConnectedConnector(c)) { setAddOpen(false); setDrawerConnectorId(c.id); } else setSetupConnectorId(c.id); }} style={{ textAlign: "left", border: "none", cursor: "pointer", padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <div className="connector-brand-logo" style={{ width: 28, height: 28, borderRadius: 8 }}>{IntegrationLogos[c.name] ?? <span style={{ color: c.color, fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{c.letter}</span>}</div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                            </div>
                            {(c.id === "gmail" || c.id === "microsoft" || getConnectorDefinition(c.id)?.authType === "nango") && (
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--cyan)", marginTop: 2 }}>
                                {c.id === "gmail" || c.id === "microsoft" ? "Secure OAuth" : "Managed OAuth"}
                              </div>
                            )}
                            <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>{c.description}</div>
                            {!isRealConnectedConnector(c) && (
                              <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4 }}>
                                Adds: {connectorCapabilities(c.id)[0]}{c.operatorsAllowed.length ? ` · Can improve: ${shortOperatorLabel(c.operatorsAllowed[0])}` : ""}
                              </div>
                            )}
                            <div style={{ marginTop: 10, color: isRealConnectedConnector(c) ? "#8df5cf" : c.records.includes("Reconnect required") ? "var(--amber)" : "var(--cyan)", fontSize: 11.5, fontWeight: 600 }}>{isRealConnectedConnector(c) ? "Connected" : c.records.includes("Reconnect required") ? "Reconnect" : "Connect"}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ paddingTop: 12, borderTop: "1px solid var(--line)", color: "var(--text-mute)", fontSize: 11.5 }}>More integrations are planned. Auterim adds systems when they support a controlled operating use case—not as a directory of logos.</div>
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
                  <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>Secure connection via Google OAuth · Native connector</div>
                )}
                {setupConnector.id === "microsoft" && (
                  <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>Secure connection via Microsoft Entra ID OAuth · Native connector</div>
                )}
                {getConnectorDefinition(setupConnector.id)?.authType === "nango" && (
                  <div style={{ fontSize: 11.5, color: "#9DEFEA" }}>
                    Managed OAuth connection{nangoStatuses[setupConnector.id]?.provider_email ? ` - ${nangoStatuses[setupConnector.id].provider_email}` : ""}
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
                      if (setupConnector.id === "microsoft") {
                        startRealMicrosoftOAuth();
                        return;
                      }
                      if (setupConnector.id === "salesforce") {
                        startRealSalesforceOAuth();
                        return;
                      }
                      if (getConnectorDefinition(setupConnector.id)?.authType === "nango") {
                        startNangoConnect(setupConnector.id);
                        return;
                      }
                    }}>{nangoConnectLoadingId === setupConnector.id ? "Connecting..." : "Connect real account"}</button>
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
            {getConnectorDefinition(drawerConnector.id)?.authType === "nango" && nangoStatuses[drawerConnector.id]?.status === "connected" && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "#9DEFEA", padding: "9px 10px", borderRadius: 10, background: "rgba(77,232,225,0.055)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.16)" }}>
                Connection verified{nangoStatuses[drawerConnector.id].provider_email ? ` · ${nangoStatuses[drawerConnector.id].provider_email}` : ""}
              </div>
            )}
            {getConnectorDefinition(drawerConnector.id)?.authType === "nango" && nangoStatuses[drawerConnector.id]?.status === "reconnect_required" && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--amber)", padding: "9px 10px", borderRadius: 10, background: "rgba(245,194,107,0.055)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.16)" }}>
                Connection issue: provider authorization could not be verified. Reconnect required.
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
            {!isRealConnectedConnector(drawerConnector) && drawerConnector.source === "preview" && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(77,232,225,0.06)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.18)", fontSize: 12, color: "var(--cyan)" }}>
                Preview connection only. Connect a real account to sync live data and enable operator actions.
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8 }}>
                {isRealConnectedConnector(drawerConnector) && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      if (getConnectorDefinition(drawerConnector.id)?.authType === "nango") void testNangoConnection(drawerConnector.id);
                      else { testConnector(drawerConnector.id); setFeedback(`${drawerConnector.name} tested.`); }
                    }}>Test connection</button>
                    {drawerConnector.id !== "gmail" && drawerConnector.id !== "microsoft" && drawerConnector.id !== "salesforce" && (
                      <button className="btn btn-ghost btn-sm" onClick={() => { resyncConnector(drawerConnector.id); setFeedback(`${drawerConnector.name} resynced.`); }}>Resync</button>
                    )}
                    {drawerConnector.id === "gmail" && (
                      <button className="btn btn-primary btn-sm" onClick={startRealGmailOAuth}>Reconnect Gmail</button>
                    )}
                    {drawerConnector.id === "microsoft" && (
                      <button className="btn btn-primary btn-sm" onClick={startRealMicrosoftOAuth}>Reconnect Microsoft 365</button>
                    )}
                    {drawerConnector.id === "salesforce" && (
                      <button className="btn btn-primary btn-sm" onClick={startRealSalesforceOAuth}>Reconnect Salesforce</button>
                    )}
                  </>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const next = drawerConnector.operatorsAllowed.includes("Support Operator")
                    ? drawerConnector.operatorsAllowed.filter((x) => x !== "Support Operator")
                    : [...drawerConnector.operatorsAllowed, "Support Operator"];
                  updateConnectorPermissions(drawerConnector.id, next);
                  setFeedback(`${drawerConnector.name} permissions updated.`);
                }}>Update operators</button>
              </div>
              <button className="btn btn-ghost btn-sm" disabled={disconnectingConnectorId === drawerConnector.id} onClick={() => void disconnectRealConnector(drawerConnector)}>
                {disconnectingConnectorId === drawerConnector.id ? "Disconnecting..." : "Disconnect"}
              </button>
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
      <div style={{ display: "grid", gap: 15, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `${connector.color}18`, boxShadow: `inset 0 0 0 1px ${connector.color}45`, display: "grid", placeItems: "center", color: connector.color, fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 800 }}>{connector.letter}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{connector.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{connector.category}</div>
            </div>
          </div>
          <span style={{ color: status.color, background: status.background, boxShadow: `inset 0 0 0 1px ${status.border}`, borderRadius: 999, padding: "6px 10px", fontSize: 11.5, fontWeight: 650 }}>
            {status.label === "Connected" ? "Connected · Healthy" : status.label}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, color: "var(--text-mute)", fontSize: 12 }}>
          <div><div className="lab">Account</div><div style={{ marginTop: 5, color: "var(--text-dim)" }}>{connector.records.startsWith("Real account connected:") ? connector.records.replace("Real account connected: ", "") : "Not verified"}</div></div>
          <div><div className="lab">Last checked</div><div style={{ marginTop: 5, color: "var(--text-dim)" }}>{lastChecked}</div></div>
        </div>
        {!isRealConnected && <div style={{ fontSize: 12, color: "#9DEFEA" }}>{setupMessage}</div>}
      </div>

      <SectionBlock title="Auterim can">
        <div style={{ display: "grid", gap: 8 }}>
          {connectorCapabilities(connector.id).map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-dim)" }}>
              <span style={{ color: "var(--cyan)", fontSize: 13 }}>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Access & control">
        {connector.id === "hubspot" ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>Auterim can prepare CRM updates, but customer records are only modified through approved actions.</div>
        ) : (
          connectorSafetyNotes(connector.id).map((item) => <div key={item} style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.45 }}>{item}</div>)
        )}
      </SectionBlock>

      <SectionBlock title="Used by operators">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {(connector.operatorsAllowed.length ? connector.operatorsAllowed : ["All operators"]).map((item) => (
            <span key={item} style={{ fontSize: 11.5, color: "var(--text-dim)", padding: "6px 9px", borderRadius: 999, background: "rgba(255,255,255,0.04)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
              {shortOperatorLabel(item)}
            </span>
          ))}
        </div>
      </SectionBlock>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}>
        <button
          type="button"
          onClick={onToggleAdvanced}
          style={{ width: "100%", border: "none", background: "transparent", color: "var(--text)", padding: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: onToggleAdvanced ? "pointer" : "default" }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 650 }}>Advanced details</span>
          <span style={{ fontSize: 12, color: "var(--text-mute)" }}>{advancedOpen ? "Hide" : "Show"}</span>
        </button>
        {advancedOpen && (
          <div style={{ padding: "0 0 6px", display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <TagList title="Required access" items={connector.readScopes.length ? connector.readScopes : connector.permissions} />
              <TagList title="Write access" items={connector.writeScopes.length ? connector.writeScopes : ["None"]} />
              <TagList title="Approval required" items={connector.approvalRequiredFor.length ? connector.approvalRequiredFor : ["None"]} />
              <TagList title="Blocked actions" items={connector.blockedActions.length ? connector.blockedActions : ["None"]} />
              <TagList title="Raw capabilities" items={def?.capabilities ?? ["Not listed"]} />
              <TagList title="Recent activity" items={connector.recentSyncEvents.length ? connector.recentSyncEvents : ["No recent activity recorded"]} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
              <Stat label="Health" value={isRealConnected ? connector.health : "Not connected"} />
              <Stat label="Last checked" value={lastChecked} />
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

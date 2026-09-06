"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { humanizeOperatorActions } from "@/lib/operators/action-labels";
import { OperatorActivationToggle, type ActivationEligibility } from "@/components/operators/activation-toggle";
import { OperatorDegradedNotice } from "@/components/operators/degraded-notice";

type OperatorReadiness = {
  operatorKey: string;
  status: "ready" | "draft_only" | "missing_connector" | "upgrade_required" | "coming_next" | "preview";
  readinessPercent: number;
  missingRequiredConnectors: string[];
  connectedRequiredConnectors: string[];
  optionalConnectors: string[];
  availableActions: string[];
  approvalRequiredActions: string[];
  blockedActions: string[];
  nextSetupStep: string;
  canRunManual: boolean;
  canExecuteRealActions: boolean;
  executionEligibility?: ActivationEligibility;
  reason: string;
};

type ClientFlowRun = {
  id: string;
  operator_key: string;
  status: string;
  output: { title?: string; type?: string } | null;
  approval_id: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

type ClientFlowScanResult = {
  status?: string;
  message?: string;
  scanned?: number;
  signalsFound?: number;
  approvalsCreated?: number;
  routedToRevenueCount?: number;
  reconnectRequired?: boolean;
  signals?: { messageId: string; from: string; subject: string; signalType: string; trelloPrepared: boolean; runId: string; approvalId: string }[];
  skipped?: { messageId: string; subject?: string; from?: string; reason: string }[];
  error?: string;
};

type ClientFlowSetup = {
  state?: "ready" | "setup_incomplete" | "needs_setup";
  readinessPercent?: number;
  coreReady?: boolean;
  gmailReady?: boolean;
  emailProvider?: "gmail" | "microsoft" | null;
  slackConnected?: boolean;
  slackChannelSelected?: boolean;
  slackAlertsReady?: boolean;
  slackRecommendedMissing?: boolean;
  trelloConnected?: boolean;
  trelloDestinationSet?: boolean;
  trelloTaskExecutionReady?: boolean;
  customerEmailPolicySet?: boolean;
  approvalFlowActive?: boolean;
};

type ClientFlowStatus = {
  readiness?: OperatorReadiness | null;
  emailProvider?: "gmail" | "microsoft" | null;
  gmail?: { status?: string; accountEmail?: string | null; executable?: boolean; reconnectRequired?: boolean; permissions?: { compose?: boolean; send?: boolean; readonly?: boolean } } | null;
  microsoft?: { status?: string; accountEmail?: string | null; executable?: boolean; reconnectRequired?: boolean; permissions?: { read?: boolean; send?: boolean } } | null;
  slack?: { status?: string; connected?: boolean; channelSelected?: boolean; notificationsEnabled?: boolean; approvalAlertsEnabled?: boolean; defaultChannelName?: string | null } | null;
  trello?: { status?: string; connected?: boolean; defaultBoardName?: string | null; defaultListName?: string | null } | null;
  customerEmailMode?: string;
  optionalUpsellConnectors?: { connectorKey: string; displayName: string; status: string }[];
  readinessChecks?: { emailReady?: boolean; slackAlertsReady?: boolean; trelloTaskExecutionReady?: boolean };
  setup?: ClientFlowSetup;
  monitoring?: {
    status: string;
    message: string;
    cadence?: string;
    sourceMode?: string;
    lastRunAt?: string | null;
    nextRunAt?: string | null;
    lastRunStatus?: string | null;
    lastRunSummary?: Record<string, unknown> | null;
    lastScanTime: string | null;
    emailsChecked: number;
    signalsFound: number;
    approvalsCreated: number;
    skippedSafelyCount: number;
    routedToRevenueCount: number;
    reconnectRequired: boolean;
    nextScanLabel: string;
    recentPendingApprovals: { id: string; title: string; created_at: string | null; to: string | null; subject: string | null }[];
  };
  error?: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  return mins > 0 ? `${mins}m ago` : "just now";
}

function CheckIcon({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 999,
        flexShrink: 0,
        color: ok ? "var(--green)" : "var(--amber)",
        background: ok ? "rgba(81,216,138,0.12)" : "rgba(245,194,107,0.12)",
        boxShadow: `inset 0 0 0 1px ${ok ? "rgba(81,216,138,0.4)" : "rgba(245,194,107,0.4)"}`,
        fontSize: 12,
      }}
    >
      {ok ? "✓" : "!"}
    </span>
  );
}

type ChecklistItem = {
  label: string;
  ok: boolean;
  detail: string;
  recommended?: boolean;
  action?: { label: string; href: string };
};

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const showAction = item.action && (!item.ok || item.recommended);
  return (
    <div className="operator-checklist-row" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0" }}>
      <CheckIcon ok={item.ok} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{item.label}</span>
          {item.recommended && !item.ok && (
            <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--blue)", background: "rgba(91,141,239,0.12)", padding: "2px 7px", borderRadius: 999 }}>Recommended</span>
          )}
        </div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: "var(--text-mute)" }}>{item.detail}</div>
      </div>
      {showAction && item.action ? (
        <Link href={item.action.href} className="btn btn-ghost btn-sm" style={{ textDecoration: "none", flexShrink: 0 }}>{item.action.label}</Link>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 600, color: item.ok ? "var(--green)" : "var(--amber)", flexShrink: 0 }}>{item.ok ? "Ready" : "Needs setup"}</span>
      )}
    </div>
  );
}

function ToolCard({ name, tone, ready, headline, note }: { name: string; tone: string; ready: boolean; headline: string; note?: string }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: ready ? "var(--green)" : "var(--amber)", boxShadow: `0 0 8px ${ready ? "rgba(81,216,138,0.6)" : "rgba(245,194,107,0.5)"}` }} />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{tone}</span>
      </div>
      <div style={{ fontSize: 12.8, color: "var(--text-dim)" }}>{headline}</div>
      {note && <div style={{ fontSize: 12, color: "var(--amber)" }}>{note}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "16px 16px", borderRadius: 14, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-mute)" }}>{label}</div>
    </div>
  );
}

function PolicyRow({ label, value, tone }: { label: string; value: string; tone: "amber" | "green" | "neutral" }) {
  const color = tone === "amber" ? "var(--amber)" : tone === "green" ? "var(--green)" : "var(--text-dim)";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0" }}>
      <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

export default function ClientFlowOperatorPage() {
  const { state } = useOS();
  const [readiness, setReadiness] = useState<OperatorReadiness | null>(null);
  const [status, setStatus] = useState<ClientFlowStatus | null>(null);
  const [runs, setRuns] = useState<ClientFlowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<ClientFlowScanResult | null>(null);

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const loadRuntime = useCallback(async () => {
    if (!state.workspace.id) return;
    setLoading(true);
    setError("");
    try {
      const readinessQs = new URLSearchParams(identityParams);
      readinessQs.set("operatorKey", "client_flow");
      const runsQs = new URLSearchParams(identityParams);
      runsQs.set("operatorKey", "client_flow");
      const statusQs = new URLSearchParams(identityParams);

      const [readinessRes, runsRes, statusRes] = await Promise.all([
        fetch(`/api/operators/readiness?${readinessQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/runs?${runsQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/client-flow/status?${statusQs.toString()}`, { cache: "no-store" }),
      ]);
      const readinessJson = await readinessRes.json().catch(() => ({})) as { readiness?: OperatorReadiness; error?: string };
      const runsJson = await runsRes.json().catch(() => ({})) as { runs?: ClientFlowRun[]; error?: string };
      const statusJson = await statusRes.json().catch(() => ({})) as ClientFlowStatus;
      if (!readinessRes.ok) throw new Error(readinessJson.error || "Could not load Client Flow readiness.");
      if (!runsRes.ok) throw new Error(runsJson.error || "Could not load Client Flow runs.");
      if (!statusRes.ok) throw new Error(statusJson.error || "Could not load Client Flow status.");
      setReadiness(statusJson.readiness ?? readinessJson.readiness ?? null);
      setStatus(statusJson);
      setRuns(Array.isArray(runsJson.runs) ? runsJson.runs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Client Flow runtime.");
    } finally {
      setLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => { void loadRuntime(); }, [loadRuntime]);

  const startEmailReconnect = (provider: "gmail" | "microsoft") => {
    const params = new URLSearchParams({ workspaceId: state.workspace.id, userEmail: state.currentUser.email });
    window.location.href = `/api/connectors/${provider}/auth?${params.toString()}`;
  };

  const submitScan = async () => {
    setScanSubmitting(true);
    setError("");
    setScanResult(null);
    try {
      const res = await fetch("/api/operators/client-flow/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, maxResults: 15 }),
      });
      const json = await res.json().catch(() => ({})) as ClientFlowScanResult;
      setScanResult(json);
      if (!res.ok && json.status !== "requires_gmail_read_scope" && json.status !== "requires_microsoft_read_scope") throw new Error(json.message || json.error || "Client Flow check failed.");
      await loadRuntime();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client Flow check failed.");
    } finally {
      setScanSubmitting(false);
    }
  };

  const monitoring = status?.monitoring;
  const setup = status?.setup;
  // Client Flow accepts Gmail or Microsoft 365 as the connected inbox. Gmail
  // is the active provider when both are connected, mirroring the backend's
  // resolveClientFlowEmailConnector() preference order.
  const activeProvider = status?.emailProvider ?? setup?.emailProvider ?? (status?.gmail ? "gmail" : status?.microsoft ? "microsoft" : null);
  const activeProviderLabel = activeProvider === "microsoft" ? "Microsoft 365" : "Gmail";
  const activeEmailConnector = activeProvider === "microsoft" ? status?.microsoft : status?.gmail;
  const gmailReconnectRequired = Boolean(activeEmailConnector?.reconnectRequired || monitoring?.reconnectRequired);
  const scanNeedsReconnect = gmailReconnectRequired
    || scanResult?.status === "requires_gmail_read_scope"
    || scanResult?.status === "requires_gmail_send_scope"
    || scanResult?.status === "requires_microsoft_read_scope"
    || scanResult?.status === "requires_microsoft_send_scope";
  const canRun = Boolean(readiness?.canRunManual && (readiness.status === "ready" || readiness.status === "draft_only"));
  const lastCheckAt = monitoring?.lastRunAt ?? monitoring?.lastScanTime ?? null;
  const hasRunScan = Boolean(lastCheckAt);
  const monitoringActive = monitoring?.status === "monitoring_active";
  const setupState = setup?.state ?? (activeEmailConnector?.executable ? "setup_incomplete" : "needs_setup");
  const readinessPercent = setup?.readinessPercent ?? readiness?.readinessPercent ?? 0;
  const emailMode = status?.customerEmailMode === "draft_only" ? "Draft only" : "Approval required";

  const pill = (() => {
    if (gmailReconnectRequired) return { label: "Needs setup", color: "var(--amber)", bg: "rgba(245,194,107,0.1)" };
    if (setupState === "needs_setup") return { label: "Needs setup", color: "var(--text-dim)", bg: "rgba(255,255,255,0.04)" };
    if (setupState === "setup_incomplete") return { label: "Setup incomplete", color: "var(--amber)", bg: "rgba(245,194,107,0.1)" };
    if (monitoringActive) return { label: "Monitoring active", color: "var(--green)", bg: "rgba(81,216,138,0.1)" };
    return { label: "Ready", color: "var(--green)", bg: "rgba(81,216,138,0.1)" };
  })();

  const heroTitle = setupState === "needs_setup"
    ? "Connect Gmail or Microsoft 365 to start Client Flow"
    : setupState === "setup_incomplete"
      ? "Client Flow is almost ready"
      : "Client Flow is ready to monitor client requests";
  const heroSub = (() => {
    if (setupState === "needs_setup") return "Client Flow reads client emails and prepares approved replies. Connect Gmail or Microsoft 365 to begin.";
    if (setupState === "setup_incomplete") {
      if (!setup?.trelloTaskExecutionReady) return "Select a Trello board and list so Client Flow can turn requests into approved tasks.";
      return "A couple of setup steps remain. Complete them to unlock the full flow.";
    }
    return "Monitoring client communication in the background. Approvals appear only when action is needed.";
  })();

  const checklist: ChecklistItem[] = [
    {
      label: `${activeProviderLabel} connected`,
      ok: Boolean(activeEmailConnector?.executable) && !gmailReconnectRequired,
      detail: gmailReconnectRequired
        ? `Reconnect ${activeProviderLabel} to restore reading and approval-gated replies.`
        : activeEmailConnector?.accountEmail
          ? `Reading client emails as ${activeEmailConnector.accountEmail}.`
          : "Reads client emails and prepares approved replies. Connect Gmail or Microsoft 365.",
      action: gmailReconnectRequired
        ? { label: `Reconnect ${activeProviderLabel}`, href: "/app/connectors" }
        : { label: "Open connectors", href: "/app/connectors" },
    },
    {
      label: "Trello board and list selected",
      ok: Boolean(setup?.trelloTaskExecutionReady),
      detail: setup?.trelloConnected
        ? setup?.trelloDestinationSet
          ? `Tasks are created on ${status?.trello?.defaultListName || "the selected list"} after approval.`
          : "Connected, but a task destination is not selected yet."
        : "Connect Trello to create project tasks after approval.",
      action: { label: "Select Trello board/list", href: "/app/connectors" },
    },
    {
      label: "Customer email policy set",
      ok: Boolean(setup?.customerEmailPolicySet ?? true),
      detail: `Client replies are set to ${emailMode.toLowerCase()}.`,
      action: { label: "Review approval policy", href: "/app/policies" },
    },
    {
      label: "Approval flow active",
      ok: Boolean(setup?.approvalFlowActive ?? true),
      detail: "Every client reply and task waits for human approval before it runs.",
      action: { label: "View approvals", href: "/app/approvals" },
    },
    {
      label: "Slack alert channel selected",
      ok: Boolean(setup?.slackAlertsReady),
      recommended: true,
      detail: setup?.slackConnected
        ? setup?.slackChannelSelected
          ? `Internal alerts post to ${status?.slack?.defaultChannelName ? `#${status.slack.defaultChannelName}` : "the selected channel"}.`
          : "Connected, but alerts are disabled. Select a channel to enable."
        : "Connect Slack to get internal alerts when client approvals are created.",
      action: { label: "Select Slack channel", href: "/app/connectors" },
    },
  ];

  return (
    <div className="os-page operator-detail-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet"><Link href="/app/agents" style={{ color: "inherit", textDecoration: "none" }}>Operators</Link> / Client Flow</span>
          <h1>Client Flow Operator</h1>
          <div className="os-page-sub">Monitors client communication, prepares follow-ups, and turns requests into approved project actions.</div>
        </div>
        <div className="os-page-actions" style={{ alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: pill.color, background: pill.bg, padding: "6px 12px", borderRadius: 999 }}>{pill.label}</span>
          <Link href="/app/approvals" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>View approvals</Link>
          <button className="btn btn-ghost btn-sm" type="button" onClick={submitScan} disabled={!canRun || scanSubmitting} style={{ opacity: !canRun || scanSubmitting ? 0.45 : 1 }}>
            {scanSubmitting ? "Checking..." : "Run manual check"}
          </button>
        </div>
      </div>

      {error && <div role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}

      {/* Hero readiness */}
      <div className="p" style={{ gap: 0, overflow: "hidden" }}>
        <div style={{ padding: "24px 26px", display: "grid", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>{loading ? "Loading operator state..." : heroTitle}</h2>
              <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--text-dim)", maxWidth: 560 }}>{heroSub}</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 120 }}>
              <div style={{ fontSize: 30, fontWeight: 600, color: readinessPercent >= 100 ? "var(--green)" : "var(--text)" }}>{readinessPercent}%</div>
              <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>setup complete</div>
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${readinessPercent}%`, background: "linear-gradient(90deg, #5FD3A8, #4DE8E1)", transition: "width 0.4s ease" }} />
          </div>
          {setup?.slackRecommendedMissing && setupState === "ready" && (
            <div style={{ fontSize: 12.5, color: "var(--blue)" }}>Recommended setup missing: select a Slack channel to receive internal alerts when client approvals are created.</div>
          )}
          <div style={{ display: "grid", gap: 0 }}>
            {checklist.map((item, index) => (
              <div key={item.label} style={{ borderTop: index === 0 ? "none" : "1px solid var(--line)" }}>
                <ChecklistRow item={item} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connected tools */}
      <div className="p" style={{ gap: 0 }}>
        <div className="p-head"><h3>Connected tools</h3></div>
        <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <ToolCard
            name={activeProviderLabel}
            tone="Client inbox"
            ready={Boolean(activeEmailConnector?.executable) && !gmailReconnectRequired}
            headline="Reads client emails and prepares approved replies."
            note={gmailReconnectRequired ? `Reconnect ${activeProviderLabel} to restore access.` : undefined}
          />
          <ToolCard
            name="Slack"
            tone="Internal alerts"
            ready={Boolean(setup?.slackAlertsReady)}
            headline="Sends internal alerts when client approvals are created."
            note={setup?.slackConnected && !setup?.slackAlertsReady ? "Connected, but alerts are disabled. Select a channel to enable." : undefined}
          />
          <ToolCard
            name="Trello"
            tone="Project tasks"
            ready={Boolean(setup?.trelloTaskExecutionReady)}
            headline="Creates project tasks after approval."
            note={setup?.trelloConnected && !setup?.trelloDestinationSet ? "Connected, but task destination is not selected." : undefined}
          />
        </div>
      </div>

      {/* Monitoring summary + policy */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div className="p" style={{ gap: 0 }}>
          <div className="p-head">
            <div>
              <h3>Monitoring</h3>
              <div className="p-meta" style={{ marginTop: 4 }}>{loading ? "Loading..." : monitoring?.nextScanLabel ?? "Daily scan ready"}{lastCheckAt ? ` · Last check ${relativeTime(lastCheckAt)}` : ""}</div>
            </div>
          </div>
          <div style={{ padding: "18px 20px" }}>
            {!hasRunScan ? (
              <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No client check has run yet. Run a manual check to test the operator.</div>
                <button className="btn btn-ghost btn-sm" type="button" onClick={submitScan} disabled={!canRun || scanSubmitting} style={{ opacity: !canRun || scanSubmitting ? 0.45 : 1 }}>{scanSubmitting ? "Checking..." : "Run manual check"}</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                <Stat label="Emails checked" value={String(monitoring?.emailsChecked ?? 0)} />
                <Stat label="Client requests" value={String(monitoring?.signalsFound ?? 0)} />
                <Stat label="Approvals created" value={String(monitoring?.approvalsCreated ?? 0)} />
                <Stat label="Routed to Revenue" value={String(monitoring?.routedToRevenueCount ?? 0)} />
                <Stat label="Skipped noise" value={String(monitoring?.skippedSafelyCount ?? 0)} />
                <Stat label="Last check" value={lastCheckAt ? relativeTime(lastCheckAt) : "-"} />
              </div>
            )}
            {scanResult && (
              <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: scanNeedsReconnect ? "rgba(245,194,107,0.06)" : "rgba(95,211,168,0.06)", boxShadow: scanNeedsReconnect ? "inset 0 0 0 1px rgba(245,194,107,0.2)" : "inset 0 0 0 1px rgba(95,211,168,0.18)", display: "grid", gap: 5 }}>
                <div style={{ fontSize: 12.8, fontWeight: 600 }}>{scanNeedsReconnect ? `Reconnect ${activeProviderLabel} required` : `Manual check ${scanResult.status ?? "completed"}`}</div>
                {scanResult.message && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{scanResult.message}</div>}
                {!scanNeedsReconnect && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{scanResult.scanned ?? 0} checked · {scanResult.signalsFound ?? 0} client requests · {scanResult.approvalsCreated ?? 0} approvals · {scanResult.routedToRevenueCount ?? 0} routed to Revenue.</div>}
              </div>
            )}
          </div>
        </div>

        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>Policy</h3></div>
          <div style={{ padding: "8px 20px 16px" }}>
            <PolicyRow label="Customer email" value={emailMode} tone="amber" />
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <PolicyRow label="Trello task changes" value="Approval required" tone="amber" />
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <PolicyRow label="Slack alerts" value={setup?.slackAlertsReady ? "Enabled" : "Disabled"} tone={setup?.slackAlertsReady ? "green" : "neutral"} />
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <PolicyRow label="Human review" value="Required" tone="green" />
          </div>
        </div>
      </div>

      {/* Last run and pending approvals */}
      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <h3>Last run and pending approvals</h3>
          <button className="btn btn-ghost btn-sm" type="button" onClick={submitScan} disabled={!canRun || scanSubmitting} style={{ opacity: !canRun || scanSubmitting ? 0.45 : 1 }}>{scanSubmitting ? "Checking..." : "Run manual check"}</button>
        </div>
        <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>Pending approvals</div>
            {(monitoring?.recentPendingApprovals?.length ?? 0) === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No pending Client Flow approvals.</div> : monitoring?.recentPendingApprovals.map((approval) => (
              <div key={approval.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{approval.subject || approval.title}</div>
                <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--text-mute)" }}>{approval.to || "Unknown recipient"} · {approval.created_at ? relativeTime(approval.created_at) : "unknown time"}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>Recent runs</div>
            {runs.length === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No Client Flow checks have run yet.</div> : runs.slice(0, 5).map((run) => (
              <div key={run.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{run.output?.title || run.output?.type || "Client Flow run"}</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: run.status === "completed" ? "var(--green)" : run.status === "failed" ? "var(--rose)" : "var(--amber)" }}>{run.status}</div></div>
                <div style={{ marginTop: 3, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{relativeTime(run.created_at)} · Approval: {run.approval_id || "none"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activation */}
      {(() => {
        const systemsInUse = [
          ...(activeEmailConnector?.executable ? [activeProviderLabel] : []),
          ...(setup?.trelloConnected ? [getConnectorDefinition("trello")?.displayName ?? "Trello"] : []),
          ...(setup?.slackConnected ? [getConnectorDefinition("slack")?.displayName ?? "Slack"] : []),
        ];
        const availableNow = humanizeOperatorActions(readiness?.availableActions ?? []);
        const upgrades = (status?.optionalUpsellConnectors ?? []).filter((c) => c.status === "available");
        const configured = Boolean(readiness?.canRunManual);
        const eligibility = readiness?.executionEligibility;
        return (
          <section className="p" style={{ gap: 0 }}>
            <div className="p-head"><h3>Operator activation</h3></div>
            <div style={{ padding: "16px 20px", display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>Systems in use</div>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--text-mute)" }}>{systemsInUse.length ? systemsInUse.join(", ") : "None connected yet"}</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 10 }}>
                    <Link href="/app/connectors" className="lnk-open">Manage connections</Link>
                    {gmailReconnectRequired && (
                      <button type="button" className="lnk-open" style={{ border: "none", background: "none", cursor: "pointer", padding: 0, color: "var(--amber)" }} onClick={() => startEmailReconnect(activeProvider === "microsoft" ? "microsoft" : "gmail")}>
                        Reconnect {activeProviderLabel}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>Available now</div>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--text-mute)" }}>{availableNow.length ? availableNow.join(", ") : "Connect a system to get started"}</div>
                </div>
              </div>
              {upgrades.length > 0 && (
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>Optional enhancements</div>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--text-mute)" }}>
                    {upgrades.map((c) => c.displayName).join(", ")} could add further context. <Link href="/app/connectors" className="lnk-open">Connect</Link>
                  </div>
                </div>
              )}
              {eligibility && state.workspace.id && (
                <OperatorActivationToggle
                  operatorKey="client_flow"
                  workspaceId={state.workspace.id}
                  userId={state.currentUser.id}
                  userEmail={state.currentUser.email}
                  executionEligibility={eligibility}
                  configured={configured}
                />
              )}
            </div>
          </section>
        );
      })()}

      {state.workspace.id && (
        <OperatorDegradedNotice
          operatorKey="client_flow"
          workspaceId={state.workspace.id}
          userId={state.currentUser.id}
          userEmail={state.currentUser.email}
        />
      )}

      {/* Advanced details */}
      <details className="p" style={{ gap: 0 }}>
        <summary style={{ listStyle: "none", cursor: "pointer", padding: "14px 20px", fontSize: 13, fontWeight: 600, color: "var(--text-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Advanced details
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>readiness, schedule, skipped reasons, connector ids</span>
        </summary>
        <div style={{ padding: "0 20px 20px", display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Schedule</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Cadence: {monitoring?.cadence ?? "daily"}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Source mode: {monitoring?.sourceMode ?? "scheduled"}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Last run status: {monitoring?.lastRunStatus ?? "none"}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Next run: {monitoring?.nextRunAt ?? "not scheduled"}</div>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Connectors</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Gmail: {status?.gmail?.status ?? "missing"}{status?.gmail?.accountEmail ? ` (${status.gmail.accountEmail})` : ""}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Microsoft 365: {status?.microsoft?.status ?? "missing"}{status?.microsoft?.accountEmail ? ` (${status.microsoft.accountEmail})` : ""}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Slack: {status?.slack?.status ?? "not_connected"} · channel {status?.slack?.defaultChannelName || "none"}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Trello: {status?.trello?.status ?? "not_connected"} · list {status?.trello?.defaultListName || "none"}</div>
            </div>
          </div>
          {scanResult?.skipped && scanResult.skipped.length > 0 && (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Skipped reasons (last manual check)</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>
                {Object.entries(scanResult.skipped.reduce<Record<string, number>>((counts, item) => { counts[item.reason] = (counts[item.reason] ?? 0) + 1; return counts; }, {})).map(([reason, count]) => `${reason}: ${count}`).join(" · ")}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Readiness object</div>
            <pre style={{ margin: 0, padding: "12px 14px", borderRadius: 10, background: "rgba(0,0,0,0.25)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 11, color: "var(--text-mute)", overflowX: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(readiness ?? {}, null, 2)}</pre>
          </div>
          {monitoring?.lastRunSummary && (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Last run summary</div>
              <pre style={{ margin: 0, padding: "12px 14px", borderRadius: 10, background: "rgba(0,0,0,0.25)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 11, color: "var(--text-mute)", overflowX: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(monitoring.lastRunSummary, null, 2)}</pre>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

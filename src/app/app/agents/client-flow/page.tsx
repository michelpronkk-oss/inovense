"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { OperatorActivationToggle, type ActivationEligibility } from "@/components/operators/activation-toggle";
import { OperatorWorkforceBriefing, type OperatorBriefingState } from "@/components/operators/workforce-briefing";
import { getOperatorCapabilityCopy } from "@/lib/operators/capability-presentation";
import { OperatorRuntimeAvatar } from "@/components/operators/runtime-avatar";

type OperatorReadiness = {
  operatorKey: string;
  status: "ready" | "draft_only" | "missing_connector" | "upgrade_required" | "coming_next" | "preview";
  readinessPercent: number;
  missingRequiredConnectors: string[];
  connectedRequiredConnectors: string[];
  optionalConnectors: string[];
  availableActions: string[];
  availableBusinessActions?: string[];
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "16px 16px", borderRadius: 14, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-mute)" }}>{label}</div>
    </div>
  );
}

function PolicyBadge({ value, tone }: { value: string; tone: "amber" | "green" | "neutral" }) {
  return <span className={`badge ${tone === "neutral" ? "muted" : tone}`}>{value.toUpperCase()}</span>;
}

export default function ClientFlowOperatorPage() {
  const { state } = useOS();
  const [readiness, setReadiness] = useState<OperatorReadiness | null>(null);
  const [status, setStatus] = useState<ClientFlowStatus | null>(null);
  const [presentationState, setPresentationState] = useState<OperatorBriefingState | null>(null);
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
  const emailMode = status?.customerEmailMode === "draft_only" ? "Draft only" : "Approval required";
  const pendingApprovals = monitoring?.recentPendingApprovals?.length ?? 0;
  const optionalContext = getOperatorCapabilityCopy("client_flow").optional;
  const showRuntime = presentationState?.lifecycle === "active";
  const showControls = Boolean(presentationState && presentationState.lifecycle !== "available_to_unlock");

  return (
    <div className="os-page operator-detail-page">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <div className="inline" style={{ gap: 16, alignItems: "flex-start" }}>
          <OperatorRuntimeAvatar operatorKey="client_flow" />
          <div>
            <div className="inline" style={{ gap: 11 }}>
              <h1 className="t-title" style={{ fontSize: 24 }}>Client Flow Operator</h1>
              {presentationState && <span className="os-status" data-state={presentationState.state}>{presentationState.label}</span>}
            </div>
            <p className="t-sub" style={{ marginTop: 7 }}>Monitors client communication, prepares follow-ups, and turns requests into approved project actions.</p>
          </div>
        </div>
      </div>

      {error && <section className="attn crit"><div className="card-pad" style={{ padding: "10px 14px", fontSize: 12.5 }}>{error}</div></section>}

      <OperatorWorkforceBriefing
        operatorKey="client_flow"
        onStateChange={setPresentationState}
        runtime={{
          pendingApprovals,
          monitoringLabel: monitoringActive ? "Active" : "Scheduled",
          nextCheckLabel: monitoring?.nextScanLabel ?? "Daily",
        }}
      />

      {(showRuntime || showControls) && (
        <div className="sec split">
          {showRuntime && <div className="stack">
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="t-section">Monitoring</div>
                  <div className="t-meta" style={{ marginTop: 3 }}>{loading ? "Loading…" : monitoringActive ? "Daily monitoring active" : "Scheduled monitoring"}{lastCheckAt ? ` · Last check ${relativeTime(lastCheckAt)}` : ""}</div>
                </div>
              </div>
              <div className="card-pad">
                {!hasRunScan ? (
                  <div className="stack" style={{ gap: 12, alignItems: "flex-start" }}>
                    <div className="t-compact">Monitoring is active. The first scheduled check has not run yet.</div>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={submitScan} disabled={!canRun || scanSubmitting}>{scanSubmitting ? "Checking…" : "Run manual check"}</button>
                  </div>
                ) : (
                  <div className="grid3">
                    <Stat label="Emails checked" value={String(monitoring?.emailsChecked ?? 0)} />
                    <Stat label="Client requests" value={String(monitoring?.signalsFound ?? 0)} />
                    <Stat label="Approvals created" value={String(monitoring?.approvalsCreated ?? 0)} />
                  </div>
                )}
              </div>
              {scanResult && (
                <div className="card-pad" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="t-object" style={{ fontSize: 13 }}>{scanNeedsReconnect ? `Reconnect ${activeProviderLabel} required` : `Manual check ${scanResult.status ?? "completed"}`}</div>
                  {scanResult.message && <div className="t-compact" style={{ marginTop: 4 }}>{scanResult.message}</div>}
                  {!scanNeedsReconnect && <div className="t-meta" style={{ marginTop: 4 }}>{scanResult.scanned ?? 0} checked · {scanResult.signalsFound ?? 0} client requests · {scanResult.approvalsCreated ?? 0} approvals · {scanResult.routedToRevenueCount ?? 0} routed to Revenue</div>}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head"><div className="t-section">Current work</div>
                {(monitoring?.recentPendingApprovals?.length ?? 0) > 0
                  ? <Link href="/app/approvals" className="btn btn-primary btn-sm">{pendingApprovals} awaiting review</Link>
                  : <Link href="/app/approvals" className="btn btn-sm btn-ghost">Approval inbox</Link>}
              </div>
              {pendingApprovals === 0 && runs.length === 0 ? (
                <div className="card-pad t-meta">No issues need attention right now. Next scheduled check: {monitoring?.nextScanLabel ?? "daily"}.</div>
              ) : (
                <div className="rows">
                  {(monitoring?.recentPendingApprovals ?? []).map((approval) => (
                    <div className="row" key={approval.id}>
                      <span className="grow"><span className="ttl">{approval.subject || approval.title}</span><span className="sub">{approval.to || "Unknown recipient"} · {approval.created_at ? relativeTime(approval.created_at) : "unknown time"}</span></span>
                      <span className="badge amber">APPROVAL NEEDED</span>
                    </div>
                  ))}
                  {runs.slice(0, 5).map((run) => (
                    <div className="row" key={run.id}>
                      <span className="grow"><span className="ttl">{run.output?.title || run.output?.type || "Client Flow run"}</span><span className="sub">{relativeTime(run.created_at)} · Approval: {run.approval_id || "none"}</span></span>
                      <span className={`badge ${run.status === "completed" ? "green" : run.status === "failed" ? "red" : "amber"}`}>{run.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <details className="card">
              <summary style={{ cursor: "pointer", listStyle: "none", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="t-object">Advanced details</span><span className="t-meta">Readiness, schedule, skipped reasons, connector ids</span></summary>
              <div className="card-pad" style={{ borderTop: "1px solid var(--line)", display: "grid", gap: 14 }}>
                <dl className="kv">
                  <dt>Cadence</dt><dd>{monitoring?.cadence ?? "daily"} · source {monitoring?.sourceMode ?? "scheduled"}</dd>
                  <dt>Last run</dt><dd>{monitoring?.lastRunStatus ?? "none"} · next {monitoring?.nextRunAt ?? "not scheduled"}</dd>
                  <dt>Gmail</dt><dd>{status?.gmail?.status ?? "missing"}{status?.gmail?.accountEmail ? ` (${status.gmail.accountEmail})` : ""}</dd>
                  <dt>Microsoft 365</dt><dd>{status?.microsoft?.status ?? "missing"}{status?.microsoft?.accountEmail ? ` (${status.microsoft.accountEmail})` : ""}</dd>
                  <dt>Slack</dt><dd>{status?.slack?.status ?? "not_connected"} · channel {status?.slack?.defaultChannelName || "none"}</dd>
                  <dt>Trello</dt><dd>{status?.trello?.status ?? "not_connected"} · list {status?.trello?.defaultListName || "none"}</dd>
                </dl>
                {scanResult?.skipped && scanResult.skipped.length > 0 && (
                  <div>
                    <div className="t-eyebrow">Skipped reasons (last manual check)</div>
                    <div className="t-meta" style={{ marginTop: 6 }}>
                      {Object.entries(scanResult.skipped.reduce<Record<string, number>>((counts, item) => { counts[item.reason] = (counts[item.reason] ?? 0) + 1; return counts; }, {})).map(([reason, count]) => `${reason}: ${count}`).join(" · ")}
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>}

          <div className="stack">
            {showRuntime && <div className="card">
              <div className="card-head"><div className="t-section">Policy</div></div>
              <div className="rows">
                <div className="row"><span className="grow t-compact">Customer-facing messages</span><PolicyBadge value={emailMode} tone="amber" /></div>
                <div className="row"><span className="grow t-compact">Project updates</span><PolicyBadge value="Approval required" tone="amber" /></div>
                <div className="row"><span className="grow t-compact">Internal alerts</span><PolicyBadge value={setup?.slackAlertsReady ? "Enabled" : "Disabled"} tone={setup?.slackAlertsReady ? "green" : "neutral"} /></div>
                <div className="row"><span className="grow t-compact">Human review</span><PolicyBadge value="Required" tone="green" /></div>
              </div>
            </div>}

            {showControls && (() => {
              const upgrades = (status?.optionalUpsellConnectors ?? []).filter((c) => c.status === "available");
              const configured = Boolean(readiness?.canRunManual);
              const eligibility = readiness?.executionEligibility;
              return (
                <div className="card">
                  <div className="card-head"><div className="t-section">Context & controls</div><Link href="/app/connectors" className="btn btn-sm btn-ghost">Manage context</Link></div>
                  <div className="card-pad" style={{ display: "grid", gap: 14 }}>
                    {upgrades.length > 0 && (
                      <div>
                        <div className="t-eyebrow">Add more context</div>
                        <div className="t-compact" style={{ marginTop: 6 }}>{optionalContext.join(" · ")}</div>
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
                        canManage={state.currentUser.roleLabel === "Owner" || state.currentUser.roleLabel === "Admin"}
                        runtimeControl
                      />
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

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
  status: string;
  connectedRequiredConnectors: string[];
  availableActions: string[];
  availableBusinessActions?: string[];
  canRunManual: boolean;
  executionEligibility?: ActivationEligibility;
};

type OperationsRun = {
  id: string;
  operator_key: string;
  status: string;
  output: { title?: string; type?: string } | null;
  approval_id: string | null;
  created_at: string;
};

type OperationsScanResult = {
  status?: string;
  message?: string;
  setupComplete?: boolean;
  cardsChecked?: number;
  signalsFound?: number;
  approvalsCreated?: number;
  signals?: { signalType: string; severity: string; cardName?: string; listName?: string; approvalId: string }[];
  suggestions?: string[];
  error?: string;
};

type OperationsSetup = {
  state?: "ready" | "setup_incomplete" | "needs_setup";
  readinessPercent?: number;
  coreReady?: boolean;
  trelloConnected?: boolean;
  trelloDestinationSet?: boolean;
  asanaConnected?: boolean;
  asanaProjectSelected?: boolean;
  jiraConnected?: boolean;
  jiraProjectSelected?: boolean;
  projectManagementReady?: boolean;
  slackConnected?: boolean;
  slackChannelSelected?: boolean;
  slackAlertsReady?: boolean;
  slackRecommendedMissing?: boolean;
  approvalFlowActive?: boolean;
  canRunManual?: boolean;
};

type OperationsStatus = {
  readiness?: OperatorReadiness | null;
  optionalUpsellConnectors?: { connectorKey: string; displayName: string; status: string }[];
  trello?: { status?: string; connected?: boolean; defaultBoardName?: string | null; defaultListName?: string | null } | null;
  asana?: { status?: string; connected?: boolean; projectSelected?: boolean } | null;
  jira?: { status?: string; connected?: boolean; projectSelected?: boolean } | null;
  slack?: { status?: string; connected?: boolean; channelSelected?: boolean; defaultChannelName?: string | null } | null;
  setup?: OperationsSetup;
  monitoring?: {
    status: string;
    cadence?: string;
    lastRunAt?: string | null;
    nextRunAt?: string | null;
    lastScanTime: string | null;
    cardsChecked: number;
    signalsFound: number;
    approvalsCreated: number;
    staleOverdueCount: number;
    nextScanLabel: string;
    recentPendingApprovals: { id: string; title: string; created_at: string | null; signalType: string | null; severity: string | null; cardName: string | null; listName: string | null }[];
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

export default function OperationsOperatorPage() {
  const { state } = useOS();
  const [status, setStatus] = useState<OperationsStatus | null>(null);
  const [presentationState, setPresentationState] = useState<OperatorBriefingState | null>(null);
  const [runs, setRuns] = useState<OperationsRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<OperationsScanResult | null>(null);

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
      const runsQs = new URLSearchParams(identityParams);
      runsQs.set("operatorKey", "operations");
      const statusQs = new URLSearchParams(identityParams);
      const [runsRes, statusRes] = await Promise.all([
        fetch(`/api/operators/runs?${runsQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/operations/status?${statusQs.toString()}`, { cache: "no-store" }),
      ]);
      const runsJson = await runsRes.json().catch(() => ({})) as { runs?: OperationsRun[]; error?: string };
      const statusJson = await statusRes.json().catch(() => ({})) as OperationsStatus;
      if (!statusRes.ok) throw new Error(statusJson.error || "Could not load Operations status.");
      setStatus(statusJson);
      setRuns(Array.isArray(runsJson.runs) ? runsJson.runs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Operations runtime.");
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
      const res = await fetch("/api/operators/operations/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email }),
      });
      const json = await res.json().catch(() => ({})) as OperationsScanResult;
      setScanResult(json);
      if (!res.ok) throw new Error(json.message || json.error || "Operations check failed.");
      await loadRuntime();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operations check failed.");
    } finally {
      setScanSubmitting(false);
    }
  };

  const setup = status?.setup;
  const monitoring = status?.monitoring;
  const canRun = Boolean(setup?.canRunManual);
  const lastCheckAt = monitoring?.lastRunAt ?? monitoring?.lastScanTime ?? null;
  const hasRunScan = Boolean(lastCheckAt);
  const pendingApprovals = monitoring?.recentPendingApprovals?.length ?? 0;
  const optionalContext = getOperatorCapabilityCopy("operations").optional;
  const showRuntime = presentationState?.lifecycle === "active";
  const showControls = Boolean(presentationState && presentationState.lifecycle !== "available_to_unlock");

  return (
    <div className="os-page operator-detail-page">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <div className="inline" style={{ gap: 16, alignItems: "flex-start" }}>
          <OperatorRuntimeAvatar operatorKey="operations" />
          <div>
            <div className="inline" style={{ gap: 11 }}>
              <h1 className="t-title" style={{ fontSize: 24 }}>Operations Operator</h1>
              {presentationState && <span className="os-status" data-state={presentationState.state}>{presentationState.label}</span>}
            </div>
            <p className="t-sub" style={{ marginTop: 7 }}>Monitors internal work, finds stalled tasks, and prepares approved operational updates.</p>
          </div>
        </div>
      </div>

      {error && <section className="attn crit"><div className="card-pad" style={{ padding: "10px 14px", fontSize: 12.5 }}>{error}</div></section>}

      <OperatorWorkforceBriefing
        operatorKey="operations"
        onStateChange={setPresentationState}
        runtime={{
          pendingApprovals,
          monitoringLabel: monitoring?.status === "monitoring_active" ? "Active" : "Scheduled",
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
                  <div className="t-meta" style={{ marginTop: 3 }}>{loading ? "Loading…" : monitoring?.status === "monitoring_active" ? "Daily monitoring active" : "Scheduled monitoring"}{lastCheckAt ? ` · Last check ${relativeTime(lastCheckAt)}` : ""}</div>
                </div>
              </div>
              <div className="card-pad">
                {!hasRunScan ? (
                  <div className="stack" style={{ gap: 12, alignItems: "flex-start" }}>
                    <div className="t-compact">Monitoring is active. The first scheduled check has not run yet.</div>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={submitScan} disabled={!canRun || scanSubmitting}>{scanSubmitting ? "Checking…" : "Run manual check"}</button>
                  </div>
                ) : (
                  <div className="grid4">
                    <Stat label="Cards checked" value={String(monitoring?.cardsChecked ?? 0)} />
                    <Stat label="Signals found" value={String(monitoring?.signalsFound ?? 0)} />
                    <Stat label="Approvals created" value={String(monitoring?.approvalsCreated ?? 0)} />
                    <Stat label="Stale / overdue" value={String(monitoring?.staleOverdueCount ?? 0)} />
                  </div>
                )}
              </div>
              {scanResult && (
                <div className="card-pad" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="t-object" style={{ fontSize: 13 }}>{scanResult.status === "setup_incomplete" ? "Check could not start" : `Manual check ${scanResult.status ?? "completed"}`}</div>
                  {scanResult.message && <div className="t-compact" style={{ marginTop: 4 }}>{scanResult.message}</div>}
                  {scanResult.status === "completed" && <div className="t-meta" style={{ marginTop: 4 }}>{scanResult.cardsChecked ?? 0} cards checked · {scanResult.signalsFound ?? 0} signals · {scanResult.approvalsCreated ?? 0} approvals</div>}
                  {scanResult.suggestions && scanResult.suggestions.length > 0 && <div className="t-meta" style={{ marginTop: 4 }}>No signals yet. To see it work: {scanResult.suggestions.join(" · ")}</div>}
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
                      <span className="grow"><span className="ttl">{approval.cardName || approval.title}</span><span className="sub">{(approval.signalType || "signal").replace(/_/g, " ")}{approval.severity ? ` · ${approval.severity}` : ""}{approval.listName ? ` · ${approval.listName}` : ""} · {approval.created_at ? relativeTime(approval.created_at) : "unknown time"}</span></span>
                      <span className="badge amber">APPROVAL NEEDED</span>
                    </div>
                  ))}
                  {runs.slice(0, 5).map((run) => (
                    <div className="row" key={run.id}>
                      <span className="grow"><span className="ttl">{run.output?.title || run.output?.type || "Operations run"}</span><span className="sub">{relativeTime(run.created_at)} · Approval: {run.approval_id || "none"}</span></span>
                      <span className={`badge ${run.status === "completed" ? "green" : run.status === "failed" ? "red" : "amber"}`}>{run.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <details className="card">
              <summary style={{ cursor: "pointer", listStyle: "none", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="t-object">Advanced details</span><span className="t-meta">Schedule, provider state, readiness</span></summary>
              <dl className="kv card-pad" style={{ borderTop: "1px solid var(--line)" }}>
                <dt>Cadence</dt><dd>{monitoring?.cadence ?? "daily"}</dd>
                <dt>Next run</dt><dd>{monitoring?.nextRunAt ?? "not scheduled"}</dd>
                <dt>Project providers</dt><dd>Trello {status?.trello?.status ?? "missing"} · Asana {status?.asana?.status ?? "missing"} · Jira {status?.jira?.status ?? "missing"}</dd>
                <dt>Readiness</dt><dd>{status?.readiness?.status ?? "unknown"}</dd>
              </dl>
            </details>
          </div>}

          <div className="stack">
            {showRuntime && <div className="card">
              <div className="card-head"><div className="t-section">Policy</div></div>
              <div className="rows">
                <div className="row"><span className="grow t-compact">Project updates</span><span className="badge amber">APPROVAL</span></div>
                <div className="row"><span className="grow t-compact">Internal alerts</span><span className={`badge ${setup?.slackAlertsReady ? "green" : "muted"}`}>{setup?.slackAlertsReady ? "ENABLED" : "DISABLED"}</span></div>
                <div className="row"><span className="grow t-compact">Human review</span><span className="badge">{setup?.approvalFlowActive === false ? "REVIEW CONFIG" : "REQUIRED"}</span></div>
              </div>
            </div>}

            {showControls && (() => {
              const upgrades = (status?.optionalUpsellConnectors ?? []).filter((c) => c.status === "available");
              const configured = Boolean(status?.readiness?.canRunManual ?? setup?.canRunManual);
              const eligibility = status?.readiness?.executionEligibility;
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
                        operatorKey="operations"
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

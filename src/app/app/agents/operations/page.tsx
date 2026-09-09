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
      <div className="os-page-head">
        <div className="operator-page-heading">
          <OperatorRuntimeAvatar operatorKey="operations" />
          <span className="os-greet"><Link href="/app/agents" style={{ color: "inherit", textDecoration: "none" }}>Operators</Link> / Operations</span>
          <h1>Operations Operator</h1>
          <div className="os-page-sub">Monitors internal work, finds stalled tasks, and prepares approved operational updates.</div>
        </div>
        {presentationState && <span className="os-status" data-state={presentationState.state}>{presentationState.label}</span>}
      </div>

      <OperatorWorkforceBriefing
        operatorKey="operations"
        onStateChange={setPresentationState}
        runtime={{
          pendingApprovals,
          monitoringLabel: monitoring?.status === "monitoring_active" ? "Active" : "Scheduled",
          nextCheckLabel: monitoring?.nextScanLabel ?? "Daily",
        }}
      />

      {error && <div role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}

      {showRuntime && <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <div>
            <h3>Monitoring</h3>
            <div className="p-meta" style={{ marginTop: 4 }}>{loading ? "Loading..." : monitoring?.status === "monitoring_active" ? "Daily monitoring active" : "Scheduled monitoring"}{lastCheckAt ? ` · Last check ${relativeTime(lastCheckAt)}` : ""}</div>
          </div>
        </div>
        <div style={{ padding: "18px 20px" }}>
          {!hasRunScan ? (
            <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Monitoring is active. The first scheduled check has not run yet.</div>
              <button className="btn btn-ghost btn-sm" type="button" onClick={submitScan} disabled={!canRun || scanSubmitting} style={{ opacity: !canRun || scanSubmitting ? 0.45 : 1 }}>{scanSubmitting ? "Checking..." : "Run manual check"}</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
              <Stat label="Cards checked" value={String(monitoring?.cardsChecked ?? 0)} />
              <Stat label="Signals found" value={String(monitoring?.signalsFound ?? 0)} />
              <Stat label="Approvals created" value={String(monitoring?.approvalsCreated ?? 0)} />
              <Stat label="Stale / overdue" value={String(monitoring?.staleOverdueCount ?? 0)} />
            </div>
          )}
          {scanResult && (
            <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: scanResult.status === "setup_incomplete" ? "rgba(245,194,107,0.06)" : "rgba(102,208,224,0.06)", boxShadow: scanResult.status === "setup_incomplete" ? "inset 0 0 0 1px rgba(245,194,107,0.2)" : "inset 0 0 0 1px rgba(102,208,224,0.18)", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12.8, fontWeight: 600 }}>{scanResult.status === "setup_incomplete" ? "Check could not start" : `Manual check ${scanResult.status ?? "completed"}`}</div>
              {scanResult.message && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{scanResult.message}</div>}
              {scanResult.status === "completed" && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{scanResult.cardsChecked ?? 0} cards checked · {scanResult.signalsFound ?? 0} signals · {scanResult.approvalsCreated ?? 0} approvals.</div>}
              {scanResult.suggestions && scanResult.suggestions.length > 0 && (
                <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>
                  No signals yet. To see it work: {scanResult.suggestions.join(" · ")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>}

      {showRuntime && (
        <section className="p operator-policy-strip">
          <div className="p-head"><h3>Policy</h3></div>
          <div>
            <span><small>Project updates</small><strong>Approval required</strong></span>
            <span><small>Internal alerts</small><strong>{setup?.slackAlertsReady ? "Enabled" : "Disabled"}</strong></span>
            <span><small>Human review</small><strong>{setup?.approvalFlowActive === false ? "Review configuration" : "Required"}</strong></span>
          </div>
        </section>
      )}

      {showControls && (() => {
        const upgrades = (status?.optionalUpsellConnectors ?? []).filter((c) => c.status === "available");
        const configured = Boolean(status?.readiness?.canRunManual ?? setup?.canRunManual);
        const eligibility = status?.readiness?.executionEligibility;
        return (
          <div className="p operator-context-section" style={{ gap: 0 }}>
            <div className="p-head"><h3>Context & controls</h3><Link href="/app/connectors" className="lnk-open">Manage context</Link></div>
            <div className="operator-context-controls" style={{ padding: "14px 20px", display: "grid", gap: 14 }}>
              {showRuntime && upgrades.length > 0 && (
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>Add more context</div>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--text-mute)" }}>
                    {optionalContext.join(" · ")}
                  </div>
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

      {showRuntime && <div className="p operator-current-work" style={{ gap: 0 }}>
        <div className="p-head">
          <h3>Current work</h3>
          {(monitoring?.recentPendingApprovals?.length ?? 0) > 0
            ? <Link href="/app/approvals" className="btn btn-primary btn-sm">{pendingApprovals} awaiting review</Link>
            : <Link href="/app/approvals" className="lnk-open">Approval inbox</Link>}
        </div>
        {pendingApprovals === 0 && runs.length === 0 ? (
          <div className="operator-compact-empty">No issues need attention right now. Next scheduled check: {monitoring?.nextScanLabel ?? "daily"}.</div>
        ) : <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>Pending approvals</div>
            {(monitoring?.recentPendingApprovals?.length ?? 0) === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No pending Operations approvals.</div> : monitoring?.recentPendingApprovals.map((approval) => (
              <div key={approval.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{approval.cardName || approval.title}</div>
                <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--text-mute)" }}>{(approval.signalType || "signal").replace(/_/g, " ")}{approval.severity ? ` · ${approval.severity}` : ""}{approval.listName ? ` · ${approval.listName}` : ""} · {approval.created_at ? relativeTime(approval.created_at) : "unknown time"}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>Recent runs</div>
            {runs.length === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No Operations checks have run yet.</div> : runs.slice(0, 5).map((run) => (
              <div key={run.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{run.output?.title || run.output?.type || "Operations run"}</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: run.status === "completed" ? "var(--green)" : run.status === "failed" ? "var(--rose)" : "var(--amber)" }}>{run.status}</div></div>
                <div style={{ marginTop: 3, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{relativeTime(run.created_at)} · Approval: {run.approval_id || "none"}</div>
              </div>
            ))}
          </div>
        </div>}
      </div>}

      {showRuntime && (
        <details className="p operator-advanced" style={{ gap: 0 }}>
          <summary style={{ listStyle: "none", cursor: "pointer", padding: "14px 20px", fontSize: 13, fontWeight: 600, color: "var(--text-dim)", display: "flex", justifyContent: "space-between" }}>
            Advanced details
            <span style={{ color: "var(--text-faint)", fontSize: 11 }}>schedule, provider state, readiness</span>
          </summary>
          <div style={{ padding: "0 20px 18px", display: "grid", gap: 7, color: "var(--text-mute)", fontSize: 12 }}>
            <span>Cadence: {monitoring?.cadence ?? "daily"}</span>
            <span>Next run: {monitoring?.nextRunAt ?? "not scheduled"}</span>
            <span>Project providers: Trello {status?.trello?.status ?? "missing"} · Asana {status?.asana?.status ?? "missing"} · Jira {status?.jira?.status ?? "missing"}</span>
            <span>Readiness: {status?.readiness?.status ?? "unknown"}</span>
          </div>
        </details>
      )}
    </div>
  );
}

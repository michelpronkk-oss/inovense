"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";

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

type ClientFlowStatus = {
  readiness?: OperatorReadiness | null;
  gmail?: { status?: string; accountEmail?: string | null; executable?: boolean; reconnectRequired?: boolean; permissions?: { compose?: boolean; send?: boolean; readonly?: boolean } } | null;
  slack?: { status?: string; connected?: boolean; notificationsEnabled?: boolean; approvalAlertsEnabled?: boolean; defaultChannelName?: string | null } | null;
  trello?: { status?: string; connected?: boolean; defaultBoardName?: string | null; defaultListName?: string | null } | null;
  customerEmailMode?: string;
  readinessChecks?: { emailReady?: boolean; slackAlertsReady?: boolean; trelloTaskExecutionReady?: boolean };
  monitoring?: {
    status: string;
    message: string;
    cadence?: string;
    sourceMode?: string;
    lastRunAt?: string | null;
    nextRunAt?: string | null;
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

function dateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "12px 13px", borderRadius: 12, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function ReadyRow({ label, ready, help }: { label: string; ready: boolean; help: string }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.8, fontWeight: 600 }}>{label}</div>
        <div style={{ marginTop: 2, fontSize: 11.5, color: "var(--text-mute)" }}>{help}</div>
      </div>
      <span className="appr-btn edit" style={{ cursor: "default", color: ready ? "var(--green)" : "var(--text-mute)", flexShrink: 0 }}>{ready ? "Ready" : "Not ready"}</span>
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

  const startGmailReconnect = () => {
    const params = new URLSearchParams({ workspaceId: state.workspace.id, userEmail: state.currentUser.email });
    window.location.href = `/api/connectors/gmail/auth?${params.toString()}`;
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
      if (!res.ok && json.status !== "requires_gmail_read_scope") throw new Error(json.message || json.error || "Client Flow check failed.");
      await loadRuntime();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client Flow check failed.");
    } finally {
      setScanSubmitting(false);
    }
  };

  const monitoring = status?.monitoring;
  const checks = status?.readinessChecks;
  const gmailReconnectRequired = Boolean(status?.gmail?.reconnectRequired || monitoring?.reconnectRequired);
  const scanNeedsReconnect = gmailReconnectRequired || scanResult?.status === "requires_gmail_read_scope" || scanResult?.status === "requires_gmail_send_scope";
  const canRun = Boolean(readiness?.canRunManual && (readiness.status === "ready" || readiness.status === "draft_only"));
  const lastCheckAt = monitoring?.lastRunAt ?? monitoring?.lastScanTime ?? null;
  const scanSkippedSummary = scanResult?.skipped?.length
    ? Object.entries(scanResult.skipped.reduce<Record<string, number>>((counts, item) => {
      counts[item.reason] = (counts[item.reason] ?? 0) + 1;
      return counts;
    }, {})).map(([reason, count]) => `${reason}: ${count}`).join(" / ")
    : "";
  const emailModeLabel = status?.customerEmailMode === "draft_only" ? "Draft only" : "Approval required";

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet"><Link href="/app/agents" style={{ color: "inherit", textDecoration: "none" }}>Operators</Link> / Client Flow</span>
          <h1>Client Flow Operator</h1>
          <div className="os-page-sub">Client Flow monitors client communication, prepares follow-ups, and turns requests into approved project actions.</div>
        </div>
        <div className="os-page-actions">
          <Link href="/app/approvals" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>View approvals</Link>
          <button className="btn btn-ghost btn-sm" type="button" onClick={submitScan} disabled={!canRun || scanSubmitting} style={{ opacity: !canRun || scanSubmitting ? 0.45 : 1 }}>
            {scanSubmitting ? "Checking..." : "Run manual check"}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <div>
            <h3>Monitoring active</h3>
            <div className="p-meta" style={{ marginTop: 4 }}>{loading ? "Loading real operator state..." : monitoring?.nextScanLabel ?? "Daily scan ready"}</div>
          </div>
          {gmailReconnectRequired && <button className="btn btn-primary btn-sm" type="button" onClick={startGmailReconnect}>Reconnect Gmail</button>}
        </div>
        <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 820 }}>Client Flow watches existing client threads in the background and only creates approvals for real client requests. New leads and pricing questions are routed back to Revenue Operator.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            <MetricCard label="Monitoring status" value={monitoring?.status ?? "loading"} />
            <MetricCard label="Last check" value={lastCheckAt ? relativeTime(lastCheckAt) : "No check yet"} />
            <MetricCard label="Next check" value={dateTimeLabel(monitoring?.nextRunAt)} />
            <MetricCard label="Emails checked" value={String(monitoring?.emailsChecked ?? 0)} />
            <MetricCard label="Client signals" value={String(monitoring?.signalsFound ?? 0)} />
            <MetricCard label="Approvals" value={String(monitoring?.approvalsCreated ?? 0)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            <MetricCard label="Skipped / noise" value={String(monitoring?.skippedSafelyCount ?? 0)} />
            <MetricCard label="Routed to Revenue" value={String(monitoring?.routedToRevenueCount ?? 0)} />
            <MetricCard label="Customer email policy" value={emailModeLabel} />
          </div>
          {gmailReconnectRequired && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(245,194,107,0.06)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.2)", color: "var(--amber)", fontSize: 12 }}>Reconnect Gmail to enable client communication monitoring.</div>}
          {!gmailReconnectRequired && !lastCheckAt && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Monitoring is active. No background check has run yet.</div>}
          {scanResult && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: scanNeedsReconnect ? "rgba(245,194,107,0.06)" : "rgba(95,211,168,0.06)", boxShadow: scanNeedsReconnect ? "inset 0 0 0 1px rgba(245,194,107,0.2)" : "inset 0 0 0 1px rgba(95,211,168,0.18)", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12.8, fontWeight: 600 }}>{scanNeedsReconnect ? "Reconnect Gmail required" : `Manual check ${scanResult.status ?? "completed"}`}</div>
              {scanResult.message && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{scanResult.message}</div>}
              {!scanNeedsReconnect && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{scanResult.scanned ?? 0} checked / {scanResult.signalsFound ?? 0} signals / {scanResult.approvalsCreated ?? 0} approvals / {scanResult.routedToRevenueCount ?? 0} routed to Revenue.</div>}
              {!scanNeedsReconnect && scanSkippedSummary && <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Skipped safely: {scanSkippedSummary}</div>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>Connected tools</h3><span className="appr-btn edit" style={{ cursor: "default" }}>{readiness?.status ?? "loading"}</span></div>
          <div style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <ReadyRow label="Gmail" ready={Boolean(status?.gmail?.executable)} help={status?.gmail?.accountEmail ? String(status.gmail.accountEmail) : "Connect Gmail to prepare and send client replies after approval."} />
            <ReadyRow label="Slack" ready={Boolean(status?.slack?.connected)} help={status?.slack?.connected ? `Internal alerts: ${status.slack.approvalAlertsEnabled ? "enabled" : "disabled"}${status.slack.defaultChannelName ? ` (#${status.slack.defaultChannelName})` : ""}` : "Connect Slack for internal approval alerts."} />
            <ReadyRow label="Trello" ready={Boolean(status?.trello?.connected)} help={status?.trello?.connected ? `Default list: ${status.trello.defaultListName || "not set"}` : "Connect Trello and set a default board/list for task execution."} />
          </div>
        </div>

        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>Readiness</h3><span className="appr-btn edit" style={{ cursor: "default" }}>{readiness?.readinessPercent ?? 0}%</span></div>
          <div style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}><div style={{ height: "100%", width: `${readiness?.readinessPercent ?? 0}%`, background: "linear-gradient(90deg, #5FD3A8, #4DE8E1)" }} /></div>
            <ReadyRow label="Email ready" ready={Boolean(checks?.emailReady)} help="Approval-gated client replies through Gmail." />
            <ReadyRow label="Slack alerts ready" ready={Boolean(checks?.slackAlertsReady)} help="Internal alert when a client approval is created." />
            <ReadyRow label="Trello task execution ready" ready={Boolean(checks?.trelloTaskExecutionReady)} help="Create a Trello task after approval on the default list." />
          </div>
        </div>
      </div>

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head"><h3>Last run and pending approvals</h3><Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Approval inbox</Link></div>
        <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pending approvals</div>
            {(monitoring?.recentPendingApprovals?.length ?? 0) === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No pending Client Flow approvals.</div> : monitoring?.recentPendingApprovals.map((approval) => (
              <div key={approval.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ fontSize: 12.8, fontWeight: 500 }}>{approval.subject || approval.title}</div>
                <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--text-mute)" }}>{approval.to || "Unknown recipient"} · {approval.created_at ? relativeTime(approval.created_at) : "unknown time"}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent runs</div>
            {runs.length === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No Client Flow runs yet.</div> : runs.slice(0, 5).map((run) => (
              <div key={run.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div style={{ fontSize: 12.8, fontWeight: 500 }}>{run.output?.title || run.output?.type || "Client Flow run"}</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: run.status === "completed" ? "var(--green)" : run.status === "failed" ? "var(--rose)" : "var(--amber)" }}>{run.status}</div></div>
                <div style={{ marginTop: 3, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{relativeTime(run.created_at)} · Approval: {run.approval_id || "none"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

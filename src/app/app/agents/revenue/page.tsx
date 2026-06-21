"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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

type RevenueRun = {
  id: string;
  operator_key: string;
  status: string;
  output: {
    title?: string;
    type?: string;
    draft?: { to?: string; subject?: string; body?: string };
    approvalId?: string;
  } | null;
  approval_id: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

type RevenueRunResult = {
  run?: { id: string; status: string; approvalId?: string };
  output?: { draft?: { to: string; subject: string; body: string }; approvalId?: string };
  approval?: { approvalId?: string };
  error?: string;
};

type RevenueScanResult = {
  status?: string;
  message?: string;
  scanned?: number;
  opportunitiesFound?: number;
  approvalsCreated?: number;
  reconnectRequired?: boolean;
  opportunities?: { messageId: string; from: string; subject: string; matchedKeywords: string[]; runId: string; approvalId: string }[];
  skipped?: { messageId: string; subject?: string; from?: string; reason: string }[];
  error?: string;
};

type RevenueStatus = {
  readiness?: OperatorReadiness | null;
  gmail?: {
    status?: string;
    accountEmail?: string | null;
    reconnectRequired?: boolean;
    permissions?: { compose?: boolean; send?: boolean; readonly?: boolean };
  } | null;
  hubspot?: {
    status?: string;
    accountEmail?: string | null;
    connected?: boolean;
    hasNangoConnection?: boolean;
  } | null;
  revenueMode?: "email_only_mode" | "full_crm_mode" | string;
  monitoring?: {
    status: string;
    message: string;
    lastScanTime: string | null;
    lastScannedCount: number;
    opportunitiesFound: number;
    approvalsCreated: number;
    skippedSafelyCount: number;
    routedItemCount: number | null;
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

function TagList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(items.length ? items : [empty]).map((item) => <span key={item} className="appr-btn edit" style={{ cursor: "default" }}>{item}</span>)}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "12px 13px", borderRadius: 12, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default function RevenueOperatorPage() {
  const { state } = useOS();
  const [revenueReadiness, setRevenueReadiness] = useState<OperatorReadiness | null>(null);
  const [revenueStatus, setRevenueStatus] = useState<RevenueStatus | null>(null);
  const [revenueRuns, setRevenueRuns] = useState<RevenueRun[]>([]);
  const [runtimeLoading, setRuntimeLoading] = useState(true);
  const [runtimeError, setRuntimeError] = useState("");
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<RevenueScanResult | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [runSubmitting, setRunSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RevenueRunResult | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [context, setContext] = useState("");

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const loadRevenueRuntime = useCallback(async () => {
    if (!state.workspace.id) return;
    setRuntimeLoading(true);
    setRuntimeError("");
    try {
      const readinessQs = new URLSearchParams(identityParams);
      readinessQs.set("operatorKey", "revenue");
      const runsQs = new URLSearchParams(identityParams);
      runsQs.set("operatorKey", "revenue");
      const statusQs = new URLSearchParams(identityParams);

      const [readinessRes, runsRes, statusRes] = await Promise.all([
        fetch(`/api/operators/readiness?${readinessQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/runs?${runsQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/revenue/status?${statusQs.toString()}`, { cache: "no-store" }),
      ]);
      const readinessJson = await readinessRes.json().catch(() => ({})) as { readiness?: OperatorReadiness; error?: string };
      const runsJson = await runsRes.json().catch(() => ({})) as { runs?: RevenueRun[]; error?: string };
      const statusJson = await statusRes.json().catch(() => ({})) as RevenueStatus;
      if (!readinessRes.ok) throw new Error(readinessJson.error || "Could not load Revenue Operator readiness.");
      if (!runsRes.ok) throw new Error(runsJson.error || "Could not load Revenue Operator runs.");
      if (!statusRes.ok) throw new Error(statusJson.error || "Could not load Revenue Operator status.");
      setRevenueReadiness(statusJson.readiness ?? readinessJson.readiness ?? null);
      setRevenueStatus(statusJson);
      setRevenueRuns(Array.isArray(runsJson.runs) ? runsJson.runs : []);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Could not load Revenue Operator runtime.");
    } finally {
      setRuntimeLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => { void loadRevenueRuntime(); }, [loadRevenueRuntime]);

  const startGmailReconnect = () => {
    const params = new URLSearchParams({ workspaceId: state.workspace.id, userEmail: state.currentUser.email });
    window.location.href = `/api/connectors/gmail/auth?${params.toString()}`;
  };

  const submitRevenueScan = async () => {
    setScanSubmitting(true);
    setRuntimeError("");
    setScanResult(null);
    try {
      const res = await fetch("/api/operators/revenue/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, maxResults: 15 }),
      });
      const json = await res.json().catch(() => ({})) as RevenueScanResult;
      setScanResult(json);
      if (!res.ok && json.status !== "requires_gmail_read_scope") throw new Error(json.message || json.error || "Revenue scan failed.");
      await loadRevenueRuntime();
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Revenue scan failed.");
    } finally {
      setScanSubmitting(false);
    }
  };

  const submitRevenueRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRunSubmitting(true);
    setRuntimeError("");
    setRunResult(null);
    try {
      const res = await fetch("/api/operators/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, operatorKey: "revenue", input: { leadName, leadEmail, context, goal: "follow_up" } }),
      });
      const json = await res.json().catch(() => ({})) as RevenueRunResult;
      if (!res.ok) throw new Error(json.error || "Revenue Operator run failed.");
      setRunResult(json);
      setLeadName("");
      setLeadEmail("");
      setContext("");
      await loadRevenueRuntime();
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Revenue Operator run failed.");
    } finally {
      setRunSubmitting(false);
    }
  };

  const monitoring = revenueStatus?.monitoring;
  const gmailReconnectRequired = Boolean(revenueStatus?.gmail?.reconnectRequired || monitoring?.reconnectRequired);
  const scanNeedsReconnect = gmailReconnectRequired || scanResult?.status === "requires_gmail_read_scope" || scanResult?.status === "requires_gmail_send_scope";
  const canRunRevenue = Boolean(revenueReadiness?.canRunManual && (revenueReadiness.status === "ready" || revenueReadiness.status === "draft_only"));
  const latestScanHadNoOpportunities = Boolean(monitoring?.lastScanTime && monitoring.opportunitiesFound === 0);
  const modeLabel = revenueStatus?.revenueMode === "full_crm_mode" ? "Full CRM mode" : "Email-only mode";
  const modeHelp = revenueStatus?.revenueMode === "full_crm_mode"
    ? "Gmail and HubSpot are connected. CRM contact and deal updates execute after approval."
    : "Gmail is connected. HubSpot is missing, so Revenue Operator prepares email follow-ups only.";
  const revenueStatusMessage = (() => {
    if (!revenueReadiness) return "Loading Revenue Operator readiness.";
    if (revenueReadiness.status === "missing_connector") return "Connect Gmail to run Revenue Operator.";
    if (revenueReadiness.status === "draft_only") return "HubSpot missing, Gmail draft and approval mode available.";
    if (revenueReadiness.status === "upgrade_required") return "Upgrade your plan to run Revenue Operator.";
    return revenueReadiness.reason;
  })();

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet"><Link href="/app/agents" style={{ color: "inherit", textDecoration: "none" }}>Operators</Link> / Revenue</span>
          <h1>Revenue Operator</h1>
          <div className="os-page-sub">Monitoring Gmail for revenue signals and preparing approval-gated follow-ups.</div>
        </div>
        <div className="os-page-actions">
          <Link href="/app/approvals" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>View approvals</Link>
          <button className="btn btn-ghost btn-sm" type="button" onClick={submitRevenueScan} disabled={!canRunRevenue || scanSubmitting} style={{ opacity: !canRunRevenue || scanSubmitting ? 0.45 : 1 }}>
            {scanSubmitting ? "Scanning..." : "Run scan now"}
          </button>
        </div>
      </div>

      {runtimeError && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{runtimeError}</div>}

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <div>
            <h3>Monitoring</h3>
            <div className="p-meta" style={{ marginTop: 4 }}>{runtimeLoading ? "Loading real operator state..." : monitoring?.nextScanLabel ?? "Daily scan ready"}</div>
          </div>
          {gmailReconnectRequired && <button className="btn btn-primary btn-sm" type="button" onClick={startGmailReconnect}>Reconnect Gmail</button>}
        </div>
        <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 760 }}>Revenue Operator is monitoring Gmail for revenue opportunities. It prepares follow-ups for approval. Nothing is sent without approval.</div>
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{modeLabel}</div>
              <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-mute)" }}>{modeHelp}</div>
            </div>
            <span className="appr-btn edit" style={{ cursor: "default" }}>{revenueStatus?.hubspot?.connected ? "HubSpot connected" : "HubSpot missing"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            <MetricCard label="Monitoring status" value={monitoring?.status ?? "loading"} />
            <MetricCard label="Last scan" value={monitoring?.lastScanTime ? relativeTime(monitoring.lastScanTime) : "No scan yet"} />
            <MetricCard label="Emails scanned" value={String(monitoring?.lastScannedCount ?? 0)} />
            <MetricCard label="Opportunities" value={String(monitoring?.opportunitiesFound ?? 0)} />
            <MetricCard label="Approvals" value={String(monitoring?.approvalsCreated ?? 0)} />
            <MetricCard label="Skipped safely" value={String(monitoring?.skippedSafelyCount ?? 0)} />
          </div>
          {gmailReconnectRequired && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(245,194,107,0.06)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.2)", color: "var(--amber)", fontSize: 12 }}>Reconnect Gmail to enable inbox monitoring.</div>}
          {!gmailReconnectRequired && monitoring?.message === "No scan has run yet." && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>No scan has run yet.</div>}
          {!gmailReconnectRequired && latestScanHadNoOpportunities && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>No high-confidence revenue opportunities found in the latest scan.</div>}
          {scanResult && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: scanNeedsReconnect ? "rgba(245,194,107,0.06)" : "rgba(77,232,225,0.06)", boxShadow: scanNeedsReconnect ? "inset 0 0 0 1px rgba(245,194,107,0.2)" : "inset 0 0 0 1px rgba(77,232,225,0.18)", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12.8, fontWeight: 600 }}>{scanNeedsReconnect ? "Reconnect Gmail required" : `Scan ${scanResult.status ?? "completed"}`}</div>
              {scanResult.message && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{scanResult.message}</div>}
              {!scanNeedsReconnect && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{scanResult.scanned ?? 0} scanned / {scanResult.opportunitiesFound ?? 0} found / {scanResult.approvalsCreated ?? 0} approvals prepared.</div>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>Readiness</h3><span className="appr-btn edit" style={{ cursor: "default" }}>{revenueReadiness?.status ?? "loading"}</span></div>
          <div style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}><div style={{ height: "100%", width: `${revenueReadiness?.readinessPercent ?? 0}%`, background: "linear-gradient(90deg, #4DE8E1, #51D88A)" }} /></div>
            <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{revenueStatusMessage}</div>
            <TagList title="Connected required connectors" items={revenueReadiness?.connectedRequiredConnectors ?? []} empty="None" />
            <TagList title="Missing required connectors" items={revenueReadiness?.missingRequiredConnectors ?? []} empty="None" />
            <TagList title="Available actions" items={revenueReadiness?.availableActions ?? []} empty="None" />
            <TagList title="Approval required actions" items={revenueReadiness?.approvalRequiredActions ?? []} empty="None" />
            <TagList title="Blocked actions" items={revenueReadiness?.blockedActions ?? []} empty="None" />
          </div>
        </div>

        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>Gmail permissions</h3><span className="appr-btn edit" style={{ cursor: "default" }}>{revenueStatus?.gmail?.status ?? "unknown"}</span></div>
          <div style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{revenueStatus?.gmail?.accountEmail ?? "No Gmail account loaded"}</div>
            <TagList title="Permissions" items={[
              `Compose: ${revenueStatus?.gmail?.permissions?.compose ? "granted" : "missing"}`,
              `Send: ${revenueStatus?.gmail?.permissions?.send ? "granted" : "missing"}`,
              `Inbox monitoring: ${revenueStatus?.gmail?.permissions?.readonly ? "granted" : "missing"}`,
            ]} empty="None" />
          </div>
        </div>
      </div>

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head"><h3>Recent approvals and runs</h3><Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Approval inbox</Link></div>
        <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pending approvals</div>
            {(monitoring?.recentPendingApprovals?.length ?? 0) === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No pending Revenue approvals.</div> : monitoring?.recentPendingApprovals.map((approval) => (
              <div key={approval.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ fontSize: 12.8, fontWeight: 500 }}>{approval.subject || approval.title}</div>
                <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--text-mute)" }}>{approval.to || "Unknown recipient"} · {approval.created_at ? relativeTime(approval.created_at) : "unknown time"}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent runs</div>
            {revenueRuns.length === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No real Revenue Operator runs yet.</div> : revenueRuns.slice(0, 5).map((run) => (
              <div key={run.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div style={{ fontSize: 12.8, fontWeight: 500 }}>{run.output?.title || run.output?.type || "Revenue run"}</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: run.status === "completed" ? "var(--green)" : run.status === "failed" ? "var(--rose)" : "var(--amber)" }}>{run.status}</div></div>
                <div style={{ marginTop: 3, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{relativeTime(run.created_at)} · Approval: {run.approval_id || "none"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {runResult?.run && (
        <div className="p" style={{ padding: 12, background: "rgba(77,232,225,0.06)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.18)" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Manual follow-up approval created</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>Run: {runResult.run.id} · Status: {runResult.run.status} · Approval: {runResult.output?.approvalId || runResult.approval?.approvalId || runResult.run.approvalId}</div>
          <Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ width: "fit-content", textDecoration: "none" }}>View approval</Link>
        </div>
      )}

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <h3>Advanced</h3>
          <button className="appr-btn edit" type="button" onClick={() => setAdvancedOpen((value) => !value)}>{advancedOpen ? "Hide manual follow-up" : "Advanced: prepare one follow-up manually"}</button>
        </div>
        {advancedOpen && (
          <form onSubmit={submitRevenueRun} style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Manual mode creates a single follow-up draft and approval from your input.</div>
            <input className="os-input" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Lead name" required />
            <input className="os-input" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="Lead email" type="email" required />
            <textarea className="os-input" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Context for the follow-up" rows={4} required />
            <input className="os-input" value="follow_up" disabled aria-disabled="true" />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!canRunRevenue || runSubmitting} style={{ opacity: !canRunRevenue || runSubmitting ? 0.45 : 1, width: "fit-content" }}>{runSubmitting ? "Preparing..." : "Prepare manual follow-up approval"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

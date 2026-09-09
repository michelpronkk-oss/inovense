"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { OperatorActivationToggle } from "@/components/operators/activation-toggle";
import { OperatorWorkforceBriefing, type OperatorBriefingState } from "@/components/operators/workforce-briefing";
import { getOperatorCapabilityCopy } from "@/lib/operators/capability-presentation";

type Status = { readiness?: { status: string; canRunManual: boolean; executionEligibility?: Record<string, unknown> }; setup?: { state?: string; coreReady?: boolean }; connectors?: { connectorKey: string; displayName: string; status: string; executable: boolean }[]; monitoring?: { status: string; lastRunAt?: string | null; nextRunAt?: string | null; scanned: number; signalsFound: number; approvalsCreated: number; skippedCount: number; nextScanLabel: string; recentPendingApprovals: { id: string; title: string; created_at?: string | null }[] }; error?: string };
type Run = { id: string; status: string; output?: { title?: string; type?: string } | null; created_at: string; approval_id?: string | null };

function relativeTime(value?: string | null) { if (!value) return "not yet"; const diff = Math.max(0, Date.now() - new Date(value).getTime()); const h = Math.floor(diff / 3_600_000); return h ? `${h}h ago` : `${Math.max(1, Math.floor(diff / 60_000))}m ago`; }

export default function SupportOperatorPage() {
  const { state } = useOS();
  const [status, setStatus] = useState<Status | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [briefing, setBriefing] = useState<OperatorBriefingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const params = useMemo(() => new URLSearchParams({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const statusRes = await fetch(`/api/operators/support/status?${params}`, { cache: "no-store" });
      const statusJson = await statusRes.json() as Status;
      if (!statusRes.ok) throw new Error(statusJson.error || "Could not load Support runtime.");
      const runParams = new URLSearchParams(params); runParams.set("operatorKey", "support");
      const runsRes = await fetch(`/api/operators/runs?${runParams}`, { cache: "no-store" });
      const runsJson = await runsRes.json() as { runs?: Run[]; error?: string };
      if (!runsRes.ok) throw new Error(runsJson.error || "Could not load Support runs.");
      setStatus(statusJson); setRuns(Array.isArray(runsJson.runs) ? runsJson.runs : []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load Support runtime."); } finally { setLoading(false); }
  }, [params]);
  useEffect(() => { void load(); }, [load]);
  const runScan = async () => {
    setRunning(true); setError(""); setResult(null);
    try { const res = await fetch("/api/operators/support/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, maxResults: 15 }) }); const json = await res.json() as Record<string, unknown>; setResult(json); if (!res.ok) throw new Error(String(json.message || json.error || "Support check failed.")); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Support check failed."); } finally { setRunning(false); }
  };
  const monitoring = status?.monitoring;
  const core = status?.readiness?.canRunManual === true;
  const capability = getOperatorCapabilityCopy("support");
  return <div className="os-page operator-detail-page">
    <div className="os-page-head"><div><span className="os-greet"><Link href="/app/agents" style={{ color: "inherit", textDecoration: "none" }}>Operators</Link> / Support</span><h1>Support Operator</h1><div className="os-page-sub">Keeps support requests moving, prepares reviewable responses, and makes unresolved customer issues visible.</div></div>{briefing && <span className="os-status" data-state={briefing.state}>{briefing.label}</span>}</div>
    <OperatorWorkforceBriefing operatorKey="support" onStateChange={setBriefing} runtime={{ pendingApprovals: monitoring?.recentPendingApprovals.length ?? 0, monitoringLabel: monitoring?.status === "monitoring_active" ? "Active" : "Scheduled", nextCheckLabel: monitoring?.nextScanLabel ?? "Daily" }} />
    {error && <div role="alert" style={{ color: "#ffaaaa", padding: 12 }}>{error}</div>}
    {briefing?.lifecycle === "active" && <>
      <div className="p" style={{ gap: 0 }}><div className="p-head"><div><h3>Support monitoring</h3><div className="p-meta">{loading ? "Loading…" : monitoring?.lastRunAt ? `Last check ${relativeTime(monitoring.lastRunAt)}` : "No check has run yet"}</div></div><button className="btn btn-primary btn-sm" type="button" onClick={runScan} disabled={running || !core}>{running ? "Checking…" : "Run manual check"}</button></div><div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}><div><strong>{monitoring?.scanned ?? 0}</strong><div className="p-meta">Items checked</div></div><div><strong>{monitoring?.signalsFound ?? 0}</strong><div className="p-meta">Support signals</div></div><div><strong>{monitoring?.approvalsCreated ?? 0}</strong><div className="p-meta">Approvals prepared</div></div><div><strong>{monitoring?.recentPendingApprovals.length ?? 0}</strong><div className="p-meta">Awaiting review</div></div></div>{result && <div style={{ padding: "0 20px 16px", color: "var(--text-dim)", fontSize: 12 }}>{String(result.message || `${result.approvalsCreated ?? 0} approvals prepared from ${result.signalsFound ?? 0} support signals.`)}</div>}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}><section className="p" style={{ gap: 0 }}><div className="p-head"><h3>Capabilities</h3></div><div style={{ padding: "12px 20px" }}>{capability.required.map((item) => <div key={item} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", color: "var(--text-dim)" }}>● {item} <span style={{ float: "right", color: "var(--green)" }}>Available</span></div>)}{capability.optional.map((item) => <div key={item} style={{ padding: "10px 0", color: "var(--text-mute)" }}>○ {item} <span style={{ float: "right" }}>Optional context</span></div>)}</div></section><section className="p" style={{ gap: 0 }}><div className="p-head"><h3>Policy</h3></div><div style={{ padding: "12px 20px" }}><div style={{ padding: "10px 0" }}>Customer replies <span style={{ float: "right", color: "var(--amber)" }}>Approval required</span></div><div style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>Ticket updates <span style={{ float: "right", color: "var(--amber)" }}>Approval required</span></div><div style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>Resolution <span style={{ float: "right", color: "var(--green)" }}>Observed only</span></div></div></section></div>
      <section className="p" style={{ gap: 0 }}><div className="p-head"><h3>Current work</h3><Link href="/app/approvals" className="lnk-open">Approval inbox</Link></div>{(monitoring?.recentPendingApprovals.length ?? 0) === 0 && runs.length === 0 ? <div style={{ padding: 20, color: "var(--text-mute)" }}>No support work needs attention. The next check runs {monitoring?.nextScanLabel ?? "daily"}.</div> : <div style={{ padding: 14 }}>{[...(monitoring?.recentPendingApprovals ?? []).map((item) => ({ id: item.id, title: item.title, status: "approval required", created_at: item.created_at })), ...runs.slice(0, 5).map((item) => ({ id: item.id, title: item.output?.title || "Support run", status: item.status, created_at: item.created_at }))].map((item) => <div key={item.id} style={{ padding: "12px 6px", borderBottom: "1px solid var(--line)" }}><strong>{item.title}</strong><span style={{ float: "right", color: "var(--text-mute)" }}>{item.status}</span><div className="p-meta">{relativeTime(item.created_at)}</div></div>)}</div>}</section>
    </>}
    {briefing && briefing.lifecycle !== "available_to_unlock" && status?.readiness?.executionEligibility && <section className="p" style={{ gap: 0 }}><div className="p-head"><h3>Context & controls</h3><Link href="/app/connectors" className="lnk-open">Manage context</Link></div><div style={{ padding: 18 }}><OperatorActivationToggle operatorKey="support" workspaceId={state.workspace.id} userId={state.currentUser.id} userEmail={state.currentUser.email} executionEligibility={status.readiness.executionEligibility as never} configured={core} canManage={state.currentUser.roleLabel === "Owner" || state.currentUser.roleLabel === "Admin"} runtimeControl /></div></section>}
  </div>;
}

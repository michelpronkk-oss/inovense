"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { OperatorActivationToggle } from "@/components/operators/activation-toggle";
import { OperatorWorkforceBriefing, type OperatorBriefingState } from "@/components/operators/workforce-briefing";
import { getOperatorCapabilityCopy } from "@/lib/operators/capability-presentation";
import { OperatorRuntimeAvatar } from "@/components/operators/runtime-avatar";

type Status = { readiness?: { status: string; canRunManual: boolean; executionEligibility?: Record<string, unknown> }; monitoring?: { status: string; lastRunAt?: string | null; nextRunAt?: string | null; scanned: number; signalsFound: number; approvalsCreated: number; skippedCount: number; nextScanLabel: string; recentPendingApprovals: { id: string; title: string; created_at?: string | null }[] }; error?: string };
type Run = { id: string; status: string; output?: { title?: string; type?: string } | null; created_at: string; approval_id?: string | null };

function relativeTime(value?: string | null) {
  if (!value) return "not yet";
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(diff / 3_600_000);
  return hours ? `${hours}h ago` : `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
}

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
    try {
      const response = await fetch("/api/operators/support/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, maxResults: 15 }) });
      const json = await response.json() as Record<string, unknown>;
      setResult(json);
      if (!response.ok) throw new Error(String(json.message || json.error || "Support check failed."));
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Support check failed."); } finally { setRunning(false); }
  };

  const monitoring = status?.monitoring;
  const active = briefing?.lifecycle === "active";
  const controlsAvailable = briefing?.lifecycle === "ready_to_activate" || briefing?.lifecycle === "paused";
  const coreAvailable = Boolean(status?.readiness?.canRunManual);
  const capability = getOperatorCapabilityCopy("support");
  const pendingWork = [
    ...(monitoring?.recentPendingApprovals ?? []).map((item) => ({ id: item.id, title: item.title, status: "Approval required", createdAt: item.created_at })),
    ...runs.slice(0, 5).map((item) => ({ id: item.id, title: item.output?.title || "Support check", status: item.status, createdAt: item.created_at })),
  ];

  return <div className="os-page operator-detail-page support-operator-page">
    <div className="os-page-head"><div className="operator-page-heading"><OperatorRuntimeAvatar operatorKey="support" /><div><span className="os-greet"><Link href="/app/agents" style={{ color: "inherit", textDecoration: "none" }}>Operators</Link> / Support</span><h1>Support Operator</h1><div className="os-page-sub">Keeps support requests moving, prepares reviewable responses, and makes unresolved customer issues visible.</div></div></div>{briefing && <span className="os-status" data-state={briefing.state}>{briefing.label}</span>}</div>
    <OperatorWorkforceBriefing operatorKey="support" onStateChange={setBriefing} runtime={{ pendingApprovals: monitoring?.recentPendingApprovals.length ?? 0, monitoringLabel: monitoring?.status === "monitoring_active" ? "Active" : "Scheduled", nextCheckLabel: monitoring?.nextScanLabel ?? "Daily support check" }} />
    {error && <div role="alert" className="os-attention" style={{ borderLeftColor: "var(--rose)" }}><div><strong>Support needs attention</strong><p>{error}</p></div></div>}

    {active && <>
      <section className="operator-live-state" aria-labelledby="support-live-state">
        <div className="operator-live-state-copy"><span id="support-live-state">Live state</span><strong>{loading ? "Loading support monitoring" : monitoring?.lastRunAt ? `Last checked ${relativeTime(monitoring.lastRunAt)}` : "No support signals detected today."}</strong><small>{monitoring?.nextScanLabel ?? "Daily support check"}</small></div>
        <div className="operator-live-state-rail"><State label="Customer support" value={briefing?.connectedCoreSystems.length ? `Available via ${briefing.connectedCoreSystems.join(" · ")}` : "Checking connection"} /><State label="Approvals" value={(monitoring?.recentPendingApprovals.length ?? 0) ? `${monitoring?.recentPendingApprovals.length} waiting` : "All clear"} /><State label="Monitoring" value={monitoring?.status === "monitoring_active" ? "Active" : "Scheduled"} /><State label="Context" value={briefing?.missingOptionalCapabilities.length ? "Core path active" : "Expanded"} /></div>
        <button className="btn btn-primary btn-sm" type="button" onClick={runScan} disabled={running || !coreAvailable}>{running ? "Checking…" : "Check now"}</button>
      </section>
      {result && <div className="operator-run-result">{String(result.message || `${result.approvalsCreated ?? 0} approvals prepared from ${result.signalsFound ?? 0} support signals.`)}</div>}
      <section className="operator-current-work operator-workspace" aria-labelledby="support-current-work"><div className="p-head"><div><h3 id="support-current-work">Current work</h3><span className="p-meta">Prepared support work and recent checks</span></div><Link href="/app/approvals" className="lnk-open">Approval inbox</Link></div>{pendingWork.length === 0 ? <div className="operator-compact-empty"><strong>No support work needs attention.</strong><span>Last check: {monitoring?.lastRunAt ? relativeTime(monitoring.lastRunAt) : "—"} · Next check: {monitoring?.nextScanLabel ?? "Daily support check"}</span></div> : <div className="operator-work-list">{pendingWork.map((item) => <div key={item.id}><strong>{item.title}</strong><span>{item.status} · {relativeTime(item.createdAt)}</span></div>)}</div>}</section>
      <div className="operator-lower-grid"><section><div className="p-head"><h3>Monitoring</h3></div><div className="operator-row-list"><Row label="Signals found" value={String(monitoring?.signalsFound ?? 0)} /><Row label="Items checked" value={String(monitoring?.scanned ?? 0)} /><Row label="Approvals prepared" value={String(monitoring?.approvalsCreated ?? 0)} /></div></section><section><div className="p-head"><h3>Control boundary</h3></div><div className="operator-row-list"><Row label="Customer replies" value="Approval required" tone="amber" /><Row label="Ticket updates" value="Approval required" tone="amber" /><Row label="Optional context" value={capability.optional.join(" · ") || "None"} /></div></section></div>
    </>}
    {controlsAvailable && status?.readiness?.executionEligibility && <section className="operator-control-row"><div><strong>Operator control</strong><span>Turn continuous monitoring on only when the workspace is ready.</span></div><OperatorActivationToggle operatorKey="support" workspaceId={state.workspace.id} userId={state.currentUser.id} userEmail={state.currentUser.email} executionEligibility={status.readiness.executionEligibility as never} configured={coreAvailable} canManage={state.currentUser.roleLabel === "Owner" || state.currentUser.roleLabel === "Admin"} runtimeControl /></section>}
  </div>;
}

function State({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Row({ label, value, tone }: { label: string; value: string; tone?: "amber" }) { return <div><span>{label}</span><strong data-tone={tone}>{value}</strong></div>; }

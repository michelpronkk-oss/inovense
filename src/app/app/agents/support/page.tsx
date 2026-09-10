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

  return (
    <div className="os-page operator-detail-page support-operator-page">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <div className="inline" style={{ gap: 16, alignItems: "flex-start" }}>
          <OperatorRuntimeAvatar operatorKey="support" />
          <div>
            <div className="inline" style={{ gap: 11 }}>
              <h1 className="t-title" style={{ fontSize: 24 }}>Support Operator</h1>
              {briefing && <span className="os-status" data-state={briefing.state}>{briefing.label}</span>}
            </div>
            <p className="t-sub" style={{ marginTop: 7 }}>Keeps support requests moving, prepares reviewable responses, and makes unresolved customer issues visible.</p>
          </div>
        </div>
      </div>

      <OperatorWorkforceBriefing operatorKey="support" onStateChange={setBriefing} runtime={{ pendingApprovals: monitoring?.recentPendingApprovals.length ?? 0, monitoringLabel: monitoring?.status === "monitoring_active" ? "Active" : "Scheduled", nextCheckLabel: monitoring?.nextScanLabel ?? "Daily support check" }} />

      {error && <section className="attn crit"><div className="card-pad" style={{ padding: "10px 14px", fontSize: 12.5 }}>{error}</div></section>}

      {active && (
        <div className="sec split">
          <div className="stack">
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="t-section">Live state</div>
                  <div className="t-meta" style={{ marginTop: 3 }}>{loading ? "Loading support monitoring" : monitoring?.lastRunAt ? `Last checked ${relativeTime(monitoring.lastRunAt)}` : "No support signals detected today."} · {monitoring?.nextScanLabel ?? "Daily support check"}</div>
                </div>
                <button className="btn btn-primary btn-sm" type="button" onClick={runScan} disabled={running || !coreAvailable}>{running ? "Checking…" : "Check now"}</button>
              </div>
              <div className="grid4 card-pad">
                <Stat label="Customer support" value={briefing?.connectedCoreSystems.length ? `Via ${briefing.connectedCoreSystems.join(" · ")}` : "Checking"} />
                <Stat label="Approvals" value={(monitoring?.recentPendingApprovals.length ?? 0) ? `${monitoring?.recentPendingApprovals.length} waiting` : "All clear"} />
                <Stat label="Monitoring" value={monitoring?.status === "monitoring_active" ? "Active" : "Scheduled"} />
                <Stat label="Context" value={briefing?.missingOptionalCapabilities.length ? "Core path active" : "Expanded"} />
              </div>
              {result && <div className="card-pad t-compact" style={{ borderTop: "1px solid var(--line)" }}>{String(result.message || `${result.approvalsCreated ?? 0} approvals prepared from ${result.signalsFound ?? 0} support signals.`)}</div>}
            </div>

            <div className="card">
              <div className="card-head"><div className="t-section">Current work</div><Link href="/app/approvals" className="btn btn-sm btn-ghost">Approval inbox</Link></div>
              {pendingWork.length === 0 ? (
                <div className="card-pad t-meta">No support work needs attention. Last check: {monitoring?.lastRunAt ? relativeTime(monitoring.lastRunAt) : "—"} · Next check: {monitoring?.nextScanLabel ?? "Daily support check"}.</div>
              ) : (
                <div className="rows">
                  {pendingWork.map((item) => (
                    <div className="row" key={item.id}>
                      <span className="grow"><span className="ttl">{item.title}</span><span className="sub">{relativeTime(item.createdAt)}</span></span>
                      <span className="badge amber">{item.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="stack">
            <div className="card">
              <div className="card-head"><div className="t-section">Monitoring</div></div>
              <div className="rows">
                <div className="row"><span className="grow t-compact">Signals found</span><span className="t-compact ink">{monitoring?.signalsFound ?? 0}</span></div>
                <div className="row"><span className="grow t-compact">Items checked</span><span className="t-compact ink">{monitoring?.scanned ?? 0}</span></div>
                <div className="row"><span className="grow t-compact">Approvals prepared</span><span className="t-compact ink">{monitoring?.approvalsCreated ?? 0}</span></div>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div className="t-section">Control boundary</div></div>
              <div className="rows">
                <div className="row"><span className="grow t-compact">Customer replies</span><span className="badge amber">APPROVAL</span></div>
                <div className="row"><span className="grow t-compact">Ticket updates</span><span className="badge amber">APPROVAL</span></div>
                <div className="row"><span className="grow t-compact">Optional context</span><span className="t-meta">{capability.optional.join(" · ") || "None"}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {controlsAvailable && status?.readiness?.executionEligibility && (
        <div className="sec">
          <div className="card">
            <div className="card-head"><div className="t-section">Operator control</div></div>
            <div className="card-pad">
              <p className="t-meta" style={{ margin: "0 0 12px" }}>Turn continuous monitoring on only when the workspace is ready.</p>
              <OperatorActivationToggle operatorKey="support" workspaceId={state.workspace.id} userId={state.currentUser.id} userEmail={state.currentUser.email} executionEligibility={status.readiness.executionEligibility as never} configured={coreAvailable} canManage={state.currentUser.roleLabel === "Owner" || state.currentUser.roleLabel === "Admin"} runtimeControl />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel" style={{ padding: "12px 13px" }}>
      <div className="t-eyebrow">{label}</div>
      <div className="t-object" style={{ marginTop: 6 }}>{value}</div>
    </div>
  );
}

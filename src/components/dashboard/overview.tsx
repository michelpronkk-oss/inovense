"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useOS } from "@/lib/os/app-provider";
import type { DashboardOverview, DashboardOperator } from "@/lib/dashboard/overview";
import { LOGOS as IntegrationLogos } from "@/components/home-v3/integrations-grid";
import { DashboardLoadingState } from "@/components/dashboard/loading-state";
import { getConnectorDefinition } from "@/lib/connectors/registry";

type ScanKey = DashboardOperator["key"];
type OverviewResponse = DashboardOverview & { error?: string; message?: string };

const scanRoutes: Record<ScanKey, string> = {
  revenue: "/api/operators/revenue/scan",
  client_flow: "/api/operators/client-flow/scan",
  operations: "/api/operators/operations/scan",
};

const operatorMeta: Record<ScanKey, { mark: string; color: string; tag: string; avatar: string }> = {
  revenue: { mark: "RV", color: "#4DE8E1", tag: "Revenue · Pipeline", avatar: "/operators/revenue-operator.png" },
  client_flow: { mark: "CF", color: "#5B8DEF", tag: "Client · Onboarding", avatar: "/operators/client-flow-operator.png" },
  operations: { mark: "OP", color: "#51D88A", tag: "Operations · Internal", avatar: "/operators/operations-operator.png" },
};

const connectorMeta: Record<string, { letter: string; color: string }> = {
  gmail: { letter: "G", color: "#EA4335" },
  hubspot: { letter: "HS", color: "#FF7A59" },
  slack: { letter: "Sl", color: "#A77FBC" },
  trello: { letter: "Tr", color: "#4BA3E8" },
};

function titleCase(value: string | null | undefined): string {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function timeAgo(value: string | null | undefined): string {
  if (!value) return "not yet";
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "unknown";
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / (60 * 24))}d ago`;
}

function clockTime(value: string | null | undefined): string {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function autonomyLabel(mode: DashboardOverview["policy"]["autonomyMode"]): string {
  if (mode === "assisted") return "Assisted autopilot";
  if (mode === "managed") return "Managed custom";
  return "Safe mode";
}

function customerEmailLabel(mode: DashboardOverview["policy"]["customerEmailMode"]): string {
  if (mode === "draft_only") return "Customer emails draft only";
  if (mode === "auto_send_low_risk") return "Customer emails auto-send low risk";
  return "Customer emails require approval";
}

function operatorMark(operatorKey: string | null | undefined): { mark: string; color: string } {
  if (operatorKey && operatorKey in operatorMeta) return operatorMeta[operatorKey as ScanKey];
  return { mark: "OS", color: "#4DE8E1" };
}

const RECOMMENDED_FALLBACK_SYSTEMS = ["gmail", "hubspot", "trello"];

function systemLabel(connectorKey: string): string {
  const def = getConnectorDefinition(connectorKey);
  return def?.displayName ?? titleCase(connectorKey);
}

function activityColor(severity: string): string {
  if (severity === "success") return "#51D88A";
  if (severity === "danger") return "#F2767C";
  if (severity === "warning") return "#F5C26B";
  return "#4DE8E1";
}

function ActivitySparkline({ activity, now, color = "#4DE8E1" }: { activity: DashboardOverview["activity"]; now: number; color?: string }) {
  const bins = Array.from({ length: 7 }, () => 0);
  for (const item of activity) {
    if (!item.time) continue;
    const age = Math.floor((now - new Date(item.time).getTime()) / 86400000);
    if (age >= 0 && age < 7) bins[6 - age] += 1;
  }
  const max = Math.max(1, ...bins);
  const points = bins.map((count, index) => `${index * 18},${28 - (count / max) * 20}`).join(" ");
  return <svg width="116" height="32" viewBox="0 0 108 32" fill="none" aria-label="Activity over the last seven days"><polyline points={points} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" /></svg>;
}

export function OSOverview() {
  const { state } = useOS();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyScan, setBusyScan] = useState<ScanKey | null>(null);
  const [busyApproval, setBusyApproval] = useState<string | null>(null);

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const loadOverview = useCallback(async (signal?: AbortSignal) => {
    if (!state.workspace.id) return;
    setError("");
    try {
      const res = await fetch(`/api/dashboard/overview?${identityParams.toString()}`, { cache: "no-store", signal });
      const json = await res.json().catch(() => ({})) as OverviewResponse;
      if (!res.ok || json.error) {
        const message = res.status === 403
          ? "You don’t have access to this workspace."
          : res.status === 401
            ? "Your session could not be verified. Please sign in again."
            : json.message || "We couldn’t load your dashboard. Refresh to try again.";
        throw new Error(message);
      }
      setOverview(json);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "We couldn’t load your dashboard. Refresh to try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => {
    const controller = new AbortController();
    setOverview(null);
    setLoading(true);
    setError("");
    void loadOverview(controller.signal);
    return () => controller.abort();
  }, [loadOverview]);

  const runManualCheck = async (key: ScanKey) => {
    if (busyScan || busyApproval) return;
    setBusyScan(key);
    setError("");
    try {
      const res = await fetch(scanRoutes[key], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, maxResults: 10 }),
      });
      const json = await res.json().catch(() => ({})) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.message || json.error || "Manual check could not run.");
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manual check could not run.");
    } finally {
      setBusyScan(null);
    }
  };

  const actOnApproval = async (id: string, action: "approve" | "reject") => {
    if (busyApproval || busyScan) return;
    setBusyApproval(id);
    setError("");
    try {
      const res = await fetch(`/api/approvals/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          userId: state.currentUser.id,
          userEmail: state.currentUser.email,
          ...(action === "reject" ? { reason: "Skipped from dashboard" } : {}),
        }),
      });
      const json = await res.json().catch(() => ({})) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.message || json.error || "Could not update approval.");
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update approval.");
    } finally {
      setBusyApproval(null);
    }
  };

  if (loading && !overview) return <DashboardLoadingState />;

  if (!overview) {
    return (
      <div className="os-page">
        <div className="os-page-head">
          <div>
            <span className="os-greet">Auterim OS</span>
            <h1>We couldn’t load your dashboard.</h1>
            <div className="os-page-sub">{error || "Refresh to try again."}</div>
            <button className="btn btn-primary btn-sm" type="button" style={{ marginTop: 16 }} onClick={() => { setLoading(true); void loadOverview(); }}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const hh = now.getHours();
  const greet = hh < 5 ? "Good night" : hh < 12 ? "Good morning" : hh < 18 ? "Good afternoon" : "Good evening";
  const firstName = state.currentUser.name?.trim().split(/\s+/)[0] || titleCase((state.currentUser.email?.split("@")[0] || "there").split(/[._-]/)[0]);
  const pending = overview.approvals.pendingCount;
  const monitoringCount = overview.operators.filter((o) => o.status !== "needs_setup" && o.status !== "disabled").length;
  const healthyConnectors = overview.connectors.filter((c) => c.connected).length;
  const mode = autonomyLabel(overview.policy.autonomyMode);
  const busy = busyScan !== null || busyApproval !== null;
  const activationSteps = [overview.operators.length > 0, healthyConnectors > 0, overview.today.runsCount > 0];
  const activationScore = Math.round((activationSteps.filter(Boolean).length / activationSteps.length) * 100);

  // State A: zero connected connectors. Never show the KPI row / connector
  // strip / empty activity feed alongside this - it must read as a
  // deliberate first-run moment, not a populated dashboard with zeros in it.
  if (healthyConnectors === 0) {
    const onboardingSystems = overview.workspace.onboardingSystems;
    const recommended = (onboardingSystems.length ? onboardingSystems : RECOMMENDED_FALLBACK_SYSTEMS).slice(0, 4);
    return (
      <div className="os-page dashboard-overview dashboard-first-run">
        <div className="os-page-head">
          <div>
            <span className="os-greet">Auterim workspace</span>
            <h1>{greet}, {firstName}.</h1>
            <div className="os-page-sub">Connect your business to see what Auterim can do here. Nothing runs until you choose to connect a system.</div>
          </div>
        </div>

        {error && (
          <div className="dashboard-alert" style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>
            {error}
          </div>
        )}

        <div className="p" style={{ padding: "34px 30px", display: "grid", gap: 18, background: "linear-gradient(112deg, rgba(77,232,225,0.08), rgba(255,255,255,0.012) 45%, rgba(255,255,255,0.01))" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: "#64ffd7" }}>Connect your business</div>
            <h2 style={{ marginTop: 12, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", maxWidth: 560 }}>No systems are connected yet.</h2>
            <p style={{ marginTop: 8, maxWidth: 560, color: "var(--text-mute)", fontSize: 13.5, lineHeight: 1.6 }}>
              {onboardingSystems.length
                ? `You told us your team uses ${recommended.map(systemLabel).join(", ")}. Connect them so Auterim has real context to work from.`
                : "Connect the tools your team already uses so Auterim has real context to work from."}
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {recommended.map((key) => {
              const def = getConnectorDefinition(key);
              const meta = connectorMeta[key] ?? { letter: key.slice(0, 2).toUpperCase(), color: "#4DE8E1" };
              return (
                <span key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.03)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 12.5 }}>
                  <span className="connector-brand-logo" style={{ width: 20, height: 20, color: meta.color }}>{IntegrationLogos[def?.displayName ?? ""] ?? meta.letter}</span>
                  {systemLabel(key)}
                </span>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn btn-primary btn-sm" href="/connectors">Connect systems</Link>
            <Link className="btn btn-ghost btn-sm" href="/agents">Explore operators</Link>
          </div>
        </div>

        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>How this works</h3></div>
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>1. Connect</div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--text-mute)" }}>Link the systems your team already uses.</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>2. Review what unlocks</div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--text-mute)" }}>See exactly which operators become ready.</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>3. Activate when ready</div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--text-mute)" }}>Nothing runs unattended until you turn it on.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State C messaging: at least one connector is live but the workspace
  // cannot execute real actions yet (trial not started / plan required /
  // billing attention / suspended). Surfaced as a reachable banner, not a
  // full-dashboard takeover - the rest of the dashboard (State B/D) still
  // renders underneath so configuration work is never blocked by billing.
  const eligibility = overview.executionEligibility;
  const showEligibilityBanner = !eligibility.eligible;

  const kpis = [
    { label: "Operating setup", val: `${activationScore}%`, sub: activationScore === 100 ? "Live operating layer" : "Choose plan to unlock live systems", subCls: activationScore === 100 ? "neutral" : "amber", color: "#4DE8E1" },
    { label: "Pending approvals", val: pending, sub: overview.approvals.highRiskCount > 0 ? `${overview.approvals.highRiskCount} high risk` : "Waiting for review", subCls: overview.approvals.highRiskCount > 0 ? "amber" : "neutral", color: "#F5C26B" },
    { label: "Actions today", val: overview.today.actionsExecuted, sub: "After approval", subCls: "neutral", color: "#4DE8E1" },
    { label: "Activity (7d)", val: overview.activity.length, sub: overview.activity.length ? "Recorded operating events" : "Begins with your first live run", subCls: "neutral", color: "#5B8DEF" },
  ];

  return (
    <div className="os-page dashboard-overview">
      {/* Header */}
      <div className="os-page-head">
        <div>
          <span className="os-greet">
            <span className="desktop-only">{overview.systemStatus.label} · updated {timeAgo(overview.lastUpdatedAt)}</span>
            <span className="mobile-only">{overview.systemStatus.label}</span>
          </span>
          <h1>{greet}, {firstName}.</h1>
          <div className="os-page-sub">
            <span className="desktop-only">{pending} approval{pending === 1 ? "" : "s"} waiting · {monitoringCount} operator{monitoringCount === 1 ? "" : "s"} monitoring · running under {mode}.</span>
            <span className="mobile-only">{monitoringCount} monitoring · {pending} need review</span>
          </div>
        </div>
        <div className="os-page-actions" style={{ alignItems: "center" }}>
          <span className="pill">{mode}</span>
          {pending > 0
            ? <Link className="btn btn-primary btn-sm" href="/approvals">Open approvals</Link>
            : <Link className="btn btn-ghost btn-sm" href="/agents">View operators</Link>}
        </div>
      </div>

      {error && (
        <div className="dashboard-alert" style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {showEligibilityBanner && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "12px 16px", borderRadius: 12, background: "rgba(245,194,107,0.07)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.2)" }}>
          <div style={{ fontSize: 12.8, color: "var(--text-dim)" }}>
            <strong style={{ color: "var(--amber)" }}>{eligibility.status === "plan_required" ? "Plan required" : eligibility.status === "billing_attention" ? "Billing needs attention" : "Execution paused"}.</strong> {eligibility.reason} You can still connect systems and configure operators now.
          </div>
          <Link className="btn btn-primary btn-sm" href="/plans" style={{ textDecoration: "none" }}>{eligibility.status === "billing_attention" ? "Update billing" : "Choose a plan"}</Link>
        </div>
      )}

      {/* KPI row (real metrics, no fabricated trends) */}
      <div className="kpi-row">
        {kpis.map((k) => (
          <div className="kpi" key={k.label} style={{ position: "relative", overflow: "hidden" }}>
            <div className="kpi-top"><span className="lab">{k.label}</span></div>
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-meta"><span className={`kpi-delta ${k.subCls}`}>{k.sub}</span></div>
            <div style={{ position: "absolute", right: 12, bottom: 9, opacity: 0.82 }}><ActivitySparkline activity={overview.activity} now={now.getTime()} color={k.color} /></div>
          </div>
        ))}
      </div>

      {/* Operators + Approvals */}
      <div className="os-grid-2 dashboard-focus-grid">
        <div className="p dashboard-operators-panel">
          <div className="p-head">
            <h3>{overview.operators.length === 1 ? "Your first operator" : "Active operators"}</h3>
            <span className="p-meta"><span className="desktop-only">{overview.operators.length} configured · no actions run without approval</span><span className="mobile-only">{overview.operators.length} active</span></span>
          </div>
          <div className="ops-grid">
            {overview.operators.map((operator) => {
              const meta = operatorMeta[operator.key];
              const needsSetup = operator.status === "needs_setup";
              const awaiting = operator.pendingApprovals > 0;
              return (
                <div className="ops-card" key={operator.key}>
                  <div className="ops-card-head">
                    <Image className="ops-card-avatar" src={meta.avatar} alt="" width={34} height={34} style={{ width: 34, height: 34, objectFit: "contain" }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="ops-card-name">{operator.name}</div>
                      <div className="ops-card-tag">{meta.tag}</div>
                    </div>
                    <div className="ops-card-status">
                      {needsSetup ? (
                        <><span className="dot dot-amber" /><span style={{ color: "var(--amber)" }}>Needs setup</span></>
                      ) : awaiting ? (
                        <><span className="dot dot-amber pulsing" /><span style={{ color: "var(--amber)" }}>Awaiting</span></>
                      ) : (
                        <><span className="dot pulsing" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} /><span style={{ color: meta.color }}>Monitoring</span></>
                      )}
                    </div>
                  </div>
                  <div className="ops-task">
                    <span>{operator.pendingApprovals} pending · {operator.signalsToday} signals today · checked {timeAgo(operator.lastRunAt)}</span>
                  </div>
                  <div className="ops-foot">
                    <span className="ops-metric"><strong>{operator.actionsToday}</strong> actions today</span>
                    <div className="ops-actions">
                      <span
                        className="lnk cyan"
                        role="button"
                        aria-disabled={busy || needsSetup}
                        onClick={() => { if (!busy && !needsSetup) void runManualCheck(operator.key); }}
                        style={{ opacity: busy || needsSetup ? 0.45 : 1, cursor: busy || needsSetup ? "default" : "pointer" }}
                      >
                        {busyScan === operator.key ? "Checking..." : "Run check"}
                      </span>
                      <Link className="lnk" href={operator.href}>Open</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p dashboard-approvals-panel">
          <div className="p-head">
            <h3>Approval inbox</h3>
            <span className="p-meta">{pending > 0 && <span className="dot dot-cyan pulsing" />} {pending} waiting</span>
          </div>
          <div>
            {pending === 0 ? (
              <div className="appr-row">
                <div className="appr-row-body" style={{ padding: "8px 0", color: "var(--text-mute)" }}>Nothing needs your review.</div>
              </div>
            ) : overview.approvals.latest.slice(0, 4).map((approval) => {
              const isBusy = busyApproval === approval.id;
              return (
                <div className="appr-row" key={approval.id}>
                  <div className="appr-row-top">
                    <span className={`pill ${approval.riskLevel === "high" ? "pill-rose" : "pill-cyan"}`}>{operatorMark(approval.operatorKey).mark}</span>
                    <span className="appr-row-title">{approval.title}</span>
                  </div>
                  <div className="appr-row-from">{titleCase(approval.operatorKey)} · {timeAgo(approval.createdAt)}</div>
                  <div className="appr-row-body">Risk: {approval.riskLevel || "medium"} · {titleCase(approval.policyDecision) || "Approval required"} · rechecked before execution</div>
                  <div className="appr-row-actions">
                    <button type="button" className="appr-btn approve" disabled={busy} onClick={() => void actOnApproval(approval.id, "approve")}>
                      {isBusy ? "..." : "Approve"}
                    </button>
                    <Link className="appr-btn edit" href={approval.href}>Open</Link>
                    <button type="button" className="appr-btn deny" disabled={busy} onClick={() => void actOnApproval(approval.id, "reject")} title="Dismiss this approval without sending or executing anything">
                      {isBusy ? "..." : "Skip"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity + Policy */}
      <div className="os-grid-2 dashboard-activity-grid">
        <div className="p">
          <div className="p-head">
            <h3>Activity</h3>
            <Link className="lnk-open" href="/logs">Open logs</Link>
          </div>
          <div>
            {overview.activity.length === 0 ? (
              <div className="act-row" style={{ color: "var(--text-mute)" }}><span /><span /><span>No activity yet. Operator runs will appear here.</span><span /></div>
            ) : overview.activity.slice(0, 7).map((item) => {
              const mark = operatorMark(item.operatorKey);
              return (
                <div className="act-row" key={item.id}>
                  <span className="act-time">{clockTime(item.time)}</span>
                  <span className="act-mark" style={{ color: activityColor(item.severity), background: `${activityColor(item.severity)}18`, boxShadow: `inset 0 0 0 1px ${activityColor(item.severity)}55` }}>{mark.mark}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description || titleCase(item.title)}</span>
                  <span className="act-target">{timeAgo(item.time)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p">
          <div className="p-head">
            <h3>Policy</h3>
            <Link className="lnk-open" href="/policies">Manage policies</Link>
          </div>
          <div style={{ padding: "14px 18px", display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span className="pill pill-cyan">{mode}</span>
              <span className={`pill ${overview.policy.emergencyStopEnabled ? "pill-rose" : ""}`}>{overview.policy.emergencyStopEnabled ? "Emergency stop on" : "Emergency stop off"}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>{customerEmailLabel(overview.policy.customerEmailMode)}.</div>
            <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}>Approval-first where risk matters. Rechecked before execution.</div>
          </div>
        </div>
      </div>

      {/* Connectors */}
      <div className="p dashboard-connectors-panel">
        <div className="p-head">
          <h3>Connectors</h3>
          <span className="p-meta">{healthyConnectors}/{overview.connectors.length} healthy</span>
        </div>
        <div className="conn-strip" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
          {overview.connectors.map((connector) => {
            const meta = connectorMeta[connector.key] ?? { letter: connector.name.slice(0, 2), color: "#4DE8E1" };
            return (
              <Link key={connector.key} href={connector.href} className="conn-tile" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="conn-logo connector-brand-logo" style={{ color: meta.color }}>
                  {IntegrationLogos[connector.name] ?? meta.letter}
                </div>
                <div className="conn-name">{connector.name}</div>
                <div className="conn-meta">
                  <span className={`dot ${connector.connected ? "dot-green" : "dot-amber"}`} />
                  {connector.connected ? (connector.lastCheckedAt ? timeAgo(connector.lastCheckedAt) : "connected") : "needs setup"}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

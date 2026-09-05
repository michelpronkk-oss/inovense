"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useOS } from "@/lib/os/app-provider";
import type { DashboardOverview, DashboardOperator } from "@/lib/dashboard/overview";

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

function activityColor(severity: string): string {
  if (severity === "success") return "#51D88A";
  if (severity === "danger") return "#F2767C";
  if (severity === "warning") return "#F5C26B";
  return "#4DE8E1";
}

function Skeleton() {
  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Operating</span>
          <h1>Loading overview...</h1>
          <div className="os-page-sub">Reading real workspace state.</div>
        </div>
      </div>
      <div className="kpi-row">{[0, 1, 2, 3].map((i) => <div className="kpi" key={i} style={{ minHeight: 92, opacity: 0.6 }} />)}</div>
    </div>
  );
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

  const loadOverview = useCallback(async () => {
    if (!state.workspace.id) return;
    setError("");
    try {
      const res = await fetch(`/api/dashboard/overview?${identityParams.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as OverviewResponse;
      if (!res.ok || json.error) throw new Error(json.message || json.error || "Could not load dashboard overview.");
      setOverview(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard overview.");
    } finally {
      setLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

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

  if (loading && !overview) return <Skeleton />;

  if (!overview) {
    return (
      <div className="os-page">
        <div className="os-page-head">
          <div>
            <span className="os-greet">Auterim OS</span>
            <h1>Overview unavailable</h1>
            <div className="os-page-sub">{error || "Could not load real dashboard state."}</div>
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

  const kpis = [
    { label: "Pending approvals", val: pending, sub: overview.approvals.highRiskCount > 0 ? `${overview.approvals.highRiskCount} high risk` : "Waiting for review", subCls: overview.approvals.highRiskCount > 0 ? "amber" : "neutral" },
    { label: "Actions today", val: overview.today.actionsExecuted, sub: "After approval", subCls: "neutral" },
    { label: "Blocked by policy", val: overview.today.blockedByPolicy, sub: "Live re-check", subCls: "neutral" },
    { label: "Healthy connectors", val: `${healthyConnectors}/${overview.connectors.length}`, sub: "Connected", subCls: "neutral" },
  ];

  return (
    <div className="os-page">
      {/* Header */}
      <div className="os-page-head">
        <div>
          <span className="os-greet">{overview.systemStatus.label} · updated {timeAgo(overview.lastUpdatedAt)}</span>
          <h1>{greet}, {firstName}.</h1>
          <div className="os-page-sub">{pending} approval{pending === 1 ? "" : "s"} waiting · {monitoringCount} operator{monitoringCount === 1 ? "" : "s"} monitoring · running under {mode}.</div>
        </div>
        <div className="os-page-actions" style={{ alignItems: "center" }}>
          <span className="pill">{mode}</span>
          {pending > 0
            ? <Link className="btn btn-primary btn-sm" href="/approvals">Open approvals</Link>
            : <Link className="btn btn-ghost btn-sm" href="/agents">View operators</Link>}
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {/* KPI row (real metrics, no fabricated trends) */}
      <div className="kpi-row">
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-top"><span className="lab">{k.label}</span></div>
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-meta"><span className={`kpi-delta ${k.subCls}`}>{k.sub}</span></div>
          </div>
        ))}
      </div>

      {/* Operators + Approvals */}
      <div className="os-grid-2">
        <div className="p">
          <div className="p-head">
            <h3>{overview.operators.length === 1 ? "Your first operator" : "Active operators"}</h3>
            <span className="p-meta">{overview.operators.length} configured · no actions run without approval</span>
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

        <div className="p">
          <div className="p-head">
            <h3>Approval inbox</h3>
            <span className="p-meta">{pending > 0 && <span className="dot dot-cyan pulsing" />} {pending} waiting</span>
          </div>
          <div>
            {pending === 0 ? (
              <div className="appr-row">
                <div className="appr-row-body" style={{ padding: "8px 0", color: "var(--text-mute)" }}>No approvals waiting. Operators will surface work here when review is needed.</div>
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
                    <span className="appr-btn approve" role="button" aria-disabled={busy} onClick={() => { if (!busy) void actOnApproval(approval.id, "approve"); }} style={{ opacity: busy ? 0.5 : 1, cursor: busy ? "default" : "pointer" }}>
                      {isBusy ? "..." : "Approve"}
                    </span>
                    <Link className="appr-btn edit" href={approval.href}>Open</Link>
                    <span className="appr-btn deny" role="button" aria-disabled={busy} onClick={() => { if (!busy) void actOnApproval(approval.id, "reject"); }} style={{ opacity: busy ? 0.5 : 1, cursor: busy ? "default" : "pointer" }}>Skip</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity + Policy */}
      <div className="os-grid-2">
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
      <div className="p">
        <div className="p-head">
          <h3>Connectors</h3>
          <span className="p-meta">{healthyConnectors}/{overview.connectors.length} healthy</span>
        </div>
        <div className="conn-strip" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
          {overview.connectors.map((connector) => {
            const meta = connectorMeta[connector.key] ?? { letter: connector.name.slice(0, 2), color: "#4DE8E1" };
            return (
              <Link key={connector.key} href={connector.href} className="conn-tile" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="conn-logo" style={{ color: meta.color, background: `${meta.color}15`, boxShadow: `inset 0 0 0 1px ${meta.color}40` }}>{meta.letter}</div>
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

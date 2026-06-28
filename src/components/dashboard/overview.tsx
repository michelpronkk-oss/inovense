"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import type { DashboardOverview, DashboardOperator } from "@/lib/dashboard/overview";

type ScanKey = DashboardOperator["key"];

type OverviewResponse = DashboardOverview & { error?: string; message?: string };

const scanRoutes: Record<ScanKey, string> = {
  revenue: "/api/operators/revenue/scan",
  client_flow: "/api/operators/client-flow/scan",
  operations: "/api/operators/operations/scan",
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

function autonomyModeLabel(mode: DashboardOverview["policy"]["autonomyMode"]): string {
  if (mode === "assisted") return "Assisted autopilot";
  if (mode === "managed") return "Managed custom";
  return "Safe mode";
}

function customerEmailLabel(mode: DashboardOverview["policy"]["customerEmailMode"]): string {
  if (mode === "draft_only") return "Customer emails draft only";
  if (mode === "auto_send_low_risk") return "Customer emails auto-send low risk";
  return "Customer emails require approval";
}

function systemTone(status: DashboardOverview["systemStatus"]["status"]) {
  if (status === "healthy") return { color: "var(--green)", dot: "var(--green)" };
  if (status === "emergency_stop") return { color: "var(--rose)", dot: "var(--rose)" };
  return { color: "var(--amber)", dot: "var(--amber)" };
}

function operatorStatusLabel(status: DashboardOperator["status"]) {
  if (status === "monitoring") return "Monitoring";
  if (status === "ready") return "Ready";
  if (status === "needs_setup") return "Needs setup";
  return "Disabled";
}

function operatorDisplayName(key: string | null | undefined): string {
  if (key === "client_flow") return "Client Flow";
  if (key === "operations") return "Operations";
  if (key === "revenue") return "Revenue";
  return key ? titleCase(key) : "Operator";
}

type HeroState = {
  key: "emergency_stop" | "pending" | "setup" | "failed" | "healthy";
  title: string;
  description: string;
  primary: { href: string; label: string };
};

function heroState(overview: DashboardOverview): HeroState {
  if (overview.systemStatus.status === "emergency_stop") {
    return {
      key: "emergency_stop",
      title: "Emergency stop is active",
      description: "Risky execution is paused until policies are updated.",
      primary: { href: "/app/policies", label: "Manage policies" },
    };
  }
  if (overview.approvals.pendingCount > 0) {
    return {
      key: "pending",
      title: `${overview.approvals.pendingCount} item${overview.approvals.pendingCount === 1 ? "" : "s"} need review`,
      description: "Operators prepared work that needs your approval.",
      primary: { href: "/app/approvals", label: "Open approvals" },
    };
  }
  if (overview.systemStatus.status === "setup_incomplete") {
    return {
      key: "setup",
      title: "Finish setup",
      description: "Connect the required tools to activate your operators.",
      primary: { href: "/app/connectors", label: "Connect tools" },
    };
  }
  if (overview.today.failedExecutions > 0) {
    return {
      key: "failed",
      title: "Execution needs attention",
      description: "Something needs review before operators continue safely.",
      primary: { href: "/app/logs", label: "Open logs" },
    };
  }
  return {
    key: "healthy",
    title: "Operating layer is running",
    description: "Monitoring connected workstreams under policy.",
    primary: { href: "/app/agents", label: "View operators" },
  };
}

function Pill({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      minHeight: 22,
      padding: "3px 9px",
      borderRadius: 999,
      background: "rgba(255,255,255,0.035)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)",
      color: color ?? "var(--text-dim)",
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Inovense OS</span>
          <h1>Loading overview...</h1>
          <div className="os-page-sub">Reading real workspace state.</div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {[0, 1].map((i) => <div key={i} className="p" style={{ minHeight: i === 0 ? 180 : 90, opacity: 0.7 }} />)}
      </div>
    </div>
  );
}

export function OSOverview() {
  const { state } = useOS();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyScan, setBusyScan] = useState<ScanKey | null>(null);

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
    if (busyScan) return;
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

  if (loading && !overview) return <Skeleton />;

  if (!overview) {
    return (
      <div className="os-page">
        <div className="os-page-head">
          <div>
            <span className="os-greet">Inovense OS</span>
            <h1>Overview unavailable</h1>
            <div className="os-page-sub">{error || "Could not load real dashboard state."}</div>
          </div>
        </div>
      </div>
    );
  }

  const tone = systemTone(overview.systemStatus.status);
  const hero = heroState(overview);
  const healthyConnectors = overview.connectors.filter((connector) => connector.connected).length;
  const autonomyLabel = autonomyModeLabel(overview.policy.autonomyMode);
  const pending = overview.approvals.pendingCount;
  const reviewRows = overview.approvals.latest.slice(0, 3);

  const metrics = [
    { label: "Pending approvals", value: pending },
    { label: "Actions today", value: overview.today.actionsExecuted },
    { label: "Blocked by policy", value: overview.today.blockedByPolicy },
    { label: "Healthy connectors", value: `${healthyConnectors}/${overview.connectors.length}` },
  ];

  const nextActions = overview.nextBestActions.filter((action) => action.href !== hero.primary.href).slice(0, 2);

  return (
    <div className="os-page">
      {/* Header */}
      <div className="os-page-head">
        <div>
          <span className="os-greet">Inovense OS</span>
          <h1>{overview.workspace.name}</h1>
        </div>
        <div className="os-page-actions" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Pill color={tone.color}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: tone.dot }} />
            {overview.systemStatus.label}
          </Pill>
          <Pill>{autonomyLabel}</Pill>
          <span style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Updated {timeAgo(overview.lastUpdatedAt)}</span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {/* Command area: operating status + review queue */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <section className="p" style={{ gap: 0, overflow: "hidden" }}>
          <div style={{ padding: "24px 24px 22px", display: "grid", gap: 16, minHeight: 196, alignContent: "space-between" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: tone.dot, boxShadow: `0 0 12px ${tone.dot}` }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: tone.color }}>{overview.systemStatus.label}</span>
              </div>
              <h2 style={{ fontSize: 23, lineHeight: 1.15, margin: 0, letterSpacing: "-0.01em" }}>{hero.title}</h2>
              <p style={{ margin: "9px 0 0", maxWidth: 440, color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.55 }}>{hero.description}</p>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <Link className="btn btn-primary btn-sm" href={hero.primary.href} style={{ width: "fit-content" }}>{hero.primary.label}</Link>
              <span style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Running under {autonomyLabel} · Rechecked before execution</span>
            </div>
          </div>
        </section>

        <section className="p" style={{ gap: 0 }}>
          <div className="p-head">
            <h3>{pending > 0 ? "Waiting for review" : "No approvals waiting"}</h3>
            {pending > 0 && <Link className="lnk-open" href="/app/approvals">Open approvals</Link>}
          </div>
          <div style={{ padding: "6px 18px 14px", display: "grid", gap: 2 }}>
            {pending === 0 ? (
              <div style={{ padding: "26px 0", color: "var(--text-mute)", fontSize: 13 }}>Operators will surface work here when review is needed.</div>
            ) : reviewRows.map((approval) => (
              <div key={approval.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>{approval.title}</div>
                  <div style={{ marginTop: 4, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 11.5, color: "var(--text-dim)", fontWeight: 600 }}>{operatorDisplayName(approval.operatorKey)}</span>
                    {approval.riskLevel && <Pill color={approval.riskLevel === "high" ? "var(--rose)" : "var(--amber)"}>Risk: {approval.riskLevel}</Pill>}
                    <span style={{ fontSize: 11, color: "var(--text-mute)" }}>{timeAgo(approval.createdAt)}</span>
                  </div>
                </div>
                <Link className="appr-btn approve" href={approval.href}>Review</Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Metrics strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {metrics.map((metric) => (
          <div className="kpi" key={metric.label}>
            <div className="kpi-top"><span className="lab">{metric.label}</span></div>
            <div className="kpi-val">{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Operators (secondary) */}
      <section className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <h3>Operators</h3>
          <Link className="lnk-open" href="/app/agents">View all</Link>
        </div>
        <div style={{ padding: "6px 18px 14px", display: "grid", gap: 2 }}>
          {overview.operators.map((operator) => (
            <div key={operator.key} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", padding: "13px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 650 }}>{operator.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: operator.status === "needs_setup" ? "var(--amber)" : "var(--green)" }}>{operatorStatusLabel(operator.status)}</span>
                </div>
                <div style={{ marginTop: 3, fontSize: 11.8, color: "var(--text-mute)" }}>
                  {operator.pendingApprovals} pending · {operator.signalsToday} signals today · checked {timeAgo(operator.lastRunAt)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Link className="lnk-open" href={operator.href} style={{ fontSize: 12 }}>Open</Link>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={busyScan !== null || operator.status === "needs_setup"}
                  onClick={() => runManualCheck(operator.key)}
                  style={{ opacity: busyScan !== null || operator.status === "needs_setup" ? 0.48 : 1 }}
                >
                  {busyScan === operator.key ? "Checking..." : "Run check"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Connectors + Policy (compact) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <section className="p" style={{ gap: 0 }}>
          <div className="p-head">
            <h3>Connectors</h3>
            <Link className="lnk-open" href="/app/connectors">Manage connectors</Link>
          </div>
          <div style={{ padding: "14px 18px 16px", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {overview.connectors.map((connector) => {
                const ok = connector.connected;
                return (
                  <span key={connector.key} style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999,
                    background: "rgba(255,255,255,0.025)",
                    boxShadow: `inset 0 0 0 1px ${ok ? "rgba(81,216,138,0.28)" : "rgba(245,194,107,0.28)"}`,
                    fontSize: 12, fontWeight: 600,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: ok ? "var(--green)" : "var(--amber)" }} />
                    {connector.name}
                    <span style={{ color: ok ? "var(--green)" : "var(--amber)", fontSize: 11 }}>{ok ? "✓" : "needs setup"}</span>
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}>Monitoring Gmail, HubSpot, Slack and Trello.</div>
          </div>
        </section>

        <section className="p" style={{ gap: 0 }}>
          <div className="p-head">
            <h3>Policy</h3>
            <Link className="lnk-open" href="/app/policies">Manage policies</Link>
          </div>
          <div style={{ padding: "14px 18px 16px", display: "grid", gap: 7 }}>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
              {autonomyLabel} · {overview.policy.emergencyStopEnabled ? "Emergency stop on" : "Emergency stop off"} · {customerEmailLabel(overview.policy.customerEmailMode)}
            </div>
            <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}>Approval-first where risk matters.</div>
          </div>
        </section>
      </div>

      {/* Activity */}
      <section className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <h3>Recent activity</h3>
          <Link className="lnk-open" href="/app/logs">Open logs</Link>
        </div>
        <div style={{ padding: "8px 18px 16px", display: "grid", gap: 12 }}>
          {overview.activity.length === 0 ? (
            <div style={{ padding: "18px 0", color: "var(--text-mute)", fontSize: 13 }}>No activity yet. Operator runs will appear here.</div>
          ) : overview.activity.slice(0, 5).map((item) => (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "baseline" }}>
              <span style={{ fontSize: 12.8, color: "var(--text-dim)", overflowWrap: "anywhere" }}>{item.description || titleCase(item.title)}</span>
              <span style={{ fontSize: 11, color: "var(--text-mute)", whiteSpace: "nowrap" }}>{timeAgo(item.time)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Next best actions (only when not duplicating the hero CTA) */}
      {nextActions.length > 0 && (
        <section className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>Suggested next</h3></div>
          <div style={{ padding: "12px 18px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {nextActions.map((action) => (
              <Link key={action.id} href={action.href} style={{ textDecoration: "none", color: "inherit", padding: 13, borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{action.title}</span>
                <span style={{ fontSize: 11.8, color: "var(--text-mute)", lineHeight: 1.45 }}>{action.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

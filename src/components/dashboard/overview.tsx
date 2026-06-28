"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CheckIcon, InboxIcon, ZapIcon } from "@/components/dashboard/icons";
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
  if (!value) return "Not checked yet";
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "Time unknown";
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / (60 * 24))}d ago`;
}

function systemTone(status: DashboardOverview["systemStatus"]["status"]) {
  if (status === "healthy") return { color: "var(--green)", bg: "rgba(81,216,138,0.08)", border: "rgba(81,216,138,0.24)" };
  if (status === "emergency_stop") return { color: "var(--rose)", bg: "rgba(242,118,124,0.1)", border: "rgba(242,118,124,0.28)" };
  if (status === "setup_incomplete") return { color: "var(--amber)", bg: "rgba(245,194,107,0.08)", border: "rgba(245,194,107,0.24)" };
  return { color: "var(--amber)", bg: "rgba(245,194,107,0.08)", border: "rgba(245,194,107,0.24)" };
}

function activityTone(severity: string) {
  if (severity === "success") return "var(--green)";
  if (severity === "danger") return "var(--rose)";
  if (severity === "warning") return "var(--amber)";
  return "var(--cyan)";
}

function connectorTone(status: string) {
  if (status === "connected") return "var(--green)";
  if (status === "error") return "var(--rose)";
  if (status === "coming_soon") return "var(--text-mute)";
  return "var(--amber)";
}

function operatorStatusLabel(status: DashboardOperator["status"]) {
  if (status === "monitoring") return "Monitoring";
  if (status === "ready") return "Ready";
  if (status === "needs_setup") return "Needs setup";
  return "Disabled";
}

function heroCopy(overview: DashboardOverview) {
  if (overview.systemStatus.status === "emergency_stop") {
    return {
      title: "Emergency stop is active",
      description: "Risky execution is blocked at policy level. Operators can still surface work, but sends and writes will not run.",
      primary: { href: "/app/policies", label: "Open policies" },
    };
  }
  if (overview.approvals.pendingCount > 0) {
    return {
      title: `${overview.approvals.pendingCount} approval${overview.approvals.pendingCount === 1 ? "" : "s"} need your review`,
      description: "Operators are preparing real work and waiting for a human decision before anything risky executes.",
      primary: { href: "/app/approvals", label: "Review approvals" },
    };
  }
  if (overview.systemStatus.status === "setup_incomplete") {
    return {
      title: "Finish setup to activate operators",
      description: "Connect the core tools and choose Slack or Trello destinations before the operating layer is fully healthy.",
      primary: { href: "/app/connectors", label: "Connect tools" },
    };
  }
  return {
    title: "Your operating layer is running",
    description: "Revenue, Client Flow and Operations are monitoring connected tools and preparing actions under policy.",
    primary: { href: "/app/agents", label: "View operators" },
  };
}

function Pill({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      minHeight: 24,
      padding: "4px 9px",
      borderRadius: 999,
      background: "rgba(255,255,255,0.035)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.075)",
      color: color ?? "var(--text-dim)",
      fontSize: 11,
      fontWeight: 650,
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
        {[0, 1, 2].map((i) => (
          <div key={i} className="p" style={{ minHeight: i === 0 ? 170 : 110, opacity: 0.7 }} />
        ))}
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
      if (!res.ok || json.error) {
        throw new Error(json.message || json.error || "Could not load dashboard overview.");
      }
      setOverview(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard overview.");
    } finally {
      setLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const runManualCheck = async (key: ScanKey) => {
    if (busyScan) return;
    setBusyScan(key);
    setError("");
    try {
      const res = await fetch(scanRoutes[key], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          userId: state.currentUser.id,
          userEmail: state.currentUser.email,
          maxResults: 10,
        }),
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
  const hero = heroCopy(overview);
  const healthyConnectors = overview.connectors.filter((connector) => connector.connected).length;
  const metrics = [
    { label: "Pending approvals", value: overview.approvals.pendingCount, sub: overview.approvals.highRiskCount > 0 ? `${overview.approvals.highRiskCount} high risk` : "Waiting for review" },
    { label: "Actions executed today", value: overview.today.actionsExecuted, sub: "After approval or safe policy" },
    { label: "Auto-handled today", value: overview.today.autoHandled, sub: "System checks and safe tasks" },
    { label: "Blocked by policy", value: overview.today.blockedByPolicy, sub: "Live re-check enforced" },
    { label: "Connectors healthy", value: `${healthyConnectors}/${overview.connectors.length}`, sub: "Real connector truth" },
  ];

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Inovense OS</span>
          <h1>{overview.workspace.name}</h1>
          <div className="os-page-sub">Monitoring connected workstreams. Nothing risky runs without policy.</div>
        </div>
        <div className="os-page-actions" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <Pill color={tone.color}>{overview.systemStatus.label}</Pill>
          <Pill>{titleCase(overview.policy.autonomyMode)}</Pill>
          <Pill>{titleCase(overview.workspace.planTier ?? overview.workspace.billingStatus)}</Pill>
          <span style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Updated {timeAgo(overview.lastUpdatedAt)}</span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      <section className="p" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "22px 24px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 22, alignItems: "center", background: tone.bg, boxShadow: `inset 0 0 0 1px ${tone.border}` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <Pill color={tone.color}>{overview.systemStatus.label}</Pill>
              <Pill>Rechecked live at execution</Pill>
            </div>
            <h2 style={{ fontSize: 27, lineHeight: 1.12, margin: 0, letterSpacing: 0 }}>{hero.title}</h2>
            <p style={{ margin: "10px 0 0", maxWidth: 720, color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.6 }}>{hero.description}</p>
            <p style={{ margin: "8px 0 0", maxWidth: 720, color: "var(--text-mute)", fontSize: 12.5, lineHeight: 1.5 }}>{overview.systemStatus.description}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link className="btn btn-primary btn-sm" href={hero.primary.href}>{hero.primary.label}</Link>
            <Link className="btn btn-ghost btn-sm" href="/app/agents">Run manual checks</Link>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {metrics.map((metric) => (
          <div className="kpi" key={metric.label}>
            <div className="kpi-top"><span className="lab">{metric.label}</span></div>
            <div className="kpi-val">{metric.value}</div>
            <div className="kpi-meta"><span className="kpi-delta">{metric.sub}</span></div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <section className="p" style={{ gap: 0 }}>
          <div className="p-head">
            <h3><InboxIcon size={13} /> Approvals queue</h3>
            <span className="p-meta">{overview.approvals.pendingCount} waiting</span>
          </div>
          <div style={{ padding: "8px 18px 16px", display: "grid", gap: 8 }}>
            {overview.approvals.latest.length === 0 ? (
              <div style={{ padding: "22px 0", color: "var(--text-mute)", fontSize: 13 }}>No approvals waiting. Operators will surface work here.</div>
            ) : overview.approvals.latest.map((approval) => (
              <div key={approval.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 650, overflowWrap: "anywhere" }}>{approval.title}</div>
                  <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <Pill>{operatorDisplayName(approval.operatorKey)}</Pill>
                    <Pill>{titleCase(approval.policyDecision)}</Pill>
                    {approval.riskLevel && <Pill color={approval.riskLevel === "high" ? "var(--rose)" : "var(--amber)"}>Risk: {approval.riskLevel}</Pill>}
                    <span style={{ fontSize: 11.5, color: "var(--text-mute)" }}>{timeAgo(approval.createdAt)}</span>
                  </div>
                </div>
                <Link className="appr-btn approve" href={approval.href}>Review</Link>
              </div>
            ))}
          </div>
        </section>

        <section className="p" style={{ gap: 0 }}>
          <div className="p-head">
            <h3>Policy</h3>
            <Link className="lnk-open" href="/app/policies">Manage policies</Link>
          </div>
          <div style={{ padding: "12px 18px 16px", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <Pill>{titleCase(overview.policy.autonomyMode)}</Pill>
              <Pill color={overview.policy.emergencyStopEnabled ? "var(--rose)" : "var(--green)"}>{overview.policy.emergencyStopEnabled ? "Emergency stop on" : "Emergency stop off"}</Pill>
              <Pill>{titleCase(overview.policy.customerEmailMode)}</Pill>
            </div>
            <div style={{ padding: "11px 12px", borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.55 }}>
              <strong style={{ color: "var(--text)" }}>Approval-first where risk matters.</strong><br />
              {overview.policy.safeSummary}
            </div>
            <div style={{ color: "var(--text-mute)", fontSize: 12.5, lineHeight: 1.55 }}>{overview.policy.assistedSummary}</div>
          </div>
        </section>
      </div>

      <section className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <h3><ZapIcon size={13} /> Operators</h3>
          <span className="p-meta">Manual checks never run automatically</span>
        </div>
        <div style={{ padding: "14px 18px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {overview.operators.map((operator) => (
            <div key={operator.key} style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{operator.name}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-mute)", lineHeight: 1.45 }}>{operator.description}</div>
                </div>
                <Pill color={operator.status === "needs_setup" ? "var(--amber)" : "var(--green)"}>{operatorStatusLabel(operator.status)}</Pill>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                <MiniStat label="Pending" value={operator.pendingApprovals} />
                <MiniStat label="Signals" value={operator.signalsToday} />
                <MiniStat label="Actions" value={operator.actionsToday} />
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Last check: {timeAgo(operator.lastRunAt)}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn btn-ghost btn-sm" href={operator.href}>Open</Link>
                <button className="btn btn-primary btn-sm" disabled={busyScan !== null || operator.status === "needs_setup"} onClick={() => runManualCheck(operator.key)} style={{ opacity: busyScan !== null || operator.status === "needs_setup" ? 0.48 : 1 }}>
                  {busyScan === operator.key ? "Checking..." : "Run check"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <section className="p" style={{ gap: 0 }}>
          <div className="p-head">
            <h3>Connector health</h3>
            <Link className="lnk-open" href="/app/connectors">Manage</Link>
          </div>
          <div style={{ padding: "8px 18px 16px", display: "grid", gap: 8 }}>
            {overview.connectors.map((connector) => (
              <div key={connector.key} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 650 }}>{connector.name}</span>
                    <span style={{ fontSize: 11, color: connectorTone(connector.status), fontWeight: 700 }}>{connector.status === "connected" ? "Connected" : connector.status === "error" ? "Error" : "Needs setup"}</span>
                  </div>
                  <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--text-mute)" }}>{connector.purpose} - {connector.usedBy.slice(0, 3).join(", ")}</div>
                </div>
                <Link className="appr-btn edit" href={connector.href}>Manage</Link>
              </div>
            ))}
          </div>
        </section>

        <section className="p" style={{ gap: 0 }}>
          <div className="p-head">
            <h3>Today activity</h3>
            <Link className="lnk-open" href="/app/logs">Open logs</Link>
          </div>
          <div style={{ padding: "8px 18px 16px", display: "grid", gap: 10 }}>
            {overview.activity.length === 0 ? (
              <div style={{ padding: "22px 0", color: "var(--text-mute)", fontSize: 13 }}>No activity yet. Operator runs will appear here.</div>
            ) : overview.activity.map((item) => (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "12px minmax(0, 1fr)", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: activityTone(item.severity), marginTop: 6 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 650 }}>{titleCase(item.title)}</span>
                    <span style={{ fontSize: 11, color: "var(--text-mute)" }}>{timeAgo(item.time)}</span>
                  </div>
                  <div style={{ fontSize: 11.8, color: "var(--text-dim)", lineHeight: 1.45, overflowWrap: "anywhere" }}>{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <h3>Next best actions</h3>
          <span className="p-meta">Generated from real state</span>
        </div>
        <div style={{ padding: "12px 18px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
          {overview.nextBestActions.map((action) => (
            <Link key={action.id} href={action.href} style={{ textDecoration: "none", color: "inherit", padding: 13, borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 5 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13.3, fontWeight: 700 }}>{action.title}</span>
                {action.priority === "high" && <CheckIcon size={13} style={{ color: "var(--amber)" }} />}
              </div>
              <span style={{ fontSize: 11.8, color: "var(--text-mute)", lineHeight: 1.45 }}>{action.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: "8px 9px", borderRadius: 10, background: "rgba(0,0,0,0.14)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
      <div style={{ fontSize: 10.5, color: "var(--text-mute)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 750 }}>{value}</div>
    </div>
  );
}

function operatorDisplayName(key: string | null | undefined): string {
  if (key === "client_flow") return "Client Flow";
  if (key === "operations") return "Operations";
  if (key === "revenue") return "Revenue";
  return key ? titleCase(key) : "Operator";
}

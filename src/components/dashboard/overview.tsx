"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { StatusBadge } from "@/components/operators/status-badge";
import { useOS } from "@/lib/os/app-provider";
import type { DashboardOverview, DashboardOperator } from "@/lib/dashboard/overview";
import { LOGOS as IntegrationLogos } from "@/components/home-v3/integrations-grid";
import { DashboardLoadingState } from "@/components/dashboard/loading-state";

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

function dashboardCounts(overview: DashboardOverview) {
  return {
    connected: overview.connectors.filter((connector) => connector.connected).length,
    ready: overview.operatorProductStates.filter((operator) => operator.state === "ready_to_activate").length,
    active: overview.operatorProductStates.filter((operator) => operator.state === "active" || operator.state === "enhanced").length,
    attention: overview.operatorProductStates.filter((operator) => operator.state === "needs_attention" || operator.degraded).length,
  };
}

function DashboardMetrics({ overview }: { overview: DashboardOverview }) {
  const counts = dashboardCounts(overview);
  const metrics = [
    { label: "Systems connected", value: counts.connected },
    { label: "Operators ready", value: counts.ready },
    { label: "Active operators", value: counts.active },
    { label: "Needs attention", value: counts.attention, attention: counts.attention > 0 },
  ];

  return (
    <section className="dashboard-metrics" aria-labelledby="auterim-overview-title">
      <div className="dashboard-section-label" id="auterim-overview-title">Auterim overview</div>
      <div className="dashboard-metric-grid">
        {metrics.map((metric) => (
          <div className="dashboard-metric" data-attention={metric.attention || undefined} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkforceActivity({ overview, now }: { overview: DashboardOverview; now: number }) {
  const windowStart = now - 7 * 86400000;
  const events = overview.activity.flatMap((item) => {
    const time = item.time ? new Date(item.time).getTime() : Number.NaN;
    if (!Number.isFinite(time) || time < windowStart || time > now) return [];
    const lane = item.type.startsWith("run.")
      ? 0
      : item.type.startsWith("approval.")
        ? 1
        : item.type.includes("executed") || item.type.includes("sent") || item.type.includes("completed")
          ? 2
          : 3;
    const x = 66 + ((time - windowStart) / (now - windowStart)) * 618;
    return [{ ...item, lane, x }];
  });
  const lanes = ["Runs", "Approvals", "Actions", "Other"];

  return (
    <section className="p dashboard-workforce-activity" aria-labelledby="workforce-activity-title">
      <div className="p-head">
        <div>
          <h3 id="workforce-activity-title">Workforce activity</h3>
          <span>Latest recorded events across the last 7 days</span>
        </div>
        {events.length > 0 && <Link className="lnk-open" href="/logs">Open logs</Link>}
      </div>
      <div className="dashboard-telemetry-frame">
        <svg viewBox="0 0 720 154" role="img" aria-label={events.length > 0 ? `${events.length} recent workforce events shown across the last seven days` : "No workforce activity recorded yet"}>
          {lanes.map((lane, index) => (
            <g key={lane}>
              <text x="0" y={31 + index * 28}>{lane}</text>
              <line x1="66" x2="704" y1={27 + index * 28} y2={27 + index * 28} />
            </g>
          ))}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((day) => {
            const x = 66 + day * (618 / 7);
            return <line className="dashboard-telemetry-day" x1={x} x2={x} y1="12" y2="125" key={day} />;
          })}
          {events.map((event) => (
            <circle cx={event.x} cy={27 + event.lane * 28} r="4" fill={activityColor(event.severity)} key={event.id}>
              <title>{event.title}: {event.description}</title>
            </circle>
          ))}
          <text className="dashboard-telemetry-axis" x="66" y="148">7 days ago</text>
          <text className="dashboard-telemetry-axis" x="704" y="148" textAnchor="end">Now</text>
        </svg>
        {events.length === 0 && (
          <div className="dashboard-telemetry-empty">
            <strong>Activity begins when your first operator is activated.</strong>
            <span>The timeline will show real runs, approvals, actions, and other recorded work.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function DashboardReadinessSummary({ overview }: { overview: DashboardOverview }) {
  const counts = dashboardCounts(overview);
  const states = overview.operatorProductStates;
  const firstReady = states.find((operator) => operator.state === "ready_to_activate");
  const firstAttention = states.find((operator) => operator.state === "needs_attention" || operator.degraded);
  const planBlocked = states.filter((operator) => operator.state === "plan_required" || operator.state === "billing_attention" || operator.state === "suspended").length;
  const lifecycle = overview.lifecycleState;
  const summary = lifecycle === "A"
    ? { state: "needs_setup", label: "Connect workspace", message: "Connect a system so Auterim can understand your workspace.", primary: "Connect systems", href: "/connectors" }
    : lifecycle === "B"
      ? { state: "needs_setup", label: "Workspace connected", message: `${counts.connected} system${counts.connected === 1 ? " is" : "s are"} connected. Auterim is mapping what each operator needs.`, primary: "Manage connections", href: "/connectors" }
      : lifecycle === "C"
        ? { state: "ready_to_activate", label: "Setup ready", message: `Auterim understands enough of your workspace to deploy ${counts.ready} operator${counts.ready === 1 ? "" : "s"}.`, primary: "Activate first operator", href: firstReady?.nextAction?.href ?? "/agents" }
        : lifecycle === "D"
          ? { state: "plan_required", label: "Ready for a plan", message: `${planBlocked} operator${planBlocked === 1 ? " is" : "s are"} configured and waiting to deploy.`, primary: "Choose a plan", href: "/plans" }
          : lifecycle === "F"
            ? { state: "needs_attention", label: "Needs attention", message: `${counts.attention} operator${counts.attention === 1 ? " needs" : "s need"} a connection restored.`, primary: firstAttention?.nextAction?.label ?? "Review connections", href: firstAttention?.nextAction?.href ?? "/connectors" }
            : { state: "active", label: "Workforce active", message: `${counts.active} operator${counts.active === 1 ? " is" : "s are"} monitoring your workspace.`, primary: overview.approvals.pendingCount > 0 ? "Open approvals" : "View operators", href: overview.approvals.pendingCount > 0 ? "/approvals" : "/agents" };

  return (
    <section className="p dashboard-readiness-summary" data-state={lifecycle} aria-labelledby="readiness-summary-title">
      <div className="dashboard-readiness-copy">
        <StatusBadge state={summary.state}>{summary.label}</StatusBadge>
        <h2 id="readiness-summary-title">{summary.message}</h2>
      </div>
      <div className="dashboard-readiness-actions">
        <Link className="btn btn-primary btn-sm" href={summary.href}>{summary.primary}</Link>
        <Link className="btn btn-ghost btn-sm" href={summary.href === "/connectors" ? "/agents" : "/connectors"}>{summary.href === "/connectors" ? "View operators" : "Manage connections"}</Link>
      </div>
    </section>
  );
}

function WhatAuterimCanDo({ overview }: { overview: DashboardOverview }) {
  const capabilities = Array.from(new Set(overview.operatorProductStates.flatMap((operator) => operator.availableNow))).slice(0, 6);
  return (
    <section className="p dashboard-capabilities" aria-labelledby="dashboard-capabilities-title">
      <div className="p-head"><h3 id="dashboard-capabilities-title">What Auterim can do now</h3><span className="p-meta">From connected systems</span></div>
      {capabilities.length > 0 ? (
        <ul>{capabilities.map((capability) => <li key={capability}><span aria-hidden="true">✓</span>{capability}</li>)}</ul>
      ) : (
        <div className="dashboard-compact-empty">Capabilities will appear here as systems connect.</div>
      )}
    </section>
  );
}

function ReadyToDeploy({ overview }: { overview: DashboardOverview }) {
  const deployable = overview.operatorProductStates.filter((operator) => operator.state === "ready_to_activate" || operator.state === "plan_required" || operator.state === "billing_attention");
  if (deployable.length === 0) return null;
  return (
    <section className="p dashboard-ready-panel" aria-labelledby="dashboard-ready-title">
      <div className="p-head"><h3 id="dashboard-ready-title">Ready to deploy</h3><span className="p-meta">{deployable.length} operator{deployable.length === 1 ? "" : "s"}</span></div>
      <div className="dashboard-ready-list">
        {deployable.map((operator) => (
          <div className="dashboard-ready-row" key={operator.operatorKey}>
            <div>
              <strong>{operator.operatorName}</strong>
              <span>{operator.connectedSystems.join(" · ") || operator.label}</span>
              <p>{operator.availableNow[0] ?? "Ready for activation"}</p>
            </div>
            {operator.nextAction && <Link className="btn btn-ghost btn-sm" href={operator.nextAction.href}>{operator.nextAction.label}</Link>}
          </div>
        ))}
      </div>
    </section>
  );
}

function UnlockMore({ overview }: { overview: DashboardOverview }) {
  const onboarding = new Set(overview.workspace.onboardingSystems);
  const missing = overview.connectors
    .filter((connector) => connector.status === "needs_setup")
    .sort((a, b) => Number(onboarding.has(b.key)) - Number(onboarding.has(a.key)))
    .slice(0, 3);
  if (missing.length === 0) return null;
  return (
    <section className="p dashboard-unlock-panel" aria-labelledby="dashboard-unlock-title">
      <div className="p-head"><h3 id="dashboard-unlock-title">Unlock more</h3><Link className="lnk-open" href="/connectors">All connections</Link></div>
      <div className="dashboard-unlock-list">
        {missing.map((connector) => (
          <div className="dashboard-unlock-row" key={connector.key}>
            <div>
              <strong>{connector.name}</strong>
              <p>{connector.purpose}{connector.usedBy.length > 0 ? ` for ${connector.usedBy.slice(0, 2).join(" and ")}.` : "."}</p>
            </div>
            <Link className="btn btn-ghost btn-sm" href={connector.href}>Connect</Link>
          </div>
        ))}
      </div>
    </section>
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
  const healthyConnectors = overview.connectors.filter((c) => c.connected).length;
  const mode = autonomyLabel(overview.policy.autonomyMode);
  const busy = busyScan !== null || busyApproval !== null;

  // State A remains an explicit server-backed first-run branch, but uses the
  // same control-center frame as later states so the dashboard stays familiar.
  if (healthyConnectors === 0) {
    const hasOnboardingPriorities = overview.workspace.onboardingSystems.length > 0;
    return (
      <div className="os-page dashboard-overview dashboard-first-run">
        <div className="os-page-head">
          <div>
            <span className="os-greet">Auterim workspace</span>
            <h1>{greet}, {firstName}.</h1>
            <div className="os-page-sub">See what Auterim understands, what is ready, and what happens next.</div>
          </div>
        </div>

        {error && (
          <div className="dashboard-alert" style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>
            {error}
          </div>
        )}

        <DashboardReadinessSummary overview={overview} />
        <DashboardMetrics overview={overview} />
        <WorkforceActivity overview={overview} now={Date.parse(overview.lastUpdatedAt)} />
        <div className="dashboard-value-grid" data-onboarding-priorities={hasOnboardingPriorities || undefined}>
          <WhatAuterimCanDo overview={overview} />
          <div className="dashboard-value-stack">
            <ReadyToDeploy overview={overview} />
            <UnlockMore overview={overview} />
          </div>
        </div>
      </div>
    );
  }

  // States B/C/D/F: no real operator is actively running yet. The lifecycle
  // branch itself is computed server-side (selectDashboardLifecycleState,
  // from the shared operator product-state model) so the client never
  // re-derives this precedence - see src/lib/dashboard/lifecycle.ts. Each
  // branch uses the same presentation frame while retaining the selected state.
  if (overview.lifecycleState === "B" || overview.lifecycleState === "C" || overview.lifecycleState === "D" || overview.lifecycleState === "F") {
    return (
      <LifecyclePreOperationalState
        lifecycleState={overview.lifecycleState}
        overview={overview}
        greet={greet}
        firstName={firstName}
        error={error}
      />
    );
  }

  // State E: at least one operator is actively running (active/enhanced).
  // This is the normal operational dashboard. A needs-attention/degraded
  // situation elsewhere in the workspace does not demote this to State F -
  // it is surfaced as a section within E instead (below), so the rest of the
  // product is never hidden behind an attention screen.
  const attentionStates = overview.operatorProductStates.filter((item) => item.state === "needs_attention" || item.degraded);

  // Billing eligibility banner: at least one connector is live and an
  // operator is actively running (State E), but the workspace itself is not
  // execution-eligible. In practice this should not happen (an operator only
  // reaches "active" when eligible), but this stays as a defensive,
  // non-blocking banner rather than assuming it can never occur.
  const eligibility = overview.executionEligibility;
  const showEligibilityBanner = !eligibility.eligible;

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
          <div className="os-page-sub">See what Auterim understands, what is ready, and what happens next.</div>
        </div>
      </div>

      {error && (
        <div className="dashboard-alert" style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      <DashboardReadinessSummary overview={overview} />
      {/* KPI row (real metrics, no fabricated trends) */}
      <DashboardMetrics overview={overview} />
      <WorkforceActivity overview={overview} now={Date.parse(overview.lastUpdatedAt)} />

      <div className="dashboard-value-grid">
        <WhatAuterimCanDo overview={overview} />
        <div className="dashboard-value-stack">
          <ReadyToDeploy overview={overview} />
          <UnlockMore overview={overview} />
        </div>
      </div>

      {showEligibilityBanner && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "12px 16px", borderRadius: 12, background: "rgba(245,194,107,0.07)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.2)" }}>
          <div style={{ fontSize: 12.8, color: "var(--text-dim)" }}>
            <strong style={{ color: "var(--amber)" }}>{eligibility.status === "plan_required" ? "Plan required" : eligibility.status === "billing_attention" ? "Billing needs attention" : "Execution paused"}.</strong> {eligibility.reason} You can still connect systems and configure operators now.
          </div>
          <Link className="btn btn-primary btn-sm" href="/plans" style={{ textDecoration: "none" }}>{eligibility.status === "billing_attention" ? "Update billing" : "Choose a plan"}</Link>
        </div>
      )}

      {/* Needs-attention section: surfaced inside the normal operational
          dashboard rather than replacing it, so an operator that is degraded
          (optional connector unhealthy) or needs_attention (required
          connector broke) never hides the rest of the product once
          something else is actively running. */}
      {attentionStates.length > 0 && (
        <div className="p" style={{ borderRadius: 14, background: "rgba(245,194,107,0.05)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.18)" }}>
          <div className="p-head"><h3>Needs attention</h3><span className="p-meta">{attentionStates.length} operator{attentionStates.length === 1 ? "" : "s"}</span></div>
          <div style={{ padding: "12px 18px", display: "grid", gap: 10 }}>
            {attentionStates.map((item) => (
              <div key={item.operatorKey} style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12.8, fontWeight: 600 }}>{item.operatorName}</div>
                  <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-mute)" }}>{item.description}</div>
                  {item.degraded && item.state !== "needs_attention" && (
                    <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--text-mute)" }}>
                      Unavailable: {item.degraded.lostCapabilities.join(", ")}{item.degraded.stillAvailableCapabilities.length ? ` · Still available: ${item.degraded.stillAvailableCapabilities.join(", ")}` : ""}
                    </div>
                  )}
                </div>
                {item.nextAction && <Link className="btn btn-ghost btn-sm" href={item.nextAction.href} style={{ textDecoration: "none", flexShrink: 0 }}>{item.nextAction.label}</Link>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operators + Approvals */}
      <div className="os-grid-2 dashboard-focus-grid">
        <div className="p dashboard-operators-panel">
          <div className="p-head">
            <h3>{overview.operators.length === 1 ? "Your first operator" : "Your operators"}</h3>
            <span className="p-meta"><span className="desktop-only">{overview.operators.length} configured · no actions run without approval</span><span className="mobile-only">{overview.operators.length} operators</span></span>
          </div>
          <div className="ops-grid">
            {overview.operators.map((operator) => {
              const meta = operatorMeta[operator.key];
              const needsSetup = operator.status === "needs_setup";
              const productState = overview.operatorProductStates.find((item) => item.operatorKey === operator.key);
              return (
                <div className="ops-card" key={operator.key}>
                  <div className="ops-card-head">
                    <Image className="ops-card-avatar" src={meta.avatar} alt="" width={34} height={34} style={{ width: 34, height: 34, objectFit: "contain" }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="ops-card-name">{operator.name}</div>
                      <div className="ops-card-tag">{meta.tag}</div>
                    </div>
                    <StatusBadge state={productState?.state ?? operator.status}>
                      {productState?.label ?? (needsSetup ? "Needs setup" : "Monitoring")}
                    </StatusBadge>
                  </div>
                  <div className="ops-task">
                    <span>{operator.pendingApprovals} pending · {operator.signalsToday} signals today · checked {timeAgo(operator.lastRunAt)}</span>
                  </div>
                  <div className="ops-foot">
                    <span className="ops-metric"><strong>{operator.actionsToday}</strong> actions today</span>
                    <div className="ops-actions">
                      <button
                        type="button"
                        className="lnk cyan"
                        disabled={busy || needsSetup}
                        onClick={() => { if (!busy && !needsSetup) void runManualCheck(operator.key); }}
                        style={{ opacity: busy || needsSetup ? 0.45 : 1, cursor: busy || needsSetup ? "default" : "pointer" }}
                      >
                        {busyScan === operator.key ? "Checking..." : "Run check"}
                      </button>
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

/**
 * Dashboard lifecycle states B, C, D, and F. Which branch to render is
 * decided entirely server-side (overview.lifecycleState, from
 * selectDashboardLifecycleState) - this component only renders the copy for
 * whichever one it is handed. The presentation stays stable while real
 * counts, capabilities, and activity change with the selected state.
 */
function LifecyclePreOperationalState({
  lifecycleState,
  overview,
  greet,
  firstName,
  error,
}: {
  lifecycleState: "B" | "C" | "D" | "F";
  overview: DashboardOverview;
  greet: string;
  firstName: string;
  error: string;
}) {
  const states = overview.operatorProductStates;
  const attentionStates = states.filter((item) => item.state === "needs_attention" || item.degraded);

  return (
    <div className="os-page dashboard-overview">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Auterim workspace</span>
          <h1>{greet}, {firstName}.</h1>
          <div className="os-page-sub">See what Auterim understands, what is ready, and what happens next.</div>
        </div>
      </div>

      {error && (
        <div className="dashboard-alert" style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      <DashboardReadinessSummary overview={overview} />
      <DashboardMetrics overview={overview} />
      <WorkforceActivity overview={overview} now={Date.parse(overview.lastUpdatedAt)} />

      {lifecycleState === "F" && attentionStates.length > 0 && (
        <section className="p dashboard-attention-panel" aria-labelledby="dashboard-attention-title">
          <div className="p-head"><h3 id="dashboard-attention-title">Needs attention</h3><span className="p-meta">Restore full coverage</span></div>
          <div className="dashboard-attention-list">
            {attentionStates.map((item) => (
              <div className="dashboard-attention-row" key={item.operatorKey}>
                <div>
                  <strong>{item.operatorName}</strong>
                  <p>{item.description}</p>
                  {item.degraded?.lostCapabilities.length ? <span>Unavailable: {item.degraded.lostCapabilities.join(", ")}</span> : null}
                  {item.degraded?.stillAvailableCapabilities.length ? <span>Still available: {item.degraded.stillAvailableCapabilities.join(", ")}</span> : null}
                </div>
                {item.nextAction && <Link className="btn btn-ghost btn-sm" href={item.nextAction.href}>{item.nextAction.label}</Link>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="dashboard-value-grid">
        <WhatAuterimCanDo overview={overview} />
        <div className="dashboard-value-stack">
          <ReadyToDeploy overview={overview} />
          <UnlockMore overview={overview} />
        </div>
      </div>
    </div>
  );
}

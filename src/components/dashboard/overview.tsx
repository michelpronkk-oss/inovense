"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { StatusBadge } from "@/components/operators/status-badge";
import { useOS } from "@/lib/os/app-provider";
import type { DashboardOverview, DashboardOperator } from "@/lib/dashboard/overview";
import { LOGOS as IntegrationLogos } from "@/components/home-v3/integrations-grid";
import { DashboardLoadingState } from "@/components/dashboard/loading-state";
import { MetricStrip, PageHeader } from "@/components/product-ui/page-primitives";

type ScanKey = DashboardOperator["key"];
type OverviewResponse = DashboardOverview & { error?: string; message?: string };

const scanRoutes: Record<ScanKey, string> = {
  revenue: "/api/operators/revenue/scan",
  client_flow: "/api/operators/client-flow/scan",
  operations: "/api/operators/operations/scan",
  support: "/api/operators/support/scan",
};

const operatorMeta: Record<ScanKey, { mark: string; color: string; tag: string; avatar: string }> = {
  revenue: { mark: "RV", color: "#4DE8E1", tag: "Revenue · Pipeline", avatar: "/operators/revenue-operator.png" },
  client_flow: { mark: "CF", color: "#5B8DEF", tag: "Client · Onboarding", avatar: "/operators/client-flow-operator.png" },
  operations: { mark: "OP", color: "#51D88A", tag: "Operations · Internal", avatar: "/operators/operations-operator.png" },
  support: { mark: "SU", color: "#66D0E0", tag: "Support · Customer care", avatar: "/operators/support-operator.png" },
};

const connectorMeta: Record<string, { letter: string; color: string }> = {
  gmail: { letter: "G", color: "#EA4335" },
  hubspot: { letter: "HS", color: "#FF7A59" },
  slack: { letter: "Sl", color: "#A77FBC" },
  trello: { letter: "Tr", color: "#4BA3E8" },
};

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function OperatorAvatar({ operatorKey, size }: { operatorKey: ScanKey; size: number }) {
  const meta = operatorMeta[operatorKey];
  const style = {
    "--rc": meta.color,
    "--rc-a": rgba(meta.color, 0.15),
    "--rc-b": rgba(meta.color, 0.03),
    "--rc-ring": rgba(meta.color, 0.33),
    width: size,
    height: size,
  } as React.CSSProperties;
  return (
    <span className="op-av" style={style}>
      <Image src={meta.avatar} alt="" width={size} height={size} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
    </span>
  );
}

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
  if (mode === "manual") return "Manual";
  if (mode === "guarded") return "Guarded";
  if (mode === "autonomous") return "Autonomous";
  return "Approval first";
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
    active: overview.operatorProductStates.filter((operator) => operator.state === "active" || operator.state === "active_limited" || operator.state === "enhanced").length,
    attention: overview.operatorProductStates.filter((operator) => operator.state === "needs_attention" || operator.state === "active_limited").length,
  };
}

/** Four-tile KPI row. Every value/detail is read straight off the fetched
 * DashboardOverview payload - nothing here is a fabricated trend or count. */
function DashboardMetrics({ overview }: { overview: DashboardOverview }) {
  const counts = dashboardCounts(overview);
  const pending = overview.approvals.pendingCount;
  const oldestApproval = overview.approvals.latest[0];
  const attentionConnectors = overview.connectors.length - counts.connected;

  const metrics = [
    {
      label: "Live workforce",
      value: <>{counts.active}<em>of {overview.operators.length} operator{overview.operators.length === 1 ? "" : "s"}</em></>,
      detail: counts.active ? overview.operators.filter((o) => (overview.operatorProductStates.find((p) => p.operatorKey === o.key)?.state ?? "") !== "needs_setup").slice(0, 2).map((o) => o.name).join(", ") : "None monitoring yet",
    },
    {
      label: "Awaiting approval",
      value: pending,
      detail: pending > 0 && oldestApproval ? `Oldest waiting ${timeAgo(oldestApproval.createdAt)}` : "All clear",
      tone: pending > 0 ? "attention" as const : "default" as const,
    },
    {
      label: "Connected systems",
      value: counts.connected,
      detail: attentionConnectors > 0 ? `${attentionConnectors} need${attentionConnectors === 1 ? "s" : ""} attention` : "All healthy",
    },
    {
      label: "Actions executed",
      value: overview.activitySummary.executed,
      detail: "Last 7 days, all logged",
    },
  ];

  return <MetricStrip items={metrics} />;
}

function WorkforceActivity({ overview }: { overview: DashboardOverview }) {
  const summary = overview.activitySummary;
  const hasActivity = summary.prepared > 0 || summary.executed > 0 || summary.held > 0;
  const max = Math.max(...summary.daily.flatMap((item) => [item.prepared, item.executed, item.held]), 1);
  const pointString = (key: "prepared" | "executed" | "held") => summary.daily.map((item, index) => {
    const x = 40 + index * (640 / Math.max(summary.daily.length - 1, 1));
    const y = 150 - (item[key] / max) * 112;
    return `${x},${y}`;
  }).join(" ");
  const preparedPoints = pointString("prepared");
  const executedPoints = pointString("executed");
  const heldPoints = pointString("held");

  return (
    <div className="card" aria-labelledby="workforce-activity-title">
      <div className="card-head">
        <div>
          <div className="t-section" id="workforce-activity-title">Workforce activity</div>
          <div className="t-meta" style={{ marginTop: 3 }}>Prepared against executed, last 7 days</div>
        </div>
        <div className="inline" style={{ gap: 18 }}>
          <span className="inline" style={{ gap: 7 }}><span className="dot dot-cyan" /><span className="t-meta">Prepared</span></span>
          <span className="inline" style={{ gap: 7 }}><span className="dot dot-green" /><span className="t-meta">Executed</span></span>
          <span className="inline" style={{ gap: 7 }}><span className="dot dot-amber" /><span className="t-meta">Held at approval</span></span>
        </div>
      </div>
      <div className="card-pad" style={{ paddingTop: 18 }}>
        <div className="dashboard-activity-counts" aria-label={`${summary.prepared} prepared, ${summary.executed} executed, and ${summary.held} held at approval across the last seven days`}>
          <span data-series="prepared"><b>{summary.prepared}</b> Prepared</span><span data-series="executed"><b>{summary.executed}</b> Executed</span><span data-series="held"><b>{summary.held}</b> Held at approval</span>
        </div>
        <div className="dashboard-telemetry-frame">
          <svg viewBox="0 0 720 190" role="img" aria-label={hasActivity ? `${summary.prepared} prepared actions, ${summary.executed} executed actions, and ${summary.held} actions held at approval across seven days.` : "No prepared, executed, or held workforce activity recorded yet"}>
            {[38, 76, 114, 152].map((y) => <line key={y} x1="40" x2="680" y1={y} y2={y} />)}
            {summary.daily.map((item, index) => { const x = 40 + index * (640 / Math.max(summary.daily.length - 1, 1)); return <g key={item.day}><line className="dashboard-telemetry-day" x1={x} x2={x} y1="28" y2="152" /><text className="dashboard-telemetry-axis" x={x} y="178" textAnchor={index === 0 ? "start" : index === summary.daily.length - 1 ? "end" : "middle"}>{new Date(`${item.day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short" })}</text></g>; })}
            {hasActivity && <>
              <polygon points={`40,152 ${preparedPoints} 680,152`} fill="rgba(77,232,225,.10)" />
              <polyline points={preparedPoints} fill="none" stroke="#4DE8E1" strokeWidth="2" />
              <polyline points={executedPoints} fill="none" stroke="#51D88A" strokeWidth="1.8" />
              <polyline points={heldPoints} fill="none" stroke="#F5C26B" strokeWidth="1.8" strokeDasharray="4 4" />
              {summary.daily.map((item, index) => { const x = 40 + index * (640 / Math.max(summary.daily.length - 1, 1)); const y = 150 - (item.prepared / max) * 112; return <circle key={item.day} cx={x} cy={y} r="3.5" fill="#4DE8E1"><title>{`${item.day}: ${item.prepared} prepared, ${item.executed} executed, ${item.held} held at approval`}</title></circle>; })}
            </>}
          </svg>
          {!hasActivity && (
            <div className="dashboard-telemetry-empty">
              <strong>Activity is still building.</strong>
              <span>Prepared, executed, and held work will appear here after operators begin monitoring.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardReadinessSummary({ overview }: { overview: DashboardOverview }) {
  const counts = dashboardCounts(overview);
  const states = overview.operatorProductStates;
  const firstReady = states.find((operator) => operator.state === "ready_to_activate");
  const firstAttention = states.find((operator) => operator.state === "needs_attention" || operator.state === "active_limited");
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
    <section className="attn info" data-state={lifecycle} aria-labelledby="readiness-summary-title" style={{ padding: "16px 18px" }}>
      <div className="inline" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div className="inline" style={{ gap: 12 }}>
          <StatusBadge state={summary.state}>{summary.label}</StatusBadge>
          <span className="t-object" id="readiness-summary-title">{summary.message}</span>
        </div>
        <div className="inline" style={{ flex: "none" }}>
          <Link className="btn btn-primary btn-sm" href={summary.href}>{summary.primary}</Link>
          <Link className="btn btn-ghost btn-sm" href={summary.href === "/connectors" ? "/agents" : "/connectors"}>{summary.href === "/connectors" ? "View operators" : "Manage connections"}</Link>
        </div>
      </div>
    </section>
  );
}

function WhatAuterimCanDo({ overview }: { overview: DashboardOverview }) {
  const capabilities = Array.from(new Set(overview.operatorProductStates.flatMap((operator) => operator.availableNow))).slice(0, 6);
  return (
    <div className="card" aria-labelledby="dashboard-capabilities-title">
      <div className="card-head"><div className="t-section" id="dashboard-capabilities-title">What Auterim can do now</div><span className="t-meta">From connected systems</span></div>
      {capabilities.length > 0 ? (
        <div className="rows">{capabilities.map((capability) => <div className="row" key={capability}><span className="dot dot-green" /><span className="grow t-compact">{capability}</span></div>)}</div>
      ) : (
        <div className="card-pad t-meta">Capabilities will appear here as systems connect.</div>
      )}
    </div>
  );
}

function ReadyToDeploy({ overview }: { overview: DashboardOverview }) {
  const deployable = overview.operatorProductStates.filter((operator) => operator.state === "ready_to_activate" || operator.state === "plan_required" || operator.state === "billing_attention");
  if (deployable.length === 0) return null;
  return (
    <div className="card" aria-labelledby="dashboard-ready-title">
      <div className="card-head"><div className="t-section" id="dashboard-ready-title">Ready to deploy</div><span className="t-meta">{deployable.length} operator{deployable.length === 1 ? "" : "s"}</span></div>
      <div className="rows">
        {deployable.map((operator) => (
          <div className="row" key={operator.operatorKey}>
            <span className="grow">
              <span className="ttl">{operator.operatorName}</span>
              <span className="sub">{operator.connectedSystems.join(" · ") || operator.label} · {operator.availableNow[0] ?? "Ready for activation"}</span>
            </span>
            {operator.nextAction && <Link className="btn btn-ghost btn-sm" href={operator.nextAction.href}>{operator.nextAction.label}</Link>}
          </div>
        ))}
      </div>
    </div>
  );
}

function UnlockMore({ overview }: { overview: DashboardOverview }) {
  if (!overview.connectors.some((connector) => connector.status === "needs_setup")) return null;
  return (
    <div className="card card-pad" aria-labelledby="dashboard-unlock-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div className="t-section" id="dashboard-unlock-title">Unlock more</div>
        <p className="t-compact" style={{ margin: "4px 0 0" }}>Connect another system to expand what your operators can understand and do.</p>
      </div>
      <Link className="btn btn-ghost btn-sm" href="/connectors?discover=1">Find a connector</Link>
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
        <PageHeader eyebrow="Auterim OS" title="We couldn’t load your dashboard." description={error || "Refresh to try again."}
          actions={<button className="btn btn-primary btn-sm" type="button" onClick={() => { setLoading(true); void loadOverview(); }}>Try again</button>} />
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

  const headerActions = (
    <>
      <Link className="btn btn-secondary" href="/connectors">Connect a system</Link>
      <Link className="btn btn-primary" href="/agents">Manage workforce</Link>
    </>
  );

  // State A remains an explicit server-backed first-run branch, but uses the
  // same control-center frame as later states so the dashboard stays familiar.
  if (overview.lifecycleState === "A") {
    const hasOnboardingPriorities = overview.workspace.onboardingSystems.length > 0;
    return (
      <div className="os-page dashboard-overview dashboard-first-run">
        <PageHeader eyebrow="Auterim workspace" title={`${greet}, ${firstName}.`} description="See what Auterim understands, what is ready, and what happens next." />

        {error && <section className="attn crit"><div className="card-pad" style={{ padding: "10px 14px", fontSize: 12.5 }}>{error}</div></section>}

        <div className="sec"><DashboardReadinessSummary overview={overview} /></div>
        <div className="sec"><DashboardMetrics overview={overview} /></div>
        <div className="sec"><WorkforceActivity overview={overview} /></div>
        <div className="sec split" data-onboarding-priorities={hasOnboardingPriorities || undefined}>
          <WhatAuterimCanDo overview={overview} />
          <div className="stack">
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
  const attentionStates = overview.operatorProductStates.filter((item) => item.state === "needs_attention" || item.state === "active_limited");

  // Billing eligibility banner: at least one connector is live and an
  // operator is actively running (State E), but the workspace itself is not
  // execution-eligible. In practice this should not happen (an operator only
  // reaches "active" when eligible), but this stays as a defensive,
  // non-blocking banner rather than assuming it can never occur.
  const eligibility = overview.executionEligibility;
  const showEligibilityBanner = !eligibility.eligible;

  const topApproval = overview.approvals.latest[0];
  const moreApprovals = overview.approvals.latest.slice(1, 4);

  return (
    <div className="os-page dashboard-overview">
      <PageHeader
        eyebrow={`${overview.systemStatus.label} · updated ${timeAgo(overview.lastUpdatedAt)}`}
        title={`${greet}, ${firstName}.`}
        description={pending > 0 ? `${pending} action${pending === 1 ? "" : "s"} need${pending === 1 ? "s" : ""} your review. Everything else is running inside policy.` : "See what Auterim understands, what is ready, and what happens next."}
        actions={headerActions}
      />

      {error && <section className="attn crit"><div className="card-pad" style={{ padding: "10px 14px", fontSize: 12.5 }}>{error}</div></section>}

      {attentionStates[0] && (
        <div className="sec" style={{ marginTop: 22 }}>
          <section className="attn" style={{ padding: "16px 18px" }}>
            <div className="inline" style={{ gap: 14, alignItems: "flex-start", flexWrap: "nowrap" }}>
              <span className="dot dot-amber" style={{ marginTop: 6 }} />
              <div className="grow" style={{ flex: 1, minWidth: 0 }}>
                <div className="t-object">{attentionStates[0].operatorName} · {attentionStates[0].label}</div>
                <div className="t-meta" style={{ marginTop: 4 }}>{attentionStates[0].requiredActions[0]?.reason ?? attentionStates[0].description}</div>
              </div>
              {attentionStates[0].nextAction && <Link className="btn btn-sm btn-amber" href={attentionStates[0].nextAction.href} style={{ flex: "none" }}>{attentionStates[0].nextAction.label}</Link>}
            </div>
          </section>
        </div>
      )}

      <div className="sec"><DashboardMetrics overview={overview} /></div>

      <div className="sec"><WorkforceActivity overview={overview} /></div>

      {showEligibilityBanner && (
        <div className="sec">
          <section className="attn" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div className="t-compact">
              <strong style={{ color: "var(--amber)" }}>{eligibility.status === "plan_required" ? "Plan required" : eligibility.status === "billing_attention" ? "Billing needs attention" : "Execution paused"}.</strong> {eligibility.reason} You can still connect systems and configure operators now.
            </div>
            <Link className="btn btn-primary btn-sm" href="/plans">{eligibility.status === "billing_attention" ? "Update billing" : "Choose a plan"}</Link>
          </section>
        </div>
      )}

      {attentionStates.length > 1 && (
        <div className="sec">
          <div className="card">
            <div className="card-head"><div className="t-section">Operator attention</div><span className="badge amber">{attentionStates.length} ACTIONABLE</span></div>
            <div className="rows">
              {attentionStates.slice(1).map((item) => (
                <div className="row" key={item.operatorKey}>
                  <span className="grow">
                    <span className="ttl">{item.operatorName} · {item.label}</span>
                    <span className="sub">{item.requiredActions[0]?.reason ?? item.description}</span>
                  </span>
                  {item.nextAction && <Link className="btn btn-ghost btn-sm" href={item.nextAction.href}>{item.nextAction.label}</Link>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="sec split">
        <div className="stack">
          <div className="card">
            <div className="card-head"><div className="t-section">Needs your review</div><Link className="btn btn-sm btn-ghost" href="/approvals">Open approvals</Link></div>
            <div className="card-pad" style={{ paddingTop: 16 }}>
              {!topApproval ? (
                <p className="t-meta" style={{ margin: 0 }}>Nothing needs your review.</p>
              ) : (
                <>
                  <div className="inline" style={{ gap: 11, marginBottom: 14 }}>
                    <OperatorAvatar operatorKey={(topApproval.operatorKey as ScanKey) ?? "revenue"} size={28} />
                    <span className="t-compact ink">{titleCase(topApproval.operatorKey)}</span>
                    <span className="badge amber">AWAITING APPROVAL</span>
                  </div>
                  <div className="t-object" style={{ fontSize: 16 }}>{topApproval.title}</div>
                  <dl className="kv" style={{ marginTop: 16 }}>
                    <dt>Waiting</dt><dd>{timeAgo(topApproval.createdAt)}</dd>
                    <dt>Risk</dt><dd>{titleCase(topApproval.riskLevel) || "Medium"}</dd>
                    <dt>Policy</dt><dd>{titleCase(topApproval.policyDecision) || "Approval required"}</dd>
                  </dl>
                  <div className="inline" style={{ marginTop: 18, gap: 9 }}>
                    <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void actOnApproval(topApproval.id, "approve")}>{busyApproval === topApproval.id ? "…" : "Approve and send"}</button>
                    <Link className="btn btn-secondary" href={topApproval.href}>Open</Link>
                    <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void actOnApproval(topApproval.id, "reject")}>{busyApproval === topApproval.id ? "…" : "Reject"}</button>
                  </div>
                </>
              )}
            </div>
            {moreApprovals.length > 0 && (
              <div className="rows">
                {moreApprovals.map((approval) => (
                  <div className="row link" key={approval.id}>
                    <span className="grow"><span className="ttl">{approval.title}</span><span className="sub">{titleCase(approval.operatorKey)} · updated {timeAgo(approval.createdAt)}</span></span>
                    <span className="rt"><span className="badge amber">WAITING</span><Link className="btn btn-sm btn-ghost" href={approval.href}>Open</Link></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><div className="t-section">{overview.operators.length === 1 ? "Your first operator" : "Workforce"}</div><Link className="btn btn-sm btn-ghost" href="/agents">Manage</Link></div>
            <div className="rows">
              {overview.operators.map((operator) => {
                const needsSetup = operator.status === "needs_setup";
                const productState = overview.operatorProductStates.find((item) => item.operatorKey === operator.key);
                return (
                  <div className="row" key={operator.key}>
                    <span className="op-id">
                      <OperatorAvatar operatorKey={operator.key} size={34} />
                      <span className="nm"><b>{operator.name}</b><span>{operator.pendingApprovals} pending · checked {timeAgo(operator.lastRunAt)}</span></span>
                    </span>
                    <span className="rt">
                      <StatusBadge state={productState?.state ?? operator.status}>{productState?.label ?? (needsSetup ? "Needs setup" : "Monitoring")}</StatusBadge>
                      <button type="button" className="btn btn-sm btn-ghost" disabled={busy || needsSetup} onClick={() => { if (!busy && !needsSetup) void runManualCheck(operator.key); }}>{busyScan === operator.key ? "…" : "Check"}</button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="t-section">Business context</div><Link className="btn btn-sm btn-ghost" href="/connectors">Connectors</Link></div>
            <div className="rows">
              {overview.connectors.map((connector) => {
                const meta = connectorMeta[connector.key] ?? { letter: connector.name.slice(0, 2), color: "#4DE8E1" };
                return (
                  <Link key={connector.key} href={connector.href} className="row link">
                    <span className="cn">
                      <span className="cn-mark" style={{ color: meta.color }}>{IntegrationLogos[connector.name] ?? meta.letter}</span>
                      <span className="nm"><b>{connector.name}</b><span>{connector.connected ? "Connected" : "Needs setup"}</span></span>
                    </span>
                    <span className="rt inline" style={{ gap: 7 }}>
                      <span className={`dot ${connector.connected ? "dot-green" : "dot-amber"}`} />
                      <span className="t-meta">{connector.connected ? (connector.lastCheckedAt ? timeAgo(connector.lastCheckedAt) : "connected") : "needs setup"}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="card-pad" style={{ padding: "12px 18px", borderTop: "1px solid var(--line)" }}>
              <span className="t-meta">{healthyConnectors}/{overview.connectors.length} healthy</span>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="t-section">Recent activity</div><Link className="btn btn-sm btn-ghost" href="/activity">All activity</Link></div>
            <div className="card-pad" style={{ padding: "14px 18px" }}>
              {overview.activity.length === 0 ? (
                <p className="t-meta" style={{ margin: 0 }}>No activity yet. Operator runs will appear here.</p>
              ) : (
                <div className="stack" style={{ gap: 13 }}>
                  {overview.activity.slice(0, 7).map((item) => {
                    const mark = operatorMark(item.operatorKey);
                    return (
                      <div className="inline" style={{ gap: 11, alignItems: "baseline", flexWrap: "nowrap" }} key={item.id}>
                        <span className="t-mono" style={{ fontSize: 11.5, color: "var(--text-faint)", flex: "none" }}>{clockTime(item.time)}</span>
                        <span className="t-compact" style={{ minWidth: 0 }}><b style={{ color: mark.color, fontWeight: 400 }}>{titleCase(item.operatorKey)}</b> {item.description || titleCase(item.title)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="t-section">Policy</div><Link className="btn btn-sm btn-ghost" href="/policies">Manage</Link></div>
            <div className="card-pad" style={{ padding: "14px 18px", display: "grid", gap: 8 }}>
              <div className="inline" style={{ gap: 7 }}>
                <span className="badge cyan">{mode.toUpperCase()}</span>
                {overview.policy.emergencyStopEnabled && <span className="badge red">EMERGENCY STOP ON</span>}
              </div>
              <div className="t-compact">{customerEmailLabel(overview.policy.customerEmailMode)}.</div>
              <div className="t-meta">Approval-first where risk matters. Rechecked before execution.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sec split">
        <WhatAuterimCanDo overview={overview} />
        <div className="stack">
          <ReadyToDeploy overview={overview} />
          <UnlockMore overview={overview} />
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
  const attentionStates = states.filter((item) => item.state === "needs_attention" || item.state === "active_limited");

  return (
    <div className="os-page dashboard-overview">
      <PageHeader eyebrow="Auterim workspace" title={`${greet}, ${firstName}.`} description="See what Auterim understands, what is ready, and what happens next." />

      {error && <section className="attn crit"><div className="card-pad" style={{ padding: "10px 14px", fontSize: 12.5 }}>{error}</div></section>}

      <div className="sec"><DashboardReadinessSummary overview={overview} /></div>
      <div className="sec"><DashboardMetrics overview={overview} /></div>
      <div className="sec"><WorkforceActivity overview={overview} /></div>

      {lifecycleState === "F" && attentionStates.length > 0 && (
        <div className="sec">
          <div className="card" aria-labelledby="dashboard-attention-title">
            <div className="card-head"><div className="t-section" id="dashboard-attention-title">Needs attention</div><span className="t-meta">Restore full coverage</span></div>
            <div className="rows">
              {attentionStates.map((item) => (
                <div className="row" key={item.operatorKey}>
                  <span className="grow">
                    <span className="ttl">{item.operatorName} · {item.label}</span>
                    <span className="sub">{item.requiredActions[0]?.reason ?? item.description}</span>
                  </span>
                  {item.nextAction && <Link className="btn btn-ghost btn-sm" href={item.nextAction.href}>{item.nextAction.label}</Link>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="sec split">
        <WhatAuterimCanDo overview={overview} />
        <div className="stack">
          <ReadyToDeploy overview={overview} />
          <UnlockMore overview={overview} />
        </div>
      </div>
    </div>
  );
}

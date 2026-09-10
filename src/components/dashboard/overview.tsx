"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { StatusBadge } from "@/components/operators/status-badge";
import { useOS } from "@/lib/os/app-provider";
import type { DashboardOverview, DashboardOperator } from "@/lib/dashboard/overview";
import { DashboardLoadingState } from "@/components/dashboard/loading-state";
import { MetricStrip, PageHeader } from "@/components/product-ui/page-primitives";
import { trialDaysRemaining } from "@/lib/os/plans";
import { ArrowIcon } from "@/components/dashboard/icons";
import type { WorkflowLoopStage } from "@/lib/workflows/stage";

type ScanKey = DashboardOperator["key"];
type OverviewResponse = DashboardOverview & { error?: string; message?: string };

const operatorMeta: Record<ScanKey, { mark: string; color: string; tag: string; avatar: string }> = {
  revenue: { mark: "RV", color: "#4DE8E1", tag: "Pipeline and renewals", avatar: "/operators/revenue-operator.png" },
  client_flow: { mark: "CF", color: "#5B8DEF", tag: "Onboarding and delivery", avatar: "/operators/client-flow-operator.png" },
  operations: { mark: "OP", color: "#51D88A", tag: "Delivery and project health", avatar: "/operators/operations-operator.png" },
  support: { mark: "SU", color: "#66D0E0", tag: "Customer support load", avatar: "/operators/support-operator.png" },
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
  const activeOperatorNames = overview.operatorProductStates
    .filter((operator) => operator.state === "active" || operator.state === "active_limited" || operator.state === "enhanced")
    .map((operator) => operator.operatorName);
  // The dashboard can intentionally focus its detail list on the workspace's
  // first operator. Never let that filtered list produce an impossible value
  // such as "2 of 1" when another operator is already active.
  const workforceTotal = Math.max(overview.operators.length, activeOperatorNames.length);

  const metrics = [
    {
      label: "Live workforce",
      value: <>{counts.active}<em>of {workforceTotal} operator{workforceTotal === 1 ? "" : "s"}</em></>,
      detail: activeOperatorNames.length ? activeOperatorNames.slice(0, 2).join(", ") : "None monitoring yet",
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
  // Y-axis: three real ticks (max / half / zero), rounded to whole units -
  // never a fabricated scale independent of the actual data.
  const yTicks = [{ y: 38, value: Math.ceil(max) }, { y: 95, value: Math.round(max / 2) }, { y: 152, value: 0 }];

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
        <div className="dashboard-telemetry-frame">
          <svg viewBox="0 0 720 190" role="img" aria-label={hasActivity ? `${summary.prepared} prepared actions, ${summary.executed} executed actions, and ${summary.held} actions held at approval across seven days.` : "No prepared, executed, or held workforce activity recorded yet"}>
            {yTicks.map((tick) => <line key={tick.y} x1="40" x2="680" y1={tick.y} y2={tick.y} />)}
            {hasActivity && yTicks.map((tick) => <text key={tick.y} className="dashboard-telemetry-axis" x="30" y={tick.y + 3} textAnchor="end">{tick.value}</text>)}
            {summary.daily.map((item, index) => { const x = 40 + index * (640 / Math.max(summary.daily.length - 1, 1)); return <text key={item.day} className="dashboard-telemetry-axis" x={x} y="178" textAnchor={index === 0 ? "start" : index === summary.daily.length - 1 ? "end" : "middle"}>{new Date(`${item.day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()}</text>; })}
            {hasActivity && <>
              <polygon points={`40,152 ${preparedPoints} 680,152`} fill="rgba(77,232,225,.10)" />
              <polyline points={preparedPoints} fill="none" stroke="#4DE8E1" strokeWidth="2" />
              <polyline points={executedPoints} fill="none" stroke="#51D88A" strokeWidth="1.8" />
              {summary.daily.map((item, index) => {
                if (item.held <= 0) return null;
                const x = 40 + index * (640 / Math.max(summary.daily.length - 1, 1));
                const y = 150 - (item.prepared / max) * 112;
                return <circle key={item.day} className="dashboard-telemetry-held" cx={x} cy={y} r="5"><title>{`${item.day}: ${item.held} held at approval`}</title></circle>;
              })}
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

const WORKFORCE_ORDER: ScanKey[] = ["revenue", "client_flow", "operations", "support"];

/**
 * "Workforce" card: every canonical operator, always - never filtered down
 * to only the selected onboarding priority or only the currently-active
 * ones (that narrower list lives in `overview.operators`). Status pills use
 * the same canonical STATE_LABEL vocabulary as /agents (product-state.ts) -
 * "Active", "Active · Limited context", "Ready to activate",
 * "Needs attention" - never re-derived here.
 */
function WorkforceCard({ overview }: { overview: DashboardOverview }) {
  const states = WORKFORCE_ORDER
    .map((key) => overview.operatorProductStates.find((item) => item.operatorKey === key))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  return (
    <div className="card" aria-labelledby="workforce-card-title">
      <div className="card-head"><div className="t-section" id="workforce-card-title">Workforce</div><Link className="btn btn-sm btn-ghost" href="/agents">Manage</Link></div>
      <div className="rows">
        {states.map((item) => {
          const key = item.operatorKey as ScanKey;
          return (
            <div className="row" key={item.operatorKey}>
              <span className="op-id">
                <OperatorAvatar operatorKey={key} size={34} />
                <span className="nm"><b>{item.operatorName}</b><span>{operatorMeta[key]?.tag ?? item.label}</span></span>
              </span>
              <span className="rt"><StatusBadge state={item.state}>{item.label}</StatusBadge></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function stageTone(stage: WorkflowLoopStage): "muted" | "amber" | "cyan" | "green" {
  if (stage === "Approve") return "amber";
  if (stage === "Execute") return "cyan";
  if (stage === "Measure") return "green";
  return "muted";
}

/** "Work in progress" card: real, active (non-terminal) workflow runs - see overview.workInProgress. */
function WorkInProgress({ overview }: { overview: DashboardOverview }) {
  const items = overview.workInProgress;
  return (
    <div className="card" aria-labelledby="work-in-progress-title">
      <div className="card-head"><div className="t-section" id="work-in-progress-title">Work in progress</div><Link className="btn btn-sm btn-ghost" href="/workflows">All workflows</Link></div>
      {items.length === 0 ? (
        <p className="t-meta card-pad" style={{ margin: 0 }}>No active workflows right now.</p>
      ) : (
        <div className="rows">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="row link">
              <span className="grow"><span className="ttl">{item.title}</span><span className="sub">{item.operatorName} · updated {timeAgo(item.updatedAt)}</span></span>
              <span className="rt inline" style={{ gap: 8 }}>
                <span className={`badge ${stageTone(item.stage)}`}>{item.stage.toUpperCase()}</span>
                <ArrowIcon size={14} style={{ color: "var(--text-faint)" }} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardReadinessSummary({ overview, trialEligible }: { overview: DashboardOverview; trialEligible?: boolean | null }) {
  const counts = dashboardCounts(overview);
  const states = overview.operatorProductStates;
  const firstReady = states.find((operator) => operator.state === "ready_to_activate");
  const firstAttention = states.find((operator) => operator.state === "needs_attention" || operator.state === "active_limited");
  const planBlocked = states.filter((operator) => operator.state === "plan_required" || operator.state === "billing_attention" || operator.state === "suspended").length;
  const lifecycle = overview.lifecycleState;
  // State A can mean two very different things: the workspace never started
  // a trial (Preview - real connectors/operators are genuinely locked), or a
  // trial/paid workspace simply hasn't connected anything yet. Preview must
  // never be told to "Connect systems" as if that were available now.
  const billingStatus = overview.workspace.billingStatus;
  const isPreview = !billingStatus || billingStatus === "preview";
  const isTrialing = billingStatus === "trialing";
  const trialEndsAt = overview.executionEligibility.trialEndsAt;
  const trialDaysLeft = trialDaysRemaining(trialEndsAt);
  const summary = lifecycle === "A"
    ? (isPreview
        ? (trialEligible
            ? { state: "preview", label: "Preview", message: "Preview is active. Start your 3-day trial to connect real systems and activate your workforce.", primary: "Start 3-day trial", href: "/plans" }
            : { state: "preview", label: "Preview", message: "Preview is active. This account's trial has already been used - choose a plan to connect real systems.", primary: "Choose a plan", href: "/plans" })
        : isTrialing
          ? { state: "trialing", label: trialDaysLeft !== null ? `Trial active - ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left` : "Trial active", message: "Your trial is active. Connect your first system to start monitoring.", primary: "Connect your first system", href: "/connectors" }
          : { state: "needs_setup", label: "Connect workspace", message: "Connect a system so Auterim can understand your workspace.", primary: "Connect systems", href: "/connectors" })
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
          <Link className="btn btn-ghost btn-sm" href={summary.href === "/connectors" ? "/agents" : "/connectors"}>{summary.href === "/connectors" ? "View operators" : summary.state === "preview" ? "View connectors" : "Manage connections"}</Link>
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
  const [busyApproval, setBusyApproval] = useState<string | null>(null);
  // Whether this workspace still has an unused trial available - decides
  // whether Preview copy offers "Start 3-day trial" or genuinely "Choose a
  // plan". Server-authoritative; null while unknown.
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);

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

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadOverview();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadOverview]);

  useEffect(() => {
    let active = true;
    fetch("/api/billing/trial-status", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => { if (active && typeof json?.eligible === "boolean") setTrialEligible(json.eligible); })
      .catch(() => { if (active) setTrialEligible(false); });
    return () => { active = false; };
  }, []);

  const actOnApproval = async (id: string, action: "approve" | "reject") => {
    if (busyApproval) return;
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
  const busy = busyApproval !== null;

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

        <div className="sec"><DashboardReadinessSummary overview={overview} trialEligible={trialEligible} /></div>
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
          <div className="card" aria-labelledby="needs-review-title">
            <div className="card-head"><div className="t-section" id="needs-review-title">Needs your review</div><Link className="btn btn-sm btn-ghost" href="/approvals">Open approvals</Link></div>
            <div className="card-pad" style={{ paddingTop: 16 }}>
              {!topApproval ? (
                <p className="t-meta" style={{ margin: 0 }}>Nothing needs your review.</p>
              ) : (
                <>
                  <div className="inline" style={{ gap: 11, marginBottom: 14 }}>
                    <OperatorAvatar operatorKey={(topApproval.operatorKey as ScanKey) ?? "revenue"} size={28} />
                    <span className="t-compact ink">{titleCase(topApproval.operatorKey)} Operator</span>
                    <span className="badge amber">AWAITING APPROVAL</span>
                  </div>
                  <div className="t-object" style={{ fontSize: 16 }}>{topApproval.title}</div>
                  <div className="grid4" style={{ marginTop: 16 }}>
                    <div><span className="t-meta">Why</span><p className="t-compact" style={{ margin: "4px 0 0" }}>{topApproval.why ?? "Detected from live connected-system activity."}</p></div>
                    <div><span className="t-meta">Evidence</span><p className="t-compact" style={{ margin: "4px 0 0" }}>{topApproval.evidence ?? "Full context is in Open approvals."}</p></div>
                    <div><span className="t-meta">Policy</span><p className="t-compact" style={{ margin: "4px 0 0" }}>{topApproval.policy}</p></div>
                    <div><span className="t-meta">Consequence</span><p className="t-compact" style={{ margin: "4px 0 0" }}>{topApproval.consequence ?? "Recorded in the run log after your decision."}</p></div>
                  </div>
                  <div className="inline" style={{ marginTop: 18, gap: 9 }}>
                    <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void actOnApproval(topApproval.id, "approve")}>{busyApproval === topApproval.id ? "…" : "Approve and send"}</button>
                    <Link className="btn btn-secondary" href={topApproval.href}>{topApproval.canEditDraft ? "Edit draft" : "Open"}</Link>
                    <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void actOnApproval(topApproval.id, "reject")}>{busyApproval === topApproval.id ? "…" : "Reject"}</button>
                  </div>
                </>
              )}
            </div>
          </div>

          <WorkInProgress overview={overview} />
        </div>

        <div className="stack">
          <WorkforceCard overview={overview} />
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

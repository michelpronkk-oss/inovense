"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/operators/status-badge";
import { useOS } from "@/lib/os/app-provider";
import { OPERATOR_REGISTRY } from "@/lib/operators/registry";
import { GLYPHS, OPERATORS, type Operator } from "@/data/operators";

type OperatorReadiness = {
  operatorKey: string;
  status: "ready" | "draft_only" | "missing_connector" | "upgrade_required" | "coming_next" | "preview";
  nextSetupStep: string;
  reason: string;
};

// Mirrors OperatorProductStateResult (src/lib/operators/product-state.ts) -
// the ONE shared server-computed state for the three real operators. This
// page never re-derives readiness/activation/connector-truth logic itself;
// it only renders whatever the shared API already decided.
type ProductState = {
  operatorKey: string;
  operatorName: string;
  state: "needs_setup" | "needs_attention" | "ready_to_activate" | "plan_required" | "billing_attention" | "suspended" | "paused" | "active" | "enhanced";
  label: string;
  description: string;
  connectedSystems: string[];
  availableNow: string[];
  nextAction: { label: string; href: string } | null;
  degraded: { unhealthyConnectors: string[]; lostCapabilities: string[]; stillAvailableCapabilities: string[] } | null;
};

const RUNNING_PRODUCT_STATES = new Set(["active", "enhanced", "paused"]);

type AgentStatus = "configured" | "available" | "upgrade" | "coming";

const HREF_BY_KEY: Record<string, string> = {
  revenue: "/agents/revenue",
  client_flow: "/agents/client-flow",
  operations: "/agents/operations",
};

const REAL_OPERATOR_VALUE: Record<string, { owns: string; value: string; enhancement: string }> = {
  revenue: {
    owns: "Inbound opportunities and sales follow-up",
    value: "Keeps qualified interest moving while every external action stays reviewable.",
    enhancement: "CRM context and approval-gated pipeline updates",
  },
  client_flow: {
    owns: "Client onboarding communication and momentum",
    value: "Surfaces stalled handoffs and prepares the next client touchpoint.",
    enhancement: "Project and team context for richer onboarding checks",
  },
  operations: {
    owns: "Internal task flow and delivery follow-through",
    value: "Finds work that needs attention and prepares controlled task updates.",
    enhancement: "Team alerts alongside task-board monitoring",
  },
};

const LOOP_STEPS = ["Detect", "Prepare", "Approve", "Execute", "Log"];

function Arrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="lock">
      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function AgAvatar({ color, glyph }: { color: string; glyph: string }) {
  return (
    <div className="ag-av" style={{ background: `linear-gradient(135deg, ${color}26, ${color}08)`, boxShadow: `inset 0 0 0 1px ${color}55`, color }}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="ag-person">
        <circle cx="12" cy="8.5" r="3.6" />
        <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5z" />
      </svg>
      <span className="ag-badge" style={{ color, boxShadow: `0 0 0 2px var(--bg), inset 0 0 0 1px ${color}55` }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: GLYPHS[glyph] ?? "" }} />
      </span>
    </div>
  );
}

type CardModel = {
  key: string;
  op: Operator;
  status: AgentStatus;
  href?: string;
  needsSetup: boolean;
  /** Real readiness reason (readiness.ts) - only set when the operator can actually run today. */
  readyReason?: string;
  /** Real shared product state (product-state.ts) - set only for the three real operators (revenue/client_flow/operations). When present, this is the single source of truth for this card's label/foot/connected-systems/next-action; readyReason/needsSetup above are not used. */
  productState?: ProductState;
  value?: { owns: string; value: string; enhancement: string };
};

function AgentCard({ model, onOpenDetails }: { model: CardModel; onOpenDetails: (model: CardModel) => void }) {
  const { op, status, href, needsSetup, readyReason, productState } = model;
  const dim = status === "upgrade" || status === "coming";
  const running = Boolean(productState && RUNNING_PRODUCT_STATES.has(productState.state));
  const statusLabel = productState
    ? productState.label
    : status === "configured" ? "Configured" : status === "available" ? (readyReason ? "Ready to activate" : "Available") : status === "upgrade" ? "Upgrade" : "Coming next";

  const attentionState = productState?.state === "needs_attention" || productState?.state === "plan_required" || productState?.state === "billing_attention" || productState?.state === "suspended";

  const foot = productState
    ? (attentionState
      ? <span className="ag-ready warn"><span className="rd" /> {productState.label}</span>
      : running
        ? <span className={`ag-ready ${productState.state === "paused" ? "warn" : "on"}`}><span className="rd" /> {productState.state === "paused" ? "Monitoring paused" : "Monitoring"}</span>
        : <span className="ag-ready"><span className="rd" /> {productState.label}</span>)
    : status === "configured"
    ? (needsSetup
      ? <span className="ag-ready warn"><span className="rd" /> Needs setup</span>
      : <span className="ag-ready on"><span className="rd" /> Monitoring</span>)
    : status === "available"
      ? (needsSetup
        ? <span className="ag-ready warn"><span className="rd" /> Connect a required tool first</span>
        : <span className="ag-ready"><span className="rd" /> Available to configure</span>)
    : status === "upgrade"
      ? <span className="ag-ready"><Lock /> Plan upgrade</span>
      : <span className="ag-ready"><Lock /> On the roadmap</span>;

  const openEl = productState?.nextAction
    ? <Link className="ag-open" href={productState.nextAction.href}>{productState.nextAction.label} <Arrow /></Link>
    : (status === "configured" || status === "available") && href
    ? <Link className="ag-open" href={href}>Open operator <Arrow /></Link>
    : <span className="ag-roadmap-state">{status === "upgrade" ? "Available with plan upgrade" : "Planned for a future release"}</span>;

  return (
    <div className={`ag-card ${dim ? "dim" : ""}`} style={{ "--c": op.color } as CSSProperties}>
      <div className="ag-card-top">
        <AgAvatar color={op.color} glyph={op.glyph} />
        <div className="ag-id">
          <h3 className="ag-name">{href ? <Link href={href}>{op.name}</Link> : op.name}</h3>
          <div className="ag-tag">{op.tag}</div>
        </div>
        <StatusBadge state={productState?.state ?? status}>{statusLabel}</StatusBadge>
      </div>

      <div className="ag-mission">{op.mission}</div>

      {!productState && status === "available" && readyReason && (
        <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: -6 }}>Because: {readyReason}</div>
      )}

      <div className="ag-foot">
        {foot}
        <div className="ag-card-actions">
          {productState && <button className="ag-details" type="button" onClick={() => onOpenDetails(model)}>Details <Arrow /></button>}
          {openEl}
        </div>
      </div>
    </div>
  );
}

function sentenceCase(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function OperatorDetails({ model, onClose }: { model: CardModel; onClose: () => void }) {
  const { op, productState, value, href } = model;
  if (!productState || !value) return null;
  const available = productState.availableNow;
  const next = productState.nextAction;
  return (
    <div className="os-modal-backdrop agent-details-backdrop" role="presentation" onClick={onClose}>
      <section className="os-modal agent-details-modal" style={{ "--c": op.color } as CSSProperties} role="dialog" aria-modal="true" aria-labelledby="operator-details-title" onClick={(event) => event.stopPropagation()}>
        <div className="agent-details-topline"><span>Operator briefing</span><button className="agent-details-close" type="button" onClick={onClose}>Close</button></div>
        <div className="agent-details-hero" style={{ "--c": op.color } as CSSProperties}>
          <AgAvatar color={op.color} glyph={op.glyph} />
          <div><span>{op.tag}</span><h2 id="operator-details-title">{op.name}</h2><p>{op.mission}</p></div>
          <StatusBadge state={productState.state}>{productState.label}</StatusBadge>
        </div>
        <div className="agent-details-value"><span>Business value</span><strong>{sentenceCase(value.value)}</strong></div>
        <div className="agent-details-grid">
          <div className="agent-details-area"><span>Owns</span><strong>{sentenceCase(value.owns)}</strong></div>
          <div className="agent-details-area"><span>Your systems</span><strong>{productState.connectedSystems.length ? productState.connectedSystems.map(sentenceCase).join(" · ") : "None connected yet"}</strong></div>
          <div className="agent-details-area agent-details-capabilities"><span>{available.length ? "Can do now" : "Needs next"}</span>{available.length ? <ul>{available.map((item) => <li key={item}>{sentenceCase(item)}</li>)}</ul> : <strong>{sentenceCase(next?.label ?? productState.description)}</strong>}</div>
          <div className="agent-details-area"><span>{productState.state === "enhanced" ? "Enhanced by" : "Enhance with"}</span><strong>{sentenceCase(value.enhancement)}</strong></div>
        </div>
        {productState.degraded && <div className="agent-details-alert">Unavailable while a connection needs attention: {productState.degraded.lostCapabilities.join(", ")}</div>}
        <div className="agent-details-actions">
          {next && <Link className="btn btn-primary btn-sm" href={next.href}>{next.label} <Arrow /></Link>}
          {href && next?.href !== href && <Link className="btn btn-ghost btn-sm" href={href}>Open operator</Link>}
        </div>
      </section>
    </div>
  );
}

export default function AgentsRegistryPage() {
  const { state } = useOS();
  const [readiness, setReadiness] = useState<OperatorReadiness[]>([]);
  const [productStates, setProductStates] = useState<ProductState[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expanding">("all");
  const [showAllExpanding, setShowAllExpanding] = useState(false);
  const [detailModel, setDetailModel] = useState<CardModel | null>(null);

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const loadReadiness = useCallback(async () => {
    if (!state.workspace.id) return;
    setError("");
    try {
      const [readinessRes, productStateRes] = await Promise.all([
        fetch(`/api/operators/readiness?${identityParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/product-state?${identityParams.toString()}`, { cache: "no-store" }),
      ]);
      const json = await readinessRes.json().catch(() => ({})) as { readiness?: OperatorReadiness[]; error?: string };
      if (!readinessRes.ok) throw new Error(json.error || "Could not load operator readiness.");
      setReadiness(Array.isArray(json.readiness) ? json.readiness : []);
      const productStateJson = await productStateRes.json().catch(() => ({})) as { states?: ProductState[]; error?: string };
      if (productStateRes.ok) setProductStates(Array.isArray(productStateJson.states) ? productStateJson.states : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load operator readiness.");
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => { void loadReadiness(); }, [loadReadiness]);

  useEffect(() => {
    if (!detailModel) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailModel(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailModel]);

  const readinessByKey = useMemo(() => new Map(readiness.map((item) => [item.operatorKey, item])), [readiness]);
  const productStateByKey = useMemo(() => new Map(productStates.map((item) => [item.operatorKey, item])), [productStates]);
  const configuredKeys = useMemo(() => new Set(state.agents.map((agent) => agent.templateId)), [state.agents]);

  // Each design roster entry maps 1:1 (same order) to the real operator registry.
  const cards: CardModel[] = useMemo(() => OPERATORS.map((op, i): CardModel => {
    const registry = OPERATOR_REGISTRY[i];
    const key = registry?.key ?? "";
    const openable = Boolean(HREF_BY_KEY[key]);
    const productState = productStateByKey.get(key);
    const status: AgentStatus = openable
      ? (productState ? (RUNNING_PRODUCT_STATES.has(productState.state) ? "configured" : "available") : (configuredKeys.has(key) ? "configured" : "available"))
      : registry?.currentReleaseStatus === "coming_next" ? "coming" : "upgrade";
    const r = readinessByKey.get(key);
    const needsSetup = openable && Boolean(r && (r.status === "missing_connector" || r.status === "upgrade_required"));
    const isReadyNow = status === "available" && Boolean(r && (r.status === "ready" || r.status === "draft_only"));
    return {
      key,
      op,
      status,
      href: HREF_BY_KEY[key],
      needsSetup,
      readyReason: isReadyNow ? r?.reason : undefined,
      productState,
      value: REAL_OPERATOR_VALUE[key],
    };
  }), [configuredKeys, productStateByKey, readinessByKey]);

  const current = cards.filter((c) => Boolean(HREF_BY_KEY[c.key]));
  const expanding = cards.filter((c) => c.status === "upgrade" || c.status === "coming");
  const showCurrent = filter !== "expanding";
  const showExpanding = filter !== "active";

  return (
    <div className="os-page agents-page">
      <div className="os-page-head">
        <div>
          <span className="ag-head-eyebrow">Your workforce</span>
          <h1 style={{ marginTop: 10 }}>Operators</h1>
          <div className="os-page-sub">Deploy focused AI operators that own a business loop, prepare work, and keep consequential actions under approval.</div>
        </div>
        <div className="os-page-actions">
          <Link href="/approvals" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Approval inbox</Link>
          <Link href="/connectors" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Connectors</Link>
        </div>
      </div>

      {error && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}

      <div className="ag-legend">
        <span className="ag-legend-label">Every operator<strong>runs one loop</strong></span>
        <span className="ag-loop-summary">One controlled loop · approval required</span>
        <div className="ag-legend-flow">
          {LOOP_STEPS.map((s, i) => (
            <Fragment key={s}>
              {i > 0 && <span className="ag-loop-arrow">&rarr;</span>}
              <span className={`ag-loop-pill ${s === "Approve" ? "gate" : ""}`}><span className="d" />{s}</span>
            </Fragment>
          ))}
        </div>
        <div className="ag-filter" style={{ marginLeft: "auto" }}>
          {([["all", "All 15"], ["active", "Current 3"], ["expanding", "Future 12"]] as const).map(([k, label]) => (
            <button key={k} className={filter === k ? "on" : ""} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      </div>

      {showCurrent && current.length > 0 && (
        <section>
          <div className="ag-sec-head">
            <h2>Your available workforce</h2>
            <span className="count"><span className="desktop-only">Three real operators, each with a focused operating loop.</span><span className="mobile-only">3 real operators</span></span>
            <span className="rule" />
          </div>
          <div className="ag-grid">
            {current.map((model) => <AgentCard key={model.op.name} model={model} onOpenDetails={setDetailModel} />)}
          </div>
        </section>
      )}

      {showExpanding && (
        <section>
          <div className="ag-sec-head">
            <h2>Expand your workforce</h2>
            <span className="count">Future roles are shown separately from the operators available today.</span>
            <span className="rule" />
          </div>
          <div className="ag-grid">
            {(showAllExpanding ? expanding : expanding.slice(0, 6)).map((model) => <AgentCard key={model.op.name} model={model} onOpenDetails={setDetailModel} />)}
          </div>
          {expanding.length > 6 && <button className="appr-btn edit" onClick={() => setShowAllExpanding((value) => !value)} style={{ marginTop: 10 }}>{showAllExpanding ? "Show less" : `Show ${expanding.length - 6} more`}</button>}
        </section>
      )}
      {detailModel && <OperatorDetails model={detailModel} onClose={() => setDetailModel(null)} />}
    </div>
  );
}

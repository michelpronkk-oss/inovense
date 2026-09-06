"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { OPERATOR_REGISTRY } from "@/lib/operators/registry";
import { GLYPHS, OPERATORS, type Operator } from "@/data/operators";

type OperatorReadiness = {
  operatorKey: string;
  status: "ready" | "draft_only" | "missing_connector" | "upgrade_required" | "coming_next" | "preview";
  nextSetupStep: string;
  reason: string;
};

type AgentStatus = "configured" | "available" | "upgrade" | "coming";

const HREF_BY_KEY: Record<string, string> = {
  revenue: "/agents/revenue",
  client_flow: "/agents/client-flow",
  operations: "/agents/operations",
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
  op: Operator;
  status: AgentStatus;
  href?: string;
  needsSetup: boolean;
  currentTask?: string;
  connectedTools?: string[];
  outcome?: string;
};

function AgentCard({ model }: { model: CardModel }) {
  const { op, status, href, needsSetup, currentTask, connectedTools, outcome } = model;
  const dim = status === "upgrade" || status === "coming";
  const statusLabel = status === "configured" ? "Configured" : status === "available" ? "Available" : status === "upgrade" ? "Upgrade" : "Coming next";

  const foot = status === "configured"
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

  const openEl = (status === "configured" || status === "available") && href
    ? <Link className="ag-open" href={href}>Open operator <Arrow /></Link>
    : <span className="ag-open muted">View details <Arrow /></span>;

  return (
    <div className={`ag-card ${dim ? "dim" : ""}`} style={{ "--c": op.color } as CSSProperties}>
      <div className="ag-card-top">
        <AgAvatar color={op.color} glyph={op.glyph} />
        <div className="ag-id">
          <div className="ag-name">{op.name}</div>
          <div className="ag-tag">{op.tag}</div>
        </div>
        <span className={`ag-status ${status}`}>{statusLabel}</span>
      </div>

      <div className="ag-mission">{op.mission}</div>

      {status === "configured" && (
        <div className="ag-operating-context">
          <div><span>Now</span><strong>{currentTask || "Monitoring workspace signals"}</strong></div>
          <div><span>Connected systems</span><strong>{connectedTools?.length ? connectedTools.join(" · ") : "No tools connected"}</strong></div>
          {outcome && <div><span>Outcome</span><strong>{outcome}</strong></div>}
        </div>
      )}

      <div className="ag-foot">
        {foot}
        {openEl}
      </div>
    </div>
  );
}

export default function AgentsRegistryPage() {
  const { state } = useOS();
  const [readiness, setReadiness] = useState<OperatorReadiness[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expanding">("all");
  const [showAllExpanding, setShowAllExpanding] = useState(false);

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const loadReadiness = useCallback(async () => {
    if (!state.workspace.id) return;
    setError("");
    try {
      const res = await fetch(`/api/operators/readiness?${identityParams.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { readiness?: OperatorReadiness[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Could not load operator readiness.");
      setReadiness(Array.isArray(json.readiness) ? json.readiness : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load operator readiness.");
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => { void loadReadiness(); }, [loadReadiness]);

  const readinessByKey = useMemo(() => new Map(readiness.map((item) => [item.operatorKey, item])), [readiness]);
  const configuredKeys = useMemo(() => new Set(state.agents.map((agent) => agent.templateId)), [state.agents]);

  // Each design roster entry maps 1:1 (same order) to the real operator registry.
  const cards: CardModel[] = useMemo(() => OPERATORS.map((op, i): CardModel => {
    const registry = OPERATOR_REGISTRY[i];
    const key = registry?.key ?? "";
    const openable = Boolean(HREF_BY_KEY[key]);
    const status: AgentStatus = openable
      ? (configuredKeys.has(key) ? "configured" : "available")
      : registry?.currentReleaseStatus === "coming_next" ? "coming" : "upgrade";
    const r = readinessByKey.get(key);
    const configuredAgent = state.agents.find((agent) => agent.templateId === key);
    const needsSetup = openable && Boolean(r && (r.status === "missing_connector" || r.status === "upgrade_required"));
    return {
      op,
      status,
      href: HREF_BY_KEY[key],
      needsSetup,
      currentTask: configuredAgent?.currentTask,
      connectedTools: configuredAgent?.config.tools,
      outcome: configuredAgent ? `${configuredAgent.stats.metricValue} ${configuredAgent.stats.metricLabel}` : undefined,
    };
  }), [configuredKeys, readinessByKey, state.agents]);

  const configured = cards.filter((c) => c.status === "configured");
  const available = cards.filter((c) => c.status === "available");
  const expanding = cards.filter((c) => c.status === "upgrade" || c.status === "coming");
  const showConfigured = filter !== "expanding";
  const showAvailable = filter === "all";
  const showExpanding = filter !== "active";

  return (
    <div className="os-page agents-page">
      <div className="os-page-head">
        <div>
          <span className="ag-head-eyebrow">Operator registry</span>
          <h1 style={{ marginTop: 10 }}>Operators</h1>
          <div className="os-page-sub">Manage the operators that run your work.</div>
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
          {([["all", "All 15"], ["active", "Configured"], ["expanding", "Expanding"]] as const).map(([k, label]) => (
            <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      </div>

      {showConfigured && configured.length > 0 && (
        <section>
          <div className="ag-sec-head">
            <h2>Active operators</h2>
            <span className="count"><span className="desktop-only">{configured.length} operator{configured.length === 1 ? "" : "s"} selected for this workspace</span><span className="mobile-only">{configured.length} configured</span></span>
            <span className="rule" />
          </div>
          <div className="ag-grid">
            {configured.map((model) => <AgentCard key={model.op.name} model={model} />)}
          </div>
        </section>
      )}

      {showAvailable && available.length > 0 && (
        <section>
          <div className="ag-sec-head">
            <h2>Available operators</h2>
            <span className="count">Add when you need them.</span>
            <span className="rule" />
          </div>
          <div className="ag-grid">
            {available.map((model) => <AgentCard key={model.op.name} model={model} />)}
          </div>
        </section>
      )}

      {showExpanding && (
        <section>
          <div className="ag-sec-head">
            <h2>More operators</h2>
            <span className="count">Upgrade or coming later.</span>
            <span className="rule" />
          </div>
          <div className="ag-grid">
            {(showAllExpanding ? expanding : expanding.slice(0, 6)).map((model) => <AgentCard key={model.op.name} model={model} />)}
          </div>
          {expanding.length > 6 && <button className="appr-btn edit" onClick={() => setShowAllExpanding((value) => !value)} style={{ marginTop: 10 }}>{showAllExpanding ? "Show less" : `Show ${expanding.length - 6} more`}</button>}
        </section>
      )}
    </div>
  );
}

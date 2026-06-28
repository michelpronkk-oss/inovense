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

type AgentStatus = "available" | "upgrade" | "coming";

const HREF_BY_KEY: Record<string, string> = {
  revenue: "/app/agents/revenue",
  client_flow: "/app/agents/client-flow",
  operations: "/app/agents/operations",
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
};

function AgentCard({ model }: { model: CardModel }) {
  const { op, status, href, needsSetup } = model;
  const dim = status !== "available";
  const statusLabel = status === "available" ? "Available" : status === "upgrade" ? "Upgrade" : "Coming next";

  const foot = status === "available"
    ? (needsSetup
      ? <span className="ag-ready warn"><span className="rd" /> Needs setup</span>
      : <span className="ag-ready on"><span className="rd" /> Ready</span>)
    : status === "upgrade"
      ? <span className="ag-ready"><Lock /> Plan upgrade</span>
      : <span className="ag-ready"><Lock /> On the roadmap</span>;

  const openEl = status === "available" && href
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

      <div className="ag-loop">
        {op.loop.map((step, i) => (
          <Fragment key={step.k}>
            {i > 0 && <span className="ag-step-sep">/</span>}
            <span className={`ag-step ${step.k === "Approve" ? "gate" : ""}`}><span className="sd" />{step.k}</span>
          </Fragment>
        ))}
      </div>

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

  // Each design roster entry maps 1:1 (same order) to the real operator registry.
  const cards: CardModel[] = useMemo(() => OPERATORS.map((op, i): CardModel => {
    const registry = OPERATOR_REGISTRY[i];
    const key = registry?.key ?? "";
    const openable = Boolean(HREF_BY_KEY[key]);
    const status: AgentStatus = openable
      ? "available"
      : registry?.currentReleaseStatus === "coming_next" ? "coming" : "upgrade";
    const r = readinessByKey.get(key);
    const needsSetup = openable && Boolean(r && (r.status === "missing_connector" || r.status === "upgrade_required"));
    return { op, status, href: HREF_BY_KEY[key], needsSetup };
  }), [readinessByKey]);

  const active = cards.filter((c) => c.status === "available");
  const expanding = cards.filter((c) => c.status !== "available");
  const showActive = filter !== "expanding";
  const showExpanding = filter !== "active";

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="ag-head-eyebrow">Operator registry</span>
          <h1 style={{ marginTop: 10 }}>Agents</h1>
          <div className="os-page-sub">Your operating layer. Fifteen operators, one disciplined loop.</div>
        </div>
        <div className="os-page-actions">
          <Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Approval inbox</Link>
          <Link href="/app/connectors" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Connectors</Link>
        </div>
      </div>

      {error && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}

      <div className="ag-legend">
        <span className="ag-legend-label">Every operator<strong>runs one loop</strong></span>
        <div className="ag-legend-flow">
          {LOOP_STEPS.map((s, i) => (
            <Fragment key={s}>
              {i > 0 && <span className="ag-loop-arrow">&rarr;</span>}
              <span className={`ag-loop-pill ${s === "Approve" ? "gate" : ""}`}><span className="d" />{s}</span>
            </Fragment>
          ))}
        </div>
        <div className="ag-filter" style={{ marginLeft: "auto" }}>
          {([["all", "All 15"], ["active", "Active"], ["expanding", "Expanding"]] as const).map(([k, label]) => (
            <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      </div>

      {showActive && (
        <section>
          <div className="ag-sec-head">
            <h2>Active</h2>
            <span className="count">{active.length} operators ready in production</span>
            <span className="rule" />
          </div>
          <div className="ag-grid">
            {active.map((model) => <AgentCard key={model.op.name} model={model} />)}
          </div>
        </section>
      )}

      {showExpanding && (
        <section>
          <div className="ag-sec-head">
            <h2>Expanding roster</h2>
            <span className="count">{expanding.length} operators · upgrade or roadmap</span>
            <span className="rule" />
          </div>
          <div className="ag-grid">
            {expanding.map((model) => <AgentCard key={model.op.name} model={model} />)}
          </div>
        </section>
      )}
    </div>
  );
}

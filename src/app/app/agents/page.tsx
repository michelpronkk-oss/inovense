"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { StatusBadge } from "@/components/operators/status-badge";
import { useOS } from "@/lib/os/app-provider";
import { OPERATOR_REGISTRY, isLiveOperator, type OperatorKey } from "@/lib/operators/registry";
import { REAL_OPERATOR_KEYS } from "@/lib/operators/product-state";
import { operatorAvatarPath } from "@/lib/operator-assets";
import { getOperatorCapabilityCopy } from "@/lib/operators/capability-presentation";
import { getLiveOperatorCardPresentation, ROADMAP_OPERATOR_PRESENTATION } from "@/lib/operators/index-card-presentation";
import { GLYPHS, OPERATORS, type Operator } from "@/data/operators";
import { PageHeader } from "@/components/product-ui/page-primitives";

// Mirrors OperatorProductStateResult (src/lib/operators/product-state.ts) -
// the ONE shared server-computed state for the four live operators. This
// page never re-derives readiness/activation/connector-truth logic itself;
// it only renders whatever the shared API already decided.
type ProductState = {
  operatorKey: string;
  operatorName: string;
  state: "needs_setup" | "needs_attention" | "ready_to_activate" | "plan_required" | "billing_attention" | "suspended" | "paused" | "active" | "active_limited" | "enhanced";
  label: string;
  description: string;
  connectedSystems: string[];
  availableNow: string[];
  nextAction: { label: string; href: string } | null;
  requiredActions: { label: string; href: string; reason: string }[];
  degraded: { unhealthyConnectors: string[]; lostCapabilities: string[]; stillAvailableCapabilities: string[] } | null;
};

const HREF_BY_KEY: Record<string, string> = {
  revenue: "/agents/revenue",
  client_flow: "/agents/client-flow",
  operations: "/agents/operations",
  support: "/agents/support",
};

const ACTIVE_STATES = new Set(["active", "active_limited", "enhanced"]);

function Arrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/**
 * Live operators wear their canonical portrait; roadmap roles keep the
 * abstract silhouette. That difference is deliberate product truth -- a
 * shipped operator looks like a real member of the workforce, an unbuilt one
 * visibly does not, so the index never implies more staff than exists.
 */
function AgAvatar({ color, glyph, operatorKey }: { color: string; glyph: string; operatorKey?: string }) {
  const avatar = operatorKey && isLiveOperator(operatorKey) ? operatorAvatarPath(operatorKey) : null;
  return (
    <div className={`ag-av${avatar ? " has-portrait" : ""}`} style={{ background: `${color}12`, boxShadow: `inset 0 0 0 1px ${color}55`, color }}>
      {avatar ? (
        <Image src={avatar} alt="" width={72} height={72} className="ag-portrait" aria-hidden />
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="ag-person">
          <circle cx="12" cy="8.5" r="3.6" />
          <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5z" />
        </svg>
      )}
      {!avatar && (
        <span className="ag-badge" style={{ color, boxShadow: `0 0 0 2px var(--bg), inset 0 0 0 1px ${color}55` }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: GLYPHS[glyph] ?? "" }} />
        </span>
      )}
    </div>
  );
}

type PrimaryAction = { label: string; href: string; kind: "open" | "activate" | "fix" };

function primaryAction(productState: ProductState | undefined, operatorHref: string): PrimaryAction {
  if (!productState) return { label: "Fix capability", href: operatorHref, kind: "fix" };
  switch (productState.state) {
    case "active":
    case "enhanced":
    case "active_limited":
      return { label: "Open runtime", href: operatorHref, kind: "open" };
    case "ready_to_activate":
      return { label: "Activate operator", href: operatorHref, kind: "activate" };
    case "paused":
      return { label: "Resume operator", href: operatorHref, kind: "activate" };
    default:
      return { label: "Fix capability", href: productState.nextAction?.href ?? operatorHref, kind: "fix" };
  }
}

function footerStatusText(productState: ProductState | undefined, operatorKey: string): string {
  if (!productState) return "Loading real state…";
  switch (productState.state) {
    case "active":
    case "enhanced":
    case "active_limited":
      return getLiveOperatorCardPresentation(operatorKey)?.cadence ?? productState.label;
    case "ready_to_activate":
      return "Ready to activate";
    case "paused":
      return "Monitoring paused";
    case "needs_attention":
      return productState.requiredActions[0]?.reason ?? productState.description;
    default:
      return productState.description;
  }
}

function footerTone(state: ProductState["state"] | undefined): "on" | "warn" | "" {
  if (!state) return "";
  if (ACTIVE_STATES.has(state)) return "on";
  if (state === "needs_attention" || state === "plan_required" || state === "billing_attention" || state === "suspended" || state === "paused") return "warn";
  return "";
}

function LiveOperatorCard({ opKey, op, productState }: { opKey: OperatorKey; op: Operator; productState: ProductState | undefined }) {
  const href = HREF_BY_KEY[opKey] ?? "/agents";
  const presentation = getLiveOperatorCardPresentation(opKey);
  const capabilityCopy = getOperatorCapabilityCopy(opKey);
  const action = primaryAction(productState, href);
  const stateKey = productState?.state ?? "needs_setup";
  const statusLabel = productState?.label ?? "Available to unlock";

  return (
    <div className="ag-card" style={{ "--c": op.color } as CSSProperties}>
      <div className="ag-card-top">
        <AgAvatar color={op.color} glyph={op.glyph} operatorKey={opKey} />
        <div className="ag-id">
          <h3 className="ag-name"><Link href={href}>{op.name}</Link></h3>
          <div className="ag-tag">{presentation?.descriptor ?? op.tag}</div>
        </div>
        <StatusBadge state={stateKey}>{statusLabel}</StatusBadge>
      </div>

      {presentation && <p className="ag-mission">{presentation.mission}</p>}

      <dl className="ag-operating-context">
        {capabilityCopy.required[0] && <div><dt>Core capability</dt><dd>{capabilityCopy.required[0]}</dd></div>}
        {presentation && <div><dt>Provided by</dt><dd>{presentation.providedBy}</dd></div>}
        {presentation && <div><dt>Optional context</dt><dd>{presentation.optionalContext}</dd></div>}
        {presentation && <div><dt>Control</dt><dd>{presentation.control}</dd></div>}
      </dl>

      <div className="ag-foot">
        <span className={`ag-ready ${footerTone(productState?.state)}`}><span className="rd" /> {footerStatusText(productState, opKey)}</span>
        <div className="ag-card-actions">
          {action.kind === "open" ? (
            <Link className="ag-open" href={action.href}>{action.label} <Arrow /></Link>
          ) : action.kind === "activate" ? (
            <Link className="btn btn-primary btn-sm" href={action.href}>{action.label}</Link>
          ) : (
            <Link className="btn btn-ghost btn-sm" href={action.href}>{action.label}</Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentsRegistryPage() {
  const { state } = useOS();
  const [productStates, setProductStates] = useState<ProductState[]>([]);
  const [error, setError] = useState("");

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const loadProductState = useCallback(async () => {
    if (!state.workspace.id) return;
    setError("");
    try {
      const res = await fetch(`/api/operators/product-state?${identityParams.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { states?: ProductState[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Could not load operator state.");
      setProductStates(Array.isArray(json.states) ? json.states : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load operator state.");
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => {
    const kickoff = window.setTimeout(() => { void loadProductState(); }, 0);
    return () => window.clearTimeout(kickoff);
  }, [loadProductState]);

  const productStateByKey = useMemo(() => new Map(productStates.map((item) => [item.operatorKey, item])), [productStates]);

  const liveCards = useMemo(() => REAL_OPERATOR_KEYS.map((key) => {
    const definition = OPERATOR_REGISTRY.find((entry) => entry.key === key);
    const op = definition ? OPERATORS.find((entry) => entry.name === definition.name) : null;
    if (!op) return null;
    return { key, op, productState: productStateByKey.get(key) };
  }).filter((entry): entry is { key: OperatorKey; op: Operator; productState: ProductState | undefined } => Boolean(entry)), [productStateByKey]);

  const activeCount = useMemo(() => liveCards.filter((card) => card.productState && ACTIVE_STATES.has(card.productState.state)).length, [liveCards]);

  return (
    <div className="os-page agents-page">
      <PageHeader
        title="Operators"
        description="Specialized workforce roles. Each one runs the same loop and answers to the same policies."
        actions={
          <nav className="seg" aria-label="Operator sections">
            <a href="#live-workforce">Live workforce</a>
            <a className="on" aria-current="location" href="#operator-roadmap">Roadmap</a>
          </nav>
        }
      />

      {error && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}

      <section id="live-workforce" aria-labelledby="live-workforce-heading">
          <div className="ag-live-heading">
            <span id="live-workforce-heading" className="t-eyebrow">Live workforce</span>
            <span className="t-meta">{liveCards.length} operators · {activeCount} active</span>
          </div>
          <div className="ag-grid ag-grid-live">
            {liveCards.map((card) => <LiveOperatorCard key={card.key} opKey={card.key} op={card.op} productState={card.productState} />)}
          </div>
      </section>

      <section id="operator-roadmap" aria-labelledby="operator-roadmap-heading">
          <div className="ag-sec-head">
            <h2 id="operator-roadmap-heading">On the roadmap</h2>
            <span className="count">Not available yet</span>
            <span className="rule" />
          </div>
          <div className="ag-roadmap-list">
            {ROADMAP_OPERATOR_PRESENTATION.map((item) => (
              <div className="ag-roadmap-row" key={item.name}>
                <span className="ag-roadmap-icon">
                  <Image src={operatorAvatarPath(item.avatarKey)} alt="" width={80} height={80} aria-hidden />
                </span>
                <div className="ag-roadmap-info">
                  <span className="ag-roadmap-name">{item.name}</span>
                  <span className="ag-roadmap-descriptor">{item.descriptor}</span>
                </div>
                <StatusBadge state="needs_setup">In design</StatusBadge>
              </div>
            ))}
          </div>
          <p className="ag-roadmap-footnote">Roadmap operators are not deployable and do not consume plan seats.</p>
      </section>
    </div>
  );
}

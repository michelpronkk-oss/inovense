"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
};

/** Shared hierarchy for authenticated product pages. */
export function PageHeader({ eyebrow, title, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="page-head product-page-header">
      <div>
        {eyebrow && <span className="t-eyebrow" style={{ display: "block", marginBottom: 8 }}>{eyebrow}</span>}
        <h1 className="t-title">{title}</h1>
        <p className="t-sub">{description}</p>
        {meta && <div className="product-page-header-meta">{meta}</div>}
      </div>
      {actions && <div className="acts product-page-actions">{actions}</div>}
    </header>
  );
}

export function FreshnessIndicator({
  updatedAt,
  realtimeStatus,
}: {
  updatedAt?: string | null;
  realtimeStatus?: "connecting" | "connected" | "reconnecting" | "disconnected" | "stale";
}) {
  const liveLabel = realtimeStatus === "connected"
    ? "Live updates connected"
    : realtimeStatus === "connecting"
      ? "Live updates connecting"
      : realtimeStatus === "reconnecting"
        ? "Live updates reconnecting"
      : "Live updates unavailable · refreshes on focus";
  return (
    <span className="freshness-indicator" data-state={realtimeStatus ?? "unknown"}>
      <span className="dot" aria-hidden="true" />
      <span>{updatedAt ? "Persisted workspace data" : "No persisted activity yet"}</span>
      <span aria-hidden="true">·</span>
      <span>{liveLabel}</span>
      {updatedAt && <time className="sr-only" dateTime={updatedAt}>Data timestamp {updatedAt}</time>}
    </span>
  );
}

export function SectionHeader({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="sec-head product-section-header">
      <div>
        <h3 className="t-section">{title}</h3>
        {detail && <p className="t-meta" style={{ margin: "3px 0 0" }}>{detail}</p>}
      </div>
      {action && <div className="r">{action}</div>}
    </div>
  );
}

export function AttentionPanel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="attn" role="status" style={{ padding: "16px 18px" }}>
      <div className="inline product-attention-content" style={{ gap: 14, alignItems: "flex-start", flexWrap: "nowrap" }}>
        <span className="dot amber" style={{ marginTop: 6 }} />
        <div className="grow" style={{ flex: 1, minWidth: 0 }}>
          <div className="t-object">{title}</div>
          <p className="t-meta" style={{ margin: "4px 0 0" }}>{children}</p>
        </div>
        {action && <div className="inline product-attention-action" style={{ flex: "none" }}>{action}</div>}
      </div>
    </section>
  );
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="empty">
      <h4>{title}</h4>
      <p>{children}</p>
      {action && <div className="acts">{action}</div>}
    </section>
  );
}

export function CapabilityList({ items }: { items: string[] }) {
  return (
    <ul className="os-capability-list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

/** Data-only metric rail. Callers keep ownership of aggregation and labels. */
export function MetricStrip({ items, className = "" }: { items: Array<{ id?: string; label: ReactNode; value: ReactNode; detail: ReactNode; tone?: "default" | "attention" }>; className?: string }) {
  return (
    <div className={`metrics os-metric-strip ${className}`.trim()}>
      {items.map((item, index) => (
        <div className={`metric os-metric-strip-item${item.tone === "attention" ? " attn-v" : ""}`} data-tone={item.tone ?? "default"} key={item.id ?? index}>
          <span className="k">{item.label}</span>
          <div className="v"><strong className="metric-value-content">{item.value}</strong></div>
          <div className="n">{item.detail}</div>
        </div>
      ))}
    </div>
  );
}

/** A presentational rendering of the fixed Auterim operating loop. */
export function LoopRail({ stages, current, className = "" }: { stages: ReadonlyArray<{ label: string; detail?: string }>; current?: string; className?: string }) {
  const activeIndex = current ? stages.findIndex((stage) => stage.label === current) : -1;
  return (
    <div className={`loop os-loop-rail ${className}`.trim()}>
      {stages.map((stage, index) => {
        const state = activeIndex < 0 ? "next" : index < activeIndex ? "done" : index === activeIndex ? "now" : "next";
        return (
          <Fragment key={stage.label}>
            <span className={`st ${state}`} title={stage.detail}>
              <i />
              <span>{stage.label}</span>
            </span>
            {index < stages.length - 1 && <span className="ln" />}
          </Fragment>
        );
      })}
    </div>
  );
}

/** Compact definition-list pattern for capability-first product surfaces. */
export function CapabilityDefinitionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return <dl className="kv os-capability-definition-list">{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}

export type CapabilityGroup = {
  key: string;
  label: string;
  description?: string;
  items: string[];
};

/**
 * Grouped, progressively-disclosed capability overview. Replaces a flat
 * "wall of pills" with named groups (e.g. Observe / Prepare / Act) that each
 * show a count and a short preview by default, and expand in place to list
 * every capability in that group. The total is stated once by the caller
 * (typically in the section header), not repeated per group.
 */
export function CapabilityGroups({ groups, previewCount = 3 }: { groups: CapabilityGroup[]; previewCount?: number }) {
  return (
    <div className="os-capability-groups">
      {groups.map((group) => <CapabilityGroupRow key={group.key} group={group} previewCount={previewCount} />)}
    </div>
  );
}

function CapabilityGroupRow({ group, previewCount }: { group: CapabilityGroup; previewCount: number }) {
  const [open, setOpen] = useState(false);
  const hasMore = group.items.length > previewCount;
  const preview = group.items.slice(0, previewCount);
  return (
    <CollapsiblePrimitive.Root open={open} onOpenChange={setOpen} className="os-capability-group" data-open={open || undefined}>
      <div className="os-capability-group-head">
        <div className="os-capability-group-heading">
          <span className="os-capability-group-label">{group.label}</span>
          {group.description && <span className="os-capability-group-description">{group.description}</span>}
        </div>
        <span className="os-capability-group-count">{group.items.length}</span>
      </div>
      {!open && (
        <p className="os-capability-group-preview">
          {preview.join(" · ")}
          {hasMore ? ` +${group.items.length - preview.length} more` : ""}
        </p>
      )}
      <CollapsiblePrimitive.Content className="os-capability-group-content">
        <ul className="os-capability-group-list">
          {group.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </CollapsiblePrimitive.Content>
      {(hasMore || open) && (
        <CollapsiblePrimitive.Trigger className="os-capability-group-toggle" aria-label={`${open ? "Collapse" : "Expand"} ${group.label} capabilities`}>
          {open ? "Show less" : "View all"}
        </CollapsiblePrimitive.Trigger>
      )}
    </CollapsiblePrimitive.Root>
  );
}

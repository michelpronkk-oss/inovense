import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

/** Shared hierarchy for authenticated product pages. */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="os-page-head product-page-header">
      <div>
        {eyebrow && <span className="os-greet">{eyebrow}</span>}
        <h1>{title}</h1>
        <p className="os-page-sub">{description}</p>
      </div>
      {actions && <div className="os-page-actions">{actions}</div>}
    </header>
  );
}

export function SectionHeader({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="p-head product-section-header">
      <div>
        <h3>{title}</h3>
        {detail && <p className="p-meta">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export function AttentionPanel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="os-attention" role="status">
      <div><strong>{title}</strong><p>{children}</p></div>
      {action && <div className="os-attention-action">{action}</div>}
    </section>
  );
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="os-empty-state">
      <strong>{title}</strong>
      <p>{children}</p>
      {action && <div>{action}</div>}
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
    <div className={`os-metric-strip ${className}`.trim()}>
      {items.map((item, index) => (
        <div className="os-metric-strip-item" data-tone={item.tone ?? "default"} key={item.id ?? index}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.detail}</small>
        </div>
      ))}
    </div>
  );
}

/** A presentational rendering of the fixed Auterim operating loop. */
export function LoopRail({ stages, current, className = "" }: { stages: ReadonlyArray<{ label: string; detail?: string }>; current?: string; className?: string }) {
  const activeIndex = current ? stages.findIndex((stage) => stage.label === current) : -1;
  return (
    <ol className={`os-loop-rail ${className}`.trim()}>
      {stages.map((stage, index) => {
        const state = activeIndex < 0 ? "next" : index < activeIndex ? "done" : index === activeIndex ? "current" : "next";
        return <li data-state={state} key={stage.label}><span aria-hidden="true" /><strong>{stage.label}</strong>{stage.detail && <small>{stage.detail}</small>}</li>;
      })}
    </ol>
  );
}

/** Compact definition-list pattern for capability-first product surfaces. */
export function CapabilityDefinitionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return <dl className="os-capability-definition-list">{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}

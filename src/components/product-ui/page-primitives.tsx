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

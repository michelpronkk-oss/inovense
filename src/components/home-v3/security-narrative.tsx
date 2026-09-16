import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./icons";

type IconName = "key" | "database" | "lock" | "shield" | "check2" | "bolt" | "doc" | "layers" | "user" | "cpu";

/* ---------- Principles: a quiet editorial rail, not four equal cards ---------- */

type Principle = { label: string; body: string };

export function SecurityPrinciples({ items }: { items: ReadonlyArray<Principle> }) {
  return (
    <div className="sec-principles" role="list">
      {items.map((item, i) => (
        <div className="sec-principle" role="listitem" key={item.label} style={{ "--i": i } as CSSProperties}>
          <span className="sec-principle-dot" aria-hidden="true" />
          <h3>{item.label}</h3>
          <p>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Control path: one connected sequence, not squeezed labels ---------- */

type Stage = { n: string; title: string; body: string; icon: IconName };

export function SecurityControlPath({ stages }: { stages: Stage[] }) {
  return (
    <div className="sec-path" aria-label="Where control applies, in order">
      <div className="sec-path-track" aria-hidden="true" />
      {stages.map((stage, i) => (
        <div className="sec-path-stage" key={stage.title} style={{ "--i": i } as CSSProperties}>
          <span className="sec-path-node" aria-hidden="true"><Icon name={stage.icon} size={15} strokeWidth={1.6} /></span>
          <span className="sec-path-n">{stage.n}</span>
          <h4>{stage.title}</h4>
          <p>{stage.body}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Evidence: two or three truthful interface fragments ---------- */

export function SecurityEvidence() {
  return (
    <div className="sec-evidence">
      <EvidenceFragment label="Approval held">
        <div className="sec-evidence-row">
          <span className="sec-evidence-dot is-wait" aria-hidden="true" />
          <span className="sec-evidence-copy"><strong>Pricing reply</strong><small>Gmail · waiting for approval</small></span>
        </div>
      </EvidenceFragment>
      <EvidenceFragment label="Connector scope">
        <div className="sec-evidence-row">
          <span className="sec-evidence-dot is-live" aria-hidden="true" />
          <span className="sec-evidence-copy"><strong>HubSpot</strong><small>Read + approval-gated writes</small></span>
        </div>
      </EvidenceFragment>
      <EvidenceFragment label="Decision trail">
        <ol className="sec-evidence-trail">
          <li>Detected</li><li>Policy checked</li><li>Approved</li><li>Executed</li>
        </ol>
      </EvidenceFragment>
    </div>
  );
}

function EvidenceFragment({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sec-evidence-frag">
      <span className="sec-evidence-lab">{label}</span>
      {children}
    </div>
  );
}

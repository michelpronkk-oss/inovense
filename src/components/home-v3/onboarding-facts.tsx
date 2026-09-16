import type { CSSProperties } from "react";

type Fact = { label: string; body: string };

/** A quiet editorial rail, not four equal cards — mirrors the same pattern used on /security. */
export function EarlyAccessFacts({ items }: { items: ReadonlyArray<Fact> }) {
  return (
    <div className="gs-facts" role="list">
      {items.map((item, i) => (
        <div className="gs-fact" role="listitem" key={item.label} style={{ "--i": i } as CSSProperties}>
          <span className="gs-fact-dot" aria-hidden="true" />
          <h3>{item.label}</h3>
          <p>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

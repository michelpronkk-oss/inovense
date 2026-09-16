import type { CSSProperties } from "react";
import Image from "next/image";
import { Icon } from "./icons";

type ControlItem = {
  kicker: string;
  summary: string;
  detail: string;
  icon: "key" | "database" | "lock" | "shield" | "check2" | "bolt" | "doc" | "layers";
};
type Domain = { label: string; overview: string; items: ControlItem[] };

/**
 * One glass product panel — same layered depth (grid, bloom, vignette,
 * scan-edge) and glass mark badge the homepage uses for its own visuals —
 * holding four control domains in a 2x2 arrangement. Each control leads
 * with a public-facing summary; the fuller technical detail sits behind a
 * native <details> disclosure so the panel doesn't read as a technical
 * document by default. The four accents (teal / blue / amber / green) are
 * the site's existing three-group palette plus its "gate" amber for the
 * one domain about human decisions.
 */
export function SecurityControlDomains({ domains }: { domains: Domain[] }) {
  const totalControls = domains.reduce((sum, domain) => sum + domain.items.length, 0);
  return (
    <div className="sec-panel">
      <div className="sec-panel-grid" aria-hidden="true" />
      <div className="sec-panel-bloom" aria-hidden="true" />
      <div className="sec-panel-vig" aria-hidden="true" />
      <div className="sec-panel-edge" aria-hidden="true" />
      <div className="sec-panel-top">
        <span className="sec-panel-badge" aria-hidden="true"><Image src="/brand/auterim-mark-live.svg" width={18} height={18} alt="" /></span>
        <span className="sec-panel-lab">Implemented controls</span>
        <span className="sec-panel-pill">{totalControls} controls · reviewable</span>
      </div>
      <div className="sec-panel-cols sec-panel-cols-2x2">
        {domains.map((domain, gi) => (
          <div className="sec-col" key={domain.label} data-accent={gi} style={{ "--i": gi } as CSSProperties}>
            <div className="sec-col-head">
              <span className="sec-col-index">{String(gi + 1).padStart(2, "0")}</span>
              <h3>{domain.label}</h3>
              <p>{domain.overview}</p>
            </div>
            <div className="sec-col-rows">
              {domain.items.map((item) => (
                <div className="sec-row" key={item.kicker}>
                  <span className="sec-row-ic" aria-hidden="true"><Icon name={item.icon} size={15} strokeWidth={1.6} /></span>
                  <div className="sec-row-body">
                    <h4>{item.kicker}</h4>
                    <p className="sec-row-summary">{item.summary}</p>
                    <details className="public-disclosure sec-row-detail">
                      <summary>Technical detail</summary>
                      <p>{item.detail}</p>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

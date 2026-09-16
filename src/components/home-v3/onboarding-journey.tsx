import type { CSSProperties } from "react";
import Image from "next/image";

type Step = { title: string; body: string };
type Phase = { label: string; description: string; steps: Step[] };

/**
 * One glass product panel — the same layered-depth recipe (grid, bloom,
 * vignette, scan-edge) and mark badge used across the public site's other
 * product visuals — holding the three Early Access phases as columns,
 * instead of three flat identical cards. The last step is picked out in
 * the site's "gate" amber, since starting a trial is the one deliberate,
 * human-triggered moment in the whole path.
 */
export function OnboardingJourney({ groups }: { groups: Phase[] }) {
  const totalSteps = groups.reduce((sum, group) => sum + group.steps.length, 0);
  const lastGroupIndex = groups.length - 1;
  return (
    <div className="gs-panel">
      <div className="gs-panel-grid" aria-hidden="true" />
      <div className="gs-panel-bloom" aria-hidden="true" />
      <div className="gs-panel-vig" aria-hidden="true" />
      <div className="gs-panel-edge" aria-hidden="true" />
      <div className="gs-panel-top">
        <span className="gs-panel-badge" aria-hidden="true"><Image src="/brand/auterim-mark-live.svg" width={18} height={18} alt="" /></span>
        <span className="gs-panel-lab">Early Access path</span>
        <span className="gs-panel-pill">{totalSteps} steps · your pace</span>
      </div>
      <div className="gs-panel-cols">
        {groups.map((group, gi) => (
          <div className="gs-col" key={group.label} data-accent={gi} style={{ "--i": gi } as CSSProperties}>
            <div className="gs-col-head">
              <span className="gs-col-index">{String(gi + 1).padStart(2, "0")}</span>
              <h3>{group.label}</h3>
              <p>{group.description}</p>
            </div>
            <div className="gs-col-steps">
              {group.steps.map((step, si) => {
                const isGate = gi === lastGroupIndex && si === group.steps.length - 1;
                return (
                  <div className={`gs-step${isGate ? " gs-gate" : ""}`} key={step.title}>
                    <span className="gs-step-n" aria-hidden="true">{String(si + 1).padStart(2, "0")}</span>
                    <div className="gs-step-body"><h4>{step.title}</h4><p>{step.body}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

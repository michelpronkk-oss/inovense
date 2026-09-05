"use client";

import Link from "next/link";
import { appHref } from "@/lib/urls";
import { Icon } from "./icons";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const CONTEXT_SOURCES = [
  { icon: "artifactWeb", label: "Website enquiry" },
  { icon: "artifactPipeline", label: "HubSpot history" },
  { icon: "artifactMemory", label: "Company memory" },
] as const;

const SEQUENCE_STEPS = [
  { label: "Signal received", time: "00:02", state: "done" },
  { label: "Context assembled", time: "00:11", state: "done" },
  { label: "Lead qualified", time: "00:19", state: "done" },
  { label: "Reply prepared", time: "held at gate", state: "now" },
  { label: "CRM updated", time: "on approval", state: "next" },
] as const;

const RAIL_PATHS = [
  "M87 0v12c0 7 5 10 12 10h149c8 0 12 3 12 10v4",
  "M260 0v36",
  "M433 0v12c0 7-5 10-12 10H272c-8 0-12 3-12 10v4",
];

export default function HeroEditorial() {
  /* Mouse-driven parallax intentionally removed: it caused perceptible shaking and soft text. */
  /* useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduced || !canHover) return;

    let frame = 0;
    let pending: { px: number; py: number; rx: number; ry: number } | null = null;

    const apply = () => {
      frame = 0;
      if (!pending) return;
      section.style.setProperty("--hero-px", pending.px.toFixed(3));
      section.style.setProperty("--hero-py", pending.py.toFixed(3));
      const panel = panelRef.current;
      if (panel) {
        panel.style.setProperty("--hero-artifact-rx", pending.rx.toFixed(3));
        panel.style.setProperty("--hero-artifact-ry", pending.ry.toFixed(3));
      }
    };

    const schedule = (next: { px: number; py: number; rx: number; ry: number }) => {
      pending = next;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const sectionRect = section.getBoundingClientRect();
      const px = clamp((event.clientX - (sectionRect.left + sectionRect.width / 2)) / (sectionRect.width / 2), -1, 1);
      const py = clamp((event.clientY - (sectionRect.top + sectionRect.height / 2)) / (sectionRect.height / 2), -1, 1);

      let rx = 0;
      let ry = 0;
      const panel = panelRef.current;
      if (panel) {
        const panelRect = panel.getBoundingClientRect();
        const overPanel = event.clientX >= panelRect.left && event.clientX <= panelRect.right
          && event.clientY >= panelRect.top && event.clientY <= panelRect.bottom;
        if (overPanel) {
          // rotateX takes its sign from vertical offset (inverted: pointer above tilts the top back),
          // rotateY from horizontal offset — kept small so the panel reads as settling, not spinning.
          rx = clamp(-(event.clientY - (panelRect.top + panelRect.height / 2)) / (panelRect.height / 2), -1, 1);
          ry = clamp((event.clientX - (panelRect.left + panelRect.width / 2)) / (panelRect.width / 2), -1, 1);
        }
      }

      schedule({ px, py, rx, ry });
    };

    const reset = () => schedule({ px: 0, py: 0, rx: 0, ry: 0 });

    section.addEventListener("pointermove", handlePointerMove);
    section.addEventListener("pointerleave", reset);

    return () => {
      section.removeEventListener("pointermove", handlePointerMove);
      section.removeEventListener("pointerleave", reset);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []); */

  return (
    <section className="hero hero-editorial" id="top">
      <div className="hero-editorial-tex" aria-hidden="true" />
      <div className="hero-editorial-beam" aria-hidden="true" />
      <div className="hero-editorial-aura" aria-hidden="true" />
      <div className="wrap hero-editorial-in">
        <div className="hero-editorial-copy">
          <p className="hero-editorial-eyebrow">Auterim / operating layer</p>
          <h1>Work moves <em className="hero-editorial-forward">forward.</em><span>You stay in control.</span></h1>
          <p className="say">Auterim gives operators the context and policies to run the right work across your tools.</p>
          <div className="hero-cta">
            <Link href={appHref("/app/onboarding")} className="btn btn-a">Start preview <span className="arrow">→</span></Link>
            <a href="#how" className="btn btn-b">See how it works</a>
          </div>
          <span className="note">Preview first. Connect systems later.</span>
        </div>

        <div className="hero-artifact" aria-label="Auterim guarded Revenue Operator run">
          <div className="hero-artifact-panel">
            <div className="hero-artifact-top">
              <span className="hero-artifact-top-k">Auterim operating layer</span>
              <span className="hero-artifact-run"><i />Run #0142 &middot; Live</span>
            </div>

            <div className="hero-artifact-ctx">
              {CONTEXT_SOURCES.map((source) => (
                <div key={source.label}>
                  <Icon name={source.icon} size={15} />
                  <b>{source.label}</b>
                </div>
              ))}
            </div>
            <svg className="hero-artifact-rail" viewBox="0 0 520 36" preserveAspectRatio="none" aria-hidden="true">
              {RAIL_PATHS.map((d) => <path d={d} key={`rail-${d}`} />)}
              {RAIL_PATHS.map((d) => <path className="hero-artifact-rail-fl" d={d} key={`rail-fl-${d}`} />)}
            </svg>
            <p className="hero-artifact-ctx-f">3 sources assembled &middot; policy applied</p>

            <div className="hero-artifact-op">
              <span className="hero-artifact-op-ic"><Icon name="trend" size={18} strokeWidth={1.4} /></span>
              <div>
                <h2>Revenue Operator</h2>
                <div className="hero-artifact-op-co">Vela Partners</div>
              </div>
            </div>
            <p className="hero-artifact-task">Qualify the enquiry and prepare the first reply.</p>

            <ul className="hero-artifact-seq">
              {SEQUENCE_STEPS.map((step) => (
                <li className={step.state !== "done" ? `hero-artifact-seq-${step.state}` : undefined} key={step.label}>
                  {step.label}<em>{step.time}</em>
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-artifact-gate">
            <span className="hero-artifact-gate-k">Approval required</span>
            <p>Send first reply to Elena at Vela Partners?</p>
            <div className="hero-artifact-gate-rdy">The reply and CRM update are ready.</div>
            <div className="hero-artifact-gate-acts">
              <button className="hero-artifact-mini hero-artifact-mini-go" type="button">Approve and send</button>
              <button className="hero-artifact-mini hero-artifact-mini-ed" type="button">Edit</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEarlyAccess } from "@/components/early-access/early-access-provider";
import HeroOperatingArtifact from "./hero-operating-artifact";
import HeroMobileOperatingLoop from "./hero-mobile-operating-loop";
import { ResponsiveCopy } from "./responsive-copy";

export default function HeroEditorial() {
  const { openEarlyAccess, hasSubmitted } = useEarlyAccess();
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
          <p className="hero-editorial-eyebrow hero-trial">
            <span className="hero-trial-pill"><i />Early access</span>
          </p>
          <h1>Auterim <em className="hero-editorial-forward">finds the work</em> before your team has to.</h1>
          <p className="say"><ResponsiveCopy desktop="Other tools wait for a prompt. Auterim reads the systems you already run, prepares the next step, and holds anything consequential for your approval." mobile="Auterim reads the systems you already run, prepares the next step, and holds anything consequential for your approval." /></p>
          <div className="hero-cta">
            <button type="button" onClick={(event) => openEarlyAccess({ trigger: event.currentTarget })} className="btn btn-a">
              {hasSubmitted ? "Request received" : <>Request early access <span className="arrow">→</span></>}
            </button>
            <a href="#how" className="btn btn-b">See how it works</a>
          </div>
        </div>

        <div className="hero-mobile-bridge" aria-hidden="true"><span /></div>
        <HeroOperatingArtifact />
        <HeroMobileOperatingLoop />
      </div>
    </section>
  );
}

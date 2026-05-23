"use client";

import { useEffect, useRef } from "react";
import ClaudeHome from "./claude-home";
import "./claude-home-v2.css";

const REVEAL_SELECTORS = [
  ".inovense-os .hero-inner",
  ".inovense-os .hero-below-fold",
  ".inovense-os .ino-dash",
  ".inovense-os .section",
];

export default function ClaudeHomeV2() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = Array.from(
      new Set(
        REVEAL_SELECTORS.flatMap((selector) => Array.from(root.querySelectorAll<HTMLElement>(selector))),
      ),
    );

    if (nodes.length === 0) return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    nodes.forEach((node, index) => {
      node.setAttribute("data-v2-reveal", "");
      node.style.setProperty(
        "--v2-reveal-delay",
        `${Math.min((index % 6) * (isMobile ? 24 : 36), isMobile ? 96 : 180)}ms`,
      );
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: isMobile ? "0px 0px 22% 0px" : "0px 0px 8% 0px",
        threshold: isMobile ? 0.01 : 0.08,
      },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="home-v2-root">
      <ClaudeHome />
    </div>
  );
}

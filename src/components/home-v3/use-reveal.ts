"use client";

import { useEffect } from "react";

// Same fade-and-rise-on-scroll pattern as the homepage (v3-page.tsx), extracted
// so other flat-editorial pages can reveal their ".rv" sections without pulling
// in the homepage's hero/architecture sequence-choreography logic.
export function useReveal(rootClass: string) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`.${rootClass}`);
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".rv"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.16 }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [rootClass]);
}

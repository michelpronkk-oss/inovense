"use client";

import Image from "next/image";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import TrustpilotSignal from "@/components/trustpilot-signal";

type LogoItem = {
  name: string;
  href: string;
  logoSrc?: string;
};

const logoItems: LogoItem[] = [
  {
    name: "St. Regis Marriott",
    href: "https://st-regis.marriott.com",
  },
  {
    name: "Barb's Home Kitchen",
    href: "https://barbshomekitchen.com",
  },
  {
    name: "AP Consultants",
    href: "https://apconsultants.com",
  },
];

function LogoWordmark({ item }: { item: LogoItem }) {
  if (item.logoSrc) {
    return (
      <Image
        src={item.logoSrc}
        alt={item.name}
        width={180}
        height={48}
        className="h-8 w-auto object-contain opacity-90 transition-opacity group-hover/logo:opacity-100"
      />
    );
  }

  return (
    <span className="whitespace-nowrap text-sm font-medium tracking-[0.04em] text-zinc-300 transition-colors group-hover/logo:text-zinc-100">
      {item.name}
    </span>
  );
}

export default function Trust() {
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [loopWidth, setLoopWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const element = trackRef.current;
    if (!element) return;

    const updateWidth = () => {
      setLoopWidth(element.scrollWidth / 2);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    if (prefersReducedMotion || isPaused || loopWidth === 0) return;

    const pixelsPerSecond = 32;
    const next = x.get() - (pixelsPerSecond * delta) / 1000;

    if (Math.abs(next) >= loopWidth) {
      x.set(next + loopWidth);
      return;
    }

    x.set(next);
  });

  const repeatedItems = [...logoItems, ...logoItems];

  return (
    <section className="border-y border-white/[0.06] bg-zinc-950/75 py-8 md:py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-4 flex flex-col gap-3 md:mb-5 md:flex-row md:items-center md:gap-4">
          <div className="flex w-full items-center gap-4">
            <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">
              Trusted ecosystems
            </p>
            <div className="h-px flex-1 bg-zinc-800/80" />
          </div>
          <TrustpilotSignal className="self-start md:self-auto" note="Read client reviews" />
        </div>

        <div
          className="group relative overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/70"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent md:w-24"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-zinc-950 via-zinc-950/90 to-transparent md:w-24"
          />

          <motion.div
            ref={trackRef}
            style={{ x: prefersReducedMotion ? 0 : x }}
            className="flex w-max items-center gap-3 px-3 py-3 md:gap-4 md:px-4 md:py-4"
          >
            {repeatedItems.map((item, index) => (
              <a
                key={`${item.name}-${index}`}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${item.name}`}
                className="group/logo inline-flex h-12 min-w-[170px] items-center justify-center rounded-lg border border-zinc-800/80 bg-zinc-900/65 px-5 transition-all duration-300 hover:border-brand/45 hover:bg-zinc-900"
              >
                <LogoWordmark item={item} />
              </a>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

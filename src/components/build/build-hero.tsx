"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Browser window visual ─────────────────────────────────────────────── */

function BrowserMock() {
  return (
    <div className="relative w-full select-none">
      {/* Depth shadow layer: shifted behind and right */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 translate-x-3 translate-y-4 rounded-2xl border border-zinc-800/30 bg-zinc-900/20"
      />
      {/* Second depth layer, further back */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 translate-x-6 translate-y-8 rounded-2xl border border-zinc-800/20 bg-zinc-900/10"
      />

      {/* Ambient glow behind the window */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-30 rounded-3xl"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 50%, rgba(73,160,164,0.14) 0%, transparent 65%)",
        }}
      />

      {/* Main browser window */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">

        {/* ── Chrome bar ── */}
        <div className="flex h-9 items-center gap-3 border-b border-zinc-800 bg-zinc-950/60 px-4">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700/80" />
          </div>
          <div className="ml-2 flex h-5 flex-1 max-w-[200px] items-center rounded-md bg-zinc-800/80 px-2.5">
            <div className="mr-1.5 h-2 w-2 rounded-full bg-zinc-700/60" />
            <span className="text-[9px] tracking-wide text-zinc-600">
              client.inovense.com
            </span>
          </div>
          {/* Reload icon */}
          <svg
            className="ml-auto h-3 w-3 text-zinc-700"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M2 6a4 4 0 1 0 1-2.6M2 2v3h3"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* ── Site nav ── */}
        <div className="flex h-10 items-center justify-between border-b border-zinc-800/50 bg-zinc-900/40 px-5">
          <div className="h-3 w-16 rounded bg-zinc-700/60" />
          <div className="flex items-center gap-3">
            <div className="h-2 w-7 rounded bg-zinc-800/80" />
            <div className="h-2 w-7 rounded bg-zinc-800/80" />
            <div className="h-2 w-7 rounded bg-zinc-800/80" />
            <div className="h-5 w-[68px] rounded-full border border-brand/35 bg-brand/18" />
          </div>
        </div>

        {/* ── Hero section ── */}
        <div className="px-5 pb-5 pt-6">
          {/* Eyebrow */}
          <div className="mb-3 h-1.5 w-14 rounded-full bg-brand/40" />
          {/* Headline blocks */}
          <div className="mb-3 space-y-2">
            <div className="h-[14px] w-[88%] rounded bg-zinc-700/60" />
            <div className="h-[14px] w-[73%] rounded bg-zinc-700/50" />
            <div className="h-[14px] w-[56%] rounded bg-zinc-700/40" />
          </div>
          {/* Sub copy */}
          <div className="mb-4 space-y-1.5">
            <div className="h-2 w-[68%] rounded bg-zinc-800/80" />
            <div className="h-2 w-[54%] rounded bg-zinc-800/60" />
          </div>
          {/* CTAs */}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-[96px] rounded-full border border-brand/40 bg-brand/22" />
            <div className="h-7 w-[80px] rounded-full border border-zinc-700/60" />
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-5 h-px bg-zinc-800/60" />

        {/* ── Feature cards row ── */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800/70 bg-zinc-900/60 p-3"
              >
                <div className="mb-2 h-1.5 w-8 rounded-full bg-brand/35" />
                <div className="mb-1.5 h-2.5 w-full rounded bg-zinc-700/50" />
                <div className="mb-1.5 h-2.5 w-[78%] rounded bg-zinc-800/70" />
                <div className="h-2 w-[55%] rounded bg-zinc-800/50" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Performance scores bar ── */}
        <div className="flex items-center gap-6 border-t border-zinc-800/40 bg-zinc-950/40 px-5 py-2">
          {[
            { label: "Performance", score: "98" },
            { label: "Accessibility", score: "100" },
            { label: "SEO", score: "100" },
          ].map(({ label, score }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-[8px] tracking-wide text-zinc-600">
                {label}
              </span>
              <span className="text-[8px] font-semibold text-brand">
                {score}
              </span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-brand/50" />
            <span className="text-[8px] text-zinc-700">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const mobileBuildItems = ["Offer clarity", "Page flow", "Trust layer", "Intake-ready"];

function MobileBuildVisual() {
  return (
    <div className="relative mx-auto w-[calc(100vw-3rem)] max-w-sm select-none md:hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -top-6 h-20 opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse 65% 60% at 50% 50%, rgba(73,160,164,0.18), transparent 70%)",
        }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)]">
        <div className="mb-4 flex items-center justify-between border-b border-zinc-800/70 pb-3">
          <div className="h-2 w-14 rounded-full bg-brand/45" />
          <span className="text-[11px] font-medium text-zinc-500">Website system</span>
        </div>

        <div className="space-y-2.5">
          <div className="rounded-xl border border-brand/25 bg-brand/10 p-3 text-left">
            <p className="text-xs font-medium text-brand">Primary offer</p>
            <div className="mt-2 space-y-1.5">
              <div className="h-2 w-4/5 rounded-full bg-zinc-700/70" />
              <div className="h-2 w-3/5 rounded-full bg-zinc-800" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {mobileBuildItems.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-zinc-800 bg-zinc-900/55 p-3 text-left"
              >
                <div className="mb-2 h-1.5 w-8 rounded-full bg-brand/35" />
                <p className="text-[11px] font-medium text-zinc-400">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Animation variants ────────────────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ─── Hero ──────────────────────────────────────────────────────────────── */

export default function BuildHero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 md:pb-24 lg:pt-36">

      {/* Grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Ambient glow: left-biased, behind the text */}
      <div
        aria-hidden
        className="animate-ambient-pulse pointer-events-none absolute left-1/2 top-[-18%] h-[70vh] w-[90%] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 70% 58% at 50% 30%, rgba(73,160,164,0.15) 0%, rgba(73,160,164,0.03) 52%, transparent 72%)",
        }}
      />

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-col items-center gap-8 text-center md:gap-12">

          {/* ── Left: Content ── */}
          <motion.div
            className="mx-auto w-full max-w-4xl"
            variants={containerVariants}
            initial={false}
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-8">
              <Badge
                variant="outline"
                className="border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium tracking-wide text-brand"
              >
                Conversion architecture
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mx-auto max-w-[calc(100vw-3rem)] break-words text-3xl font-semibold leading-[1.08] tracking-tight text-zinc-50 sm:max-w-4xl sm:text-5xl lg:text-6xl"
            >
              Websites as{" "}
              <em className="not-italic text-brand">acquisition systems.</em>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mt-6 max-w-[calc(100vw-3rem)] text-base leading-relaxed text-zinc-400 sm:max-w-2xl sm:text-lg"
            >
              We shape the offer, page structure, trust layer, and intake path so visitors can move from interest to qualified action.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mx-auto mt-8 flex w-[calc(100vw-3rem)] max-w-sm flex-col justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row"
            >
              <Button
                asChild
                size="lg"
                className="w-full rounded-full bg-brand px-8 text-white hover:bg-brand/90 sm:w-auto"
              >
                <Link href="/intake">Request a build review</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full rounded-full border-zinc-700 bg-transparent px-8 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50 sm:w-auto"
              >
                <Link href="#build-work">View build outcomes</Link>
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-5 flex items-center justify-center gap-2">
              <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-700" aria-hidden="true" />
              <span className="text-xs text-zinc-600">
                Conversion architecture, premium execution, and launch control in one lane.
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            className="w-full md:hidden"
            variants={itemVariants}
          >
            <MobileBuildVisual />
          </motion.div>

          {/* Right: Browser mock, desktop only */}
          <div className="hidden w-full max-w-3xl md:block">
            {/* Entrance animation wrapper */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            >
              {/* Continuous float */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{
                  duration: 14,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              >
                <BrowserMock />
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

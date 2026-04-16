"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Growth signal visual ───────────────────────────────────────────────── */

const channels = [
  { label: "SEO", fill: 84, trend: "+12%" },
  { label: "Paid", fill: 68, trend: "+7%" },
  { label: "Content", fill: 91, trend: "+19%" },
  { label: "Conversion", fill: 74, trend: "+11%" },
];

const sparkBars = [22, 31, 28, 35, 29, 38, 42, 36, 45, 41, 48, 47];

function GrowthSignalMock() {
  const peak = Math.max(...sparkBars);

  return (
    <div className="relative w-full select-none">
      {/* Depth shadow layers */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 translate-x-3 translate-y-4 rounded-2xl border border-zinc-800/30 bg-zinc-900/20"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 translate-x-6 translate-y-8 rounded-2xl border border-zinc-800/20 bg-zinc-900/10"
      />

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-30 rounded-3xl"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 50%, rgba(73,160,164,0.13) 0%, transparent 65%)",
        }}
      />

      {/* Main panel */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">

        {/* ── Header bar ── */}
        <div className="flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-950/60 px-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-brand/80" />
            <span className="text-[10px] tracking-wide text-zinc-500">
              Growth Overview
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-zinc-700">This month</span>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-semibold text-brand">+24%</span>
              <span className="text-[9px] text-zinc-600">qualified leads</span>
            </div>
          </div>
        </div>

        {/* ── Channel performance ── */}
        <div className="px-4 pt-3.5 pb-3">
          <p className="mb-3 text-[9px] font-medium uppercase tracking-widest text-zinc-700">
            Channel Performance
          </p>
          <div className="flex flex-col gap-2.5">
            {channels.map(({ label, fill, trend }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-[58px] shrink-0 text-[9px] text-zinc-500">
                  {label}
                </span>
                <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-zinc-800/80">
                  <div
                    className="h-full rounded-full bg-brand/55"
                    style={{ width: `${fill}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[9px] font-medium text-brand">
                  {trend}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-4 h-px bg-zinc-800/60" />

        {/* ── Pipeline signal sparkline ── */}
        <div className="px-4 pt-3 pb-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[9px] font-medium uppercase tracking-widest text-zinc-700">
              Pipeline Signal
            </p>
            <span className="text-[9px] text-zinc-700">Last 12 weeks</span>
          </div>
          <div className="flex h-9 items-end gap-[3px]">
            {sparkBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${(h / peak) * 100}%`,
                  background:
                    i >= sparkBars.length - 3
                      ? "rgba(73,160,164,0.65)"
                      : "rgba(73,160,164,0.25)",
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="flex items-center gap-5 border-t border-zinc-800/40 bg-zinc-950/40 px-4 py-2">
          {[
            { label: "Organic traffic", value: "↑12%" },
            { label: "Conv. rate", value: "4.8%" },
            { label: "Pipeline", value: "Growing" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-[8px] tracking-wide text-zinc-600">
                {label}
              </span>
              <span className="text-[8px] font-semibold text-brand">
                {value}
              </span>
            </div>
          ))}
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
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

/* ─── Hero ──────────────────────────────────────────────────────────────── */

export default function GrowthHero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:min-h-screen lg:flex lg:items-center">

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

      {/* Ambient glow: top-center to distinguish from /build (left) and /systems (right) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-5%] top-[-20%] h-[85vh] w-[70%]"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 40% 35%, rgba(73,160,164,0.13) 0%, rgba(73,160,164,0.03) 50%, transparent 70%)",
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
        <div className="flex flex-col items-start gap-16 lg:flex-row lg:items-center lg:gap-14">

          {/* ── Left: Content ── */}
          <motion.div
            className="w-full flex-shrink-0 lg:max-w-[520px]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-8">
              <Badge
                variant="outline"
                className="border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium tracking-wide text-brand"
              >
                Growth ·· Lane 03
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl font-semibold leading-[1.08] tracking-tight text-zinc-50 lg:text-6xl"
            >
              Paid media, content, and lead generation —{" "}
              <em className="not-italic text-brand">built</em> to fill your pipeline.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-[440px] text-lg leading-relaxed text-zinc-400"
            >
              We run growth campaigns for businesses that need qualified leads, not just clicks and impressions.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Button
                asChild
                size="lg"
                className="rounded-full bg-brand px-8 text-white hover:bg-brand/90"
              >
                <Link href="/intake">Start a growth project</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-zinc-700 bg-transparent px-8 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
              >
                <Link href="#growth-offerings">See what we build</Link>
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-5 flex items-center gap-2">
              <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-700" aria-hidden="true" />
              <span className="text-xs text-zinc-600">
                Selective intake. We only take on growth projects we can win.
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex items-center gap-4"
            >
              <div className="h-px w-8 bg-brand/40" />
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                Growth lane ·· Inovense
              </span>
            </motion.div>
          </motion.div>

          {/* ── Right: Signal mock, desktop only ── */}
          <div className="hidden w-full flex-1 lg:block">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              >
                <GrowthSignalMock />
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

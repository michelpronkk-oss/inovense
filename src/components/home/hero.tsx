"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Infrastructure overview mock ──────────────────────────────────────── */

const systemsNodes = ["Capture", "Route", "Assign", "Done"];
const growthBars = [28, 35, 31, 40, 38, 45, 42, 47];
const growthPeak = 47;

function InfrastructureMock() {
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

      {/* Ambient glow behind the panel */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-30 rounded-3xl"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 50%, rgba(73,160,164,0.11) 0%, transparent 65%)",
        }}
      />

      {/* Main panel */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">

        {/* ── Header ── */}
        <div className="flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-950/60 px-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-brand/80" />
            <span className="text-[10px] tracking-wide text-zinc-500">
              Infrastructure Overview
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-brand/60" />
            <span className="text-[9px] text-zinc-600">3 lanes active</span>
          </div>
        </div>

        {/* ── Lane cards ── */}
        <div className="flex flex-col gap-2.5 p-3">

          {/* 01 Build */}
          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/60 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] font-medium text-brand">01</span>
                <span className="text-[10px] font-semibold text-zinc-300">Build</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-brand/70" />
                <span className="text-[8px] text-zinc-600">Active</span>
              </div>
            </div>
            <p className="mb-2 text-[8px] text-zinc-600">
              Websites, webshops and Shopify stores
            </p>
            {/* Mini visual: three card skeletons */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex-1 rounded-md border border-zinc-800/70 bg-zinc-900/80 p-1.5"
                >
                  <div className="mb-1 h-1 w-4 rounded-full bg-brand/35" />
                  <div className="h-1 w-full rounded-full bg-zinc-800/70" />
                  <div className="mt-0.5 h-1 w-[70%] rounded-full bg-zinc-800/50" />
                </div>
              ))}
            </div>
          </div>

          {/* 02 Systems */}
          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/60 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] font-medium text-brand">02</span>
                <span className="text-[10px] font-semibold text-zinc-300">Systems</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-brand/70" />
                <span className="text-[8px] text-zinc-600">Active</span>
              </div>
            </div>
            <p className="mb-2 text-[8px] text-zinc-600">
              Smart workflows and automation
            </p>
            {/* Mini visual: pipeline nodes */}
            <div className="flex items-center">
              {systemsNodes.map((node, i) => (
                <div key={node} className="flex items-center">
                  <div className="rounded px-1.5 py-[3px] text-[7px] font-medium border border-brand/30 bg-brand/10 text-brand">
                    {node}
                  </div>
                  {i < systemsNodes.length - 1 && (
                    <div className="mx-0.5 h-px w-2 shrink-0 bg-brand/35" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 03 Growth */}
          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/60 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] font-medium text-brand">03</span>
                <span className="text-[10px] font-semibold text-zinc-300">Growth</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-brand/70" />
                <span className="text-[8px] text-zinc-600">Active</span>
              </div>
            </div>
            <p className="mb-2 text-[8px] text-zinc-600">
              Paid media, SEO, and lead generation
            </p>
            {/* Mini visual: sparkline */}
            <div className="flex h-[18px] items-end gap-[2px]">
              {growthBars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${(h / growthPeak) * 100}%`,
                    background:
                      i >= growthBars.length - 2
                        ? "rgba(73,160,164,0.65)"
                        : "rgba(73,160,164,0.25)",
                  }}
                />
              ))}
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-3 border-t border-zinc-800/40 bg-zinc-950/40 px-4 py-2">
          <span className="text-[8px] tracking-wide text-zinc-700">Inovense</span>
          <div className="ml-auto flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-brand/50" />
            <span className="text-[8px] text-zinc-600">Live</span>
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
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

const trustItems = ["Custom-built", "Conversion-focused", "Senior-built", "No templates"];

/* ─── Hero ──────────────────────────────────────────────────────────────── */

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 lg:min-h-screen lg:flex lg:items-center">

      {/* Grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Left ambient glow: behind the headline */}
      <div
        aria-hidden
        className="animate-ambient-pulse pointer-events-none absolute -left-[5%] top-[-20%] h-[90vh] w-[65%]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 30% 40%, rgba(73,160,164,0.16) 0%, rgba(73,160,164,0.04) 50%, transparent 70%)",
        }}
      />

      {/* Right ambient glow: behind the mock */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-5%] top-[-10%] h-[80vh] w-[55%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 70% 45%, rgba(73,160,164,0.08) 0%, transparent 65%)",
        }}
      />

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
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
                Custom-built for growth
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl font-semibold leading-[1.08] tracking-tight text-zinc-50 lg:text-6xl"
            >
              Websites, webshops and smart systems{" "}
              <span className="text-brand">built to win more clients.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-[520px] text-lg leading-relaxed text-zinc-400"
            >
              We build websites, Shopify stores, and smart workflows that help businesses earn trust, move faster, and convert more of the right people.
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
                <Link href="/intake">Start a project</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-zinc-700 bg-transparent px-8 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
              >
                <Link href="#work">See our work</Link>
              </Button>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              variants={itemVariants}
              className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2"
            >
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1.5 text-xs text-zinc-700"
                >
                  <span className="h-1 w-1 shrink-0 rounded-full bg-brand/40" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </motion.div>

          </motion.div>

          {/* ── Right: Infrastructure mock, desktop only ── */}
          <div className="hidden w-full flex-1 lg:block">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            >
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{
                  duration: 14,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              >
                <InfrastructureMock />
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

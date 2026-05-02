"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Systems dashboard visual ──────────────────────────────────────────── */

const flows = [
  {
    label: "Lead Router",
    nodes: ["Capture", "Qualify", "Route", "Assign"],
    active: true,
  },
  {
    label: "CRM Sync",
    nodes: ["Trigger", "Transform", "Push"],
    active: true,
  },
  {
    label: "Weekly Report",
    nodes: ["Aggregate", "Format", "Deliver"],
    active: false,
  },
];

const pipeline = [
  { label: "Lead in", done: true },
  { label: "Qualify", done: true },
  { label: "Route", done: true },
  { label: "Assign", done: false },
  { label: "Follow-up", done: false },
];

function SystemsDashMock() {
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

      {/* Main dashboard panel */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">

        {/* ── Header bar ── */}
        <div className="flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-950/60 px-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-brand/80" />
            <span className="text-[10px] tracking-wide text-zinc-500">
              Systems Overview
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-zinc-700">12 flows active</span>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
              <span className="text-[9px] text-zinc-600">Live</span>
            </div>
          </div>
        </div>

        {/* ── Two-panel content ── */}
        <div className="flex">

          {/* Left: Pipeline stages */}
          <div className="w-[116px] shrink-0 border-r border-zinc-800/60 p-3">
            <p className="mb-3 text-[9px] font-medium uppercase tracking-widest text-zinc-700">
              Pipeline
            </p>
            <div className="relative flex flex-col">
              {/* Vertical connector */}
              <div className="absolute bottom-2 left-[4px] top-2 w-px bg-zinc-800/80" />
              {pipeline.map((stage) => (
                <div
                  key={stage.label}
                  className="relative flex items-center gap-2.5 py-[5px]"
                >
                  <div
                    className={`relative z-10 h-[9px] w-[9px] shrink-0 rounded-full border ${
                      stage.done
                        ? "border-brand/60 bg-brand/25"
                        : "border-zinc-700 bg-zinc-900"
                    }`}
                  />
                  <span
                    className={`text-[9px] ${
                      stage.done ? "text-zinc-400" : "text-zinc-700"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Active flows */}
          <div className="flex-1 p-3">
            <p className="mb-2.5 text-[9px] font-medium uppercase tracking-widest text-zinc-700">
              Active Flows
            </p>
            <div className="flex flex-col gap-2">
              {flows.map(({ label, nodes, active }) => (
                <div
                  key={label}
                  className="rounded-lg border border-zinc-800/70 bg-zinc-900/60 p-2"
                >
                  <p className="mb-1.5 text-[8px] font-medium tracking-wide text-zinc-600">
                    {label}
                  </p>
                  <div className="flex items-center">
                    {nodes.map((node, i) => (
                      <div key={node} className="flex items-center">
                        <div
                          className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${
                            active
                              ? "border border-brand/30 bg-brand/10 text-brand"
                              : "border border-zinc-800 bg-zinc-900/60 text-zinc-700"
                          }`}
                        >
                          {node}
                        </div>
                        {i < nodes.length - 1 && (
                          <div
                            className={`mx-0.5 h-px w-2 shrink-0 ${
                              active ? "bg-brand/35" : "bg-zinc-800"
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Stats bar ── */}
        <div className="flex items-center gap-6 border-t border-zinc-800/40 bg-zinc-950/40 px-4 py-2">
          {[
            { label: "Flows active", value: "12" },
            { label: "Runs today", value: "847" },
            { label: "Errors", value: "0" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-[8px] tracking-wide text-zinc-600">
                {label}
              </span>
              <span
                className={`text-[8px] font-semibold ${
                  value === "0" ? "text-zinc-600" : "text-brand"
                }`}
              >
                {value}
              </span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-brand/50" />
            <span className="text-[8px] text-zinc-700">Running</span>
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

/* ─── Hero ──────────────────────────────────────────────────────────────── */

export default function SystemsHero() {
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

      {/* Ambient glow: right-biased to complement /build */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-18%] h-[70vh] w-[90%] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 70% 58% at 50% 30%, rgba(73,160,164,0.13) 0%, rgba(73,160,164,0.03) 52%, transparent 72%)",
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
        <div className="flex flex-col items-center gap-12 text-center">

          {/* ── Left: Content ── */}
          <motion.div
            className="mx-auto w-full max-w-4xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-8">
              <Badge
                variant="outline"
                className="border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium tracking-wide text-brand"
              >
                Client flow systems
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-50 sm:text-5xl lg:text-6xl"
            >
              The client flow behind{" "}
              <em className="not-italic text-brand">every better website.</em>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg"
            >
              Intake, qualification, follow-up, proposal, payment, and onboarding flows built to reduce leakage after the first click.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"
            >
              <Button
                asChild
                size="lg"
                className="rounded-full bg-brand px-8 text-white hover:bg-brand/90"
              >
                <Link href="/intake">Request a systems review</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-zinc-700 bg-transparent px-8 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
              >
                <Link href="#systems-offerings">See what we build</Link>
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-5 flex items-center justify-center gap-2">
              <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-700" aria-hidden="true" />
              <span className="text-xs text-zinc-600">
                Fewer dropped leads, faster handoff, and clearer team ownership.
              </span>
            </motion.div>
          </motion.div>

          {/* ── Right: Dashboard mock, desktop only ── */}
          <div className="hidden w-full max-w-3xl md:block">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 16,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              >
                <SystemsDashMock />
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

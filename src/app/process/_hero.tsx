"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Engagement tracker visual ─────────────────────────────────────────── */

const stages = [
  { num: "01", label: "Inquiry and review", status: "done" },
  { num: "02", label: "Fit and scope", status: "done" },
  { num: "03", label: "Proposal", status: "done" },
  { num: "04", label: "Deposit and kickoff", status: "done" },
  { num: "05", label: "Onboarding brief", status: "active" },
  { num: "06", label: "Execution", status: "pending" },
  { num: "07", label: "Review and launch", status: "pending" },
  { num: "08", label: "Handoff", status: "pending" },
] as const;

const mobileProcessSteps = ["Review", "Scope", "Build", "Refine", "Launch"];

type StageStatus = typeof stages[number]["status"];

function dotClass(status: StageStatus) {
  if (status === "done") return "border-brand/60 bg-brand/25";
  if (status === "active") return "border-brand bg-brand/55";
  return "border-zinc-700/80 bg-zinc-900";
}

function labelClass(status: StageStatus) {
  if (status === "done") return "text-zinc-400";
  if (status === "active") return "text-brand font-medium";
  return "text-zinc-700";
}

function ProcessTrackerMock() {
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

      {/* Ambient glow behind panel */}
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
              Engagement Overview
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-zinc-700">Stage 5 of 8</span>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-brand/60" />
              <span className="text-[9px] text-zinc-600">On schedule</span>
            </div>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="mx-4 mt-3.5 mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[9px] font-medium uppercase tracking-widest text-zinc-700">
              Progress
            </p>
            <span className="text-[9px] text-brand">5 / 8 complete</span>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-brand/50"
              style={{ width: "56%" }}
            />
          </div>
        </div>

        {/* ── Stage list ── */}
        <div className="relative px-4 pb-3">
          <p className="mb-2.5 text-[9px] font-medium uppercase tracking-widest text-zinc-700">
            Stages
          </p>
          <div className="relative flex flex-col">
            {/* Vertical connector */}
            <div className="absolute bottom-2 left-[4px] top-2 w-px bg-zinc-800/80" />

            {stages.map(({ num, label, status }) => (
              <div
                key={num}
                className="relative flex items-center gap-3 py-[4.5px]"
              >
                <div
                  className={`relative z-10 h-[9px] w-[9px] shrink-0 rounded-full border ${dotClass(status)}`}
                />
                <span className={`flex-1 text-[9px] ${labelClass(status)}`}>
                  {label}
                </span>
                {status === "active" && (
                  <span className="rounded border border-brand/25 bg-brand/10 px-1 py-0.5 text-[8px] text-brand">
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="flex items-center gap-5 border-t border-zinc-800/40 bg-zinc-950/40 px-4 py-2">
          {[
            { label: "Completed", value: "4" },
            { label: "In progress", value: "1" },
            { label: "Remaining", value: "3" },
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
          <div className="ml-auto flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-brand/50" />
            <span className="text-[8px] text-zinc-700">Week 3</span>
          </div>
        </div>

      </div>
    </div>
  );
}

function MobileProcessVisual() {
  return (
    <div className="relative mx-auto w-[calc(100vw-3rem)] max-w-sm select-none md:hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -top-6 h-20 opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse 65% 60% at 50% 50%, rgba(73,160,164,0.16), transparent 70%)",
        }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)]">
        <div className="mb-4 flex items-center justify-between border-b border-zinc-800/70 pb-3">
          <span className="text-xs font-medium text-brand">Delivery rhythm</span>
          <span className="text-[11px] text-zinc-600">Controlled path</span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {mobileProcessSteps.map((step, index) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className={`h-2 w-full rounded-full ${
                  index < 3 ? "bg-brand/45" : "bg-zinc-800"
                }`}
              />
              <span className="text-[10px] font-medium text-zinc-500">{step}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/55 p-3 text-left">
          <p className="text-xs font-medium text-zinc-300">Scope before speed</p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            Each step has an owner, an output, and a next decision.
          </p>
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

export default function ProcessHero() {
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

      {/* Ambient glow: center-left */}
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
                Controlled execution
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mx-auto max-w-[calc(100vw-3rem)] break-words text-3xl font-semibold leading-[1.08] tracking-tight text-zinc-50 sm:max-w-4xl sm:text-5xl lg:text-6xl"
            >
              Controlled from{" "}
              <em className="not-italic text-brand">review to launch.</em>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mt-6 max-w-[calc(100vw-3rem)] text-base leading-relaxed text-zinc-400 sm:max-w-2xl sm:text-lg"
            >
              Clear scope, fast decisions, clean handoff, and a delivery rhythm designed to avoid revision chaos.
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
                <Link href="#how-we-work">See how it works</Link>
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-5 flex items-center justify-center gap-2"
            >
              <span
                className="h-1 w-1 shrink-0 rounded-full bg-zinc-700"
                aria-hidden="true"
              />
              <span className="text-xs text-zinc-600">
                24-hour response{" "}
                <span className="text-zinc-500">· Full ownership on delivery</span>
              </span>
            </motion.div>
          </motion.div>

          {/* ── Right: Engagement tracker, desktop only ── */}
          <motion.div
            className="w-full md:hidden"
            variants={itemVariants}
          >
            <MobileProcessVisual />
          </motion.div>

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
                <ProcessTrackerMock />
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

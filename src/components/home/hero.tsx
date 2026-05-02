"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const acquisitionStages = [
  {
    label: "Build",
    title: "Conversion website",
    detail: "Offer clarity, trust, speed, and intake-ready pages.",
  },
  {
    label: "Systems",
    title: "Client flow",
    detail: "Intake, follow-up, proposals, CRM handoff, and onboarding.",
  },
  {
    label: "Growth",
    title: "Pipeline feedback",
    detail: "Campaign assets, proof loops, variants, and source learning.",
  },
] as const;

const flowNodes = ["Interest", "Fit", "Proposal", "Onboarding", "Revenue"];
const trustItems = ["Custom-built", "Conversion-first", "Operator-grade", "No templates"];

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

function AcquisitionSystemVisual() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative mx-auto mt-12 w-full max-w-5xl md:mt-14"
      variants={itemVariants}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-brand/35 to-transparent sm:block"
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/2 hidden h-2 w-2 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_24px_rgba(73,160,164,0.75)] sm:block"
        animate={
          shouldReduceMotion
            ? { left: "50%", opacity: 0.45 }
            : { left: ["13%", "87%"], opacity: [0, 1, 0] }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 7, repeat: Infinity, ease: "easeInOut" }
        }
      />

      <motion.div
        className="relative overflow-hidden rounded-[2rem] border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-[0_30px_110px_rgba(0,0,0,0.48)] backdrop-blur-sm sm:p-5 md:p-6"
        animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={
          shouldReduceMotion
            ? undefined
            : { duration: 16, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.024) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.024) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 78% 70% at 50% 30%, black 0%, transparent 72%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-32 opacity-60 blur-2xl"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(73,160,164,0.18), transparent 72%)",
          }}
        />

        <div className="relative grid gap-3 md:grid-cols-3">
          {acquisitionStages.map((stage, index) => (
            <motion.div
              key={stage.label}
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/55 p-4 text-left transition-colors duration-300 hover:border-brand/35 hover:bg-zinc-900/80"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.65,
                delay: 0.55 + index * 0.08,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand">
                  {stage.label}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-brand/60 shadow-[0_0_18px_rgba(73,160,164,0.5)]" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-100">{stage.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                {stage.detail}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="relative mt-4 rounded-2xl border border-zinc-800/80 bg-black/20 p-4 sm:mt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {flowNodes.map((node, index) => (
              <div key={node} className="flex items-center gap-3 sm:flex-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-[10px] font-semibold text-brand">
                  {index + 1}
                </div>
                <span className="text-xs font-medium text-zinc-400">{node}</span>
                {index < flowNodes.length - 1 && (
                  <div className="hidden h-px flex-1 bg-gradient-to-r from-brand/35 to-zinc-800 sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[calc(100svh-1rem)] items-center overflow-hidden pb-16 pt-28 md:pb-20 md:pt-32">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[82vh]"
        animate={
          shouldReduceMotion
            ? undefined
            : { opacity: [0.75, 0.95, 0.75], scale: [1, 1.04, 1] }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : { duration: 18, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 18%, rgba(73,160,164,0.19) 0%, rgba(73,160,164,0.05) 46%, transparent 72%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse 80% 62% at 50% 32%, black 0%, transparent 74%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6">
        <motion.div
          className="mx-auto flex max-w-5xl flex-col items-center text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-7">
            <Badge
              variant="outline"
              className="border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium tracking-wide text-brand"
            >
              Premium acquisition systems studio
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="max-w-5xl text-4xl font-semibold leading-[1.06] tracking-tight text-zinc-50 sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Build the website. Automate the client flow.{" "}
            <span className="text-brand">Close better business.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg"
          >
            Inovense builds premium websites, intake flows, proposal systems, and onboarding automations for service businesses that need fewer leaks between interest and revenue.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="rounded-full bg-brand px-8 text-white hover:bg-brand/90"
            >
              <Link href="/intake">Request a build review</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-zinc-700 bg-transparent px-8 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
            >
              <Link href="#work">See selected work</Link>
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
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

          <AcquisitionSystemVisual />
        </motion.div>
      </div>
    </section>
  );
}

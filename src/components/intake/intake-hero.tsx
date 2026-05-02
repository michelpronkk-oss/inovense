"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import TrustpilotSignal from "@/components/trustpilot-signal";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export default function IntakeHero() {
  return (
    <section className="relative overflow-hidden pb-14 pt-32">

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 20%, rgba(73,160,164,0.11) 0%, transparent 65%)",
        }}
      />

      {/* Grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />

      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.p
            variants={item}
            className="mb-5 text-xs font-medium uppercase tracking-[0.12em] text-brand"
          >
            Build review
          </motion.p>

          <motion.h1
            variants={item}
            className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl"
          >
            Request a build review.
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400"
          >
            Tell us what you are building, where the current flow leaks, and what needs to become cleaner before the next launch.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
          >
            <Button
              asChild
              size="lg"
              className="rounded-full bg-brand px-8 text-white hover:bg-brand/90"
            >
              <Link href="#intake-form">Submit your brief</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-zinc-700 bg-transparent px-8 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
            >
              <Link href="/process">How we work</Link>
            </Button>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            variants={item}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            {["Limited intake", "24-hour response", "No pitch decks"].map((label) => (
              <span key={label} className="flex items-center gap-2 text-xs text-zinc-600">
                <span className="h-1 w-1 shrink-0 rounded-full bg-brand/50" />
                {label}
              </span>
            ))}
          </motion.div>

          <motion.div variants={item} className="mt-6">
            <TrustpilotSignal note="Read client reviews" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

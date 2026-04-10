"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TrustpilotSignal from "@/components/trustpilot-signal";

const intakeSteps = [
  { label: "Brief ingestuurd", status: "done" },
  { label: "Handmatige review", status: "active" },
  { label: "Reactie binnen 24 uur", status: "pending" },
  { label: "Volgende stap bepaald", status: "pending" },
] as const;

function IntakeMock() {
  return (
    <div className="relative w-full select-none">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 translate-x-3 translate-y-4 rounded-2xl border border-zinc-800/30 bg-zinc-900/20"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 translate-x-6 translate-y-8 rounded-2xl border border-zinc-800/20 bg-zinc-900/10"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-30 rounded-3xl"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 50%, rgba(73,160,164,0.13) 0%, transparent 65%)",
        }}
      />

      <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-950/60 px-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-brand/80" />
            <span className="text-[10px] tracking-wide text-zinc-500">
              Intake Route
            </span>
          </div>
          <span className="text-[9px] text-zinc-700">NL flow</span>
        </div>

        <div className="p-4">
          <p className="mb-3 text-[9px] font-medium uppercase tracking-widest text-zinc-700">
            Wat er nu gebeurt
          </p>
          <div className="space-y-2.5">
            {intakeSteps.map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 rounded-full border ${
                    step.status === "done"
                      ? "border-brand/60 bg-brand/25"
                      : step.status === "active"
                        ? "border-brand bg-brand/55"
                        : "border-zinc-700 bg-zinc-900"
                  }`}
                />
                <span
                  className={`text-[10px] ${
                    step.status === "pending"
                      ? "text-zinc-600"
                      : "text-zinc-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-5 border-t border-zinc-800/40 bg-zinc-950/40 px-4 py-2">
          {[
            { label: "SLA", value: "24u" },
            { label: "Review", value: "Handmatig" },
            { label: "Status", value: "Actief" },
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

export default function NlIntakeHero() {
  return (
    <section className="relative overflow-hidden pb-14 pt-32 lg:pb-20">
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 20%, rgba(73,160,164,0.11) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-col items-start gap-12 lg:flex-row lg:items-center lg:gap-14">
          <motion.div
            className="w-full lg:max-w-[520px]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-8">
              <Badge
                variant="outline"
                className="border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium tracking-wide text-brand"
              >
                Project intake | NL
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl"
            >
              Vertel ons wat je bouwt.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-[460px] text-base leading-relaxed text-zinc-400 md:text-lg"
            >
              Vul de brief hieronder in. We beoordelen elke inzending persoonlijk
              en reageren binnen 24 uur met een duidelijke volgende stap.
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
                <Link href="#nl-intake-form">Projectaanvraag starten</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-zinc-700 bg-transparent px-8 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
              >
                <Link href="/nl/process">Hoe wij werken</Link>
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              {["Beperkte intake", "Reactie binnen 24 uur", "Geen pitch decks"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-2 text-xs text-zinc-600">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-brand/50" />
                    {item}
                  </span>
                )
              )}
            </motion.div>

            <motion.div variants={itemVariants} className="mt-6">
              <TrustpilotSignal note="Bekijk klantreviews" />
            </motion.div>
          </motion.div>

          <div className="hidden w-full flex-1 lg:block">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 14,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              >
                <IntakeMock />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

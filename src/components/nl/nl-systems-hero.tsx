"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    label: "Weekrapport",
    nodes: ["Aggregate", "Format", "Deliver"],
    active: false,
  },
];

const pipeline = [
  { label: "Lead in", done: true },
  { label: "Kwalificeer", done: true },
  { label: "Route", done: true },
  { label: "Owner", done: false },
  { label: "Follow-up", done: false },
];

function SystemsDashMock() {
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
              Systems Overzicht
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-zinc-700">12 flows actief</span>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
              <span className="text-[9px] text-zinc-600">Live</span>
            </div>
          </div>
        </div>

        <div className="flex">
          <div className="w-[116px] shrink-0 border-r border-zinc-800/60 p-3">
            <p className="mb-3 text-[9px] font-medium uppercase tracking-widest text-zinc-700">
              Pipeline
            </p>
            <div className="relative flex flex-col">
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

          <div className="flex-1 p-3">
            <p className="mb-2.5 text-[9px] font-medium uppercase tracking-widest text-zinc-700">
              Actieve Flows
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

        <div className="flex items-center gap-6 border-t border-zinc-800/40 bg-zinc-950/40 px-4 py-2">
          {[
            { label: "Flows actief", value: "12" },
            { label: "Runs vandaag", value: "847" },
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

const mobilePipelineSteps = ["Lead in", "Kwalificeer", "Route", "Eigenaar", "Follow-up"];

function MobileNlSystemsVisual() {
  return (
    <div className="relative mx-auto w-full max-w-sm select-none lg:hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -top-6 h-16 opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse 65% 60% at 50% 50%, rgba(73,160,164,0.16), transparent 70%)",
        }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)]">
        <div className="mb-4 flex items-center justify-between border-b border-zinc-800/70 pb-3">
          <span className="text-xs font-medium text-brand">Systems overzicht</span>
          <span className="text-[11px] text-zinc-600">12 flows actief</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {mobilePipelineSteps.map((step, index) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className={`h-2 w-full rounded-full ${
                  index < 3 ? "bg-brand/45" : "bg-zinc-800"
                }`}
              />
              <span className="text-[9px] font-medium text-zinc-600">{step}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/55 p-3 text-left">
          <p className="text-xs font-medium text-zinc-300">Minder handwerk</p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            Automatisch werken, consistent op tijd.
          </p>
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

export default function NlSystemsHero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 lg:flex lg:min-h-screen lg:items-center">
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

      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[-15%] h-[90vh] w-[80%]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 70% 40%, rgba(73,160,164,0.13) 0%, rgba(73,160,164,0.03) 50%, transparent 70%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-col items-start gap-16 lg:flex-row lg:items-center lg:gap-14">
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
                Systems | Lane 02
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-3xl font-semibold leading-[1.1] tracking-tight text-zinc-50 sm:text-4xl lg:text-6xl"
            >
              Slimme systemen en AI-automatisering,{" "}
              <em className="not-italic text-brand">gebouwd</em> voor operationele helderheid.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-[calc(100vw-3rem)] text-base leading-relaxed text-zinc-400 sm:max-w-[440px] sm:text-lg"
            >
              We bouwen maatwerk workflows, automatiseringen en AI-tools die wrijving weghalen,
              tijd besparen en je bedrijf beter laten lopen.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex w-[calc(100vw-3rem)] max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row"
            >
              <Button
                asChild
                size="lg"
                className="w-full rounded-full bg-brand px-8 text-white hover:bg-brand/90 sm:w-auto"
              >
                <Link href="/nl/intake">Start een systems project</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full rounded-full border-zinc-700 bg-transparent px-8 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50 sm:w-auto"
              >
                <Link href="/nl/process">Bekijk het proces</Link>
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-5 flex items-center gap-2">
              <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-700" aria-hidden="true" />
              <span className="text-xs text-zinc-600">
                Gebouwd voor teams die meer output willen zonder meer overhead.
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex items-center gap-4"
            >
              <div className="h-px w-8 bg-brand/40" />
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                Systems lane | Inovense
              </span>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-8">
              <MobileNlSystemsVisual />
            </motion.div>
          </motion.div>

          <div className="hidden w-full flex-1 lg:block">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
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

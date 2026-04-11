"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const lanes = [
  { lane: "Build", note: "Websites en digitale producten" },
  { lane: "Systems", note: "Automatisering en operaties" },
  { lane: "Growth", note: "Distributie en commerciele flow" },
];

const proofItems = [
  "Geen templates",
  "Volledige eigendom",
  "Reactie binnen 24 uur",
];

function EcosystemMock() {
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
              Digitale infrastructuur
            </span>
          </div>
          <span className="text-[9px] text-zinc-700">3 lanes actief</span>
        </div>

        <div className="px-4 pb-3.5 pt-3">
          <p className="mb-2.5 text-[9px] font-medium uppercase tracking-widest text-zinc-700">
            Lanes
          </p>
          <div className="flex flex-col gap-2">
            {lanes.map((item) => (
              <div
                key={item.lane}
                className="rounded-lg border border-zinc-800/70 bg-zinc-900/60 px-2.5 py-2"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand/60" />
                  <span className="text-[10px] font-medium text-zinc-300">
                    {item.lane}
                  </span>
                </div>
                <p className="text-[9px] text-zinc-600">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-4 h-px bg-zinc-800/60" />

        <div className="px-4 pb-3.5 pt-3">
          <p className="mb-2.5 text-[9px] font-medium uppercase tracking-widest text-zinc-700">
            Werkwijze
          </p>
          <div className="flex flex-wrap gap-1.5">
            {proofItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-0.5 text-[8px] text-zinc-500"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-5 border-t border-zinc-800/40 bg-zinc-950/40 px-4 py-2">
          {[
            { label: "Lanes", value: "3" },
            { label: "Uitvoering", value: "Op maat" },
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

export default function NlHomeHero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 lg:flex lg:min-h-screen lg:items-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-10%] top-[-10%] h-[90vh] w-[80%]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 40% 35%, rgba(73,160,164,0.14) 0%, rgba(73,160,164,0.03) 50%, transparent 70%)",
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
                Q2 2026 projecten beschikbaar
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl font-semibold leading-[1.08] tracking-tight text-zinc-50 lg:text-6xl"
            >
              Websites, webshops en systemen{" "}
              <span className="text-brand">die echt presteren</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-[560px] text-lg leading-relaxed text-zinc-400"
            >
              Voor bedrijven die strakker willen bouwen, beter willen converteren en slimmer
              willen werken.
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
                <Link href="/nl/intake">Project starten</Link>
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

            <motion.div variants={itemVariants} className="mt-5 flex items-center gap-2">
              <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-700" aria-hidden="true" />
              <span className="text-xs text-zinc-600">
                Premium uitvoering <span className="text-zinc-500">| Reactie binnen 24 uur</span>
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex items-center gap-4"
            >
              <div className="h-px w-8 bg-brand/40" />
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                Build | Systems | Growth
              </span>
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
                <EcosystemMock />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

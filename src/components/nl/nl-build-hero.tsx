"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function BrowserMock() {
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
            "radial-gradient(ellipse 85% 70% at 50% 50%, rgba(73,160,164,0.14) 0%, transparent 65%)",
        }}
      />

      <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex h-9 items-center gap-3 border-b border-zinc-800 bg-zinc-950/60 px-4">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700/80" />
          </div>
          <div className="ml-2 flex h-5 max-w-[200px] flex-1 items-center rounded-md bg-zinc-800/80 px-2.5">
            <div className="mr-1.5 h-2 w-2 rounded-full bg-zinc-700/60" />
            <span className="text-[9px] tracking-wide text-zinc-600">
              client.inovense.nl
            </span>
          </div>
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

        <div className="flex h-10 items-center justify-between border-b border-zinc-800/50 bg-zinc-900/40 px-5">
          <div className="h-3 w-16 rounded bg-zinc-700/60" />
          <div className="flex items-center gap-3">
            <div className="h-2 w-7 rounded bg-zinc-800/80" />
            <div className="h-2 w-7 rounded bg-zinc-800/80" />
            <div className="h-2 w-7 rounded bg-zinc-800/80" />
            <div className="h-5 w-[68px] rounded-full border border-brand/35 bg-brand/18" />
          </div>
        </div>

        <div className="px-5 pb-5 pt-6">
          <div className="mb-3 h-1.5 w-14 rounded-full bg-brand/40" />
          <div className="mb-3 space-y-2">
            <div className="h-[14px] w-[88%] rounded bg-zinc-700/60" />
            <div className="h-[14px] w-[73%] rounded bg-zinc-700/50" />
            <div className="h-[14px] w-[56%] rounded bg-zinc-700/40" />
          </div>
          <div className="mb-4 space-y-1.5">
            <div className="h-2 w-[68%] rounded bg-zinc-800/80" />
            <div className="h-2 w-[54%] rounded bg-zinc-800/60" />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-[96px] rounded-full border border-brand/40 bg-brand/22" />
            <div className="h-7 w-[80px] rounded-full border border-zinc-700/60" />
          </div>
        </div>

        <div className="mx-5 h-px bg-zinc-800/60" />

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

        <div className="flex items-center gap-6 border-t border-zinc-800/40 bg-zinc-950/40 px-5 py-2">
          {[
            { label: "Snelheid", score: "98" },
            { label: "Toegankelijkheid", score: "100" },
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

export default function NlBuildHero() {
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
        className="animate-ambient-pulse pointer-events-none absolute -left-[10%] top-[-15%] h-[90vh] w-[80%]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 30% 40%, rgba(73,160,164,0.15) 0%, rgba(73,160,164,0.03) 50%, transparent 70%)",
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
                Build | Lane 01
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-50 sm:text-5xl lg:text-6xl"
            >
              Websites en webshops die vertrouwen{" "}
              <em className="not-italic text-brand">wekken</em> en converteren.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-[440px] text-base leading-relaxed text-zinc-400 sm:text-lg"
            >
              Op maat gebouwde websites en Shopify-winkels die presteren, niet alleen mooi zijn.
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
                <Link href="/nl/intake">Start een build project</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-zinc-700 bg-transparent px-8 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
              >
                <Link href="/nl/process">Bekijk het proces</Link>
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-5 flex items-center gap-2">
              <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-700" aria-hidden="true" />
              <span className="text-xs text-zinc-600">
                We bouwen voor bedrijven die meer nodig hebben dan een template.
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex items-center gap-4"
            >
              <div className="h-px w-8 bg-brand/40" />
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                Build lane | Inovense
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

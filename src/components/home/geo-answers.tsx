import Link from "next/link";
import { INOVENSE_HOME_FAQS } from "@/lib/geo";

const laneClarity = [
  {
    lane: "Build",
    href: "/build",
    focus: "Websites and digital products built to convert.",
    signal: "Right fit when traffic exists but the site is not converting.",
    cta: "See Build",
  },
  {
    lane: "Systems",
    href: "/systems",
    focus: "AI automation and internal tools that remove manual bottlenecks.",
    signal: "Right fit when manual work or broken handoffs are limiting your team.",
    cta: "See Systems",
  },
  {
    lane: "Growth",
    href: "/growth",
    focus: "SEO, content, and paid media that compound over time.",
    signal: "Right fit when the business runs well but inbound is not growing.",
    cta: "See Growth",
  },
] as const;

const questionLinks: Record<
  (typeof INOVENSE_HOME_FAQS)[number]["question"],
  { href: string; label: string }
> = {
  "What does Inovense do?": { href: "/process", label: "How delivery works" },
  "What is the difference between Build, Systems, and Growth?": {
    href: "/build",
    label: "See Build lane",
  },
  "Who is Inovense for?": { href: "/intake", label: "Fit and intake" },
  "When should a company invest in systems or automation?": {
    href: "/systems",
    label: "See Systems lane",
  },
  "When is a website problem actually a trust or conversion problem?": {
    href: "/web-design",
    label: "Web design service",
  },
  "When does growth fail because the system leaks?": {
    href: "/lead-generation-systems",
    label: "Lead systems service",
  },
  "What kind of clients are the best fit for Inovense?": {
    href: "/intake",
    label: "Best-fit projects",
  },
};

const proofSurfaces = [
  {
    title: "SilentSpend case",
    note: "Product and systems case with live interface captures.",
    href: "/work/silentspend",
  },
  {
    title: "Build outcomes",
    note: "Website and digital product outcomes.",
    href: "/build#build-work",
  },
  {
    title: "Systems outcomes",
    note: "Automation and workflow outcomes.",
    href: "/systems#systems-work",
  },
  {
    title: "Growth outcomes",
    note: "SEO and demand outcomes.",
    href: "/growth#growth-work",
  },
] as const;

const VISIBLE_FAQS = INOVENSE_HOME_FAQS.slice(0, 4);

export default function GeoAnswers() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 md:items-end">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-brand">
              Service clarity
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Answers first. Hype last.
            </h2>
            <Link
              href="/answers"
              className="mt-3 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Full service-fit answers
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
          <p className="text-sm leading-relaxed text-zinc-500 md:text-right">
            Clear lane definitions, fit signals, and proof so you know where to start.
          </p>
        </div>

        {/* Lane cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {laneClarity.map((lane) => (
            <Link
              key={lane.lane}
              href={lane.href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-900"
            >
              {/* Top accent line */}
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/70 transition-transform duration-300 ease-out group-hover:scale-x-100" />

              {/* Subtle hover overlay */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-inset ring-brand/20 transition-opacity duration-200 group-hover:opacity-100" />

              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-100 transition-colors group-hover:text-zinc-50">
                  {lane.lane}
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden
                  className="text-zinc-600 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
                >
                  <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <p className="mb-2 text-sm leading-snug text-zinc-300">{lane.focus}</p>
              <p className="mb-4 text-xs leading-relaxed text-zinc-500">{lane.signal}</p>

              <div className="mt-auto flex items-center gap-1">
                <span className="text-xs font-medium text-zinc-500 transition-colors group-hover:text-brand">
                  {lane.cta}
                </span>
                <svg
                  width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden
                  className="text-zinc-600 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
                >
                  <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom: Q&A + Proof */}
        <div className="grid grid-cols-1 gap-6 border-t border-zinc-800/70 pt-8 md:grid-cols-2">

          {/* Questions answered */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-600">
              Questions answered
            </h3>
            <div className="space-y-2.5">
              {VISIBLE_FAQS.map((faq) => (
                <Link
                  key={faq.question}
                  href={questionLinks[faq.question].href}
                  className="group block rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-4 transition-all duration-200 hover:border-zinc-700/80 hover:bg-zinc-900/60"
                >
                  <p className="mb-1.5 text-[13px] font-semibold leading-snug text-zinc-100 transition-colors group-hover:text-zinc-50">
                    {faq.question}
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-500">{faq.answer}</p>
                  <p className="mt-2 text-[11px] text-zinc-600 transition-colors group-hover:text-zinc-400">
                    {questionLinks[faq.question].label} →
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Proof and work */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-600">
              Proof and work
            </h3>
            <div className="space-y-2.5">
              {proofSurfaces.map((surface) => (
                <Link
                  key={surface.title}
                  href={surface.href}
                  className="group flex items-center justify-between rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-4 transition-all duration-200 hover:border-zinc-700/80 hover:bg-zinc-900/60"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-[13px] font-semibold text-zinc-100 transition-colors group-hover:text-zinc-50">
                      {surface.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{surface.note}</p>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden
                    className="shrink-0 text-zinc-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-400"
                  >
                    <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { INOVENSE_HOME_FAQS } from "@/lib/geo";

const laneClarity = [
  {
    lane: "Build",
    href: "/build",
    focus: "Website trust, conversion flow, and digital product quality.",
    signal:
      "Use Build when traffic exists but the site experience is costing credibility or conversion.",
    detailHref: "/web-design",
    detailLabel: "Web design service",
  },
  {
    lane: "Systems",
    href: "/systems",
    focus: "Operational leverage through automation, routing, and tooling.",
    signal:
      "Use Systems when growth is limited by manual process, broken handoffs, or disconnected tools.",
    detailHref: "/ai-automation",
    detailLabel: "AI automation service",
  },
  {
    lane: "Growth",
    href: "/growth",
    focus: "Compounding demand through SEO, content, and conversion-ready distribution.",
    signal:
      "Use Growth when execution is consistent but inbound demand and signal quality are not compounding.",
    detailHref: "/lead-generation-systems",
    detailLabel: "Lead generation systems",
  },
] as const;

const questionLinks: Record<
  (typeof INOVENSE_HOME_FAQS)[number]["question"],
  { href: string; label: string }
> = {
  "What does Inovense do?": { href: "/process", label: "How delivery works" },
  "What is the difference between Build, Systems, and Growth?": {
    href: "/build",
    label: "Compare lanes",
  },
  "Who is Inovense for?": { href: "/intake", label: "Fit and intake" },
  "When should a company invest in systems or automation?": {
    href: "/systems",
    label: "Systems lane",
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
    note: "Detailed product and systems proof with live interface captures.",
    href: "/work/silentspend",
  },
  {
    title: "Build outcomes",
    note: "Service-linked website and digital product outcomes.",
    href: "/build#build-work",
  },
  {
    title: "Systems outcomes",
    note: "Automation and workflow outcomes tied to operational bottlenecks.",
    href: "/systems#systems-work",
  },
  {
    title: "Growth outcomes",
    note: "SEO and demand outcomes tied to acquisition performance.",
    href: "/growth#growth-work",
  },
] as const;

export default function GeoAnswers() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Inovense clarity layer
            </p>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Answers first. Hype last.
            </h2>
            <Link
              href="/answers"
              className="mt-4 inline-flex text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Open full service-fit answers
            </Link>
          </div>
          <div className="flex items-end">
            <p className="max-w-md text-sm leading-relaxed text-zinc-500">
              This section exists so buyers, search engines, and AI systems can
              interpret Inovense the same way: clear lane definitions, explicit
              fit signals, and proof surfaces that map to real delivery.
            </p>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {laneClarity.map((lane) => (
            <article
              key={lane.lane}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6"
            >
              <Link
                href={lane.href}
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-200 transition-colors hover:text-zinc-50"
              >
                {lane.lane}
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2.5 6h7M6.5 3l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <p className="mb-3 text-sm leading-relaxed text-zinc-400">{lane.focus}</p>
              <p className="text-xs leading-relaxed text-zinc-500">{lane.signal}</p>
              <Link
                href={lane.detailHref}
                className="mt-4 inline-flex text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                {lane.detailLabel}
              </Link>
            </article>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-zinc-800/70 pt-12 md:grid-cols-2">
          <div>
            <h3 className="mb-6 text-lg font-semibold tracking-tight text-zinc-100">
              Public questions answered clearly
            </h3>
            <div className="space-y-5">
              {INOVENSE_HOME_FAQS.map((faq) => (
                <article key={faq.question} className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-5">
                  <p className="mb-2 text-sm font-semibold text-zinc-100">{faq.question}</p>
                  <p className="text-sm leading-relaxed text-zinc-500">{faq.answer}</p>
                  <Link
                    href={questionLinks[faq.question].href}
                    className="mt-3 inline-flex text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    {questionLinks[faq.question].label}
                  </Link>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-lg font-semibold tracking-tight text-zinc-100">
              Proof and citation surfaces
            </h3>
            <div className="space-y-4">
              {proofSurfaces.map((surface) => (
                <article
                  key={surface.title}
                  className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-5"
                >
                  <Link
                    href={surface.href}
                    className="text-sm font-semibold text-zinc-200 transition-colors hover:text-zinc-50"
                  >
                    {surface.title}
                  </Link>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{surface.note}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

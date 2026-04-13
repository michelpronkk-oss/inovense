import Link from "next/link";

type ServiceKey = "build" | "systems" | "growth";

const services: Record<
  ServiceKey,
  { label: string; href: string; description: string }
> = {
  build: {
    label: "Build",
    href: "/build",
    description: "Websites and digital products",
  },
  systems: {
    label: "Systems",
    href: "/systems",
    description: "AI workflows and automation",
  },
  growth: {
    label: "Growth",
    href: "/growth",
    description: "SEO, content, and paid growth",
  },
};

const laneGuidance: Record<
  ServiceKey,
  {
    question: string;
    answer: string;
    serviceLinks: Array<{ label: string; href: string }>;
    proofLink: { label: string; href: string };
  }
> = {
  build: {
    question: "When should you choose Build?",
    answer:
      "Choose Build when trust, conversion, or digital product quality is the bottleneck. If your offer is strong but the site experience is underperforming, this is the right lane.",
    serviceLinks: [
      { label: "Web Design", href: "/web-design" },
      { label: "Shopify Design", href: "/shopify-design" },
      { label: "SaaS Design", href: "/saas-design" },
    ],
    proofLink: { label: "Build outcome references", href: "/build#build-work" },
  },
  systems: {
    question: "When should you choose Systems?",
    answer:
      "Choose Systems when manual operations, routing errors, or disconnected tools are creating avoidable revenue leakage and team friction.",
    serviceLinks: [
      { label: "AI Automation", href: "/ai-automation" },
      { label: "Lead Generation Systems", href: "/lead-generation-systems" },
      { label: "Internal Tools", href: "/internal-tools" },
    ],
    proofLink: { label: "Systems outcome references", href: "/systems#systems-work" },
  },
  growth: {
    question: "When should you choose Growth?",
    answer:
      "Choose Growth when core delivery works but qualified demand is not compounding. Growth lane work focuses on durable acquisition systems instead of short spikes.",
    serviceLinks: [
      { label: "Lead Generation Systems", href: "/lead-generation-systems" },
      { label: "Process", href: "/process" },
    ],
    proofLink: { label: "Growth outcome references", href: "/growth#growth-work" },
  },
};

const ArrowRight = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden
    className="shrink-0 transition-transform group-hover:translate-x-0.5"
  >
    <path
      d="M2.5 6h7M6.5 3l3 3-3 3"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function RelatedServices({ current }: { current: ServiceKey }) {
  const others = Object.entries(services)
    .filter(([key]) => key !== current)
    .map(([, val]) => val);
  const guidance = laneGuidance[current];

  return (
    <section className="border-t border-zinc-800/60 py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 rounded-xl border border-zinc-800/70 bg-zinc-900/35 p-6">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-600">
            Lane guidance
          </p>
          <h3 className="mb-3 text-lg font-semibold tracking-tight text-zinc-100">
            {guidance.question}
          </h3>
          <p className="text-sm leading-relaxed text-zinc-500">{guidance.answer}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {guidance.serviceLinks.map((serviceLink) => (
              <Link
                key={serviceLink.href}
                href={serviceLink.href}
                className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
              >
                {serviceLink.label}
              </Link>
            ))}
            <Link
              href={guidance.proofLink.href}
              className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
            >
              {guidance.proofLink.label}
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <p className="shrink-0 pt-0.5 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-700 sm:w-44">
            Also from Inovense
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-5">
            {others.map((s) => (
              <Link key={s.href} href={s.href} className="group flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition-colors group-hover:text-zinc-50">
                  {s.label}
                  <ArrowRight />
                </span>
                <span className="text-xs text-zinc-600 transition-colors group-hover:text-zinc-500">
                  {s.description}
                </span>
              </Link>
            ))}
            <Link href="/process" className="group flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition-colors group-hover:text-zinc-50">
                Process
                <ArrowRight />
              </span>
              <span className="text-xs text-zinc-600 transition-colors group-hover:text-zinc-500">
                How every project works
              </span>
            </Link>
            <Link href="/answers" className="group flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition-colors group-hover:text-zinc-50">
                Service Fit Answers
                <ArrowRight />
              </span>
              <span className="text-xs text-zinc-600 transition-colors group-hover:text-zinc-500">
                Compare website, systems, and growth problems
              </span>
            </Link>
            <Link href="/work/silentspend" className="group flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition-colors group-hover:text-zinc-50">
                SilentSpend Case
                <ArrowRight />
              </span>
              <span className="text-xs text-zinc-600 transition-colors group-hover:text-zinc-500">
                Product and systems proof surface
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

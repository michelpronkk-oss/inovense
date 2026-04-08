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

  return (
    <section className="border-t border-zinc-800/60 py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <p className="shrink-0 pt-0.5 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-700 sm:w-44">
            Also from Inovense
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-5">
            {others.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group flex flex-col gap-0.5"
              >
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
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

const services = [
  {
    id: "build",
    label: "Build",
    href: "/build",
    tagline: "Websites & Webshops",
    description:
      "Conversion-optimized websites and Shopify stores built to earn trust, generate leads, and sell.",
    deliverables: [
      "Custom website design",
      "Shopify stores",
      "Landing pages",
      "Redesign and migration",
    ],
  },
  {
    id: "systems",
    label: "Systems",
    href: "/systems",
    tagline: "Smart Systems",
    description:
      "AI automation, CRM workflows, and operational tooling that removes friction and saves hours.",
    deliverables: [
      "AI workflow automation",
      "CRM and pipeline logic",
      "Internal tooling",
      "Integrations and APIs",
    ],
  },
  {
    id: "growth",
    label: "Growth",
    href: "/growth",
    tagline: "Growth Campaigns",
    description:
      "Paid media, content strategy, and lead generation built to drive qualified traffic and pipeline.",
    deliverables: [
      "Paid social campaigns",
      "Search and SEO",
      "Lead generation funnels",
      "Content and email nurture",
    ],
  },
];

export default function Services() {
  return (
    <section id="services" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            What we build
          </p>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Three ways we grow your business.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 md:text-base">
            Every project is scoped, built, and delivered to produce real commercial output.
          </p>
        </div>

        {/* Cards — each card links to its own service page for sitelink-readiness */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.id}
              href={service.href}
              id={service.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900"
            >
              {/* Brand accent line: slides in from left on hover */}
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <div className="mb-6">
                <span className="text-xs font-medium uppercase tracking-widest text-brand">
                  {service.label}
                </span>
              </div>

              <p className="mb-4 text-lg font-medium leading-snug text-zinc-50">
                {service.tagline}
              </p>

              <p className="mb-8 text-sm leading-relaxed text-zinc-500">
                {service.description}
              </p>

              <ul className="mt-auto space-y-2.5 border-t border-zinc-800 pt-6">
                {service.deliverables.map((d) => (
                  <li key={d} className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-brand" />
                    {d}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors group-hover:text-brand">
                Explore {service.label}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M2.5 7h9M7.5 3.5L11 7l-3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}

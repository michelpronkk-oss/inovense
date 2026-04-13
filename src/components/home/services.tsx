import Link from "next/link";

const services = [
  {
    id: "build",
    label: "Build",
    href: "/build",
    tagline: "Websites & digital products engineered to convert.",
    description:
      "From landing pages to full-stack builds. Every decision is made with performance and conversion in mind. No template shortcuts.",
    deliverables: [
      "Web design & development",
      "Landing pages & microsites",
      "E-commerce builds",
      "Full-stack web applications",
    ],
  },
  {
    id: "systems",
    label: "Systems",
    href: "/systems",
    tagline: "AI automation and tooling that multiplies your output.",
    description:
      "We design and build AI workflows, process automation, and internal tooling that remove bottlenecks and compound over time.",
    deliverables: [
      "AI workflow design & build",
      "Process automation",
      "CRM & ops setup",
      "Lead qualification systems",
    ],
  },
  {
    id: "growth",
    label: "Growth",
    href: "/growth",
    tagline: "Content, SEO, and paid infrastructure built to compound.",
    description:
      "Growth systems that build pipeline over time. Not monthly reports. Content that ranks, converts, and compounds regardless of market.",
    deliverables: [
      "Content strategy & production",
      "SEO infrastructure",
      "Paid media systems",
      "Social & authority building",
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
            Three lanes. One execution standard.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 md:text-base">
            Build improves trust and conversion at the experience layer. Systems
            removes operational bottlenecks through automation and tooling.
            Growth compounds qualified demand through SEO, content, and
            distribution.
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

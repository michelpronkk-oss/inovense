const offerings = [
  {
    number: "01",
    title: "Brand Websites",
    description:
      "The complete digital presence. Architecture, design, and build done together, not handed off between teams. Built to convert and hold up under scrutiny.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "Landing Pages",
    description:
      "High-conversion pages for campaigns, product launches, and lead capture. Fast, focused, and worth every dollar of your ad spend.",
    tag: null,
  },
  {
    number: "03",
    title: "E-commerce Builds",
    description:
      "From Shopify to custom stack. Built around how people actually buy: brand-level finish, mobile-first, and structured to convert at every step.",
    tag: null,
  },
  {
    number: "04",
    title: "Microsites",
    description:
      "Standalone experiences for launches, campaigns, and brand moments that deserve more than a page on your main site.",
    tag: null,
  },
  {
    number: "05",
    title: "Digital Products",
    description:
      "Web apps, SaaS interfaces, client portals, and tools. Production-grade code, designed to the same standard as the rest of your brand.",
    tag: null,
  },
];

export default function BuildOfferings() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Scope
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Everything that falls
              <br />
              <span className="text-zinc-500">under Build.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Each project is scoped from your brief. Nothing reskinned,
              nothing templated, nothing pulled from a starter kit.
            </p>
          </div>
        </div>

        {/* Numbered list: editorial spec-sheet layout */}
        <div className="divide-y divide-zinc-800/70">
          {offerings.map((o) => (
            <div
              key={o.number}
              className="group flex flex-col gap-4 py-8 transition-colors duration-200 hover:bg-zinc-900/20 md:flex-row md:items-start md:gap-0 md:py-10 md:-mx-6 md:px-6 md:rounded-xl"
            >
              {/* Number */}
              <span className="w-14 shrink-0 font-mono text-xs font-medium text-brand/70 md:pt-0.5">
                {o.number}
              </span>

              {/* Title + tag */}
              <div className="shrink-0 md:w-[220px] md:pr-8">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-zinc-50">
                    {o.title}
                  </h3>
                  {o.tag && (
                    <span className="rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                      {o.tag}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="flex-1 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400 md:max-w-none">
                {o.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

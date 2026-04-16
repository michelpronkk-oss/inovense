const offerings = [
  {
    number: "01",
    title: "Conversion-focused website",
    description:
      "Multi-page websites built around your offer, your audience, and your conversion goals. Clean, fast, and built to earn trust from the first visit.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "Shopify store",
    description:
      "Full Shopify builds including product setup, custom design, payment flow, and post-launch optimisation.",
    tag: null,
  },
  {
    number: "03",
    title: "Landing pages",
    description:
      "High-converting landing pages for campaigns, launches, and lead generation — built fast and A/B-ready.",
    tag: null,
  },
  {
    number: "04",
    title: "Redesign and migration",
    description:
      "Existing site underperforming? We rebuild from a clean foundation — faster, sharper, and better converting.",
    tag: null,
  },
  {
    number: "05",
    title: "CMS and content layer",
    description:
      "Full CMS setup so your team can update content without touching code.",
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
              What&apos;s included
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              What we build.
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Every Build project is scoped and delivered as a custom solution.
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

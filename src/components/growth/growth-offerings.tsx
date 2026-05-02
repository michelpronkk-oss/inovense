const offerings = [
  {
    number: "01",
    title: "Paid campaign systems",
    description:
      "Meta, LinkedIn, and search campaigns scoped to qualified lead quality, not vanity reach. Every campaign is tied to a conversion objective.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "Search and discovery",
    description:
      "Google Ads and SEO strategy for businesses that need consistent inbound volume from high-intent traffic.",
    tag: null,
  },
  {
    number: "03",
    title: "Landing page and offer variants",
    description:
      "Variant-based landing pages, offer angles, and call-to-action structures built for testing, learning, and conversion improvement.",
    tag: null,
  },
  {
    number: "04",
    title: "Proof loops and content systems",
    description:
      "Content and proof distribution systems designed to reinforce trust, support campaigns, and improve inbound quality over time.",
    tag: null,
  },
  {
    number: "05",
    title: "Follow-up and nurture flow",
    description:
      "Email and CRM nurture sequences that carry qualified leads from first response through sales conversation and close readiness.",
    tag: null,
  },
  {
    number: "06",
    title: "Performance and signal audits",
    description:
      "Recurring reviews that identify drop-off points by source, asset, and funnel step, then prioritize the next conversion tests.",
    tag: null,
  },
];

export default function GrowthOfferings() {
  return (
    <section
      id="growth-offerings"
      className="border-t border-white/[0.06] py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              What we run
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Growth work that compounds commercial signal.
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Every Growth engagement is scoped as an iteration system connected to Build and Systems, not as isolated channel work.
            </p>
          </div>
        </div>

        {/* Numbered list */}
        <div className="divide-y divide-zinc-800/70">
          {offerings.map((o) => (
            <div
              key={o.number}
              className="group flex flex-col gap-4 py-8 transition-colors duration-200 hover:bg-zinc-900/20 md:flex-row md:items-start md:gap-0 md:py-10 md:-mx-6 md:px-6 md:rounded-xl"
            >
              <span className="w-14 shrink-0 font-mono text-xs font-medium text-brand/70 md:pt-0.5">
                {o.number}
              </span>

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

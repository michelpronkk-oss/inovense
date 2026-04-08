const outcomes = [
  {
    client: "B2B SaaS Company",
    category: "SEO Infrastructure + Content System",
    outcome:
      "Organic pipeline grew from near-zero to the primary acquisition channel within six months. Content system now runs on cadence, compounds monthly, and requires no manual coordination.",
    result: "SEO architecture built · Content system live · Organic now primary channel",
    tags: ["SEO Infrastructure", "Content Systems", "Reporting"],
  },
  {
    client: "E-commerce Brand",
    category: "Paid Media + Landing Pages",
    outcome:
      "ROAS improved significantly after restructuring campaign architecture and rebuilding landing pages around real conversion intent. Less spend, better margin, cleaner signal.",
    result: "Campaign architecture rebuilt · Landing pages optimised · Spend efficiency improved",
    tags: ["Paid Media", "Landing Page Optimization", "Conversion"],
  },
  {
    client: "Professional Services Firm",
    category: "Content + Signal Reporting",
    outcome:
      "Monthly qualified inbound tripled after implementing a structured content system and fixing the conversion layer. Reporting now reflects actual pipeline, not vanity numbers.",
    result: "Content system deployed · Reporting rebuilt · Qualified inbound tripled",
    tags: ["Content Systems", "Signal Reporting", "SEO"],
  },
];

export default function GrowthOutcomes() {
  return (
    <section
      id="growth-work"
      className="border-t border-white/[0.06] bg-zinc-900/15 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Outcomes
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Selected Growth outcomes.
            </h2>
          </div>
          <a
            href="#growth-contact"
            className="self-start text-sm font-medium text-zinc-500 transition-colors hover:text-brand md:self-auto"
          >
            Start your growth project →
          </a>
        </div>

        {/* Outcome cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {outcomes.map((o) => (
            <div
              key={o.client}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900"
            >
              {/* Top accent on hover */}
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/60 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <span className="mb-6 text-xs font-medium uppercase tracking-widest text-zinc-600 transition-colors group-hover:text-brand/70">
                {o.category}
              </span>

              <h3 className="mb-4 text-xl font-semibold text-zinc-50">
                {o.client}
              </h3>

              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                {o.outcome}
              </p>

              <p className="mb-6 text-xs leading-relaxed text-zinc-600">
                {o.result}
              </p>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-800 pt-6">
                {o.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-600 transition-colors group-hover:border-zinc-700 group-hover:text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

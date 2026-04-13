const outcomes = [
  {
    id: "b2b-saas-growth",
    client: "B2B SaaS Company",
    category: "SEO Infrastructure and Content System",
    whatChanged:
      "Acquisition moved from ad hoc publishing to an integrated SEO and content operating system with clear production cadence.",
    resultSnapshot:
      "Organic pipeline moved from near-zero to primary channel while reducing manual coordination overhead.",
    proofType: "Compounding inbound pipeline",
    tags: ["SEO Infrastructure", "Content Systems", "Reporting"],
  },
  {
    id: "ecommerce-paid-media",
    client: "E-commerce Brand",
    category: "Paid Media and Landing Pages",
    whatChanged:
      "Campaign architecture and landing page intent mapping were rebuilt around conversion quality instead of volume alone.",
    resultSnapshot:
      "Spend efficiency improved through stronger message-match, cleaner signal, and better margin outcomes.",
    proofType: "Conversion quality and spend efficiency",
    tags: ["Paid Media", "Landing Page Optimization", "Conversion"],
  },
  {
    id: "services-content-signal",
    client: "Professional Services Firm",
    category: "Content and Signal Reporting",
    whatChanged:
      "Content strategy and reporting were redesigned to prioritize qualified inbound signal over vanity metrics.",
    resultSnapshot:
      "Qualified inbound increased materially and reporting became directly tied to pipeline reality.",
    proofType: "Qualified demand and signal quality",
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
            Start your growth project
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {outcomes.map((item) => (
            <article
              id={item.id}
              key={item.client}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/60 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <span className="mb-6 text-xs font-medium uppercase tracking-widest text-zinc-600 transition-colors group-hover:text-brand/70">
                {item.category}
              </span>

              <h3 className="mb-4 text-xl font-semibold text-zinc-50">
                {item.client}
              </h3>

              <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                What changed
              </p>
              <p className="mb-4 text-sm leading-relaxed text-zinc-500">
                {item.whatChanged}
              </p>

              <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                Result snapshot
              </p>
              <p className="mb-4 text-sm leading-relaxed text-zinc-500">
                {item.resultSnapshot}
              </p>

              <p className="mb-6 text-xs text-zinc-600">{item.proofType}</p>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-800 pt-6">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-600 transition-colors group-hover:border-zinc-700 group-hover:text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

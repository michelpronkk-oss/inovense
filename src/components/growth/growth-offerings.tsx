const offerings = [
  {
    number: "01",
    title: "SEO Infrastructure",
    description:
      "Technical SEO, content architecture, and indexation strategy built to compound over time. Not a checklist exercise. A long-term acquisition channel designed and executed with precision.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "Content Systems",
    description:
      "Structured content programs built around your target audience and search intent. Editorial rhythm, quality control, and distribution logic that scales without turning into noise.",
    tag: null,
  },
  {
    number: "03",
    title: "Paid Media Systems",
    description:
      "Campaign architecture, targeting structure, and spend governance for paid channels. Built to acquire at margin, not just generate impressions or inflate vanity numbers.",
    tag: null,
  },
  {
    number: "04",
    title: "Landing Page Optimization",
    description:
      "Conversion-focused pages tested against real traffic. Copy, layout, and CTA logic refined against signal from your actual audience, not assumptions from a template.",
    tag: null,
  },
  {
    number: "05",
    title: "Reporting and Signal Loops",
    description:
      "Dashboards and reporting infrastructure that surface what matters. Decision-grade data delivered to the right people, not vanity metric spreadsheets sent weekly.",
    tag: null,
  },
  {
    number: "06",
    title: "Distribution Systems",
    description:
      "Structured distribution logic that gets the right content to the right audience through the right channels. Consistent, compounding, and tied to measurable outcomes.",
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
              Scope
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Everything that falls
              <br />
              <span className="text-zinc-500">under Growth.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Each growth engagement is designed around your specific business
              model and acquisition goals. No generic playbooks, no activity for
              its own sake.
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

const differences = [
  {
    number: "01",
    title: "Performance architecture",
    body: "Core Web Vitals, load speed, and server performance are designed in from day one. Not patched in at the end. We target green across the board.",
  },
  {
    number: "02",
    title: "Conversion-led layout",
    body: "Every section, headline, and CTA placement is informed by how your target user makes decisions. We design for outcomes, not aesthetics alone.",
  },
  {
    number: "03",
    title: "Brand-level polish",
    body: "Mobile typography, spacing, micro-detail, and responsive behavior executed at a standard that matches your positioning. Not what a template defaults to.",
  },
  {
    number: "04",
    title: "Built from scratch, every time",
    body: "We don't start from a theme and customize outward. We start from your brief and build in. Every component exists because it needs to.",
  },
  {
    number: "05",
    title: "Clean ownership & handoff",
    body: "You own the code, the assets, the CMS, and the deployment. Full documentation, clean repo, and a handoff that doesn't leave you dependent on us.",
  },
  {
    number: "06",
    title: "SEO-ready from launch",
    body: "Semantic structure, metadata, Open Graph, and performance baked in from the start. You launch with what search engines reward, not what you retrofit later.",
  },
];

export default function BuildDifference() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            The difference
          </p>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            What separates our builds.
          </h2>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {differences.map((d) => (
            <div
              key={d.number}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-7 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              {/* Hover top accent */}
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/70 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <div className="flex gap-5">
                <span className="mt-0.5 shrink-0 font-mono text-xs font-medium text-brand">
                  {d.number}
                </span>
                <div>
                  <h3 className="mb-2.5 text-base font-semibold leading-snug text-zinc-50">
                    {d.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                    {d.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

const differences = [
  {
    number: "01",
    title: "We optimize the full conversion loop",
    body: "Traffic, landing experience, intake quality, and follow-up are treated as one system. We do not isolate the ad from the handoff.",
  },
  {
    number: "02",
    title: "Commercial goals come first",
    body: "We measure by qualified pipeline signal and close quality, not surface engagement metrics. If signal drops, we adjust quickly.",
  },
  {
    number: "03",
    title: "Fast iteration with clear evidence",
    body: "Creative, offer, and page variants are tested in structured cycles so decisions come from evidence instead of opinion.",
  },
  {
    number: "04",
    title: "Source-to-lead visibility",
    body: "We track which sources and assets produce qualified conversations, then reallocate effort to the highest-leverage opportunities.",
  },
  {
    number: "05",
    title: "Operator-grade reporting",
    body: "Reporting is designed for action: what changed, what improved, where leads leaked, and what we test next.",
  },
];

export default function GrowthDifference() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            The difference
          </p>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Why our growth work converts.
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

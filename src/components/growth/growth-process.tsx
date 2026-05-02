const steps = [
  {
    number: "01",
    title: "Audit and Baseline",
    body: "We audit channel performance, landing behavior, lead quality, and handoff outcomes to establish a clear baseline before changes are made.",
    note: "Evidence before strategy",
  },
  {
    number: "02",
    title: "Strategy and Architecture",
    body: "We design an acquisition plan around business model, margin reality, and conversion constraints. This includes assets, funnel variants, and testing priorities.",
    note: "Built for your business",
  },
  {
    number: "03",
    title: "Build and Launch",
    body: "Campaign setup, asset production, landing variants, and tracking implementation are launched as one coordinated system.",
    note: "Production-grade standard",
  },
  {
    number: "04",
    title: "Optimise and Compound",
    body: "We run recurring test cycles based on source-to-lead evidence. Winning patterns are scaled, weak points are replaced, and performance compounds instead of resetting monthly.",
    note: "Long-term compounding",
  },
];

export default function GrowthProcess() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            Growth process
          </p>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From baseline to compounding demand.
          </h2>
        </div>

        {/* Steps */}
        <div className="divide-y divide-zinc-800/70">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group flex flex-col gap-6 py-8 transition-colors hover:bg-zinc-900/20 md:flex-row md:items-start md:gap-0 md:py-10 md:-mx-6 md:px-6 md:rounded-xl"
            >
              {/* Step number */}
              <div className="flex shrink-0 items-center gap-4 md:w-16 md:flex-col md:items-start md:gap-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/35 bg-brand/10 font-mono text-xs font-semibold text-brand">
                  {step.number}
                </span>
              </div>

              {/* Title + note */}
              <div className="shrink-0 md:w-[220px] md:pr-8 md:pt-1.5">
                <h3 className="mb-1.5 text-base font-semibold text-zinc-50">
                  {step.title}
                </h3>
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                  {step.note}
                </span>
              </div>

              {/* Body */}
              <p className="flex-1 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400 md:pt-1.5">
                {step.body}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

const steps = [
  {
    number: "01",
    title: "Strategy call",
    body: "We understand your goals, constraints, and current position. We'll tell you honestly whether we're the right fit. If we're not, we'll point you in the right direction.",
  },
  {
    number: "02",
    title: "Scoped proposal",
    body: "A clear document with exact deliverables, timeline, and price. No sliding scope, no surprise invoices. You know what you're getting before anything starts.",
  },
  {
    number: "03",
    title: "Build & execute",
    body: "We move with precision. Regular updates, clear milestones, and no disappearing acts. You stay informed without needing to chase.",
  },
  {
    number: "04",
    title: "Launch & compound",
    body: "Clean handover with full asset ownership. We don't disappear at launch. We measure, refine, and continue driving results.",
  },
];

export default function Process() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            How we work
          </p>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From first call to compounding results.
          </h2>
        </div>

        {/* Steps grid */}
        {/*
          Timeline line fix:
          - Single absolute line spanning from center of circle 1 to center of circle 4.
          - In a 4-col gap-0 grid, each col is 25% wide. Circles are left-aligned at 1.25rem
            from each col's left edge.
          - Circle 1 center: left = 1.25rem
          - Circle 4 center: left = 75% + 1.25rem  →  right = 25% - 1.25rem
          - Circles get bg-zinc-950 + relative z-10 to cleanly occlude the line beneath them.
        */}
        <div className="relative grid grid-cols-1 gap-0 md:grid-cols-4">

          {/* Single continuous timeline line */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-5 hidden h-px bg-zinc-800 md:block"
            style={{ left: "1.25rem", right: "calc(25% - 1.25rem)" }}
          />

          {steps.map((step, i) => (
            <div key={step.number} className="relative flex flex-col">

              <div className="pr-8 pb-10 md:pb-0">
                {/* Circle node: solid bg occludes the line cleanly */}
                <div className="mb-5 flex items-center">
                  <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-zinc-950 text-xs font-semibold text-brand ring-4 ring-zinc-950">
                    {step.number}
                  </span>
                </div>

                <h3 className="mb-3 text-base font-semibold text-zinc-50">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {step.body}
                </p>
              </div>

              {/* Mobile vertical connector */}
              {i < steps.length - 1 && (
                <div className="mb-10 ml-5 h-10 w-px bg-zinc-800 md:hidden" />
              )}

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

const steps = [
  {
    number: "01",
    title: "Intake & brief",
    body: "We understand your business, your goals, and what a successful outcome looks like before we scope anything.",
  },
  {
    number: "02",
    title: "Scope & proposal",
    body: "You receive a clear, fixed-price proposal. No vague retainers, no scope creep.",
  },
  {
    number: "03",
    title: "Build & deliver",
    body: "We build, test, and deliver to a high standard. You stay informed throughout without being buried in updates.",
  },
  {
    number: "04",
    title: "Launch & support",
    body: "After launch, we support the handoff and make sure everything performs the way it should.",
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
            From brief to results — a clear, controlled process.
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

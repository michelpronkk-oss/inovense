const steps = [
  {
    number: "01",
    title: "Audit and Map",
    body: "We map your current processes, tools, and manual workflows before touching anything. We need to understand what actually exists before we design what comes next.",
    note: "Clarity before design",
  },
  {
    number: "02",
    title: "System Design",
    body: "We design the logic, flow architecture, and integration structure with you. No black boxes. You understand what we are building, why it works that way, and what it connects to.",
    note: "No surprises in production",
  },
  {
    number: "03",
    title: "Build and Test",
    body: "Production-grade implementation with real-world edge-case testing. We stress-test failure states, timing issues, and data integrity before anything goes near your live environment.",
    note: "Reliable from day one",
  },
  {
    number: "04",
    title: "Deploy and Document",
    body: "Clean deployment with full documentation, operator training where needed, and post-launch monitoring. You leave with full ownership of your systems and everything needed to run them.",
    note: "Full ownership, no lock-in",
  },
];

export default function SystemsProcess() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            Systems process
          </p>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From brief to live infrastructure.
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

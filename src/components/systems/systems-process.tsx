const steps = [
  {
    number: "01",
    title: "Audit and Map",
    body: "We map intake, qualification, CRM movement, follow-up, proposal, and onboarding so we can see exactly where qualified leads slow down or drop.",
    note: "Clarity before design",
  },
  {
    number: "02",
    title: "System Design",
    body: "We design flow logic, ownership rules, and integration structure with your team. You understand what is being built, why, and how each handoff works.",
    note: "No surprises in production",
  },
  {
    number: "03",
    title: "Build and Test",
    body: "Production implementation with real-world testing across timing, data integrity, and failure states before anything reaches your live lead flow.",
    note: "Reliable from day one",
  },
  {
    number: "04",
    title: "Deploy and Document",
    body: "Clean deployment with documentation, operator training, and launch monitoring so your team can run and improve the system without external dependency.",
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
            From workflow audit to live client system.
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

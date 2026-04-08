const steps = [
  {
    number: "01",
    title: "Discovery & Brief",
    body: "We get clear on goals, audience, and what success actually looks like. Site structure, conversion priorities, and scope locked before design starts.",
    note: "Alignment before execution",
  },
  {
    number: "02",
    title: "Design Direction",
    body: "Visual language, layout, and component structure reviewed with you. Alignment on direction before a single line of production code gets written.",
    note: "Design-first, no surprises",
  },
  {
    number: "03",
    title: "Build & QA",
    body: "Full-stack development, cross-device QA, performance testing, and accessibility review. Nothing ships until it passes.",
    note: "Production-ready standard",
  },
  {
    number: "04",
    title: "Launch & Handoff",
    body: "Clean deployment with full code and asset ownership. CMS access, documentation, and post-launch support. You leave with everything, owing nothing.",
    note: "Full ownership, no lock-in",
  },
];

export default function BuildProcess() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            Build process
          </p>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From brief to browser.
          </h2>
        </div>

        {/* Two-column list layout: editorial, different from homepage timeline */}
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

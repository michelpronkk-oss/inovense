const outcomes = [
  {
    id: "ecommerce-operator",
    client: "E-commerce Operator",
    category: "AI Workflows and CRM Sync",
    whatChanged:
      "Post-purchase flow, CRM sync, and lead routing were redesigned as one automation system instead of disconnected tasks.",
    resultSnapshot:
      "Three recurring manual processes were removed and day-to-day admin burden dropped across the team.",
    proofType: "Workflow automation and routing reliability",
    tags: ["AI Workflows", "CRM Logic", "Ops Automation"],
  },
  {
    id: "services-firm",
    client: "Professional Services Firm",
    category: "Pipeline Logic and Reporting",
    whatChanged:
      "Proposal triggers, follow-up cadence, and reporting logic were mapped and rebuilt into a consistent operational rhythm.",
    resultSnapshot:
      "Pipeline visibility moved from fragmented to clear, with scheduled reporting and fewer missed handoffs.",
    proofType: "Pipeline reliability and visibility",
    tags: ["CRM Logic", "Reporting Flows", "Automation"],
  },
  {
    id: "high-growth-saas",
    client: "High-Growth SaaS",
    category: "Lead Routing and Onboarding",
    whatChanged:
      "Inbound qualification, scoring, routing, and onboarding triggers were converted into rule-based system behavior.",
    resultSnapshot:
      "Sales teams spent more time on qualified conversations and less time on repetitive routing and onboarding admin.",
    proofType: "Lead qualification and assignment precision",
    tags: ["Lead Routing", "AI Workflows", "Onboarding"],
  },
];

export default function SystemsOutcomes() {
  return (
    <section
      id="systems-work"
      className="border-t border-white/[0.06] bg-zinc-900/15 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Outcomes
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Selected Systems outcomes.
            </h2>
          </div>
          <a
            href="#systems-contact"
            className="self-start text-sm font-medium text-zinc-500 transition-colors hover:text-brand md:self-auto"
          >
            Start your systems project
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

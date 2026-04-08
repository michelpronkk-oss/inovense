const outcomes = [
  {
    client: "E-commerce Operator",
    category: "AI Workflows + CRM Sync",
    outcome:
      "Post-purchase flows, CRM sync, and lead routing all running without manual input. The team moved from daily admin work to focusing on decisions that actually need humans.",
    result: "3 manual processes removed · Full post-purchase flow automated · CRM sync running live",
    tags: ["AI Workflows", "CRM Logic", "Ops Automation"],
  },
  {
    client: "Professional Services Firm",
    category: "Pipeline Logic + Reporting",
    outcome:
      "Pipeline visibility went from chaotic to clear. Proposal triggers, follow-up sequences, and weekly reporting now run on schedule. No chasing. No missed steps.",
    result: "Pipeline restructured · Auto-reporting live · Follow-up sequences running",
    tags: ["CRM Logic", "Reporting Flows", "Automation"],
  },
  {
    client: "High-Growth SaaS",
    category: "Lead Routing + Onboarding",
    outcome:
      "Inbound now qualifies, scores, and assigns itself. Onboarding triggers fire on the right conditions. The sales team spends time on conversations, not admin.",
    result: "Lead scoring built · Routing logic deployed · Onboarding sequences live",
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

        {/* Header */}
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
            Start your systems project →
          </a>
        </div>

        {/* Outcome cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {outcomes.map((o) => (
            <div
              key={o.client}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900"
            >
              {/* Top accent on hover */}
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/60 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <span className="mb-6 text-xs font-medium uppercase tracking-widest text-zinc-600 transition-colors group-hover:text-brand/70">
                {o.category}
              </span>

              <h3 className="mb-4 text-xl font-semibold text-zinc-50">
                {o.client}
              </h3>

              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                {o.outcome}
              </p>

              <p className="mb-6 text-xs leading-relaxed text-zinc-600">
                {o.result}
              </p>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-800 pt-6">
                {o.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-600 transition-colors group-hover:border-zinc-700 group-hover:text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

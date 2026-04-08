const offerings = [
  {
    number: "01",
    title: "AI Workflows",
    description:
      "Custom AI integrations designed around your actual processes. Not general-purpose tools bolted on. Specific, reliable pipelines that handle real operational logic with consistent output.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "Lead Routing Systems",
    description:
      "Structured pipelines that capture, qualify, and route leads to the right place. Faster handoffs, fewer gaps, and no leads falling through the cracks between tools.",
    tag: null,
  },
  {
    number: "03",
    title: "CRM and Pipeline Logic",
    description:
      "Custom CRM configuration, automation logic, and pipeline architecture. Built to match how your team actually sells, follows up, and closes, not how a template assumes they do.",
    tag: null,
  },
  {
    number: "04",
    title: "Internal Dashboards",
    description:
      "Clean operational views that surface what your team needs to see, without burying it in noise. Built for clarity and daily use, not for a demo.",
    tag: null,
  },
  {
    number: "05",
    title: "Ops Automations",
    description:
      "Repetitive operational tasks removed from the queue. Data sync, notifications, scheduling, handoffs, and reporting: all running reliably without manual input.",
    tag: null,
  },
  {
    number: "06",
    title: "Reporting and Decision Flows",
    description:
      "Automated pipelines that deliver the right data to the right people at the right time. Decisions made on current information, not last week's export.",
    tag: null,
  },
];

export default function SystemsOfferings() {
  return (
    <section
      id="systems-offerings"
      className="border-t border-white/[0.06] py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Scope
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Everything that falls
              <br />
              <span className="text-zinc-500">under Systems.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Each system is designed around your specific operations. No
              off-the-shelf workflows, no generic automation templates, no
              tools configured for someone else&apos;s business.
            </p>
          </div>
        </div>

        {/* Numbered list */}
        <div className="divide-y divide-zinc-800/70">
          {offerings.map((o) => (
            <div
              key={o.number}
              className="group flex flex-col gap-4 py-8 transition-colors duration-200 hover:bg-zinc-900/20 md:flex-row md:items-start md:gap-0 md:py-10 md:-mx-6 md:px-6 md:rounded-xl"
            >
              <span className="w-14 shrink-0 font-mono text-xs font-medium text-brand/70 md:pt-0.5">
                {o.number}
              </span>

              <div className="shrink-0 md:w-[220px] md:pr-8">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-zinc-50">
                    {o.title}
                  </h3>
                  {o.tag && (
                    <span className="rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                      {o.tag}
                    </span>
                  )}
                </div>
              </div>

              <p className="flex-1 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400 md:max-w-none">
                {o.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

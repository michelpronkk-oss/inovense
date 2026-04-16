const offerings = [
  {
    number: "01",
    title: "AI-powered lead handling",
    description:
      "Automated intake, qualification, routing, and follow-up flows. Leads handled faster, with less manual effort.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "CRM and pipeline automation",
    description:
      "Custom CRM setups and automated pipeline workflows built around how your team actually sells.",
    tag: null,
  },
  {
    number: "03",
    title: "Operational workflows",
    description:
      "We map, build, and automate the repetitive processes eating your team's time — proposals, onboarding, handoffs, reporting.",
    tag: null,
  },
  {
    number: "04",
    title: "Internal tooling",
    description:
      "Custom admin panels and operator tools built with Next.js and Supabase — fast, private, and built to your exact workflow.",
    tag: null,
  },
  {
    number: "05",
    title: "AI content and document generation",
    description:
      "Automated generation of proposals, briefs, reports, and client-facing documents from your existing data.",
    tag: null,
  },
  {
    number: "06",
    title: "Integrations and API connectors",
    description:
      "We connect your stack — CRM, email, payments, calendar, tools — so data flows cleanly and nothing falls through the cracks.",
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
              What we build
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Systems that run while you work.
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Every system is scoped, built, and handed over so your team can run it without us.
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

const differences = [
  {
    number: "01",
    title: "Practical first",
    body: "We build systems your team can rely on in production. Not experiments. Not proof-of-concepts. Stable, tested infrastructure that handles real load and real edge cases.",
  },
  {
    number: "02",
    title: "Designed for humans",
    body: "Good systems are usable systems. We design the logic and the interface layer so your team adopts what we build, not works around it.",
  },
  {
    number: "03",
    title: "Business fit over feature count",
    body: "We scope to what your business actually needs. Not the largest automation platform on the market. The right one, configured correctly for your operations.",
  },
  {
    number: "04",
    title: "Reliable by design",
    body: "We test for edge cases, failure states, and real-world usage before anything goes live. Systems that fail silently are not systems. They are liabilities.",
  },
  {
    number: "05",
    title: "Friction removed, not hidden",
    body: "Every system we build targets a real source of manual work or operational drag. If your team is still doing something by hand that can run automatically, we address it.",
  },
  {
    number: "06",
    title: "Built to be maintained",
    body: "Clean logic, documented flows, and no duct tape. Systems you can understand, update, and hand to someone else without a full briefing from us.",
  },
];

export default function SystemsDifference() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            The difference
          </p>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            What separates our systems.
          </h2>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {differences.map((d) => (
            <div
              key={d.number}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-7 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              {/* Hover top accent */}
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/70 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <div className="flex gap-5">
                <span className="mt-0.5 shrink-0 font-mono text-xs font-medium text-brand">
                  {d.number}
                </span>
                <div>
                  <h3 className="mb-2.5 text-base font-semibold leading-snug text-zinc-50">
                    {d.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                    {d.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

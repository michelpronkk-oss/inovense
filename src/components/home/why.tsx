const points = [
  {
    number: "01",
    title: "Small team. No handoff chains.",
    body: "We take on a limited number of engagements at a time. The people you meet are the people who build. Senior execution on every project, no account managers in between.",
  },
  {
    number: "02",
    title: "Scoped for outcomes, not hours.",
    body: "Every project is defined by what it needs to deliver. Clear scope, clear deliverables, no open-ended retainers that produce decks instead of results.",
  },
  {
    number: "03",
    title: "We build. We don't just advise.",
    body: "You'll get more shipping updates than strategy calls. We measure success by what moves: rankings, conversions, revenue. Not by what gets reported.",
  },
];

export default function Why() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/30 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Why Inovense
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              We operate differently.
              <br />
              <span className="text-zinc-500">Intentionally.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Most agencies are built to maximize throughput. We&apos;re built
              to maximize outcomes for a smaller number of clients who care about
              results.
            </p>
          </div>
        </div>

        {/* Points: gap-px grid trick for hairline dividers */}
        <div className="grid grid-cols-1 gap-px bg-zinc-800 md:grid-cols-3">
          {points.map((point) => (
            <div
              key={point.number}
              className="group bg-zinc-950 p-8 transition-colors duration-300 hover:bg-zinc-900/80 md:p-10"
            >
              <span className="mb-6 block font-mono text-xs font-medium text-brand">
                {point.number}
              </span>
              <h3 className="mb-4 text-base font-semibold leading-snug text-zinc-50">
                {point.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                {point.body}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

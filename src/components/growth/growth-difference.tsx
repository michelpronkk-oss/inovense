const differences = [
  {
    number: "01",
    title: "Infrastructure over activity",
    body: "We build growth systems, not content calendars. Everything we create is designed to compound and hold up over time, not fill a weekly deliverable quota.",
  },
  {
    number: "02",
    title: "Signal over noise",
    body: "We track what predicts outcomes: qualified traffic, pipeline contribution, and conversion rate. Not impressions, follower counts, or engagement rate theater.",
  },
  {
    number: "03",
    title: "Conversion-focused throughout",
    body: "Every channel, asset, and campaign is measured against one thing: qualified leads and revenue. We do not optimise for awareness metrics that do not move the business.",
  },
  {
    number: "04",
    title: "Clarity in reporting",
    body: "You always know what is working, what is not, and what comes next. No opaque agency reports with vanity metrics buried in deck slides and sent without context.",
  },
  {
    number: "05",
    title: "Consistency over hacks",
    body: "Sustainable growth comes from well-executed fundamentals run with discipline. We do not chase algorithm hacks or short-cycle tactics that decay in six weeks.",
  },
  {
    number: "06",
    title: "Systems that compound",
    body: "The best growth infrastructure improves over time. We build toward compounding returns: SEO authority, audience trust, and conversion improvement that accumulate.",
  },
];

export default function GrowthDifference() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            The difference
          </p>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            What separates our growth work.
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

const differences = [
  {
    number: "01",
    title: "Built to your workflow, not ours",
    body: "We do not fit your business into an off-the-shelf tool. We scope the system around how you already work.",
  },
  {
    number: "02",
    title: "Handed off properly",
    body: "Every system comes with documentation, training, and a clean handoff so your team can own it from day one.",
  },
  {
    number: "03",
    title: "Speed and reliability",
    body: "Systems that respond fast, handle errors cleanly, and keep working when you are not watching.",
  },
  {
    number: "04",
    title: "No bloated middleware",
    body: "We build lean, direct integrations. No unnecessary third-party layers that break every few months.",
  },
  {
    number: "05",
    title: "Commercial impact first",
    body: "Every automation we build is judged by whether it saves real time or improves a commercial outcome. No vanity tooling.",
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
            Why our systems actually get used.
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

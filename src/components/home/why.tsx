const points = [
  {
    number: "01",
    title: "Senior execution, no juniors.",
    body: "Every project is handled by senior specialists. No account managers passing briefs down to juniors.",
  },
  {
    number: "02",
    title: "Custom-built, not templated.",
    body: "We build from the foundation. No themes, no shortcuts, no bloated plugins. Fast, clean, and built to last.",
  },
  {
    number: "03",
    title: "Commercial focus throughout.",
    body: "Every decision, from copy to layout to automation, is made with conversion and trust in mind.",
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
              Execution-heavy.
              <br />
              <span className="text-zinc-500">Results-first.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              We are not a generalist agency. We are a focused, senior team that builds custom
              solutions, delivers on time, and stays commercially sharp throughout.
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

import Image from "next/image";
import Link from "next/link";

const capabilityPoints = [
  "Global monetization layer architecture",
  "High-trust intelligence and decision workflows",
  "Product, systems, and workflow execution in one build",
];

const caseTags = ["Product", "Systems", "Intelligence", "SaaS"];

export default function Work() {
  return (
    <section
      id="work"
      className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Proof of execution
            </p>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Featured case: SilentSpend.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 md:text-base">
              A premium internal product case showing how Inovense ships complex,
              high-trust software systems with product-grade clarity.
            </p>
          </div>
          <Link
            href="/work/silentspend"
            className="self-start text-sm font-medium text-zinc-500 transition-colors hover:text-brand md:self-auto"
          >
            Open case study
          </Link>
        </div>

        <article className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/55">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.05fr_1.25fr]">
            <div className="p-7 md:p-9">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600">
                Premium internal product case
              </p>

              <h3 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
                SilentSpend
              </h3>

              <p className="mt-5 text-sm leading-relaxed text-zinc-400 md:text-base">
                SilentSpend is a global monetization layer built as a high-trust
                intelligence and decision system.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500 md:text-base">
                It tracks pricing movement, packaging shifts, trial and free-tier
                changes, paywall changes, and monetization surface movement across
                digital businesses.
              </p>

              <ul className="mt-7 space-y-3 border-t border-zinc-800/80 pt-6">
                {capabilityPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-zinc-400">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" />
                    {point}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/work/silentspend"
                  className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
                >
                  View SilentSpend case
                </Link>
                <Link
                  href="/intake"
                  className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-100"
                >
                  Start your project
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {caseTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-800/80 px-3 py-1 text-[11px] text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <Link
              href="/work/silentspend"
              className="group relative block border-t border-zinc-800/80 lg:border-l lg:border-t-0"
              aria-label="Open SilentSpend case study"
            >
              <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">
                  Product interface capture
                </p>
                <p className="text-[10px] text-zinc-600 transition-colors group-hover:text-zinc-500">
                  SilentSpend
                </p>
              </div>

              <div className="relative bg-zinc-950/70">
                <Image
                  src="/work/silentspend/hero.png"
                  alt="SilentSpend case interface"
                  width={1457}
                  height={1097}
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(9,9,11,0.32) 0%, rgba(9,9,11,0) 45%)",
                  }}
                />
              </div>
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

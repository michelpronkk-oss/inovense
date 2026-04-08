export default function BuildStandard() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] py-28 md:py-40">

      {/* Subtle grid texture: slightly more visible in this section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Centered ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(73,160,164,0.07) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">

        {/* Top ornament */}
        <div className="mb-14 flex items-center justify-center gap-5">
          <div className="h-px w-16 bg-zinc-800" />
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-brand/60">
            Build Standard
          </span>
          <div className="h-px w-16 bg-zinc-800" />
        </div>

        {/* Primary statement */}
        <p className="text-3xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-4xl lg:text-5xl">
          &ldquo;Every pixel earns its place.
          <br />
          <span className="text-brand">
            Every build ships production-ready.&rdquo;
          </span>
        </p>

        {/* Supporting copy */}
        <p className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
          We don&apos;t reskin themes. We don&apos;t ship work that&apos;s
          merely adequate. We build from first principles: performance-first,
          conversion-led, and held to a standard we&apos;re willing to put
          our name on.
        </p>

        {/* Bottom ornament */}
        <div className="mt-14 flex items-center justify-center gap-5">
          <div className="h-px flex-1 max-w-[120px] bg-zinc-800" />
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-700">
            Inovense
          </span>
          <div className="h-px flex-1 max-w-[120px] bg-zinc-800" />
        </div>

      </div>
    </section>
  );
}

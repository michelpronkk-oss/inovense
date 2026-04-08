import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import IntakeForm from "@/components/intake/intake-form";

export const metadata: Metadata = {
  title: "Start a Project",
  description:
    "Submit your brief. Inovense reviews every request personally and responds within 24 hours with a clear direction. Limited intake.",
  alternates: {
    canonical: "https://inovense.com/intake",
  },
  openGraph: {
    url: "https://inovense.com/intake",
    title: "Start a Project | Inovense",
    description:
      "Submit your brief. Inovense reviews every request personally and responds within 24 hours with a clear direction. Limited intake.",
  },
};

export default function IntakePage() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">

        {/* ── Page header ── */}
        <section className="relative overflow-hidden pt-32 pb-14">

          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 20%, rgba(73,160,164,0.11) 0%, transparent 65%)",
            }}
          />

          {/* Grid texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px",
            }}
          />

          {/* Bottom fade */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--background))",
            }}
          />

          <div className="relative mx-auto max-w-2xl px-6 text-center">
            <p className="mb-5 text-xs font-medium uppercase tracking-widest text-brand">
              Project intake
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
              Tell us what you&apos;re building.
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400">
              Fill in the brief below. We review every submission and respond
              within 24 hours with a clear next step, not a proposal template.
            </p>

            {/* Trust strip */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {[
                "Limited intake",
                "24-hour response",
                "No pitch decks",
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-2 text-xs text-zinc-600"
                >
                  <span className="h-1 w-1 shrink-0 rounded-full bg-brand/50" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Form ── */}
        <section className="pb-28 md:pb-36">
          <div className="mx-auto max-w-2xl px-6">

            {/* Form card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 md:p-10">
              <IntakeForm />
            </div>

            {/* Footer note */}
            <p className="mt-8 text-center text-xs leading-relaxed text-zinc-700">
              Prefer email?{" "}
              <a
                href="mailto:hello@inovense.com"
                className="text-zinc-500 transition-colors hover:text-zinc-300"
              >
                hello@inovense.com
              </a>
            </p>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}

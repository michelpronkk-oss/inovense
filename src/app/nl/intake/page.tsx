import type { Metadata } from "next";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import NlIntakeForm from "@/components/intake/nl-intake-form";

export const metadata: Metadata = {
  title: "Project starten | Inovense",
  description:
    "Stuur je brief. Inovense beoordeelt elk verzoek persoonlijk en reageert binnen 24 uur met een duidelijke richting. Beperkte intake.",
  alternates: {
    canonical: "https://inovense.com/nl/intake",
  },
  openGraph: {
    url: "https://inovense.com/nl/intake",
    title: "Project starten | Inovense",
    description:
      "Stuur je brief. Inovense beoordeelt elk verzoek persoonlijk en reageert binnen 24 uur met een duidelijke richting. Beperkte intake.",
    locale: "nl_NL",
  },
};

export default function NlIntakePage() {
  return (
    <>
      <NlNav />
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
              Vertel ons wat je bouwt.
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400">
              Vul de brief hieronder in. We beoordelen elke inzending persoonlijk
              en reageren binnen 24 uur met een duidelijke volgende stap, geen
              voorstel-template.
            </p>

            {/* Trust strip */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {[
                "Beperkte intake",
                "Reactie binnen 24 uur",
                "Geen pitch decks",
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
              <NlIntakeForm />
            </div>

            {/* Footer note */}
            <p className="mt-8 text-center text-xs leading-relaxed text-zinc-700">
              Liever mailen?{" "}
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
      <NlFooter />
    </>
  );
}

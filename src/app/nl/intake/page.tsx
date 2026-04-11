import type { Metadata } from "next";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import NlIntakeForm from "@/components/intake/nl-intake-form";
import NlIntakeHero from "@/components/nl/nl-intake-hero";

export const metadata: Metadata = {
  title: "Project starten",
  description:
    "Vertel ons wat je bouwt. Inovense beoordeelt elke brief persoonlijk en reageert binnen 24 uur met een duidelijke richting, geen salesverhaal. Beperkte intake.",
  alternates: {
    canonical: "https://inovense.com/nl/intake",
    languages: {
      en: "https://inovense.com/intake",
      nl: "https://inovense.com/nl/intake",
      "x-default": "https://inovense.com/intake",
    },
  },
  openGraph: {
    url: "https://inovense.com/nl/intake",
    title: "Project starten | Inovense",
    description:
      "Vertel ons wat je bouwt. Inovense beoordeelt elke brief persoonlijk en reageert binnen 24 uur met een duidelijke richting, geen salesverhaal. Beperkte intake.",
    locale: "nl_NL",
  },
};

export default function NlIntakePage() {
  return (
    <>
      <NlNav />
      <main className="flex flex-col">

        {/* ── Page header ── */}
        <NlIntakeHero />

        {/* ── Form ── */}
        <section id="nl-intake-form" className="pb-28 md:pb-36">
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

import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import IntakeHero from "@/components/intake/intake-hero";
import IntakeForm from "@/components/intake/intake-form";

export const metadata: Metadata = {
  title: "Start Your Project",
  description:
    "Tell us what you're building. Inovense reviews every brief personally and responds within 24 hours with a clear direction, not a pitch deck. Limited intake.",
  alternates: {
    canonical: "https://inovense.com/intake",
    languages: {
      en: "https://inovense.com/intake",
      nl: "https://inovense.com/nl/intake",
      "x-default": "https://inovense.com/intake",
    },
  },
  openGraph: {
    url: "https://inovense.com/intake",
    title: "Start Your Project | Inovense",
    description:
      "Tell us what you're building. Inovense reviews every brief personally and responds within 24 hours with a clear direction, not a pitch deck. Limited intake.",
  },
};

export default function IntakePage() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">

        {/* ── Page header ── */}
        <IntakeHero />

        {/* ── Form ── */}
        <section id="intake-form" className="pb-28 md:pb-36">
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

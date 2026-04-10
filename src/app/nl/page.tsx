import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";

export const metadata: Metadata = {
  title: "Inovense - Digitale infrastructuur voor serieuze operators",
  description:
    "Build, Systems en Growth voor operators die op uitvoering concurreren. Een Nederlandstalige conversielaag, gebouwd rond duidelijke lanes en een helder proces.",
  alternates: {
    canonical: "https://inovense.com/nl",
  },
  openGraph: {
    url: "https://inovense.com/nl",
    title: "Inovense - Digitale infrastructuur voor serieuze operators",
    description:
      "Build, Systems en Growth voor operators die op uitvoering concurreren. Een Nederlandstalige conversielaag, gebouwd rond duidelijke lanes en een helder proces.",
  },
};

/* ─── Primitives ────────────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
      {children}
    </p>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 md:pb-32 md:pt-44">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[900px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 10%, rgba(73,160,164,0.13) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-brand/25 bg-brand/8 px-3 py-1 text-[11px] font-medium tracking-wide text-brand">
            Inovense
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Nederland
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Geen templates
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Wij bouwen de digitale infrastructuur{" "}
          <span className="text-brand">waarop serieuze operators groeien.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Build, Systems en Growth uitgevoerd op het niveau dat jouw
          positionering vereist. Geen templates, geen bureaugedoe, geen
          gerecycled werk.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/nl/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Project starten
          </Link>
          <Link
            href="/nl/process"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            Hoe wij werken
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
          {["Geen templates", "Volledige eigendom bij oplevering", "Reactie binnen 24 uur"].map(
            (item) => (
              <span key={item} className="flex items-center gap-2 text-xs text-zinc-700">
                <span className="h-1 w-1 shrink-0 rounded-full bg-brand/50" />
                {item}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Services ──────────────────────────────────────────────────────────── */

const services = [
  {
    label: "Build",
    href: "/nl/build",
    headline: "Digitale producten en websites gebouwd van brief tot browser.",
    body: "Van merkwebsites tot productfront-ends en e-commerce. Conversiegericht, performance-first en volledig op maat gebouwd.",
    tags: ["Build lane", "Geen templates", "Volledige eigendom"],
  },
  {
    label: "Systems",
    href: "/nl/systems",
    headline: "Operationele systemen die meebewegen met hoe je team werkt.",
    body: "Workflowautomatisering, interne tooling en AI-integraties die jouw operatie versnellen zonder extra complexiteit.",
    tags: ["Systems lane", "Op maat gebouwd", "Geen off-the-shelf"],
  },
  {
    label: "Growth",
    href: "/nl/growth",
    headline: "Groeisystemen voor leadflow, distributie en follow-up.",
    body: "Van lead capture en routing tot performance content en paid support. Gebouwd als commercieel systeem, niet als losse tactieken.",
    tags: ["Growth lane", "Commerciele focus", "Systeemdenken"],
  },
];

function Services() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Wat wij bouwen</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Drie lanes. Een standaard.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-500">
            Deze laag is ontworpen voor snelle Nederlandse intake zonder
            architectuurdrift. Elke route sluit aan op Build, Systems, Growth
            en Proces.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-7 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/60 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <span className="mb-4 inline-flex items-center rounded-full border border-brand/25 bg-brand/8 px-2.5 py-0.5 text-[11px] font-medium text-brand">
                {service.label}
              </span>

              <h3 className="mb-3 text-base font-semibold leading-snug text-zinc-50">
                {service.headline}
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                {service.body}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {service.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-700/50 px-2 py-0.5 text-[10px] font-medium text-zinc-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-brand/70 transition-colors group-hover:text-brand">
                Meer informatie
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2.5 6h7M6.5 3l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Why Inovense ──────────────────────────────────────────────────────── */

const reasons = [
  {
    title: "Op maat gebouwd, altijd",
    body: "Wij starten niet vanuit een theme en passen van buiten naar binnen aan. Wij beginnen bij jouw brief en bouwen van binnen naar buiten. Elk component bestaat omdat het nodig is.",
  },
  {
    title: "Eén team van brief tot oplevering",
    body: "Geen handoffs tussen strategie, design en development. Hetzelfde team begrijpt jouw context van het eerste gesprek tot de definitieve oplevering.",
  },
  {
    title: "Beperkte intake, bewust",
    body: "Wij nemen een klein aantal projecten tegelijk aan. Dat is geen marketingtruc. Het is hoe wij de kwaliteit bewaken die onze klanten verwachten.",
  },
  {
    title: "Volledige eigendom bij oplevering",
    body: "Code, assets, CMS-toegang en documentatie overgedragen bij oplevering. Geen doorlopende afhankelijkheid van Inovense om jouw site draaiende te houden.",
  },
];

function WhyInovense() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Waarom Inovense</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Gebouwd voor operators die op uitvoering concurreren.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {reasons.map((item) => (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-7 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/60 transition-transform duration-500 ease-out group-hover:scale-x-100" />
              <h3 className="mb-3 text-sm font-semibold leading-snug text-zinc-50">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ───────────────────────────────────────────────────────────────── */

function PageCTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
      >
        <div
          className="h-px w-[55%]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(73,160,164,0.4) 50%, transparent 100%)",
          }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 50% 110%, rgba(73,160,164,0.11) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Eyebrow>Project starten</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Klaar om iets serieus
          <br className="hidden md:block" /> te bouwen?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Stuur een brief. We beoordelen elk verzoek persoonlijk en reageren
          binnen 24 uur met een duidelijke richting, geen voorstel-template.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/nl/intake"
            className="rounded-full bg-brand px-10 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Project starten
          </Link>
          <span className="text-sm text-zinc-600">
            of mail naar{" "}
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-400 transition-colors hover:text-zinc-50"
            >
              hello@inovense.com
            </a>
          </span>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {["Beperkte intake", "Reactie binnen 24 uur", "Geen pitch decks"].map((item) => (
            <span key={item} className="flex items-center gap-2 text-xs text-zinc-700">
              <span className="h-1 w-1 shrink-0 rounded-full bg-brand/50" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function NlPage() {
  return (
    <>
      <NlNav />
      <main className="flex flex-col">
        <Hero />
        <Services />
        <WhyInovense />
        <PageCTA />
      </main>
      <NlFooter />
    </>
  );
}

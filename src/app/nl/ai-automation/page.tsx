import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";

export const metadata: Metadata = {
  title: "AI Automatisering | Inovense",
  description:
    "Automatisering gebouwd rond hoe jouw bedrijf echt werkt. Geen generieke tools. Geen off-the-shelf oplossingen die je aan je proces moet aanpassen.",
  alternates: {
    canonical: "https://inovense.com/nl/ai-automation",
  },
  openGraph: {
    url: "https://inovense.com/nl/ai-automation",
    title: "AI Automatisering | Inovense",
    description:
      "Automatisering gebouwd rond hoe jouw bedrijf echt werkt. Geen generieke tools. Geen off-the-shelf oplossingen die je aan je proces moet aanpassen.",
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
            AI Automatisering
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Systems lane
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Op maat gebouwd
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Automatisering gebouwd rond hoe{" "}
          <span className="text-brand">jouw bedrijf echt werkt.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Geen generieke tools die je aan je proces moet aanpassen. Wij
          analyseren jouw operationele stroom en bouwen automatisering die
          daadwerkelijk past bij hoe jouw team werkt en groeit.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/nl/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Project starten
          </Link>
          <Link
            href="/process"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            Hoe wij werken
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
          {["Op maat gebouwd", "Geen off-the-shelf", "Reactie binnen 24 uur"].map(
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

/* ─── Who this is for ───────────────────────────────────────────────────── */

const audience = [
  {
    title: "Operators met repetitieve handmatige processen",
    body: "Als hetzelfde werk elke week handmatig opnieuw wordt gedaan, is dat geen efficientieprobeem. Het is een systeem dat nog niet gebouwd is.",
  },
  {
    title: "Teams die te veel tijd verliezen aan coördinatie",
    body: "Follow-ups, statusupdates, data overzetten. Als je team meer tijd besteedt aan het bijhouden van werk dan aan het doen ervan, bouwt Inovense het systeem dat dat regelt.",
  },
  {
    title: "Bedrijven die willen schalen zonder proportioneel meer mensen",
    body: "Groei hoeft niet altijd meer headcount te betekenen. De juiste automatisering stelt je bestaande team in staat meer te doen zonder meer te raken.",
  },
  {
    title: "Founders die AI in hun product of workflow willen integreren",
    body: "Van AI-aangedreven content pipelines tot geautomatiseerde klantcommunicatie. Wij bouwen de integratie op het niveau dat jouw product verdient.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Voor wie dit is</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Gebouwd voor operators die slimmer willen schalen, niet harder.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {audience.map((item) => (
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

/* ─── What we build ─────────────────────────────────────────────────────── */

const deliverables = [
  {
    number: "01",
    title: "Workflow automatisering",
    description:
      "Repetitieve processen geautomatiseerd van begin tot eind. Van lead routing en onboarding flows tot interne goedkeurings- en notificatiesystemen.",
    tag: "Meest gevraagd",
  },
  {
    number: "02",
    title: "AI-aangedreven content pipelines",
    description:
      "Geautomatiseerde content generatie, verwerking en distributie. Van productbeschrijvingen tot interne samenvattingen, gebouwd op de modellen die het beste presteren voor jouw use case.",
    tag: null,
  },
  {
    number: "03",
    title: "Data integraties en synchronisatie",
    description:
      "Verbindingen tussen tools, databases en systemen die handmatige overzetting elimineren. Één bron van waarheid, automatisch bijgehouden.",
    tag: null,
  },
  {
    number: "04",
    title: "Klantcommunicatie automatisering",
    description:
      "Op triggers gebaseerde e-mail- en berichtensystemen die op het juiste moment en op de juiste toon reageren. Geen generieke templates, geen verkeerde timing.",
    tag: null,
  },
  {
    number: "05",
    title: "Interne AI-tools",
    description:
      "Maatwerk dashboards, tools en interfaces waarmee je team AI-mogelijkheden dagelijks kan benutten zonder technische kennis.",
    tag: null,
  },
];

function WhatWeBuild() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <Eyebrow>Scope</Eyebrow>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Wat valt onder
              <br />
              <span className="text-zinc-500">AI automatisering.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Elk systeem wordt gescopet op basis van jouw operationele context.
              Niets generiek, niets gebouwd voor een andere use case.
            </p>
          </div>
        </div>

        <div className="divide-y divide-zinc-800/70">
          {deliverables.map((item) => (
            <div
              key={item.number}
              className="group flex flex-col gap-4 py-8 transition-colors hover:bg-zinc-900/20 md:flex-row md:items-start md:gap-0 md:py-10 md:-mx-6 md:px-6 md:rounded-xl"
            >
              <span className="w-14 shrink-0 font-mono text-xs font-medium text-brand/70 md:pt-0.5">
                {item.number}
              </span>
              <div className="shrink-0 md:w-[220px] md:pr-8">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-zinc-50">
                    {item.title}
                  </h3>
                  {item.tag && (
                    <span className="rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                      {item.tag}
                    </span>
                  )}
                </div>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Our approach ──────────────────────────────────────────────────────── */

const approach = [
  {
    number: "01",
    title: "Procesanalyse eerst",
    body: "Voordat we iets bouwen, begrijpen we hoe jouw operatie daadwerkelijk werkt. Niet hoe het op papier staat. We identificeren waar automatisering waarde toevoegt en waar het gewoon complexiteit toevoegt.",
  },
  {
    number: "02",
    title: "Gebouwd om te onderhouden",
    body: "Automatisering die alleen werkt zolang de originele bouwer er is, lost niets op. We bouwen systemen die je team kan begrijpen, aanpassen en beheren zonder technische afhankelijkheid.",
  },
  {
    number: "03",
    title: "Het juiste model voor de taak",
    body: "We zijn niet gebonden aan een specifiek AI-platform. We kiezen het model en de architectuur die het beste passen bij jouw use case, budget en vereisten voor betrouwbaarheid.",
  },
  {
    number: "04",
    title: "Stapsgewijze implementatie",
    body: "Grote automatiseringsprojecten worden gefaseerd opgeleverd. Je ziet waarde eerder, en we passen aan op basis van hoe het systeem presteert in de praktijk voor we verder uitbreiden.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Onze aanpak</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Automatisering die werkt zoals jouw bedrijf werkt.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {approach.map((item) => (
            <div
              key={item.number}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-7 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/70 transition-transform duration-500 ease-out group-hover:scale-x-100" />
              <div className="flex gap-5">
                <span className="mt-0.5 shrink-0 font-mono text-xs font-medium text-brand">
                  {item.number}
                </span>
                <div>
                  <h3 className="mb-2.5 text-base font-semibold leading-snug text-zinc-50">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                    {item.body}
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

/* ─── FAQ ───────────────────────────────────────────────────────────────── */

const faqs = [
  {
    q: "Moet ik technische kennis hebben om met jullie te werken?",
    a: "Nee. Jij kent je bedrijfsproces. Wij vertalen dat naar een technisch systeem. Je hoeft geen code te begrijpen om de uitkomst te beoordelen.",
  },
  {
    q: "Hoe weten jullie welke processen het waard zijn om te automatiseren?",
    a: "We beginnen met een analyse van je operatie. We kijken naar frequentie, foutgevoeligheid, tijdsinvestering en strategische impact. Automatisering moet zichzelf terugverdienen.",
  },
  {
    q: "Kunnen jullie ook bestaande tools en systemen integreren?",
    a: "Ja. Veel projecten draaien om het verbinden van systemen die nu los van elkaar werken. We bouwen integraties op maat of breiden bestaande tools uit waar nodig.",
  },
  {
    q: "Wat gebeurt er als het systeem na oplevering aangepast moet worden?",
    a: "We documenteren alles en leveren de code over. Kleine aanpassingen kun je zelf doorvoeren of via ons. Grotere evoluties bespreken we als apart project.",
  },
];

function FAQ() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Veelgestelde vragen.
          </h2>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {faqs.map((item) => (
            <div key={item.q} className="py-8 md:grid md:grid-cols-[2fr_3fr] md:gap-12">
              <p className="mb-3 text-sm font-semibold text-zinc-100 md:mb-0">
                {item.q}
              </p>
              <p className="text-sm leading-relaxed text-zinc-500">{item.a}</p>
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
        <Eyebrow>Automatiseringsproject starten</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Klaar om te stoppen met
          <br className="hidden md:block" /> hetzelfde handmatige werk?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Beschrijf je proces en laat ons inschatten wat er mogelijk is. We
          reageren binnen 24 uur met een duidelijke richting.
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

export default function NlAiAutomationPage() {
  return (
    <>
      <NlNav />
      <main className="flex flex-col">
        <Hero />
        <WhoThisIsFor />
        <WhatWeBuild />
        <OurApproach />
        <FAQ />
        <PageCTA />
      </main>
      <NlFooter />
    </>
  );
}

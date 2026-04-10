import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";

export const metadata: Metadata = {
  title: "Shopify Design | Inovense",
  description:
    "Een Shopify-winkel die jouw merk echt weerspiegelt. Merk-niveau afwerking, mobile-first en gestructureerd om te converteren. Geen standaard themes.",
  alternates: {
    canonical: "https://inovense.com/nl/shopify-design",
  },
  openGraph: {
    url: "https://inovense.com/nl/shopify-design",
    title: "Shopify Design | Inovense",
    description:
      "Een Shopify-winkel die jouw merk echt weerspiegelt. Merk-niveau afwerking, mobile-first en gestructureerd om te converteren. Geen standaard themes.",
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
            Shopify Design
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Build lane
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Merk-niveau afwerking
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Een Shopify-winkel die jouw merk{" "}
          <span className="text-brand">echt weerspiegelt.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Merk-niveau afwerking, mobile-first, en gestructureerd om te
          converteren van productpagina tot kassa. Niet wat een standaard
          theme oplevert als je de kleuren aanpast.
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
          {["Geen standaard themes", "Mobile-first", "Reactie binnen 24 uur"].map(
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
    title: "Merken die hun Shopify-winkel op hun niveau willen brengen",
    body: "Een gewijzigd standaard theme vertelt de klant iets over je aandacht voor kwaliteit. Niet altijd wat je wilt overbrengen.",
  },
  {
    title: "E-commerce operators met serieuze conversiedoelen",
    body: "Elke seconde laadtijd, elke verwarrende checkout-stap en elke slechte mobiele ervaring kost je conversies. Wij ontwerpen alles weg.",
  },
  {
    title: "Founders die een D2C-merk lanceren",
    body: "Een nieuwe winkel verdient een fundament dat schaalt. Geen patching van een theme zodra je groeit.",
  },
  {
    title: "Bestaande winkels die toe zijn aan een serieuze herbouw",
    body: "Als de winkel technische schuld heeft opgebouwd en de merkpresentatie niet meer klopt, is herbouwen goedkoper dan doorpatchen.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Voor wie dit is</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Voor merken die meer verdienen dan een gewijzigd standaard theme.
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
    title: "Maatwerk Shopify themes",
    description:
      "Volledig op maat gebouwde Shopify themes die jouw merk-identiteit vertalen naar elke pagina van de winkel. Van homepage tot checkout, ontworpen als een geheel.",
    tag: "Meest gevraagd",
  },
  {
    number: "02",
    title: "Conversie-optimalisatie",
    description:
      "Productpagina's, collectiepagina's en checkout flows herontworpen rond hoe jouw klanten daadwerkelijk kopen. Elk element verdient zijn plek of valt weg.",
    tag: null,
  },
  {
    number: "03",
    title: "Shopify herbouw",
    description:
      "Bestaande winkels volledig herbouwd wanneer het doorpatchen van het huidige theme niet langer zinvol is. We nemen wat werkt mee en ontwerpen de rest opnieuw.",
    tag: null,
  },
  {
    number: "04",
    title: "Sectie- en componentontwikkeling",
    description:
      "Maatwerk secties, blokken en app-integraties bovenop een bestaand theme wanneer alleen specifieke delen moeten worden uitgebreid.",
    tag: null,
  },
  {
    number: "05",
    title: "Shopify Plus configuratie",
    description:
      "Checkout uitbreidingen, B2B-configuraties en geavanceerde Shopify Plus mogelijkheden geconfigureerd en geoptimaliseerd voor jouw operationele model.",
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
              <span className="text-zinc-500">Shopify design.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Elk project wordt gescopet op basis van jouw winkel en doelen.
              Niets generiek, niets overgenomen van een ander project.
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
    title: "Merk-coherentie op elke pagina",
    body: "Een Shopify-winkel is meer dan een productcatalogus. Elk touch point, van de homepage tot de bestellingsbevestiging, wordt behandeld als een merkmogelijkheid.",
  },
  {
    number: "02",
    title: "Mobile-first, altijd",
    body: "Het grootste deel van je bezoekers komt op een telefoon. Wij ontwerpen en bouwen mobile-first en testen op echte apparaten, niet alleen in de browser inspector.",
  },
  {
    number: "03",
    title: "Performance die conversie ondersteunt",
    body: "Laadsnelheid, Core Web Vitals en Shopify-specifieke performance worden ingebakken. Een trage winkel kost verkopen. Wij zorgen dat die discussie niet aan de orde is.",
  },
  {
    number: "04",
    title: "Checkout geoptimaliseerd, niet standaard",
    body: "De checkout is waar conversies worden gewonnen of verloren. We ontwerpen en configureren de checkout flow rond hoe jouw klanten kopen en wat jouw merk vereist.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Onze aanpak</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Een winkel gebouwd voor het merk achter de producten.
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
    q: "Bouwen jullie ook op bestaande themes zoals Dawn?",
    a: "We kunnen een bestaand theme uitbreiden als dat de juiste aanpak is voor jouw situatie. Maar als de scope dat rechtvaardigt, bouwen we liever op maat. We beoordelen dat per project.",
  },
  {
    q: "Hoe lang duurt een Shopify-project gemiddeld?",
    a: "Een gerichte conversie-aanpassing kan in twee tot drie weken. Een volledige maatwerk winkel loopt typisch vier tot acht weken. Scope, feedbackrondes en asset-gereedheid bepalen de tijdlijn.",
  },
  {
    q: "Kunnen jullie ook migreren van een ander platform naar Shopify?",
    a: "Ja. Productdata, klantgeschiedenis en orderhistorie kunnen worden gemigreerd. We beoordelen wat er beschikbaar is en wat zinvol is om over te zetten.",
  },
  {
    q: "Werken jullie ook met Shopify Plus?",
    a: "Ja. Checkout extensies, B2B-configuraties, scripts en geavanceerde Shopify Plus mogelijkheden vallen binnen onze scope.",
  },
  {
    q: "Kan ik de winkel zelf beheren na oplevering?",
    a: "Ja. Shopify is ontworpen voor zelfbeheer. We configureren de admin, documenteren wat je moet weten en zorgen dat je team zelfstandig verder kan.",
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
        <Eyebrow>Shopify project starten</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Klaar voor een Shopify-winkel
          <br className="hidden md:block" /> op het niveau van je merk?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          We nemen een klein aantal projecten tegelijk aan. Stuur een brief en
          we reageren binnen 24 uur met een duidelijke richting.
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

export default function NlShopifyDesignPage() {
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

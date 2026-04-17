import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import TrustpilotSignal from "@/components/trustpilot-signal";
import { absoluteSiteUrl, buildLocalizedAlternates } from "@/lib/metadata";

const NL_SHOPIFY_DESIGN_ALTERNATES = buildLocalizedAlternates({
  canonicalPath: "/nl/shopify-design",
  enPath: "/shopify-design",
  nlPath: "/nl/shopify-design",
});

export const metadata: Metadata = {
  title: "Premium Shopify design en ontwikkeling",
  description:
    "Maatwerk Shopify themes, productpagina's en e-commercedesign voor merken die een standaard stocktemplate zijn ontgroeid. Conversiefocus, merkniveau uitvoering, mobile-first.",
  alternates: NL_SHOPIFY_DESIGN_ALTERNATES,
  openGraph: {
    url: absoluteSiteUrl("/nl/shopify-design"),
    title: "Premium Shopify design en ontwikkeling | Inovense",
    description:
      "Maatwerk Shopify themes, productpagina's en e-commercedesign voor merken die een standaard stocktemplate zijn ontgroeid. Conversiefocus, merkniveau uitvoering, mobile-first.",
    locale: "nl_NL",
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
            "radial-gradient(ellipse 70% 55% at 50% 5%, rgba(73,160,164,0.12) 0%, transparent 65%)",
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
            Geen theme reskins
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Een Shopify winkel waardig{" "}
          <span className="text-brand">aan het merk erachter.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Maatwerk Shopify themes, productpagina-systemen en e-commercedesign
          voor merken die meer nodig hebben dan een aangepast stocktemplate.
          Ontworpen voor conversie, gebouwd voor merk, door en door mobile-first.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/nl/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Shopify project starten
          </Link>
          <Link
            href="/nl/build"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            Bekijk de Build lane
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
          {[
            "Geen theme reskins",
            "Mobile-first uitvoering",
            "Volledige eigendom bij oplevering",
          ].map((item) => (
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

/* ─── Who this is for ───────────────────────────────────────────────────── */

const audience = [
  {
    title: "DTC-merken die een stocktheme zijn ontgroeid",
    body: "Op een gegeven moment wordt de kloof tussen jouw merkniveau en je Shopify theme zichtbaar voor klanten. Die kloof kost je omzet.",
  },
  {
    title: "Producten waarbij presentatie waarde signaleert",
    body: "Wanneer jouw product meer kost dan een commodity, moet jouw winkel dat communiceren voor een klant een woord copy heeft gelezen.",
  },
  {
    title: "Merken die een markt betreden met hoge visuele standaarden",
    body: "Lanceren in een categorie waar concurrenten hebben geinvesteerd in hun winkel betekent dat je standaard uiterlijk je vanaf dag een op achterstand zet.",
  },
  {
    title: "Bedrijven waar design de conversiebegrenzer is geworden",
    body: "Als traffic en aanbiedingen niet het probleem zijn maar conversie wel, zit het antwoord doorgaans in de winkelervaring.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Voor wie</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Gebouwd voor merken waarbij de winkel onderdeel is van de productervaring.
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
      "Van nul gebouwd of vanuit een minimale basis. Geen premium theme opnieuw ingekleurd met jouw kleuren. Een winkel ontworpen rond jouw specifieke producten, merk en koper.",
    tag: "Meest gevraagd",
  },
  {
    number: "02",
    title: "Productpagina-systemen",
    description:
      "Visuele hierarchie, vertrouwensarchitectuur en overtuigingslogica ontworpen rond jouw product. Elk element op de pagina verdient zijn plek door vertrouwen te bouwen of de aankoop vooruit te bewegen.",
    tag: null,
  },
  {
    number: "03",
    title: "Collectie- en categoriearchitectuur",
    description:
      "Categoriestructuren, filtersystemen en browse-ervaringen ontworpen rond hoe jouw klanten echt winkelen, niet hoe Shopify standaard producten organiseert.",
    tag: null,
  },
  {
    number: "04",
    title: "Mobile-first winkels",
    description:
      "Ontworpen en getest voor de aankoopstromen die op iPhone plaatsvinden. Geen desktopdesign aangepast voor mobiel. Mobiele ervaring ontworpen als het primaire oppervlak.",
    tag: null,
  },
  {
    number: "05",
    title: "Winkelredesigns",
    description:
      "Bestaande winkels herbouwd wanneer patchen geen antwoord meer is. We beoordelen wat structureel werkt en ontwerpen daarna vooruit.",
    tag: null,
  },
  {
    number: "06",
    title: "Checkout- en winkelwagenoptimalisatie",
    description:
      "Frictie verminderen op het moment van hoogste koopintentie. Winkelwagenervaring, upsell-architectuur en checkoutstroom beoordeeld en verbeterd.",
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
              Elk Shopify project wordt geschopt op jouw werkelijke merk, product
              en conversiedoelen. Niets generiek, niets op basis van een template.
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
    title: "Geen theme reskins",
    body: "We kopen geen Shopify theme en vervangen het logo en de kleuren. We bouwen vanuit jouw brief. Elk component bestaat omdat jouw merk en product het vereist.",
  },
  {
    number: "02",
    title: "Conversiebewuste productpagina's",
    body: "Productpaginalayout is een commerciele beslissing, niet alleen een ontwerpbeslissing. Elk element verdient zijn plek door vertrouwen te bouwen of de aankoop vooruit te bewegen. Niets decoratief zonder functie.",
  },
  {
    number: "03",
    title: "Merkwaardige mobiele afwerking",
    body: "De meeste e-commerceaankopen vinden plaats op mobiel. We ontwerpen voor die omgeving eerst, niet als nagedachte. Typografie, spatiering en aanraakdoelen uitgevoerd op de standaard die jouw merk vereist.",
  },
  {
    number: "04",
    title: "Performanceoptimalisatie",
    body: "Laadsnelheid beinvloedt zowel conversie als organische zoekrangschikking. We bouwen Shopify winkels die snel laden omdat trage winkels geld kosten, vooral op mobiele verbindingen.",
  },
  {
    number: "05",
    title: "Volledig eigendom bij oplevering",
    body: "Jij bezit de themecode, de assets en de deployment. Volledige documentatie en toegangsoverdracht. Geen doorlopende afhankelijkheid van Inovense om jouw winkel te draaien.",
  },
  {
    number: "06",
    title: "SEO-klare architectuur",
    body: "Schone semantische markup, gestructureerde data en crawlbare architectuur ingebouwd. Je winkel lanceert met wat zoekmachines belonen, niet iets om later retroactief toe te voegen.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Het verschil</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Wat een gebouwde winkel scheidt van een geconfigureerde.
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

/* ─── Proof strip ───────────────────────────────────────────────────────── */

function ProofStrip() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] py-24 md:py-32">
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(73,160,164,0.07) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="mb-12 flex items-center justify-center gap-5">
          <div className="h-px w-16 bg-zinc-800" />
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-brand/60">
            Build standaard
          </span>
          <div className="h-px w-16 bg-zinc-800" />
        </div>

        <p className="text-3xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-4xl">
          &ldquo;Jouw winkel is onderdeel van jouw merk.
          <br />
          <span className="text-brand">Bouw hem op dezelfde standaard.&rdquo;</span>
        </p>

        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-zinc-500">
          Een Shopify winkel gebouwd op de Inovense standaard: conversiebewuste
          layouts, merkwaardige mobiele afwerking en performance geoptimaliseerd
          voor lancering. Geen theme geconfigureerd om jouw brief te benaderen.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <TrustpilotSignal note="Lees klantreviews" />
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ──────────────────────────────────────────────────────── */

const steps = [
  {
    number: "01",
    title: "Brief indienen",
    note: "Reactie binnen 24 uur",
    body: "Beschrijf jouw merk, producten en wat er niet werkt aan je huidige winkel. We beoordelen elke brief zelf en reageren binnen 24 uur.",
  },
  {
    number: "02",
    title: "Ontwerprichting",
    note: "Visuele afstemming voor de build",
    body: "We presenteren een ontwerprichting met layout, visuele taal en componentstructuur. Je beoordeelt en keurt goed voor een enkele regel productiecode wordt geschreven.",
  },
  {
    number: "03",
    title: "Voorstel en aanbetaling",
    note: "Duidelijke scope, geblokkeerd slot",
    body: "Een gestructureerd voorstel met deliverables, tijdlijn en investering. Aanbetaling bevestigt je startdatum.",
  },
  {
    number: "04",
    title: "Build en staging",
    note: "Volledig preview voor go-live",
    body: "Themeontwikkeling op Shopify staging. Een gestructureerde feedbackronde voor de lancering. Niets wordt verzonden tot je het hebt beoordeeld en goedgekeurd.",
  },
  {
    number: "05",
    title: "QA en lancering",
    note: "Cross-device, cross-browser",
    body: "Mobiel, desktop en checkoutstroom getest. Performance en SEO-checks uitgevoerd. We handelen de lancering af en bevestigen dat alles correct werkt.",
  },
  {
    number: "06",
    title: "Overdracht",
    note: "Volledige eigendomsoverdracht",
    body: "Themecode, assetbestanden en documentatie overgedragen. Je bezit de winkel en kunt hem onafhankelijk bedienen vanaf dag een.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Het proces</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Van brief tot live winkel.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
            Elk project volgt dezelfde gestructureerde aanpak.{" "}
            <Link href="/nl/process" className="text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-200">
              Bekijk het volledige proces.
            </Link>
          </p>
        </div>

        <div className="divide-y divide-zinc-800/70">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group flex flex-col gap-6 py-8 transition-colors hover:bg-zinc-900/20 md:flex-row md:items-start md:gap-0 md:py-10 md:-mx-6 md:px-6 md:rounded-xl"
            >
              <div className="shrink-0 md:w-16">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/30 bg-brand/8 font-mono text-xs font-semibold text-brand">
                  {step.number}
                </span>
              </div>
              <div className="shrink-0 md:w-[230px] md:pr-8 md:pt-1.5">
                <h3 className="mb-1.5 text-base font-semibold text-zinc-100">
                  {step.title}
                </h3>
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                  {step.note}
                </span>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400 md:pt-1.5">
                {step.body}
              </p>
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
    q: "Kunnen jullie alleen een deel van mijn winkel redesignen, zoals de productpagina's?",
    a: "Ja. Gerichte redesigns van specifieke templates, zoals productpagina's, collectiepagina's of de homepage, zijn een veelvoorkomende scope. We beoordelen wat de moeite waard is om te behouden en bouwen daarna vooruit.",
  },
  {
    q: "Hoe verschilt dit van het kopen van een premium Shopify theme?",
    a: "Een premium theme is gebouwd voor iedereen en dus voor niemand geoptimaliseerd. Wij bouwen voor jouw specifieke producten, merk en koper. Het resultaat is een winkel die jouw positionering weerspiegelt in plaats van de aannames van de theemontwikkelaar.",
  },
  {
    q: "Werken jullie met Shopify Plus?",
    a: "Ja. Shopify Plus ontgrendelt checkout-uitbreidbaarheid, aangepaste stromen en extra scriptingopties. Als je op Plus zit, werken we met die mogelijkheden waar relevant voor het project.",
  },
  {
    q: "Kan ik producten en content zelf bijwerken na de lancering?",
    a: "Ja. Shopify's admin is jouw contentlaag. We configureren het theme zodat je producten, collecties, copy en afbeeldingen kunt bijwerken zonder code aan te raken.",
  },
  {
    q: "Wat als ik wil migreren van een ander platform naar Shopify?",
    a: "We handelen Shopify-migraties af als onderdeel van buildprojecten. Datamigratie, productcatalogusopzet en redirectarchitectuur worden geschopt als onderdeel van het totale traject.",
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
          Klaar om een winkel te bouwen
          <br className="hidden md:block" /> die jouw merk verdient?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Stuur een brief. We beoordelen elk project zelf en reageren binnen
          24 uur met een duidelijke richting over fit, scope en vervolgstappen.
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
        <ProofStrip />
        <HowItWorks />
        <FAQ />
        <PageCTA />
      </main>
      <NlFooter />
    </>
  );
}

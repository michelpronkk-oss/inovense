import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import NlBuildHero from "@/components/nl/nl-build-hero";
import NlRelatedServices from "@/components/nl/nl-related-services";

export const metadata: Metadata = {
  title: "Bouwen: Websites, E-commerce en Digitale Producten",
  description:
    "Op maat gebouwde websites, Shopify-winkels, landingspagina's en digitale producten. Conversiegericht, performance-first, en gebouwd van brief tot browser.",
  alternates: {
    canonical: "https://inovense.com/nl/build",
    languages: {
      en: "https://inovense.com/build",
      nl: "https://inovense.com/nl/build",
      "x-default": "https://inovense.com/build",
    },
  },
  openGraph: {
    url: "https://inovense.com/nl/build",
    title: "Bouwen: Websites, E-commerce en Digitale Producten | Inovense",
    description:
      "Op maat gebouwde websites, Shopify-winkels, landingspagina's en digitale producten. Conversiegericht, performance-first, en gebouwd van brief tot browser.",
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
  return <NlBuildHero />;
}

/* ─── Who this is for ───────────────────────────────────────────────────── */

const audience = [
  {
    title: "Founders die een serieuze merkpresentatie lanceren",
    body: "Eerste indrukken zijn commerciele beslissingen. Als je site eruitziet als een template, concurreert hij ook als een.",
  },
  {
    title: "E-commerce merken die meer willen dan een standaard Shopify-theme",
    body: "Merk-niveau afwerking, geoptimaliseerde checkout en een winkel die converteert van productpagina tot kassa.",
  },
  {
    title: "Operators die hun huidige site zijn ontgroeid",
    body: "Als het bedrijf vooruitgaat maar de website niet, wordt de site de beperkende factor. Wij bouwen het fundament dat de groei aankan.",
  },
  {
    title: "Productteams die een dedicated webervaring lanceren",
    body: "Nieuwe productlanceringen verdienen een front-end gebouwd rondom het product, niet gesleept uit een multipurpose theme.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Voor wie dit is</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Gebouwd voor bedrijven die het zich niet kunnen veroorloven gemiddeld te lijken.
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
    title: "Merkwebsites",
    description:
      "De complete digitale aanwezigheid. Architectuur, design en build in handen van één team. Gestructureerd om te converteren en gebouwd om bestand te zijn tegen kritisch onderzoek en aanhoudend verkeer.",
    tag: "Meest gevraagd",
  },
  {
    number: "02",
    title: "Shopify en e-commerce",
    description:
      "Webshops gebouwd rondom hoe mensen daadwerkelijk kopen. Merk-niveau afwerking, mobile-first en gestructureerd om te converteren van productpagina tot kassa. Maatwerk of bovenop een bestaand theme.",
    tag: null,
  },
  {
    number: "03",
    title: "Landingspagina's",
    description:
      "High-conversion pagina's voor campagnes, productlanceringen en lead capture. Elk element verdient zijn plek. Snel, gefocust en de advertentie-investering waard.",
    tag: null,
  },
  {
    number: "04",
    title: "Digitale producten",
    description:
      "Web apps, SaaS-interfaces, klantportalen en interne tools. Productie-grade code, ontworpen op dezelfde standaard als de rest van jouw merk.",
    tag: null,
  },
  {
    number: "05",
    title: "Microsites",
    description:
      "Zelfstandige ervaringen voor lanceringen, campagnes en merkmomenten die meer verdienen dan een pagina op je hoofdsite.",
    tag: null,
  },
  {
    number: "06",
    title: "Redesigns",
    description:
      "Bestaande sites volledig herbouwd wanneer patchen niet meer zinvol is. Wij beoordelen wat de moeite waard is om te bewaren en ontwerpen dan vooruit.",
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
              Alles wat valt
              <br />
              <span className="text-zinc-500">onder Bouwen.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Elk project wordt gescopet op basis van jouw brief. Niets
              opnieuw ingekleurd, niets uit een starter kit, niets twee keer gebouwd.
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
    title: "Performance ingebakken van dag een",
    body: "Core Web Vitals, laadsnelheid en server performance worden ontworpen, niet toegevoegd. We streven naar groen in alle metrieken, want trage digitale producten kosten geld.",
  },
  {
    number: "02",
    title: "Conversiegericht layout",
    body: "Elke sectie, koptekst en CTA-plaatsing is gebaseerd op hoe jouw doelgebruiker beslissingen neemt. We ontwerpen voor resultaten, niet voor esthetiek alleen.",
  },
  {
    number: "03",
    title: "Merk-niveau mobile afwerking",
    body: "Typografie, witruimte, touch targets en responsive gedrag uitgevoerd op het niveau dat jouw positionering vereist. Niet wat een componentbibliotheek standaard oplevert.",
  },
  {
    number: "04",
    title: "Elke keer from scratch gebouwd",
    body: "Wij starten niet vanuit een theme en passen van buiten naar binnen aan. Wij beginnen bij jouw brief en bouwen van binnen naar buiten. Elk component bestaat omdat het nodig is.",
  },
  {
    number: "05",
    title: "SEO-klaar bij lancering",
    body: "Semantische structuur, metadata, Open Graph en performance ingebakken voor go-live. Je lanceert met wat zoekmachines belonen, niet wat je achteraf nog moet toevoegen.",
  },
  {
    number: "06",
    title: "Volledige eigendom, geen lock-in",
    body: "Jij bezit de code, de CMS-toegang en de deployment. Gedocumenteerde overdracht zonder doorlopende afhankelijkheid van Inovense om jouw project draaiende te houden.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Het verschil</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Wat onze builds onderscheidt van de standaard.
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

/* ─── Build Standard ────────────────────────────────────────────────────── */

function BuildStandard() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] py-28 md:py-40">
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
        <div className="mb-14 flex items-center justify-center gap-5">
          <div className="h-px w-16 bg-zinc-800" />
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-brand/60">
            Build Standaard
          </span>
          <div className="h-px w-16 bg-zinc-800" />
        </div>

        <p className="text-3xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-4xl lg:text-5xl">
          &ldquo;Elk pixel verdient zijn plek.
          <br />
          <span className="text-brand">
            Elke build gaat productie-klaar live.&rdquo;
          </span>
        </p>

        <p className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Wij reskinnen geen themes. Wij leveren geen werk dat slechts voldoende
          is. Wij bouwen vanuit eerste principes: performance-first,
          conversiegericht en gehouden aan een standaard waar we onze naam
          onder zetten.
        </p>

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

/* ─── Build Work / Proof ────────────────────────────────────────────────── */

const projects = [
  {
    client: "St. Regis Marriott",
    category: "Websiteontwikkeling",
    outcome:
      "Complete digitale herbouw gericht op merkvertrouwen en directe boekingen. Ontworpen op het luxeniveau van de accommodatie en performend op elk apparaat.",
    result: "Volledig redesign · Conversie-architectuur · Performance-audit",
    tags: ["Web Design", "Development", "SEO"],
  },
  {
    client: "Barb's Home Kitchen",
    category: "E-commerce en merk",
    outcome:
      "End-to-end e-commerce build met merkvernieuwing voor een groeiend foodbedrijf. Mobile-first, conversie-geoptimaliseerd en gebouwd rond productverhaal.",
    result: "E-commerce build · Merkidentiteit · Mobile-first",
    tags: ["E-commerce", "Brand", "Shopify"],
  },
  {
    client: "AP Consultants",
    category: "Merkwebsite",
    outcome:
      "Merkidentiteit en digitale aanwezigheid voor een professioneel dienstverlener. Ontworpen om autoriteit uit te stralen en betere gesprekken aan te trekken.",
    result: "Merkidentiteit · Webpresence · Positionering",
    tags: ["Branding", "Web Design", "Development"],
  },
];

function BuildWork() {
  return (
    <section
      id="build-werk"
      className="border-t border-white/[0.06] bg-zinc-900/15 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Build werk
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Geselecteerde Build-uitkomsten.
            </h2>
          </div>
          <Link
            href="/nl/intake"
            className="self-start text-sm font-medium text-zinc-500 transition-colors hover:text-brand md:self-auto"
          >
            Start je bouwproject →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.client}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/60 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <span className="mb-6 text-xs font-medium uppercase tracking-widest text-zinc-600 transition-colors group-hover:text-brand/70">
                {project.category}
              </span>

              <h3 className="mb-4 text-xl font-semibold text-zinc-50">
                {project.client}
              </h3>

              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                {project.outcome}
              </p>

              <p className="mb-6 text-xs leading-relaxed text-zinc-600">
                {project.result}
              </p>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-800 pt-6">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-600 transition-colors group-hover:border-zinc-700 group-hover:text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ──────────────────────────────────────────────────────── */

const steps = [
  {
    number: "01",
    title: "Aanvraag insturen",
    note: "Reactie binnen 24 uur",
    body: "Beschrijf het project, je doelen en hoe een goed resultaat eruitziet. We beoordelen elke aanvraag zelf en reageren binnen 24 uur.",
  },
  {
    number: "02",
    title: "Scope en voorstel",
    note: "Duidelijke deliverables, duidelijke prijs",
    body: "Een gestructureerd voorstel met scope, tijdlijn en investering. Geen verborgen kosten. Geen scope-ambiguiteit. Je weet precies wat je krijgt voor het werk begint.",
  },
  {
    number: "03",
    title: "Aanbetaling en kickoff",
    note: "Jouw startdatum is bevestigd",
    body: "Een aanbetaling bevestigt je startdatum. We bevestigen de planning en verzamelen de onboarding brief voor het werk begint.",
  },
  {
    number: "04",
    title: "Design en build",
    note: "Eén gestructureerde feedbackronde",
    body: "Design richting beoordeeld en afgestemd voor development. Eén gestructureerde feedbackronde per fase. Geen open-ended iteratielussen.",
  },
  {
    number: "05",
    title: "Review en lancering",
    note: "Niets gaat live zonder jouw akkoord",
    body: "Cross-device QA, performance testing en jouw definitieve beoordeling voor deployment. Wij regelen de lancering en bevestigen dat alles werkt zoals verwacht.",
  },
  {
    number: "06",
    title: "Overdracht",
    note: "Volledige eigendomsoverdracht",
    body: "Code, assets, CMS-toegang en documentatie overgedragen. Geen doorlopende afhankelijkheid van Inovense.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Het proces</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Van aanvraag tot oplevering.
          </h2>
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
    q: "Gebruiken jullie templates of page builders?",
    a: "Nee. Elk project wordt van aanvraag tot browser gebouwd. We reskinnen geen themes, gebruiken geen page builders en starten niet vanuit multipurpose starter kits. De code bestaat omdat jouw project het nodig heeft.",
  },
  {
    q: "Kunnen jullie ook een Shopify-winkel voor mij bouwen?",
    a: "Ja. Shopify e-commerce valt volledig onder de Build lane. Dat omvat maatwerk themes, conversie-optimalisatie, Shopify Plus configuratie en migraties van andere platformen.",
  },
  {
    q: "Hoe lang duurt een project gemiddeld?",
    a: "Dat hangt af van de scope. Een gerichte landingspagina kan in een tot twee weken. Een volledige merkwebsite of Shopify-winkel loopt typisch vier tot acht weken. Scope, feedbackrondes en asset-gereedheid zijn de belangrijkste variabelen.",
  },
  {
    q: "Kan ik de site of winkel zelf beheren na oplevering?",
    a: "Ja. CMS- of Shopify-toegang is inbegrepen bij van toepassing zijnde projecten. We configureren het, documenteren het en dragen het over. Je hoeft ons niet te bellen om een koptekst of product te wijzigen.",
  },
  {
    q: "Op welke platforms bouwen jullie?",
    a: "Next.js en React voor performance-kritische of product-grade builds. Shopify voor e-commerce. We kiezen het platform dat bij het project past, niet andersom.",
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
        <Eyebrow>Bouwproject starten</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Klaar om iets te bouwen
          <br className="hidden md:block" /> dat de moeite waard is?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          We nemen een klein aantal projecten tegelijk aan. Stuur een aanvraag
          en we reageren binnen 24 uur met een duidelijke richting.
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

export default function NlBuildPage() {
  return (
    <>
      <NlNav />
      <main className="flex flex-col">
        <Hero />
        <WhoThisIsFor />
        <WhatWeBuild />
        <OurApproach />
        <BuildStandard />
        <BuildWork />
        <HowItWorks />
        <FAQ />
        <NlRelatedServices current="build" />
        <PageCTA />
      </main>
      <NlFooter />
    </>
  );
}

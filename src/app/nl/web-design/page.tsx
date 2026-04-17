import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import TrustpilotSignal from "@/components/trustpilot-signal";
import { absoluteSiteUrl, buildLocalizedAlternates } from "@/lib/metadata";

const NL_WEB_DESIGN_ALTERNATES = buildLocalizedAlternates({
  canonicalPath: "/nl/web-design",
  enPath: "/web-design",
  nlPath: "/nl/web-design",
});

export const metadata: Metadata = {
  title: "Premium website design en ontwikkeling",
  description:
    "Maatwerk website design gebouwd voor conversie, performance en merk. Geen templates. Geen ballast. Ontworpen en gebouwd van brief tot browser door Inovense.",
  alternates: NL_WEB_DESIGN_ALTERNATES,
  openGraph: {
    url: absoluteSiteUrl("/nl/web-design"),
    title: "Premium website design en ontwikkeling | Inovense",
    description:
      "Maatwerk website design gebouwd voor conversie, performance en merk. Geen templates. Geen ballast. Ontworpen en gebouwd van brief tot browser door Inovense.",
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
            Web Design
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Build lane
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Geen templates
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Websites die standhouden{" "}
          <span className="text-brand">onder kritisch oog.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Conversiegericht, performance-first website design en ontwikkeling
          voor founders, operators en merken die concurreren op kwaliteit.
          Gebouwd van brief tot browser. Niets op basis van een template.
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

/* ─── Who this is for ───────────────────────────────────────────────────── */

const audience = [
  {
    title: "Founders die een serieuze merkpresentie lanceren",
    body: "Eerste indrukken zijn commerciele beslissingen. Als je site eruitziet als een template, concurreert hij als een.",
  },
  {
    title: "Operators die hun huidige site zijn ontgroeid",
    body: "Wanneer het bedrijf vooruit is gegaan maar de website niet, wordt de site de beperkende factor.",
  },
  {
    title: "Merken die betere conversie willen zonder uitstraling te offeren",
    body: "Performance en esthetiek staan niet op gespannen voet wanneer beide van het begin af aan op dezelfde standaard worden gebouwd.",
  },
  {
    title: "Productteams die een dedicated webervaring lanceren",
    body: "Nieuwe productlanceringen verdienen een front-end gebouwd rond het product, niet gesleurd uit een multipurpose theme.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Voor wie</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Gebouwd voor bedrijven die het zich niet kunnen veroorloven er gemiddeld uit te zien.
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
      "De volledige digitale aanwezigheid. Architectuur, design en build in handen van een team. Gestructureerd om te converteren en gebouwd om stand te houden onder aanhoudend verkeer en kritisch oog.",
    tag: "Meest gevraagd",
  },
  {
    number: "02",
    title: "Landingspagina's",
    description:
      "Hoge-conversiepagina's voor campagnes, productlanceringen en lead capture. Elk element verdient zijn plek. Snel, gefocust en de advertentiekosten erachter waard.",
    tag: null,
  },
  {
    number: "03",
    title: "Shopify en e-commerce",
    description:
      "Online winkels gebouwd rond hoe mensen echt kopen. Merkniveau afwerking, mobile-first en gestructureerd om te converteren van productpagina tot checkout.",
    tag: null,
  },
  {
    number: "04",
    title: "Microsites",
    description:
      "Zelfstandige ervaringen voor lanceringen, campagnes en merkmomenten die meer verdienen dan een pagina op je hoofdsite.",
    tag: null,
  },
  {
    number: "05",
    title: "Redesigns",
    description:
      "Bestaande sites van de grond af herbouwd wanneer patchen geen zin meer heeft. We beoordelen wat de moeite waard is om te behouden en ontwerpen daarna vooruit.",
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
              <span className="text-zinc-500">web design.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Elk project wordt geschopt vanuit jouw brief. Niets opnieuw
              ingekleurd, niets uit een starter kit gehaald, niets twee keer gebouwd.
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
    title: "Performancearchitectuur",
    body: "Core Web Vitals, laadsnelheid en serverprestaties worden van dag een ingebouwd. Niet achteraf opgelapt. We streven naar groen in de hele breedte omdat trage sites geld kosten.",
  },
  {
    number: "02",
    title: "Conversiegericht layout",
    body: "Elke sectie, kop en CTA-plaatsing wordt bepaald door hoe jouw doelgebruiker beslissingen neemt. We ontwerpen voor uitkomsten, niet voor esthetiek in isolatie.",
  },
  {
    number: "03",
    title: "Merkwaardige mobiele afwerking",
    body: "Typografie, spatiering, aanraakdoelen en responsief gedrag uitgevoerd op de standaard die jouw positionering vereist. Niet wat een componentbibliotheek standaard doet.",
  },
  {
    number: "04",
    title: "Elke keer van nul gebouwd",
    body: "We beginnen niet met een theme en passen van buiten naar binnen aan. We beginnen bij jouw brief en bouwen van binnen naar buiten. Elk component bestaat omdat het moet.",
  },
  {
    number: "05",
    title: "SEO-klaar bij lancering",
    body: "Semantische structuur, metadata, Open Graph en performance ingebakken voor go-live. Je lanceert met wat zoekmachines belonen, niet wat je later retroactief toevoegt.",
  },
  {
    number: "06",
    title: "Volledig eigendom, geen lock-in",
    body: "Jij bezit de code, de CMS-toegang en de deployment. Gedocumenteerde overdracht zonder doorlopende afhankelijkheid van Inovense om jouw site draaiende te houden.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Het verschil</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Wat onze builds scheidt van de standaard.
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
          &ldquo;Elk pixel verdient zijn plek.
          <br />
          <span className="text-brand">Elke build gaat productie-klaar live.&rdquo;</span>
        </p>

        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-zinc-500">
          We houden elk webproject op dezelfde standaard ongeacht de scope.
          Schone code, gedocumenteerde overdracht en geen snelkoppelingen ten
          koste van performance of conversie.
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
    body: "Beschrijf het project, je doelen en hoe een goed resultaat eruit ziet. We beoordelen elke brief zelf en reageren binnen 24 uur.",
  },
  {
    number: "02",
    title: "Scope en voorstel",
    note: "Duidelijke deliverables, duidelijke prijs",
    body: "Een gestructureerd voorstel met scope, tijdlijn en investering. Geen verborgen kosten. Geen scope-onduidelijkheid. Je weet precies wat je krijgt voor er werk begint.",
  },
  {
    number: "03",
    title: "Aanbetaling en kickoff",
    note: "Jouw slot is geblokkeerd",
    body: "Een aanbetaling bevestigt je startdatum. We bevestigen de planning en verzamelen de onboardingbrief voor het werk begint.",
  },
  {
    number: "04",
    title: "Ontwerp en build",
    note: "Een gestructureerde feedbackronde",
    body: "Ontwerprichting beoordeeld en afgestemd voor ontwikkeling. Een gestructureerde feedbackronde per fase. Geen open iteratielussen.",
  },
  {
    number: "05",
    title: "Review en lancering",
    note: "Niets gaat live zonder jouw akkoord",
    body: "Cross-device QA, prestatietesten en jouw finale review voor deployment. We handelen de lancering af en bevestigen dat alles werkt zoals verwacht.",
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
            Van brief tot browser.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
            Elk project volgt dezelfde structuur.{" "}
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
    q: "Gebruiken jullie templates of paginabouwers?",
    a: "Nee. Elk project wordt gebouwd van brief tot browser. We reskinnen geen themes, gebruiken geen paginabouwers en starten niet vanuit multipurpose starter kits. De code bestaat omdat jouw project het vereist.",
  },
  {
    q: "Wat moet ik aanleveren voor het werk begint?",
    a: "We behandelen de onboardingbrief als onderdeel van ons proces. Voor de build begint stemmen we af op merkassets, kopieerrichting, referenties en eventuele bestaande technische setup. Je hoeft niet alles klaar te hebben op dag een.",
  },
  {
    q: "Hoe lang duurt een websiteproject doorgaans?",
    a: "De tijdlijn hangt af van de scope. Een gerichte landingspagina kan in een tot twee weken worden opgeleverd. Een volledige merkwebsite loopt doorgaans vier tot acht weken. Scope, feedbackrondes en assetbereidheid zijn de belangrijkste variabelen.",
  },
  {
    q: "Op welke platforms bouwen jullie?",
    a: "Next.js en React voor performance-kritische of productwaardige builds. Shopify voor e-commerce. We kiezen het platform dat bij het project past, niet andersom.",
  },
  {
    q: "Kan ik de site zelf bijwerken na de lancering?",
    a: "Ja. CMS-toegang is inbegrepen bij van toepassing zijnde projecten. We configureren het, documenteren het en dragen het over. Je moet ons niet hoeven bellen om een kop te wijzigen.",
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
        <Eyebrow>Web design project starten</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Klaar om een website te bouwen
          <br className="hidden md:block" /> waar je trots op bent?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          We nemen een klein aantal projecten tegelijk aan. Stuur een brief
          en we reageren binnen 24 uur met een duidelijke richting, geen
          voorsteltemplate.
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

export default function NlWebDesignPage() {
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

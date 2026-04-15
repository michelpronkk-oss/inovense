import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import NlSystemsHero from "@/components/nl/nl-systems-hero";
import NlRelatedServices from "@/components/nl/nl-related-services";

export const metadata: Metadata = {
  title: "AI-automatisering, Workflows en Interne Systemen op Maat",
  description:
    "AI-automatisering, workflow systemen, interne tools en operationele infrastructuur gebouwd rondom hoe jouw bedrijf echt werkt. Geen off-the-shelf, geen generieke tools.",
  alternates: {
    canonical: "https://inovense.com/nl/systems",
    languages: {
      en: "https://inovense.com/systems",
      nl: "https://inovense.com/nl/systems",
      "x-default": "https://inovense.com/systems",
    },
  },
  openGraph: {
    url: "https://inovense.com/nl/systems",
    title: "AI-automatisering, Workflows en Interne Systemen op Maat | Inovense",
    description:
      "AI-automatisering, workflow systemen, interne tools en operationele infrastructuur gebouwd rondom hoe jouw bedrijf echt werkt. Geen off-the-shelf, geen generieke tools.",
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
  return <NlSystemsHero />;
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
    title: "AI-integraties",
    description:
      "AI-aangedreven content pipelines, documentverwerking, geautomatiseerde klantcommunicatie en beslissingsondersteuning. Gebouwd op het model dat het beste presteert voor jouw use case.",
    tag: null,
  },
  {
    number: "03",
    title: "Interne tools en dashboards",
    description:
      "Maatwerk interfaces waarmee jouw team dagelijks data kan inzien, processen kan beheren en beslissingen kan nemen. Geen off-the-shelf software die je team aan moet passen.",
    tag: null,
  },
  {
    number: "04",
    title: "CRM en lead management",
    description:
      "Operationele CRM-logica, lead routing en commercieel procesmanagement gebouwd op wat jouw team daadwerkelijk nodig heeft, niet wat een generiek pakket standaard biedt.",
    tag: null,
  },
  {
    number: "05",
    title: "Data integraties",
    description:
      "Verbindingen tussen tools, databases en systemen die handmatige overzetting elimineren. Eén bron van waarheid, automatisch bijgehouden.",
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
              <span className="text-zinc-500">onder Systemen.</span>
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
    body: "Automatisering die alleen werkt zolang de originele bouwer er is, lost niets op. We bouwen systemen die jouw team kan begrijpen, aanpassen en beheren zonder technische afhankelijkheid.",
  },
  {
    number: "03",
    title: "Het juiste model voor de taak",
    body: "We zijn niet gebonden aan een specifiek AI-platform of toolstack. We kiezen het model en de architectuur die het beste passen bij jouw use case, budget en vereisten voor betrouwbaarheid.",
  },
  {
    number: "04",
    title: "Stapsgewijze oplevering",
    body: "Grote projecten worden gefaseerd opgeleverd. Je ziet waarde eerder, en we passen aan op basis van hoe het systeem presteert in de praktijk voor we verder uitbreiden.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Het verschil</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Systemen die werken zoals jouw bedrijf werkt.
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

/* ─── Systems Standard ──────────────────────────────────────────────────── */

function SystemsStandard() {
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
            Systems Standaard
          </span>
          <div className="h-px w-16 bg-zinc-800" />
        </div>

        <p className="text-3xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-4xl lg:text-5xl">
          &ldquo;Geen plakband. Geen AI-experimenten.
          <br />
          <span className="text-brand">
            Alleen systemen die werken.&rdquo;
          </span>
        </p>

        <p className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Wij plakken geen automatisering op gebroken processen. Wij verkopen
          geen vage AI-capaciteit. Wij ontwerpen operationele infrastructuur
          die past bij jouw bedrijf, betrouwbaar draait en jouw team sneller
          maakt zonder nieuwe complexiteit toe te voegen.
        </p>

        <div className="mt-14 flex items-center justify-center gap-5">
          <div className="h-px max-w-[120px] flex-1 bg-zinc-800" />
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-700">
            Inovense
          </span>
          <div className="h-px max-w-[120px] flex-1 bg-zinc-800" />
        </div>
      </div>
    </section>
  );
}

/* ─── Systems Outcomes ──────────────────────────────────────────────────── */

const outcomes = [
  {
    client: "E-commerce operator",
    category: "AI-workflows en CRM-sync",
    outcome:
      "Post-purchase flows, CRM-sync en lead routing draaien zonder handmatige input. Het team verschoof van dagelijks admin naar beslissingen die echt mensen vereisen.",
    result: "3 handmatige processen verwijderd · Volledige post-purchase flow geautomatiseerd · CRM-sync live",
    tags: ["AI-workflows", "CRM-logica", "Ops Automatisering"],
  },
  {
    client: "Professioneel dienstverlener",
    category: "Pipeline logica en rapportage",
    outcome:
      "Pipeline-zichtbaarheid ging van chaotisch naar helder. Voorstel-triggers, follow-up sequenties en wekelijkse rapportage draaien nu op schema. Geen achtervolgen, geen gemiste stappen.",
    result: "Pipeline geherstructureerd · Auto-rapportage live · Follow-up sequenties actief",
    tags: ["CRM-logica", "Rapportage Flows", "Automatisering"],
  },
  {
    client: "Snelgroeiende SaaS",
    category: "Lead routing en onboarding",
    outcome:
      "Inbound kwalificeert, scoort en wijst zichzelf toe. Onboarding-triggers vuren op de juiste condities. Het salesteam besteedt tijd aan gesprekken, niet aan admin.",
    result: "Lead scoring gebouwd · Routing logica deployed · Onboarding sequenties live",
    tags: ["Lead Routing", "AI-workflows", "Onboarding"],
  },
];

function SystemsOutcomes() {
  return (
    <section
      id="systems-werk"
      className="border-t border-white/[0.06] bg-zinc-900/15 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Uitkomsten
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Geselecteerde Systems-uitkomsten.
            </h2>
          </div>
          <Link
            href="/nl/intake"
            className="self-start text-sm font-medium text-zinc-500 transition-colors hover:text-brand md:self-auto"
          >
            Start je systeemproject →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {outcomes.map((o) => (
            <div
              key={o.client}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/60 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <span className="mb-6 text-xs font-medium uppercase tracking-widest text-zinc-600 transition-colors group-hover:text-brand/70">
                {o.category}
              </span>

              <h3 className="mb-4 text-xl font-semibold text-zinc-50">
                {o.client}
              </h3>

              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                {o.outcome}
              </p>

              <p className="mb-6 text-xs leading-relaxed text-zinc-600">
                {o.result}
              </p>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-800 pt-6">
                {o.tags.map((tag) => (
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

/* ─── Systems Process ───────────────────────────────────────────────────── */

const processSteps = [
  {
    number: "01",
    title: "Audit en analyse",
    body: "We brengen jouw huidige processen, tools en handmatige workflows in kaart voor we iets aanraken. We moeten begrijpen wat er daadwerkelijk bestaat voor we ontwerpen wat er komt.",
    note: "Helderheid voor ontwerp",
  },
  {
    number: "02",
    title: "Systeemontwerp",
    body: "We ontwerpen de logica, flow-architectuur en integratiestructuur samen met jou. Geen black boxes. Je begrijpt wat we bouwen, waarom het zo werkt en wat het verbindt.",
    note: "Geen verrassingen in productie",
  },
  {
    number: "03",
    title: "Bouwen en testen",
    body: "Productie-grade implementatie met real-world edge-case testing. We stress-testen faaltoestanden, timing-problemen en data-integriteit voor iets in de buurt van je live omgeving komt.",
    note: "Betrouwbaar vanaf dag een",
  },
  {
    number: "04",
    title: "Deployen en overdragen",
    body: "Heldere deployment met volledige documentatie, operatortraining waar nodig en monitoring na lancering. Je vertrekt met volledig eigendom van je systemen en alles wat nodig is om ze te draaien.",
    note: "Volledige eigendom, geen lock-in",
  },
];

function SystemsProcess() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            Systems proces
          </p>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Van brief tot live infrastructuur.
          </h2>
        </div>

        <div className="divide-y divide-zinc-800/70">
          {processSteps.map((step) => (
            <div
              key={step.number}
              className="group flex flex-col gap-6 py-8 transition-colors hover:bg-zinc-900/20 md:flex-row md:items-start md:gap-0 md:py-10 md:-mx-6 md:px-6 md:rounded-xl"
            >
              <div className="flex shrink-0 items-center gap-4 md:w-16 md:flex-col md:items-start md:gap-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/35 bg-brand/10 font-mono text-xs font-semibold text-brand">
                  {step.number}
                </span>
              </div>
              <div className="shrink-0 md:w-[220px] md:pr-8 md:pt-1.5">
                <h3 className="mb-1.5 text-base font-semibold text-zinc-50">
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
    a: "We documenteren alles en leveren de code over. Kleine aanpassingen kun je zelf doorvoeren of via ons. Grotere uitbreidingen bespreken we als apart project.",
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
        <Eyebrow>Systeemproject starten</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Klaar om te stoppen met
          <br className="hidden md:block" /> hetzelfde handmatige werk?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Beschrijf je operatie en laat ons inschatten wat er mogelijk is.
          We reageren binnen 24 uur met een duidelijke richting.
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

export default function NlSystemsPage() {
  return (
    <>
      <NlNav />
      <main className="flex flex-col">
        <Hero />
        <WhoThisIsFor />
        <WhatWeBuild />
        <OurApproach />
        <SystemsStandard />
        <SystemsOutcomes />
        <SystemsProcess />
        <FAQ />
        <NlRelatedServices current="systems" />
        <PageCTA />
      </main>
      <NlFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import NlGrowthHero from "@/components/nl/nl-growth-hero";
import NlRelatedServices from "@/components/nl/nl-related-services";

export const metadata: Metadata = {
  title: "Groeicampagnes gericht op pipeline, niet op impressies. | Inovense",
  description:
    "Betaalde media, content en leadgeneratie gebouwd om je pipeline te vullen. We draaien groeicampagnes voor bedrijven die gekwalificeerde leads nodig hebben.",
  alternates: {
    canonical: "https://inovense.com/nl/growth",
    languages: {
      en: "https://inovense.com/growth",
      nl: "https://inovense.com/nl/growth",
      "x-default": "https://inovense.com/growth",
    },
  },
  openGraph: {
    url: "https://inovense.com/nl/growth",
    title: "Groeicampagnes gericht op pipeline, niet op impressies. | Inovense",
    description:
      "Betaalde media, content en leadgeneratie gebouwd om je pipeline te vullen. We draaien groeicampagnes voor bedrijven die gekwalificeerde leads nodig hebben.",
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
  return <NlGrowthHero />;
}

/* ─── Focus areas ───────────────────────────────────────────────────────── */

const focusAreas = [
  {
    title: "Lead capture en kwalificatie",
    body: "Formflows, intake logica en kwalificatievragen die ruis verminderen en saleskwaliteit verhogen.",
  },
  {
    title: "Routing en opvolging",
    body: "Heldere routingregels naar CRM, inbox en owner zodat geen waardevolle aanvraag verdwijnt.",
  },
  {
    title: "Distributie en campagnes",
    body: "Content- en paid-uitrol met duidelijke structuur per kanaal, zonder fragmentatie tussen teams.",
  },
  {
    title: "Feedback en optimalisatie",
    body: "Terugkoppeling op conversionpunten zodat het systeem per cyclus scherper wordt in plaats van drukker.",
  },
];

function FocusAreas() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Voor wie dit is</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Growth met systeemdiscipline.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {focusAreas.map((item) => (
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

/* ─── Scope ─────────────────────────────────────────────────────────────── */

const scope = [
  {
    number: "01",
    title: "Betaalde social campagnes",
    description:
      "Campagne-architectuur en creatieve assets gericht op conversie, niet alleen bereik. Gebouwd rondom jouw funnel en doelgroep.",
    tag: "Kerngebied",
  },
  {
    number: "02",
    title: "Search en vindbaarheid",
    description:
      "SEO-structuur, landingspagina's en contentstrategie afgestemd op hoe jouw doelgroep zoekt en beslist.",
    tag: null,
  },
  {
    number: "03",
    title: "Leadgeneratiefunnels",
    description:
      "Van eerste contact tot gekwalificeerde lead. Capture, kwalificatie, scoring en routing als een gekoppeld commercieel systeem.",
    tag: null,
  },
  {
    number: "04",
    title: "Content en organische groei",
    description:
      "Onderwerpen, publicatieritme en distributie gebouwd op compounding organisch bereik en autoriteit in jouw markt.",
    tag: null,
  },
  {
    number: "05",
    title: "E-mail en CRM-nurture",
    description:
      "Follow-up sequenties, nurture flows en pipeline-opvolging die leads omzetten in gesprekken zonder handmatige tussenkomst.",
    tag: null,
  },
  {
    number: "06",
    title: "Performanceaudits",
    description:
      "Audit van huidige kanalen, conversiepunten en growthdata. We identificeren waar het lekt en waar de echte kansen liggen.",
    tag: null,
  },
];

function Scope() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <Eyebrow>Wat we draaien</Eyebrow>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Groeiwerk dat aansluit op commercieel resultaat.
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Elk groeiproject wordt geschreven rond een commercieel doel, niet een kanaal.
            </p>
          </div>
        </div>

        <div className="divide-y divide-zinc-800/70">
          {scope.map((item) => (
            <div
              key={item.number}
              className="group flex flex-col gap-4 py-8 transition-colors hover:bg-zinc-900/20 md:-mx-6 md:flex-row md:items-start md:gap-0 md:rounded-xl md:px-6 md:py-10"
            >
              <span className="w-14 shrink-0 font-mono text-xs font-medium text-brand/70 md:pt-0.5">
                {item.number}
              </span>
              <div className="shrink-0 md:w-[230px] md:pr-8">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-zinc-50">{item.title}</h3>
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

/* ─── Growth Difference ─────────────────────────────────────────────────── */

const difference = [
  {
    number: "01",
    title: "We bouwen de funnel, niet alleen de advertentie",
    body: "Growth bestaat hier uit gekoppelde onderdelen: capture, kwalificatie, routing, distributie en feedback. Elk onderdeel versterkt het volgende. Geen losse campagnes.",
  },
  {
    number: "02",
    title: "Commerciële doelen staan centraal",
    body: "Elk kanaal, elke asset en elke beslissing is gekoppeld aan een uitkomst. We draaien geen campagnes om activiteit te tonen.",
  },
  {
    number: "03",
    title: "AI-gestuurde optimalisatie",
    body: "We zetten AI in voor snellere iteraties, betere targetinglogica en scherpere creatieve beslissingen, niet als vervanger van strategie.",
  },
  {
    number: "04",
    title: "Crosschannel inzicht",
    body: "We kijken naar hoe kanalen elkaar versterken. SEO, paid en content werken samen rondom jouw commercieel doel, niet los van elkaar.",
  },
  {
    number: "05",
    title: "Transparante rapportage",
    body: "Rapportage op metrics die beslissingen sturen, niet op ijdele nummers. Als iets niet werkt, zeggen we het en passen we aan.",
  },
];

function GrowthDifference() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Het verschil</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Waarom ons groeiwerk converteert.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {difference.map((item) => (
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

/* ─── Growth Standard ───────────────────────────────────────────────────── */

function GrowthStandard() {
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
            Growth Standaard
          </span>
          <div className="h-px w-16 bg-zinc-800" />
        </div>

        <p className="text-3xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-4xl lg:text-5xl">
          &ldquo;Wij verkopen geen marketingactiviteit.
          <br />
          <span className="text-brand">
            Wij bouwen groei-infrastructuur.&rdquo;
          </span>
        </p>

        <p className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Wij draaien geen campagnes om te zeggen dat we het gedaan hebben.
          Elk kanaal, elke asset en elke beslissing is gekoppeld aan een
          uitkomst. Growth die compoundt, rapportage die eerlijk is en
          uitvoering gehouden aan dezelfde standaard als alles wat wij bouwen.
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

/* ─── Growth Outcomes ───────────────────────────────────────────────────── */

const outcomes = [
  {
    client: "B2B SaaS bedrijf",
    category: "SEO-infrastructuur en contentsysteem",
    outcome:
      "Organische pipeline groeide van bijna nul naar het primaire acquisitiekanaal binnen zes maanden. Het contentsysteem draait nu op ritme, compoundt maandelijks en vereist geen handmatige coordinatie.",
    result: "SEO-architectuur gebouwd · Contentsysteem live · Organisch nu primair kanaal",
    tags: ["SEO-infrastructuur", "Contentsystemen", "Rapportage"],
  },
  {
    client: "E-commerce merk",
    category: "Paid media en landingspagina's",
    outcome:
      "ROAS verbeterde aanzienlijk na herstructurering van de campagne-architectuur en herbouw van landingspagina's rondom echte conversie-intentie. Minder besteding, betere marge, schoner signaal.",
    result: "Campagne-architectuur herbouwd · Landingspagina's geoptimaliseerd · Bestedings-efficiency verbeterd",
    tags: ["Paid Media", "Landingspagina optimalisatie", "Conversie"],
  },
  {
    client: "Professioneel dienstverlener",
    category: "Content en signaalrapportage",
    outcome:
      "Maandelijks gekwalificeerd inbound verdrievoudigde na implementatie van een gestructureerd contentsysteem en herstel van de conversielaag. Rapportage reflecteert nu echte pipeline, geen ijdele nummers.",
    result: "Contentsysteem deployed · Rapportage herbouwd · Gekwalificeerd inbound verdrievoudigd",
    tags: ["Contentsystemen", "Signaalrapportage", "SEO"],
  },
];

function GrowthOutcomes() {
  return (
    <section
      id="growth-werk"
      className="border-t border-white/[0.06] bg-zinc-900/15 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Uitkomsten
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Geselecteerde Growth-uitkomsten.
            </h2>
          </div>
          <Link
            href="/nl/intake"
            className="self-start text-sm font-medium text-zinc-500 transition-colors hover:text-brand md:self-auto"
          >
            Start je growthproject →
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

/* ─── Growth Process ────────────────────────────────────────────────────── */

const processSteps = [
  {
    number: "01",
    title: "Audit en baseline",
    body: "We auditeren je huidige kanalen, conversiepunten en growthdata voor we een aanbeveling doen. We moeten weten wat daadwerkelijk werkt en wat niet voor we iets ontwerpen.",
    note: "Bewijs voor strategie",
  },
  {
    number: "02",
    title: "Strategie en architectuur",
    body: "We ontwerpen een groeisysteem gebouwd rondom jouw business model, margestructuur en acquisitiedoelen. Geen generiek draaiboek op jouw merk geplakt. Een specifiek, gestructureerd plan.",
    note: "Gebouwd voor jouw bedrijf",
  },
  {
    number: "03",
    title: "Bouwen en lanceren",
    body: "Systeembouw, campagne-aanmaak, contentproductie en technische implementatie. Alles opgezet op dezelfde productiestandaard als ons Build en Systems werk.",
    note: "Productie-grade standaard",
  },
  {
    number: "04",
    title: "Optimaliseren en compounderen",
    body: "Continue verfijning op basis van echt signaal. Conversietesting, kanaaloptimalisatie en samengestelde uitvoering in de tijd. Growth die op zichzelf voortbouwt in plaats van elke maand opnieuw te starten.",
    note: "Langetermijn compounding",
  },
];

function GrowthProcess() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
            Growth proces
          </p>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Van brief tot samengestelde acquisitie.
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
    q: "Doen jullie ook alleen losse campagnes?",
    a: "Alleen als ze logisch passen in een bredere commerciële flow. We geven voorkeur aan werk dat structureel effect heeft op leadkwaliteit en opvolging.",
  },
  {
    q: "Is dit hetzelfde als AI-automatisering?",
    a: "Nee. Growth focust op commerciële acquisitie en distributie. Systems focust op operationele workflows en interne procesautomatisering.",
  },
  {
    q: "Kunnen jullie aansluiten op ons bestaande CRM?",
    a: "Ja. We werken juist vaak bovenop bestaande CRM- en salesprocessen en herstellen de koppelingen waar commercieel lek ontstaat.",
  },
  {
    q: "Hoe snel zien we impact?",
    a: "Dat hangt af van huidige datakwaliteit, trafficvolume en uitvoeringsdiscipline. We sturen op vroege signalen en bouwen daarna door op wat werkt.",
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
              <p className="mb-3 text-sm font-semibold text-zinc-100 md:mb-0">{item.q}</p>
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
        <Eyebrow>Growth project starten</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Klaar om te groeien met
          <br className="hidden md:block" /> een scherp, senior team?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Vertel ons je groeidoel en we scopen een plan.
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
          {["Selectieve intake. We nemen alleen projecten aan die we kunnen winnen."].map((item) => (
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

export default function NlGrowthPage() {
  return (
    <>
      <NlNav />
      <main className="flex flex-col">
        <Hero />
        <FocusAreas />
        <Scope />
        <GrowthDifference />
        <GrowthStandard />
        <GrowthOutcomes />
        <GrowthProcess />
        <FAQ />
        <NlRelatedServices current="growth" />
        <PageCTA />
      </main>
      <NlFooter />
    </>
  );
}

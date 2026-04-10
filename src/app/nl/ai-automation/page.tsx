import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import TrustpilotSignal from "@/components/trustpilot-signal";

export const metadata: Metadata = {
  title: "AI-automatisering en bedrijfsworkflows",
  description:
    "Praktische AI-automatisering, lead routing en operationele workflows voor bedrijven die echte interne hefboomwerking nodig hebben. Geen vage AI-beloften. Systemen die draaien.",
  alternates: {
    canonical: "https://inovense.com/nl/ai-automation",
  },
  openGraph: {
    url: "https://inovense.com/nl/ai-automation",
    title: "AI-automatisering en bedrijfsworkflows | Inovense",
    description:
      "Praktische AI-automatisering, lead routing en operationele workflows voor bedrijven die echte interne hefboomwerking nodig hebben. Geen vage AI-beloften. Systemen die draaien.",
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
        className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 80% 10%, rgba(73,160,164,0.11) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-[30%] h-[500px] w-[500px]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 50%, rgba(73,160,164,0.08) 0%, transparent 65%)",
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
            AI-automatisering
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Systems lane
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Praktische systemen
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Automatisering gebouwd rond{" "}
          <span className="text-brand">hoe jouw bedrijf echt werkt.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          AI-workflows, lead routing en operationele automatisering voor
          bedrijven die hun team willen richten op echt werk in plaats van
          handmatige processen. Praktische systemen. Geen vage AI-beloften.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/nl/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Automatiseringsproject starten
          </Link>
          <Link
            href="/nl/systems"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            Bekijk de Systems lane
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
          {[
            "Gebouwd op jouw bestaande stack",
            "Gedocumenteerd en onderhoudbaar",
            "Reactie binnen 24 uur",
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
    title: "Operationeel zware bedrijven met te veel handmatige processen",
    body: "Wanneer gekwalificeerde mensen veel tijd besteden aan repetitief, laagwaardig werk, presteert het bedrijf onder zijn capaciteit.",
  },
  {
    title: "Salesteams met gebroken of ontbrekende lead routing",
    body: "Leads via meerdere kanalen zonder consistente kwalificatielogica leiden tot langzamere opvolging en slechtere conversie.",
  },
  {
    title: "Founders wiens bedrijf draait op losgekoppelde tools",
    body: "Spreadsheets, kopieer-plak tussen apps en handmatige data-invoer zijn prima totdat ze dat niet meer zijn. Op een gegeven moment wordt de prijs zichtbaar.",
  },
  {
    title: "Bedrijven die tools kopen die niet met elkaar praten",
    body: "De meeste SaaS-tools lossen een smal probleem goed op. De frictie zit tussen die tools. Daar creert automatisering de meeste hefboomwerking.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Voor wie</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Gebouwd voor bedrijven waar handmatige processen de bottleneck zijn.
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
    title: "Lead capture en routing",
    description:
      "Automatisch kwalificeren, scoren en routeren van inkomende leads naar de juiste persoon of pipeline-fase. Snellere opvolging, geen leads die door de mazen vallen.",
    tag: "Meest gevraagd",
  },
  {
    number: "02",
    title: "CRM-sync en datapipelines",
    description:
      "Klantdata actueel en consistent houden over al je tools zonder handmatige tussenkomst. Enrichment, deduplicatie en veldsynchronisatie gebouwd rond jouw werkelijke CRM.",
    tag: null,
  },
  {
    number: "03",
    title: "Rapportage en waarschuwingssystemen",
    description:
      "Geautomatiseerde samenvattingen, prestatierapporten en drempelgestuurde waarschuwingen afgeleverd bij de juiste persoon op het juiste moment. Nuttig signaal, geen dataruis.",
    tag: null,
  },
  {
    number: "04",
    title: "Document- en goedkeuringsworkflows",
    description:
      "Voorstelgeneratie, contractpipelines en gestructureerde goedkeuringsstromen. Handmatige processen met hoge frictie vervangen door betrouwbare geautomatiseerde sequenties.",
    tag: null,
  },
  {
    number: "05",
    title: "Interne tools en dashboards",
    description:
      "Aangepaste operator-gerichte tools gebouwd rond jouw werkelijke workflow. Geen extra SaaS-abonnement, geen generiek dashboard. Iets dat past bij hoe jouw team werkt.",
    tag: null,
  },
  {
    number: "06",
    title: "Integratiepipelines",
    description:
      "Losgekoppelde tools verbinden en data tonen waar jouw team daadwerkelijk opereert. De frictie tussen je apps is meestal waar de meeste hefboomwerking zit.",
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
              <span className="text-zinc-500">AI-automatisering.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Elk systeem wordt afgestemd op jouw werkelijke workflow. We
              bouwen geen generieke automatiseringssjablonen. We bouwen wat
              jouw specifieke operatie nodig heeft.
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
    title: "Systeemdenken, geen snelkoppelingen",
    body: "Elke workflow wordt van begin tot eind in kaart gebracht voor er iets gebouwd wordt. We begrijpen het volledige plaatje, inclusief faalmodi, voor we een enkele integratie schrijven.",
  },
  {
    number: "02",
    title: "Gebouwd rond jouw bestaande stack",
    body: "We werken met de tools die je al hebt. Geen gedwongen migraties, geen vervanging van platforms die werken. Het systeem past bij jouw operatie, niet andersom.",
  },
  {
    number: "03",
    title: "Betrouwbaarheid voor featureaantal",
    body: "Een workflow die 98% van de tijd correct werkt maar stilzwijgend faalt de andere 2% is actief schadelijk. We bouwen voor betrouwbaarheid, met foutafhandeling, logging en waarschuwingen inbegrepen.",
  },
  {
    number: "04",
    title: "Gedocumenteerd en onderhoudbaar",
    body: "Alles wat we bouwen wordt geleverd met documentatie die jouw team kan volgen zonder ons te bellen. Het systeem moet het traject overleven, niet ervan afhangen.",
  },
  {
    number: "05",
    title: "Hoogste hefboomwerking eerst",
    body: "We richten ons op de automatiseringen die de meeste frictie direct wegnemen. Geen volledige operationele verbouwingen. Het juiste eerste systeem creert momentum voor wat daarna komt.",
  },
  {
    number: "06",
    title: "Geen black boxes",
    body: "Jouw team zal begrijpen wat het systeem doet en waarom. Als er iets kapot gaat, moet je het kunnen diagnosticeren. We bouwen geen systemen die vereisen dat wij ze voor altijd onderhouden.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Het verschil</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Wat operationele systemen scheidt van lapmiddelen.
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

      <div className="relative mx-auto max-w-4xl px-6">
        <div className="mb-12 flex items-center gap-5">
          <div className="h-px w-16 bg-zinc-800" />
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-brand/60">
            Systems bewijs
          </span>
        </div>

        <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-2xl font-semibold leading-snug tracking-tight text-zinc-50 md:text-3xl">
              &ldquo;Interne hefboomwerking,
              <br />
              <span className="text-brand">gebouwd om te blijven.&rdquo;</span>
            </p>
            <p className="mt-6 text-sm leading-relaxed text-zinc-500">
              Inovense bouwde SilentSpend, een monetisatie-intelligentieplatform,
              met dezelfde systeemarchitectuurprincipes die we toepassen op
              klantautomatiseringstrajecten. Complexe datapipelines, gestructureerde
              signaalverwerking en operator-grade interactieontwerp.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <TrustpilotSignal note="Lees klantreviews" />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-6">
            <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
              SilentSpend by Inovense
            </p>
            <div className="space-y-4">
              {[
                "Monetisatieveranderingsdetectie over digitale producten",
                "Signaalbron met gestructureerd bewijs en audittrail",
                "Beslissingslaag voor operators, founders en pricingteams",
                "Gebouwd op Next.js, Supabase en een aangepaste intelligentiepipeline",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" aria-hidden />
                  <span className="text-sm leading-relaxed text-zinc-400">{point}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-zinc-800/60 pt-5">
              <Link
                href="/work/silentspend"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                Case bekijken
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
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
    body: "Beschrijf het handmatige proces of de operationele bottleneck die je wilt oplossen. Wees specifiek over wat je tijd kost of fouten introduceert.",
  },
  {
    number: "02",
    title: "Systeemaudit",
    note: "Eerst in kaart brengen, dan bouwen",
    body: "We brengen jouw huidige tools, datastromen en faaloverzichten in kaart voor we een implementatie scopen. Het volledige plaatje begrijpen voorkomt het bouwen van het verkeerde ding.",
  },
  {
    number: "03",
    title: "Scope en voorstel",
    note: "Duidelijke deliverables, duidelijke prijs",
    body: "Een voorstel met de specifieke systemen om te bouwen, implementatiebenadering, tijdlijn en investering. Geprioriteerd op het hoogste-hefboomwerk eerst.",
  },
  {
    number: "04",
    title: "Bouwen en testen",
    note: "Staging voor productie",
    body: "Alle workflows gebouwd en getest in een stagingomgeving voor productieimplementatie. Foutafhandeling en logging inbegrepen.",
  },
  {
    number: "05",
    title: "Overdracht en documentatie",
    note: "Volledige eigendomsoverdracht",
    body: "Volledige documentatie, toegangsgegevens en workflowdiagrammen overgedragen. Jouw team moet kunnen begrijpen, monitoren en aanpassen wat er gebouwd is.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Het proces</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Van brief tot draaiend systeem.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
            Elk traject volgt dezelfde gestructureerde aanpak.{" "}
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
    q: "Met welke tools en platforms werk je?",
    a: "We werken met de belangrijkste automatiserings- en integratieplatforms, waaronder Make, n8n, Zapier en aangepaste pipelines waar de use case dat vereist. We bouwen ook rechtstreeks tegen API's, Supabase, Airtable en de meeste moderne SaaS-stacks.",
  },
  {
    q: "Heb ik een ontwikkelaar nodig om te onderhouden wat je bouwt?",
    a: "Nee. Een deel van wat we opleveren is documentatie die grondig genoeg is dat jouw team het systeem kan monitoren en aanpassen. Voor complexere builds scoppen we een overdrachtsessie. Het doel is altijd een operatie die je zelf kunt beheren.",
  },
  {
    q: "Kun je werken met ons bestaande CRM en toolstack?",
    a: "Ja. We bouwen rond wat je hebt. We proberen je stack niet te vervangen door onze voorkeurstools. Of je CRM HubSpot, Salesforce of iets aangepast is, we werken ermee.",
  },
  {
    q: "Hoe verschilt dit van het inhuren van een no-code freelancer?",
    a: "Het verschil zit in systeemdenken en betrouwbaarheidsnormen. Een no-code freelancer kan dingen aan elkaar koppelen. Wat wij opleveren is een in kaart gebracht, gedocumenteerd, foutafhandelend systeem dat iemand in jouw team kan begrijpen en onderhouden.",
  },
  {
    q: "We hebben al wat automatisering. Kunnen jullie die auditen en verbeteren?",
    a: "Ja. Systeemaudits zijn hoe we de meeste trajecten beginnen. Als je bestaande automatiseringen hebt die fragiel, ongedocumenteerd of slecht presterend zijn, kunnen we ze beoordelen, herbouwen of uitbreiden.",
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
          Vertel ons wat jouw team
          <br className="hidden md:block" /> vertraagt.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Stuur een brief met de bottleneck. We reageren binnen 24 uur met
          een directe beoordeling van of en hoe we kunnen helpen.
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

export default function NlAIAutomationPage() {
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

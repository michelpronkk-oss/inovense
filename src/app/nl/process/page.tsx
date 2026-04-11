import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import NlProcessHero from "@/components/nl/nl-process-hero";

export const metadata: Metadata = {
  title: "Proces: Van intake tot overdracht",
  description:
    "Het Inovense proces in acht duidelijke stappen. Intake, scope, voorstel, aanbetaling, onboarding, uitvoering, lancering en overdracht zonder ruis.",
  alternates: {
    canonical: "https://inovense.com/nl/process",
    languages: {
      en: "https://inovense.com/process",
      nl: "https://inovense.com/nl/process",
      "x-default": "https://inovense.com/process",
    },
  },
  openGraph: {
    url: "https://inovense.com/nl/process",
    title: "Proces: Van intake tot overdracht | Inovense",
    description:
      "Het Inovense proces in acht duidelijke stappen. Intake, scope, voorstel, aanbetaling, onboarding, uitvoering, lancering en overdracht zonder ruis.",
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
  return <NlProcessHero />;
}

/* ─── Workflow stages (8 steps) ─────────────────────────────────────────── */

const stages = [
  {
    number: "01",
    title: "Aanvraag en review",
    note: "Reactie binnen 24 uur",
    body: "Je stuurt je brief in via het intakeformulier. We beoordelen elke aanvraag handmatig en reageren binnen 24 uur. Bij een duidelijke match bevestigen we en gaan we direct naar scope. Als er geen match is, zeggen we dat eerlijk.",
  },
  {
    number: "02",
    title: "Fit en scope",
    note: "Een gesprek. Geen pitch decks.",
    body: "Een kort gesprek of directe uitwisseling om doelen, deliverables, tijdlijn en budget af te stemmen. Wij pitchen niet. We stellen de juiste vragen zodat de scope helder is voor er iets op papier staat.",
  },
  {
    number: "03",
    title: "Voorstel",
    note: "Heldere scope, heldere prijs",
    body: "Een gestructureerd voorstel met scope, tijdlijn en investering. Geen verborgen kosten. Geen scope-ambiguiteit. Je weet precies wat je krijgt en wat het kost.",
  },
  {
    number: "04",
    title: "Aanbetaling en kickoff",
    note: "Jouw startdatum is bevestigd",
    body: "Een aanbetaling bevestigt je projectslot en startdatum. Na ontvangst bevestigen we de planning en bereiden we de onboarding voor. Het resterende bedrag is gekoppeld aan overeengekomen projectmijlpalen.",
  },
  {
    number: "05",
    title: "Onboarding brief",
    note: "10 minuten. Hoge waarde.",
    body: "Een korte gestructureerde brief zodat we alles hebben wat we nodig hebben voor het werk begint: merkassets, toegangsgegevens, voorkeuren, referentiepunten. Dit is wat de uitvoering schoon houdt.",
  },
  {
    number: "06",
    title: "Uitvoering",
    note: "Gestructureerde voortgang, geen verrassingen",
    body: "We bouwen. Voortgangsupdates op afgesproken intervallen. Feedback wordt verzameld in één gestructureerde cyclus per fase, niet in open-einde heen-en-weer. Dit beschermt kwaliteit en houdt het project op schema.",
  },
  {
    number: "07",
    title: "Review en lancering",
    note: "Niets gaat live zonder jouw akkoord",
    body: "Een definitieve QA-ronde, cross-device review en performance-check. Jij beoordeelt en keurt goed voor iets live gaat. Wij regelen de deployment en bevestigen dat alles werkt zoals verwacht.",
  },
  {
    number: "08",
    title: "Overdracht",
    note: "Je vertrekt met alles",
    body: "Volledige eigendomsoverdracht. Code, assets, toegang en documentatie. Geen doorlopende afhankelijkheid van Inovense tenzij je de relatie wilt voortzetten.",
  },
];

function Workflow() {
  return (
    <section id="workflow" className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Projectstappen</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Van brief tot overdracht, stap voor stap.
          </h2>
        </div>

        <div className="divide-y divide-zinc-800/70">
          {stages.map((stage) => (
            <div
              key={stage.number}
              className="group flex flex-col gap-6 py-8 transition-colors hover:bg-zinc-900/20 md:-mx-6 md:flex-row md:items-start md:gap-0 md:rounded-xl md:px-6 md:py-10"
            >
              <div className="shrink-0 md:w-16">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/30 bg-brand/8 font-mono text-xs font-semibold text-brand">
                  {stage.number}
                </span>
              </div>
              <div className="shrink-0 md:w-[230px] md:pr-8 md:pt-1.5">
                <h3 className="mb-1.5 text-base font-semibold text-zinc-100">{stage.title}</h3>
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                  {stage.note}
                </span>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400 md:pt-1.5">
                {stage.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── What you get ──────────────────────────────────────────────────────── */

const deliverables = [
  {
    title: "Volledige code en asset-eigendom",
    body: "Alles gebouwd voor jouw project is van jou. Broncode, designbestanden, assets. Geen licenties, geen lock-in.",
  },
  {
    title: "Gedocumenteerd overdrachtsrapport",
    body: "Een gestructureerde overdracht met installatie-instructies, CMS-handleidingen waar van toepassing en systeemnotities. Jouw team kan overnemen zonder een gesprek.",
  },
  {
    title: "CMS-toegang waar van toepassing",
    body: "Bouwprojecten bevatten volledige CMS-configuratie en -toegang. Geen afhankelijkheid van Inovense om content bij te werken na overdracht.",
  },
  {
    title: "Support-venster na lancering",
    body: "Een dedicated venster na lancering om eventuele bugs, aanpassingen of vragen te behandelen. Inbegrepen in de projectvergoeding, geen extra factuur.",
  },
  {
    title: "Eén aanspreekpunt",
    body: "Eén persoon beheert jouw project van intake tot overdracht. Geen handoffs naar accountmanagers. Geen onduidelijkheid over wie verantwoordelijk is.",
  },
  {
    title: "Geen doorlopende afhankelijkheid",
    body: "Inovense is niet ontworpen als retainer-bedrijf. Je neemt eigendom en opereert onafhankelijk. We zijn er als je ons nodig hebt.",
  },
];

function WhatYouGet() {
  return (
    <section className="border-t border-zinc-800/60 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Wat je krijgt</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Wat je hebt als we klaar zijn.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
            Elk project eindigt met een complete, goed gedocumenteerde overdracht.
            Dit zijn de standaarden die wij onszelf opleggen bij elk engagement.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-zinc-800/60 sm:grid-cols-2 lg:grid-cols-3">
          {deliverables.map((item) => (
            <div key={item.title} className="bg-zinc-950 p-6 transition-colors hover:bg-zinc-900/60">
              <div className="mb-1 h-px w-8 bg-brand/40" />
              <h3 className="mt-4 mb-2 text-sm font-semibold text-zinc-100">{item.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Operating Principles ──────────────────────────────────────────────── */

const principles = [
  {
    number: "I",
    title: "Afstemming voor uitvoering",
    body: "We beginnen niet met bouwen totdat scope, doelen en verwachtingen helder zijn en overeengekomen. Dit beschermt jouw budget en onze output.",
  },
  {
    number: "II",
    title: "Gestructureerde feedback",
    body: "Elke fase heeft één gestructureerde feedbackcyclus. Dit is geen beperking. Het is wat ervoor zorgt dat werk niet afdrijft en dat elke beslissing intentioneel is.",
  },
  {
    number: "III",
    title: "Selectieve intake",
    body: "We nemen tegelijkertijd een klein aantal projecten aan zodat elk engagement volledige focus krijgt. Als we jouw project aannemen, is dat omdat we er zeker van zijn het goed te kunnen leveren.",
  },
  {
    number: "IV",
    title: "Eerlijk boven comfortabel",
    body: "Als iets geen match is, zeggen we dat. Als een tijdlijn niet realistisch is, zeggen we dat. Eerlijke communicatie op elk moment leidt tot betere uitkomsten voor beide partijen.",
  },
];

function OperatingPrinciples() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Hoe wij opereren</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            De principes die elk project sturen.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {principles.map((p) => (
            <div
              key={p.number}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-7"
            >
              <span className="mb-5 inline-block font-mono text-xs font-semibold tracking-widest text-brand/60">
                {p.number}
              </span>
              <h3 className="mb-3 text-base font-semibold text-zinc-100">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Lane notes ────────────────────────────────────────────────────────── */

const laneNotes = [
  {
    lane: "Build",
    href: "/nl/build",
    color: "text-sky-400",
    border: "border-sky-400/20",
    bg: "bg-sky-400/5",
    dot: "bg-sky-400/50",
    points: [
      "Designrichting wordt beoordeeld en goedgekeurd voor er productie-code wordt geschreven.",
      "Eén stageomgeving. Eén gestructureerde feedbackcyclus voor lancering.",
      "Volledige CMS-setup en -toegang inbegrepen bij van toepassing zijnde projecten.",
      "Cross-device QA en performance-benchmarking voor akkoord.",
    ],
  },
  {
    lane: "Systems",
    href: "/nl/systems",
    color: "text-violet-400",
    border: "border-violet-400/20",
    bg: "bg-violet-400/5",
    dot: "bg-violet-400/50",
    points: [
      "Integratie-intensieve projecten starten met een technische audit om de bestaande stack in kaart te brengen.",
      "Alle workflows en automatiseringslogica worden gedocumenteerd voor de bouw.",
      "Systeemdiagrammen en volledige configuratienotities overgedragen bij voltooiing.",
      "Testing uitgevoerd in een stageomgeving voor productie-deployment.",
    ],
  },
  {
    lane: "Growth",
    href: "/nl/growth",
    color: "text-emerald-400",
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/5",
    dot: "bg-emerald-400/50",
    points: [
      "Strategie en positionering geleverd voor er uitvoering begint.",
      "Alle assets, copy en creative overgedragen per cyclus. Jij bezit alles.",
      "Maandelijkse reviewcyclus met heldere rapportage over wat werkt en wat wordt aangepast.",
      "Geen langdurige lock-in. Engagements lopen cyclus per cyclus.",
    ],
  },
];

function LaneNotes() {
  return (
    <section className="border-t border-zinc-800/60 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Per lane</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Hoe het proces varieert per lane.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
            De kernstructuur blijft hetzelfde. Dit zijn de details die per
            lane-type verschillen.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {laneNotes.map((lane) => (
            <div
              key={lane.lane}
              className={`rounded-xl border ${lane.border} ${lane.bg} p-7`}
            >
              <Link
                href={lane.href}
                className={`mb-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${lane.color} transition-opacity hover:opacity-75`}
              >
                {lane.lane}
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2.5 6h7M6.5 3l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <ul className="space-y-4">
                {lane.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${lane.dot}`}
                      aria-hidden
                    />
                    <span className="text-sm leading-relaxed text-zinc-400">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
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
        <Eyebrow>Klaar om te starten</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Nu je weet wat je kunt verwachten.
          <br className="hidden md:block" /> Laten we aan het werk gaan.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Dien je brief in. We beoordelen het binnen 24 uur en komen terug met
          een heldere richting. Geen pitch decks, geen geautomatiseerde reacties.
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

export default function NlProcessPage() {
  return (
    <>
      <NlNav />
      <main className="flex flex-col">
        <Hero />
        <Workflow />
        <WhatYouGet />
        <OperatingPrinciples />
        <LaneNotes />
        <PageCTA />
      </main>
      <NlFooter />
    </>
  );
}

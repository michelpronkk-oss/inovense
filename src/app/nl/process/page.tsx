import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";

export const metadata: Metadata = {
  title: "Proces: Van intake tot overdracht | Inovense",
  description:
    "Het Inovense proces in duidelijke stappen. Intake, scope, uitvoering, lancering en overdracht zonder ruis.",
  alternates: {
    canonical: "https://inovense.com/nl/process",
  },
  openGraph: {
    url: "https://inovense.com/nl/process",
    title: "Proces: Van intake tot overdracht | Inovense",
    description:
      "Het Inovense proces in duidelijke stappen. Intake, scope, uitvoering, lancering en overdracht zonder ruis.",
    locale: "nl_NL",
  },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
      {children}
    </p>
  );
}

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
            Proces
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Duidelijke stappen
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Geen ruis
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Van intake tot overdracht.{" "}
          <span className="text-brand">Zonder improvisatie.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Elke samenwerking volgt een vaste structuur met duidelijke momenten
          voor scope, feedback en oplevering. Dat beschermt kwaliteit, tempo en
          budget.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/nl/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Project starten
          </Link>
          <Link
            href="/nl/build"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            Bekijk Build
          </Link>
        </div>
      </div>
    </section>
  );
}

const stages = [
  {
    number: "01",
    title: "Intake en review",
    note: "Reactie binnen 24 uur",
    body: "Je stuurt je brief in via /nl/intake. We beoordelen elk verzoek handmatig en koppelen snel terug met een duidelijke volgende stap.",
  },
  {
    number: "02",
    title: "Scope en voorstel",
    note: "Duidelijke deliverables",
    body: "We scherpen doel, scope, tijdlijn en investering aan. Daarna krijg je een concreet voorstel zonder vage randvoorwaarden.",
  },
  {
    number: "03",
    title: "Kickoff en onboarding",
    note: "Startdatum bevestigd",
    body: "Na akkoord plannen we de start, verzamelen de benodigde assets en zetten de werkstructuur op zodat uitvoering direct goed loopt.",
  },
  {
    number: "04",
    title: "Uitvoering per fase",
    note: "Gestructureerde feedback",
    body: "We leveren per fase op met een heldere feedbackronde. Zo blijft het tempo hoog en voorkomen we open-einde iteraties.",
  },
  {
    number: "05",
    title: "QA en livegang",
    note: "Niets live zonder akkoord",
    body: "We doen quality checks, device checks en eindafstemming voordat iets live gaat. Pas na akkoord volgt deployment.",
  },
  {
    number: "06",
    title: "Overdracht",
    note: "Volledige eigendom",
    body: "Code, assets, toegang en documentatie worden overgedragen. Geen afhankelijkheid van Inovense om het systeem operationeel te houden.",
  },
];

function Workflow() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Projectstappen</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Hoe een project bij ons loopt.
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

const deliverables = [
  {
    title: "Volledige eigendom",
    body: "Alle code en assets zijn van jou na oplevering. Geen lock-in model.",
  },
  {
    title: "Documentatie en overdracht",
    body: "Heldere overdracht zodat je team zelfstandig kan doorwerken.",
  },
  {
    title: "Eenduidig aanspreekpunt",
    body: "Geen doorgeefstructuur. Een team met directe verantwoordelijkheid.",
  },
  {
    title: "Lane-gebonden uitvoering",
    body: "Build, Systems en Growth hebben elk hun eigen ritme, maar dezelfde kwaliteitsstandaard.",
  },
];

function Deliverables() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Wat je krijgt</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Duidelijke opleverstandaard.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-zinc-800/60 sm:grid-cols-2">
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

const lanes = [
  {
    lane: "Build",
    href: "/nl/build",
    points: [
      "Design en development in een verbonden traject.",
      "Performance en UX vanaf dag een meegenomen.",
    ],
  },
  {
    lane: "Systems",
    href: "/nl/systems",
    points: [
      "Workflowanalyse voor implementatie.",
      "Integraties en logica met overdraagbare documentatie.",
    ],
  },
  {
    lane: "Growth",
    href: "/nl/growth",
    points: [
      "Capture, routing en distributie als gekoppeld systeem.",
      "Commerciele feedbackloops op echte beslissingsdata.",
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
            Zelfde standaard, andere focus.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {lanes.map((lane) => (
            <div
              key={lane.lane}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-6"
            >
              <Link
                href={lane.href}
                className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-brand transition-opacity hover:opacity-80"
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
              <ul className="space-y-3">
                {lane.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" />
                    <span className="text-sm leading-relaxed text-zinc-400">{point}</span>
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
        <Eyebrow>Start</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Klaar om te starten met
          <br className="hidden md:block" /> een helder traject?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Dien je brief in. We reageren binnen 24 uur met een duidelijke
          richting en passend lane-advies.
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
      </div>
    </section>
  );
}

export default function NlProcessPage() {
  return (
    <>
      <NlNav />
      <main className="flex flex-col">
        <Hero />
        <Workflow />
        <Deliverables />
        <LaneNotes />
        <PageCTA />
      </main>
      <NlFooter />
    </>
  );
}

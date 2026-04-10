import type { Metadata } from "next";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import NlGrowthHero from "@/components/nl/nl-growth-hero";

export const metadata: Metadata = {
  title: "Groei: Leadgeneratie en Distributiesystemen",
  description:
    "Growth als commercieel systeem. Van lead capture en kwalificatie tot distributie en follow-up. Gebouwd voor operators die op uitvoering concurreren.",
  alternates: {
    canonical: "https://inovense.com/nl/growth",
  },
  openGraph: {
    url: "https://inovense.com/nl/growth",
    title: "Groei: Leadgeneratie en Distributiesystemen | Inovense",
    description:
      "Growth als commercieel systeem. Van lead capture en kwalificatie tot distributie en follow-up. Gebouwd voor operators die op uitvoering concurreren.",
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
  return <NlGrowthHero />;
}

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
          <Eyebrow>Waar dit op focust</Eyebrow>
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

const scope = [
  {
    number: "01",
    title: "Lead generation systems",
    description:
      "Capture, kwalificatie, scoring en routing als een gekoppeld commercieel systeem in plaats van losse tools.",
    tag: "Kerngebied",
  },
  {
    number: "02",
    title: "SEO en content infrastructuur",
    description:
      "Onderwerpen, landingsstructuur en publicatieritme afgestemd op hoe jouw doelgroep zoekt en beslist.",
    tag: null,
  },
  {
    number: "03",
    title: "Paid creative support",
    description:
      "Advertentie-assets en campagnelogica die aansluiten op je funnel in plaats van alleen bereik najagen.",
    tag: null,
  },
  {
    number: "04",
    title: "CRM pipeline hygiene",
    description:
      "Heldere statusmodellen en overdracht tussen marketing en sales om commercieel lek te beperken.",
    tag: null,
  },
  {
    number: "05",
    title: "Reporting en feedback loops",
    description:
      "Rapportage op de metrics die beslissingen sturen, met snelle iteraties op bottlenecks in de flow.",
    tag: null,
  },
];

function Scope() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <Eyebrow>Scope</Eyebrow>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Alles wat valt
              <br />
              <span className="text-zinc-500">onder Growth.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Growth is hier een beslissysteem met eigenaarschap en duidelijke
              uitvoeringsregels. Niet een verzameling losse hacks.
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
    <section className="border-t border-white/[0.06] py-24 md:py-32">
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
          Klaar om je growthflow
          <br className="hidden md:block" /> als systeem te bouwen?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Stuur je context en huidige bottlenecks. We reageren binnen 24 uur
          met een duidelijke richting en een realistische volgende stap.
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

export default function NlGrowthPage() {
  return (
    <>
      <NlNav />
      <main className="flex flex-col">
        <Hero />
        <FocusAreas />
        <Scope />
        <FAQ />
        <PageCTA />
      </main>
      <NlFooter />
    </>
  );
}

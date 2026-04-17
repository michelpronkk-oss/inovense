import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import NlNav from "@/components/nl-nav";
import NlFooter from "@/components/nl-footer";
import NlHomeHero from "@/components/nl/nl-home-hero";
import TrustpilotSignal from "@/components/trustpilot-signal";
import { absoluteSiteUrl, buildLocalizedAlternates } from "@/lib/metadata";

const NL_HOME_ALTERNATES = buildLocalizedAlternates({
  canonicalPath: "/nl",
  enPath: "/",
  nlPath: "/nl",
});

export const metadata: Metadata = {
  title: {
    absolute: "Inovense | Websites, AI-automatisering en Groeisystemen",
  },
  description:
    "We bouwen websites, webshops en slimme automatiseringen voor bedrijven die echte resultaten willen. Op maat, conversiegericht, AI-ready.",
  alternates: NL_HOME_ALTERNATES,
  openGraph: {
    url: absoluteSiteUrl("/nl"),
    title: "Inovense | Websites, AI-automatisering en Groeisystemen",
    description:
      "We bouwen websites, webshops en slimme automatiseringen voor bedrijven die echte resultaten willen. Op maat, conversiegericht, AI-ready.",
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
  return <NlHomeHero />;
}

/* ─── Trust ─────────────────────────────────────────────────────────────── */

function Trust() {
  return (
    <section className="border-y border-white/[0.06] bg-zinc-950/75 py-7 md:py-8">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Geverifieerd
          </p>
          <TrustpilotSignal note="Lees geverifieerde klantreviews" />
        </div>
      </div>
    </section>
  );
}

/* ─── Services ──────────────────────────────────────────────────────────── */

const services = [
  {
    label: "Build",
    href: "/nl/build",
    headline: "Websites & webshops",
    body: "Conversiegerichte websites en Shopify-winkels die vertrouwen wekken, leads genereren en verkopen.",
    tags: ["Build lane", "Geen templates", "Volledige eigendom"],
  },
  {
    label: "Systems",
    href: "/nl/systems",
    headline: "Slimme systemen",
    body: "AI-automatisering, CRM-workflows en operationele tooling die wrijving wegneemt en uren bespaart.",
    tags: ["Systems lane", "Op maat gebouwd", "Geen off-the-shelf"],
  },
  {
    label: "Growth",
    href: "/nl/growth",
    headline: "Groeicampagnes",
    body: "Betaalde media, contentstrategie en leadgeneratie gericht op gekwalificeerd verkeer en meer pipeline.",
    tags: ["Growth lane", "Commerciele focus", "Systeemdenken"],
  },
];

function Services() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Wat wij bouwen</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Drie manieren waarop we jouw bedrijf laten groeien.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-500">
            Elk project wordt geschreven, gebouwd en opgeleverd met commercieel resultaat als doel.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-7 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/60 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <span className="mb-4 inline-flex items-center rounded-full border border-brand/25 bg-brand/8 px-2.5 py-0.5 text-[11px] font-medium text-brand">
                {service.label}
              </span>

              <h3 className="mb-3 text-base font-semibold leading-snug text-zinc-50">
                {service.headline}
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                {service.body}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {service.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-700/50 px-2 py-0.5 text-[10px] font-medium text-zinc-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-brand/70 transition-colors group-hover:text-brand">
                Meer informatie
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2.5 6h7M6.5 3l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Why Inovense ──────────────────────────────────────────────────────── */

const reasons = [
  {
    title: "Senior specialisten, geen juniors",
    body: "Elk project wordt geleid door een senior specialist. Geen accountmanagers die briefings doorsluizen naar juniors.",
  },
  {
    title: "Op maat gebouwd, niet van een template",
    body: "We bouwen vanaf de basis. Geen thema's, geen shortcuts, geen opgeblazen plugins. Snel, schoon en gebouwd om te blijven.",
  },
  {
    title: "Commercieel denken van begin tot eind",
    body: "Elke beslissing, van copy tot opmaak tot automatisering, wordt gemaakt met conversie en vertrouwen als uitgangspunt.",
  },
  {
    title: "Helder proces, geen verrassingen",
    body: "Vaste prijs, duidelijke scope, schone oplevering. Je weet altijd waar je aan toe bent.",
  },
];

function WhyInovense() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Waarom Inovense</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Serieuze uitvoering. Resultaat voorop.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {reasons.map((item) => (
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

/* ─── Process preview ───────────────────────────────────────────────────── */

const steps = [
  {
    number: "01",
    title: "Intake & briefing",
    body: "We leren je bedrijf kennen, begrijpen je doelen en stellen vast hoe een geslaagd project eruitziet.",
  },
  {
    number: "02",
    title: "Scope & voorstel",
    body: "Je ontvangt een helder voorstel met vaste prijs. Geen vage abonnementen, geen scope-uitbreiding achteraf.",
  },
  {
    number: "03",
    title: "Bouwen & opleveren",
    body: "We bouwen, testen en leveren op hoog niveau. Je blijft op de hoogte zonder te verdrinken in updates.",
  },
  {
    number: "04",
    title: "Launch & ondersteuning",
    body: "Na de lancering begeleiden we de overdracht en zorgen we dat alles presteert zoals het hoort.",
  },
];

function ProcessPreview() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16">
          <Eyebrow>Hoe wij werken</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Van briefing tot resultaat: een helder, gecontroleerd proces.
          </h2>
        </div>

        <div className="relative grid grid-cols-1 gap-0 md:grid-cols-4">
          <div
            aria-hidden
            className="pointer-events-none absolute top-5 hidden h-px bg-zinc-800 md:block"
            style={{ left: "1.25rem", right: "calc(25% - 1.25rem)" }}
          />

          {steps.map((step, i) => (
            <div key={step.number} className="relative flex flex-col">
              <div className="pr-8 pb-10 md:pb-0">
                <div className="mb-5 flex items-center">
                  <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-zinc-950 text-xs font-semibold text-brand ring-4 ring-zinc-950">
                    {step.number}
                  </span>
                </div>
                <h3 className="mb-3 text-base font-semibold text-zinc-50">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {step.body}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="mb-10 ml-5 h-10 w-px bg-zinc-800 md:hidden" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 flex items-center gap-4">
          <Link
            href="/nl/process"
            className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-50"
          >
            Volledig proces bekijken
            <span aria-hidden> →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Selected work ─────────────────────────────────────────────────────── */

type WorkCase = {
  title: string;
  lane: string;
  summary: string;
  tags: string[];
  status: string;
  href?: string;
  imageSrc?: string;
};

const workCases: WorkCase[] = [
  {
    title: "SilentSpend",
    lane: "Product intelligence",
    summary:
      "Globale monetisatielaag gebouwd als een high-trust beslissysteem voor pricing en packaging.",
    tags: ["Product", "Systems"],
    status: "Live case",
    href: "/work/silentspend",
    imageSrc: "/work/silentspend/hero.png",
  },
  {
    title: "St. Regis Marriott",
    lane: "Luxe digitale infrastructuur",
    summary:
      "Hospitality platform met focus op premium UX en conversie-grade fundamenten.",
    tags: ["Build", "Luxury"],
    status: "Binnenkort gepubliceerd",
  },
  {
    title: "The Nude Bottle",
    lane: "Commerce en merksystemen",
    summary:
      "Commerce en merksysteem voor helderdere positionering en growth-ready productverhaal.",
    tags: ["Commerce", "Brand"],
    status: "Binnenkort gepubliceerd",
  },
];

function CaseCard({ item }: { item: WorkCase }) {
  const content = (
    <>
      <div className="border-b border-zinc-800/80 px-5 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
          {item.lane}
        </p>
      </div>

      <div className="relative aspect-[16/10] border-b border-zinc-800/80 bg-zinc-950/80">
        {item.imageSrc ? (
          <Image
            src={item.imageSrc}
            alt={`${item.title} case preview`}
            fill
            sizes="(max-width: 768px) 86vw, (max-width: 1024px) 68vw, 33vw"
            className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.015]"
          />
        ) : (
          <div
            className="flex h-full items-end p-5"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              {item.status}
            </p>
          </div>
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(9,9,11,0.30) 0%, rgba(9,9,11,0) 45%)",
          }}
        />
      </div>

      <div className="flex min-h-[216px] flex-col p-5 md:min-h-[230px]">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-50 md:text-xl">
          {item.title}
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-zinc-500">{item.summary}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-800/80 px-2.5 py-1 text-[11px] text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between pt-5">
          <p className="text-xs text-zinc-600">{item.status}</p>
          {item.href ? (
            <span className="text-xs text-zinc-500 transition-colors group-hover:text-zinc-300">
              Case bekijken
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  const baseClassName =
    "group block min-w-[88%] snap-start overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/55 sm:min-w-[68%] md:min-w-0 md:h-full";

  if (item.href) {
    return (
      <Link href={item.href} className={baseClassName}>
        {content}
      </Link>
    );
  }

  return <article className={baseClassName}>{content}</article>;
}

function Work() {
  return (
    <section
      id="werk"
      className="border-t border-white/[0.06] bg-zinc-900/20 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex flex-col gap-5 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Geselecteerd werk
            </p>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Product en systeemcases.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 md:text-base">
              SilentSpend is live. Aanvullende engagements worden voorbereid voor publicatie.
            </p>
          </div>
        </div>

        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0">
          {workCases.slice(0, 3).map((item) => (
            <CaseCard key={item.title} item={item} />
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
        <Eyebrow>Aan de slag</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Vertel ons wat je nodig hebt.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Stuur een briefing en we komen terug met een helder voorstel.
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
          {["Geen verplichtingen. Reactie binnen 1 werkdag."].map((item) => (
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

export default function NlPage() {
  return (
    <>
      <NlNav />
      <main className="flex flex-col">
        <Hero />
        <Trust />
        <Services />
        <WhyInovense />
        <ProcessPreview />
        <Work />
        <PageCTA />
      </main>
      <NlFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/footer";
import Nav from "@/components/nav";
import {
  INOVENSE_ORGANIZATION_ID,
  INOVENSE_URL,
  INOVENSE_WEBSITE_ID,
  toJsonLd,
} from "@/lib/geo";

export const metadata: Metadata = {
  title: "Inovense Service Fit Answers",
  description:
    "Clear answers on when to choose Build, Systems, or Growth, plus proof snapshots and fit guidance for operators evaluating Inovense.",
  alternates: {
    canonical: "https://inovense.com/answers",
    languages: {
      en: "https://inovense.com/answers",
      "x-default": "https://inovense.com/answers",
    },
  },
  openGraph: {
    url: "https://inovense.com/answers",
    title: "Inovense Service Fit Answers",
    description:
      "A compact answer surface for service fit, lane differences, and proof snapshots across Build, Systems, and Growth.",
  },
};

const answerFaqs = [
  {
    question: "What does Inovense do?",
    answer:
      "Inovense builds execution infrastructure across three lanes: Build for websites and digital products, Systems for automation and operations, and Growth for compounding demand systems.",
  },
  {
    question: "What is the difference between Build, Systems, and Growth?",
    answer:
      "Build improves trust and conversion at the experience layer. Systems fixes internal handoffs, workflow leaks, and operational bottlenecks. Growth compounds acquisition through SEO, content, and distribution.",
  },
  {
    question:
      "When does a company need a better website versus a better system?",
    answer:
      "Choose website improvements when trust and conversion are weak after users arrive. Choose systems improvements when execution breaks after capture, such as routing delays, follow-up inconsistency, or tool fragmentation.",
  },
  {
    question: "When does growth fail because the system leaks?",
    answer:
      "Growth fails when demand capture, qualification, routing, and follow-up are disconnected. In that state, more traffic amplifies waste instead of increasing qualified pipeline.",
  },
  {
    question: "What kind of companies are the right fit for Inovense?",
    answer:
      "Best-fit companies already have momentum, value execution standards, and want durable systems they can own after handoff rather than long-term agency dependency.",
  },
  {
    question:
      "What is the difference between a weak website problem and a weak operations problem?",
    answer:
      "A weak website problem shows up as low trust or low conversion despite solid traffic. A weak operations problem shows up as missed handoffs, slow response, and inconsistent execution after lead capture.",
  },
  {
    question: "When should a company invest in automation?",
    answer:
      "Invest in automation when recurring manual work is slowing response, introducing errors, or preventing the team from spending time on higher-leverage decisions.",
  },
] as const;

const laneRows = [
  {
    lane: "Build",
    focus: "Website trust, positioning, and conversion flow",
    bestFor:
      "Companies with demand that lands on a site that underperforms commercially.",
    links: [
      { label: "Build lane", href: "/build" },
      { label: "Web design", href: "/web-design" },
    ],
  },
  {
    lane: "Systems",
    focus: "Operational reliability and automation leverage",
    bestFor:
      "Teams where growth is blocked by manual process, routing friction, or disconnected tools.",
    links: [
      { label: "Systems lane", href: "/systems" },
      { label: "AI automation", href: "/ai-automation" },
    ],
  },
  {
    lane: "Growth",
    focus: "Compounding qualified demand",
    bestFor:
      "Companies with a working offer that need durable acquisition and signal quality improvements.",
    links: [
      { label: "Growth lane", href: "/growth" },
      { label: "Lead systems", href: "/lead-generation-systems" },
    ],
  },
] as const;

const diagnosticRows = [
  {
    signal: "Traffic exists but qualified conversions stay low",
    likelyIssue: "Website trust and conversion problem",
    likelyLane: "Build",
  },
  {
    signal: "Inbound arrives but follow-up is inconsistent or late",
    likelyIssue: "Operations and routing problem",
    likelyLane: "Systems",
  },
  {
    signal: "More campaigns increase volume but pipeline quality does not improve",
    likelyIssue: "System leakage across capture and qualification",
    likelyLane: "Systems + Growth",
  },
  {
    signal: "Brand positioning feels strong but discoverability stays flat",
    likelyIssue: "Acquisition and distribution infrastructure problem",
    likelyLane: "Growth",
  },
] as const;

const proofSnapshots = [
  {
    lane: "Build",
    whatChanged:
      "Generic or outdated site experiences were replaced with conversion-led, brand-trust web architecture.",
    result:
      "Clearer decision paths and stronger first-impression credibility on high-intent traffic.",
    href: "/build#build-work",
  },
  {
    lane: "Systems",
    whatChanged:
      "Manual handoffs and fragile routing were replaced with mapped workflows and automation logic.",
    result:
      "Faster response, fewer dropped leads, and cleaner operational visibility for operators.",
    href: "/systems#systems-work",
  },
  {
    lane: "Growth",
    whatChanged:
      "Ad hoc growth activity was replaced with structured SEO, content, and distribution systems.",
    result:
      "More durable inbound quality and compounding demand performance over time.",
    href: "/growth#growth-work",
  },
  {
    lane: "Cross-lane proof",
    whatChanged:
      "SilentSpend was built as a high-trust product and decision system for complex monetization signal.",
    result:
      "Public proof of product-grade execution in categories where evidence quality drives decisions.",
    href: "/work/silentspend",
  },
] as const;

const answersPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${INOVENSE_URL}/answers#webpage`,
  url: `${INOVENSE_URL}/answers`,
  name: "Inovense Service Fit Answers",
  description:
    "Answer page covering service fit, lane differences, and proof snapshots for Inovense.",
  inLanguage: "en",
  isPartOf: {
    "@id": INOVENSE_WEBSITE_ID,
  },
  about: {
    "@id": INOVENSE_ORGANIZATION_ID,
  },
};

const answersFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${INOVENSE_URL}/answers#faq`,
  mainEntity: answerFaqs.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function AnswersPage() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(answersPageSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(answersFaqSchema) }}
        />

        <section className="border-b border-white/[0.06] pb-16 pt-32 md:pb-24 md:pt-44">
          <div className="mx-auto max-w-6xl px-6">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Service fit answers
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.05]">
              Clear answers for Build, Systems, and Growth fit.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-zinc-400 md:text-lg">
              This page exists to make Inovense easier to evaluate, summarize,
              and cite accurately. Compact answers, explicit fit logic, and
              proof snapshots tied to real lane outcomes.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100 md:text-3xl">
              Build vs Systems vs Growth
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {laneRows.map((row) => (
                <article
                  key={row.lane}
                  className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-6"
                >
                  <h3 className="mb-3 text-base font-semibold text-zinc-100">{row.lane}</h3>
                  <p className="mb-2 text-sm text-zinc-300">{row.focus}</p>
                  <p className="text-sm leading-relaxed text-zinc-500">{row.bestFor}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {row.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-800/60 bg-zinc-900/20 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100 md:text-3xl">
              Website problem vs operations problem
            </h2>
            <div className="overflow-hidden rounded-xl border border-zinc-800/70">
              <div className="hidden grid-cols-[1.6fr_1fr_1fr] border-b border-zinc-800/70 bg-zinc-950/60 px-5 py-3 text-xs uppercase tracking-[0.12em] text-zinc-600 md:grid">
                <p>Observed signal</p>
                <p>Likely issue</p>
                <p>Likely lane</p>
              </div>
              {diagnosticRows.map((row) => (
                <article
                  key={row.signal}
                  className="grid grid-cols-1 gap-2 border-b border-zinc-800/70 bg-zinc-900/30 px-5 py-4 last:border-b-0 md:grid-cols-[1.6fr_1fr_1fr] md:gap-5"
                >
                  <p className="text-sm text-zinc-300">{row.signal}</p>
                  <p className="text-sm text-zinc-500">{row.likelyIssue}</p>
                  <p className="text-sm text-brand/90">{row.likelyLane}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100 md:text-3xl">
              Proof snapshots by lane
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {proofSnapshots.map((item) => (
                <article
                  key={item.lane}
                  className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-6"
                >
                  <p className="mb-3 text-xs uppercase tracking-[0.12em] text-zinc-600">
                    {item.lane}
                  </p>
                  <p className="mb-2 text-sm font-medium text-zinc-300">What changed</p>
                  <p className="mb-4 text-sm leading-relaxed text-zinc-500">
                    {item.whatChanged}
                  </p>
                  <p className="mb-2 text-sm font-medium text-zinc-300">Result snapshot</p>
                  <p className="text-sm leading-relaxed text-zinc-500">{item.result}</p>
                  <Link
                    href={item.href}
                    className="mt-4 inline-flex text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    Open source surface
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-800/60 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100 md:text-3xl">
              Core service-fit answers
            </h2>
            <div className="space-y-4">
              {answerFaqs.map((item) => (
                <article
                  key={item.question}
                  className="rounded-xl border border-zinc-800/70 bg-zinc-900/25 p-6"
                >
                  <h3 className="mb-2 text-sm font-semibold text-zinc-100">
                    {item.question}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500">{item.answer}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/intake"
                className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
              >
                Start a project
              </Link>
              <Link
                href="/process"
                className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
              >
                Review process
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

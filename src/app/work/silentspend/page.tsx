import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import {
  INOVENSE_ORGANIZATION_ID,
  INOVENSE_URL,
  INOVENSE_WEBSITE_ID,
  toJsonLd,
} from "@/lib/geo";

export const metadata: Metadata = {
  title: "SilentSpend | Global Monetization Layer Case Study",
  description:
    "How Inovense designed and built SilentSpend as a global monetization intelligence and decision layer for operators, founders, pricing teams, growth, and product leaders.",
  alternates: {
    canonical: "https://inovense.com/work/silentspend",
  },
  openGraph: {
    type: "article",
    url: "https://inovense.com/work/silentspend",
    title: "SilentSpend Case Study | Inovense",
    description:
      "A flagship internal product case on designing and building SilentSpend as a high-trust monetization intelligence system.",
  },
};

const silentSpendCaseSchema = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "@id": `${INOVENSE_URL}/work/silentspend#case-study`,
  name: "SilentSpend case study",
  url: `${INOVENSE_URL}/work/silentspend`,
  description:
    "Case study covering how Inovense designed and built SilentSpend as a monetization intelligence decision layer.",
  inLanguage: "en",
  author: {
    "@id": INOVENSE_ORGANIZATION_ID,
  },
  isPartOf: {
    "@id": INOVENSE_WEBSITE_ID,
  },
  about: [
    { "@type": "Thing", name: "Monetization intelligence" },
    { "@type": "Thing", name: "Decision systems" },
    { "@type": "Thing", name: "Product workflows" },
  ],
  mentions: [
    { "@type": "WebPage", url: `${INOVENSE_URL}/build` },
    { "@type": "WebPage", url: `${INOVENSE_URL}/systems` },
    { "@type": "WebPage", url: `${INOVENSE_URL}/growth` },
  ],
};

const silentSpendFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${INOVENSE_URL}/work/silentspend#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "What does this case prove about Inovense?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It demonstrates Inovense can design and ship high-trust product systems where evidence quality and decision workflow clarity are core requirements.",
      },
    },
    {
      "@type": "Question",
      name: "Which service lanes does this case support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The case primarily demonstrates Systems and Build capabilities, with direct relevance to Growth teams that depend on reliable signal quality.",
      },
    },
    {
      "@type": "Question",
      name: "Who is this case most relevant for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Founders, operators, pricing teams, product leaders, and growth leads who make decisions in complex environments with incomplete or noisy data.",
      },
    },
  ],
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-zinc-800/60" />;
}

function Hero() {
  const tags = ["Product", "Systems", "SaaS", "Intelligence"];

  return (
    <section className="relative overflow-hidden pb-14 pt-24 md:pb-22 md:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "82px 82px",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[920px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 68% 58% at 50% 10%, rgba(73,160,164,0.16) 0%, transparent 68%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6">
        <Link
          href="/build"
          className="mb-10 inline-flex items-center gap-2 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M8 10L4 6l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Build lane
        </Link>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-zinc-700/70 px-3 py-1 text-[11px] font-medium text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end lg:gap-10">
          <div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.05]">
              SilentSpend is a <span className="text-brand">global monetization layer.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
              Not a dashboard. A high-trust decision system for pricing movement,
              packaging shifts, trial and free-tier changes, paywall changes, and
              monetization surface movement across digital businesses.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="https://www.silentspend.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
              >
                Visit SilentSpend
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M3 9L9 3M9 3H4.5M9 3v4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <Link
                href="/intake"
                className="inline-flex items-center rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
              >
                Start a project
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/45 p-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Product identifier
            </p>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-100">
              SilentSpend
            </p>
            <p className="mt-2 text-sm text-zinc-400">Monetization Intelligence Layer</p>
            <div className="mt-6 space-y-2.5 border-t border-zinc-800/80 pt-4">
              {[
                "Tracks monetization movement across markets",
                "Converts noisy changes into decision-ready signal",
                "Built for operators, founders, pricing, growth, and product teams",
              ].map((item) => (
                <p key={item} className="text-xs leading-relaxed text-zinc-500">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 md:mt-10 md:gap-x-10 md:gap-y-5">
          {[
            { label: "Client", value: "SilentSpend" },
            { label: "Engagement", value: "Internal product design and build" },
            { label: "Category", value: "Monetization intelligence" },
            { label: "Focus", value: "Signal quality, trust, and decision workflows" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                {label}
              </p>
              <p className="text-sm font-medium text-zinc-300">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 md:mt-12">
          <div className="overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-900/35">
            <div className="flex items-center justify-between border-b border-zinc-800/70 px-4 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">
                Live product view
              </p>
              <p className="text-[10px] text-zinc-600">SilentSpend interface</p>
            </div>
            <Image
              src="/work/silentspend/hero.png"
              alt="SilentSpend product interface showing monetization intelligence overview"
              width={1457}
              height={1097}
              priority
              sizes="(max-width: 768px) 100vw, 920px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatSilentSpendIs() {
  const movements = [
    "Pricing changes",
    "Packaging changes",
    "Trial and free-tier updates",
    "Paywall shifts",
    "Monetization surface movement",
  ];

  return (
    <section className="py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-[1fr_1.6fr]">
          <div>
            <Eyebrow>What SilentSpend is</Eyebrow>
            <h2 className="text-2xl font-semibold leading-snug tracking-tight text-zinc-50 md:text-3xl">
              A decision layer for monetization teams that need trusted signal.
            </h2>
          </div>

          <div className="space-y-6">
            <p className="text-base leading-relaxed text-zinc-400">
              SilentSpend is not financial admin tooling. It is a global monetization
              layer that continuously observes monetization movement and structures it
              into evidence teams can act on.
            </p>

            <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-6">
              <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">
                Intelligence scope
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {movements.map((movement) => (
                  <p
                    key={movement}
                    className="flex items-center gap-2 text-sm text-zinc-300"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand/60" aria-hidden />
                    {movement}
                  </p>
                ))}
              </div>
            </div>

            <p className="text-sm leading-relaxed text-zinc-500">
              Primary users are operators, founders, pricing teams, growth leaders, and
              product teams who need context before making monetization decisions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyLayerMatters() {
  const reasons = [
    {
      title: "Monetization movement is often quiet",
      body: "Critical pricing and packaging shifts rarely arrive as clean announcements. Teams need structured detection, not manual monitoring.",
    },
    {
      title: "Signal quality determines decision quality",
      body: "If evidence is noisy or fragmented, teams hesitate or make the wrong call. Trustworthy signal is the core product requirement.",
    },
    {
      title: "Decision speed needs a shared layer",
      body: "Pricing, growth, and product cannot operate from separate spreadsheets. A shared decision layer aligns teams around the same evidence.",
    },
  ];

  return (
    <section className="border-t border-zinc-800/60 py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 md:mb-14">
          <Eyebrow>Why this matters</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Why a global monetization layer is strategically valuable.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {reasons.map((reason) => (
            <article
              key={reason.title}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-7"
            >
              <h3 className="mb-3 text-sm font-semibold text-zinc-100">{reason.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{reason.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Challenge() {
  const problems = [
    {
      title: "Fragmented monetization data",
      body: "Signals are distributed across product surfaces, pricing pages, release notes, and in-product flows with inconsistent structure.",
    },
    {
      title: "Quiet pricing and packaging movement",
      body: "Changes can be subtle but commercially meaningful, so detection logic and evidence framing need precision.",
    },
    {
      title: "Low trust in noisy monitoring",
      body: "Operators do not need more alerts. They need confidence in what changed, where it changed, and why it matters.",
    },
    {
      title: "Complexity of usable decision systems",
      body: "The hard part is balancing depth with clarity so teams can move from raw observation to action without cognitive overload.",
    },
  ];

  return (
    <section className="py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 md:mb-14">
          <Eyebrow>The challenge</Eyebrow>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Building a high-trust decision layer for complex monetization movement.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {problems.map((problem, index) => (
            <article
              key={problem.title}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-7"
            >
              <span className="mb-5 inline-block text-xs font-semibold tracking-widest text-brand/60">
                0{index + 1}
              </span>
              <h3 className="mb-3 text-sm font-semibold text-zinc-100">{problem.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{problem.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatWasBuilt() {
  const systems = [
    {
      title: "Monetization signal feed",
      body: "A structured feed that surfaces pricing, packaging, trial, paywall, and surface movement without drowning users in noise.",
    },
    {
      title: "Evidence structure",
      body: "Each signal is tied to verifiable context so teams can inspect confidence, source, and decision relevance before acting.",
    },
    {
      title: "Decision workspace",
      body: "Interaction patterns designed for prioritization, review, and handoff across operators, pricing, growth, and product stakeholders.",
    },
    {
      title: "Workflow architecture",
      body: "Clear progression from signal intake to evidence review to decision state, so teams can work in a repeatable cadence.",
    },
    {
      title: "High-trust interaction model",
      body: "Calm, precise UX built to reinforce confidence under ambiguity, with clarity over novelty in every core flow.",
    },
    {
      title: "Product-grade interface system",
      body: "A durable UI language built for intelligence workflows, balancing scan speed, depth, and long-session usability.",
    },
  ];

  return (
    <section className="border-t border-zinc-800/60 py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 md:mb-14">
          <Eyebrow>What was built</Eyebrow>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Product, system, and workflow layers designed as one integrated build.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {systems.map((system) => (
            <article
              key={system.title}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-7"
            >
              <h3 className="mb-3 text-sm font-semibold text-zinc-100">{system.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{system.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExecutionPrinciples() {
  const principles = [
    "Clarity over noise",
    "Trust over gimmicks",
    "Signal quality before feature sprawl",
    "Premium UX for complex systems",
    "Operator-grade execution",
  ];

  return (
    <section className="py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 md:mb-14">
          <Eyebrow>Execution principles</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            The standards used to keep this product credible under real use.
          </h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800/70">
          {principles.map((principle) => (
            <div
              key={principle}
              className="flex items-center justify-between gap-4 border-b border-zinc-800/60 bg-zinc-900/25 px-6 py-4 last:border-b-0"
            >
              <p className="text-sm text-zinc-300">{principle}</p>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductProof() {
  const proofSlots = [
    {
      label: "Signal Feed",
      title: "Pricing and packaging movement stream",
      note: "Live product screenshot from SilentSpend.",
      src: "/work/silentspend/signal-feed.png",
      width: 1108,
      height: 926,
      alt: "SilentSpend signal feed showing monetization movement tracking",
    },
    {
      label: "Evidence View",
      title: "Decision-ready evidence and context",
      note: "Live product screenshot from SilentSpend.",
      src: "/work/silentspend/evidence-view.png",
      width: 849,
      height: 908,
      alt: "SilentSpend evidence view with context and decision support details",
    },
    {
      label: "Workflow",
      title: "Operator workspace and prioritization flow",
      note: "Live product screenshot from SilentSpend.",
      src: "/work/silentspend/workflow-view.png",
      width: 891,
      height: 628,
      alt: "SilentSpend workflow view for operator prioritization and action",
    },
  ];

  return (
    <section className="border-t border-zinc-800/60 py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 flex flex-col gap-4 md:mb-14 md:flex-row md:items-end md:justify-between md:gap-5">
          <div>
            <Eyebrow>Product proof</Eyebrow>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Visual proof layer for real product artifacts.
            </h2>
          </div>
          <a
            href="https://www.silentspend.com"
            target="_blank"
            rel="noopener noreferrer"
            className="self-start rounded-full border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-100"
          >
            Open silentspend.com
          </a>
        </div>

        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-zinc-500 md:mb-8">
          Real interface captures from SilentSpend. This section shows how the
          product handles signal discovery, evidence review, and workflow decisions.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {proofSlots.map((slot) => (
            <article
              key={slot.title}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/25 p-4 md:p-5"
            >
              <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">
                {slot.label}
              </p>
              <div className="mb-4 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950">
                <Image
                  src={slot.src}
                  alt={slot.alt}
                  width={slot.width}
                  height={slot.height}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 340px"
                  className="h-auto w-full"
                />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">{slot.title}</h3>
              <p className="text-xs leading-relaxed text-zinc-500">{slot.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyItMattersForClients() {
  const points = [
    {
      title: "Premium SaaS product design",
      body: "Interface systems that feel calm, intentional, and credible in high-stakes operating contexts.",
    },
    {
      title: "Complex systems thinking",
      body: "Architecture that connects fragmented data, evidence models, and decisions into one usable product layer.",
    },
    {
      title: "Intelligence workflow design",
      body: "Workflows built for signal review, prioritization, and action, not static reporting.",
    },
    {
      title: "High-trust execution",
      body: "Delivery discipline focused on product integrity, clarity, and operational readiness.",
    },
  ];

  return (
    <section className="py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 md:mb-14">
          <Eyebrow>Why this matters for Inovense clients</Eyebrow>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Proof of execution for teams building serious product systems.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-zinc-800/60 sm:grid-cols-2">
          {points.map((point) => (
            <article key={point.title} className="bg-zinc-950 p-7">
              <div className="mb-4 h-px w-9 bg-brand/50" />
              <h3 className="mb-3 text-sm font-semibold text-zinc-100">{point.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{point.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CaseAnswers() {
  const answers = [
    {
      question: "What does this case prove about Inovense?",
      answer:
        "It proves we can ship high-trust product systems where evidence clarity and decision confidence matter as much as interface quality.",
      linkLabel: "Systems lane",
      href: "/systems",
    },
    {
      question: "Which service lanes does this case support?",
      answer:
        "This case maps most directly to Systems and Build work, and is relevant to Growth teams that depend on reliable signal quality.",
      linkLabel: "Build lane",
      href: "/build",
    },
    {
      question: "Who is this most relevant for?",
      answer:
        "Founders, operators, pricing teams, product leaders, and growth leaders working in categories where monetization decisions carry real downside risk.",
      linkLabel: "Growth lane",
      href: "/growth",
    },
  ] as const;

  return (
    <section className="border-t border-zinc-800/60 py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10">
          <Eyebrow>Case clarity</Eyebrow>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Questions this case answers directly.
          </h2>
        </div>

        <div className="space-y-4">
          {answers.map((item) => (
            <article
              key={item.question}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/25 p-6"
            >
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">
                {item.question}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500">{item.answer}</p>
              <Link
                href={item.href}
                className="mt-3 inline-flex text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                {item.linkLabel}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] py-16 md:py-24">
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
            "radial-gradient(ellipse 55% 55% at 50% 110%, rgba(73,160,164,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Eyebrow>Build with Inovense</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Need a product that turns complex signals into trusted decisions?
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
          We design and build high-trust product systems for teams operating in
          complex categories where signal quality matters.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/intake"
            className="rounded-full bg-brand px-10 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Start a project
          </Link>
          <Link
            href="/systems"
            className="rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            Explore systems
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function SilentSpendPage() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(silentSpendCaseSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(silentSpendFaqSchema) }}
        />
        <Hero />
        <Divider />
        <WhatSilentSpendIs />
        <WhyLayerMatters />
        <Challenge />
        <WhatWasBuilt />
        <ExecutionPrinciples />
        <ProductProof />
        <WhyItMattersForClients />
        <CaseAnswers />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

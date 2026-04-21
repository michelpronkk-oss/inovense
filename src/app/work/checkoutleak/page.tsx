import type { Metadata } from "next";
import Link from "next/link";
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
  title: "CheckoutLeak | Revenue Leak Detection Platform Case Study",
  description:
    "How Inovense designed and built CheckoutLeak — a revenue leak detection platform for Shopify and Stripe operators. Full product: website, backend, and core detection engine.",
  alternates: {
    canonical: "https://inovense.com/work/checkoutleak",
  },
  openGraph: {
    type: "article",
    url: "https://inovense.com/work/checkoutleak",
    title: "CheckoutLeak Case Study | Inovense",
    description:
      "A case study on designing and building CheckoutLeak as a full revenue intelligence platform for Shopify and Stripe operators.",
  },
};

const checkoutLeakCaseSchema = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "@id": `${INOVENSE_URL}/work/checkoutleak#case-study`,
  name: "CheckoutLeak case study",
  url: `${INOVENSE_URL}/work/checkoutleak`,
  description:
    "Case study covering how Inovense designed and built CheckoutLeak as a full revenue leak detection platform for Shopify and Stripe operators.",
  inLanguage: "en",
  author: {
    "@id": INOVENSE_ORGANIZATION_ID,
  },
  isPartOf: {
    "@id": INOVENSE_WEBSITE_ID,
  },
  about: [
    { "@type": "Thing", name: "Revenue intelligence" },
    { "@type": "Thing", name: "Checkout optimization" },
    { "@type": "Thing", name: "E-commerce systems" },
  ],
  mentions: [
    { "@type": "WebPage", url: `${INOVENSE_URL}/build` },
    { "@type": "WebPage", url: `${INOVENSE_URL}/systems` },
  ],
};

const checkoutLeakFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${INOVENSE_URL}/work/checkoutleak#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "What does this case prove about Inovense?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It proves Inovense can design and build full product systems: marketing layer, backend infrastructure, and a core intelligence engine in one integrated engagement.",
      },
    },
    {
      "@type": "Question",
      name: "Which service lanes does this case support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "This case demonstrates Build, Systems, and product design capabilities simultaneously.",
      },
    },
    {
      "@type": "Question",
      name: "Who is this case most relevant for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Founders and operators who need a complete product built from scratch — not just a website, but the underlying system that makes it work.",
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
  const tags = ["Product", "Systems", "Build", "E-commerce"];

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
          href="/#work"
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
          Selected work
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
              CheckoutLeak is a{" "}
              <span className="text-brand">revenue leak detection platform.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
              Not an analytics dashboard. A detection and recovery system that finds
              what Shopify and Stripe operators are losing at checkout, ranked by
              actual recovery potential.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="https://www.checkoutleak.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
              >
                Visit CheckoutLeak
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
              CheckoutLeak
            </p>
            <p className="mt-2 text-sm text-zinc-400">Revenue Leak Detection Platform</p>
            <div className="mt-6 space-y-2.5 border-t border-zinc-800/80 pt-4">
              {[
                "Scans Shopify and Stripe for hidden revenue losses",
                "Ranks findings by monthly recovery potential",
                "Built for operators running at scale",
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
            { label: "Client", value: "CheckoutLeak" },
            { label: "Engagement", value: "Full product design and build" },
            { label: "Category", value: "Revenue intelligence" },
            { label: "Scope", value: "Website, backend, and core detection engine" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                {label}
              </p>
              <p className="text-sm font-medium text-zinc-300">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Overview() {
  return (
    <section className="py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-[1fr_1.6fr]">
          <div>
            <Eyebrow>Overview</Eyebrow>
            <h2 className="text-2xl font-semibold leading-snug tracking-tight text-zinc-50 md:text-3xl">
              Revenue losses at checkout are quiet. They compound before anyone looks.
            </h2>
          </div>

          <div className="space-y-6">
            <p className="text-base leading-relaxed text-zinc-400">
              CheckoutLeak is a revenue leak detection platform built for Shopify and
              Stripe operators. It scans checkout and billing environments to surface
              hidden losses, identifies the root cause of each issue, and ranks
              findings by monthly recovery potential.
            </p>
            <p className="text-sm leading-relaxed text-zinc-500">
              Standard reports show what happened. CheckoutLeak shows what is being
              lost and why, across checkout friction, payment method gaps, and failed
              billing recovery.
            </p>

            <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-6">
              <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">
                What it detects
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  "Checkout exit points by step and device",
                  "Payment method coverage gaps",
                  "Failed billing and retry opportunities",
                  "Configuration issues affecting conversion",
                  "Multi-store consolidated revenue gaps",
                  "Recovery potential ranked by impact",
                ].map((item) => (
                  <p
                    key={item}
                    className="flex items-center gap-2 text-sm text-zinc-300"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand/60" aria-hidden />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatWeBuilt() {
  const layers = [
    {
      index: "01",
      title: "Website",
      subtitle: "Marketing and positioning layer",
      body: "CheckoutLeak needed a website that could communicate a technically precise product to a non-technical buyer. We designed and built the full marketing surface: positioning, copy, conversion flow, and pricing structure. The goal was clarity without oversimplification.",
    },
    {
      index: "02",
      title: "Backend and infrastructure",
      subtitle: "Detection pipeline and data layer",
      body: "We built the backend infrastructure that powers the platform: store connection and authentication, Shopify and Stripe data ingestion, detection pipeline architecture, automated scanning cadences, and multi-store reporting consolidation.",
    },
    {
      index: "03",
      title: "Core software layer",
      subtitle: "Revenue leak detection engine",
      body: "The intelligence layer is the core of the product. It runs detection logic across checkout friction, payment method coverage, and failed billing recovery. Each finding is structured with a root cause, recovery estimate, and fix path. Findings are ranked by monthly recovery potential so operators know exactly where to focus.",
    },
  ];

  return (
    <section className="border-t border-zinc-800/60 py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 md:mb-14">
          <Eyebrow>What we built</Eyebrow>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Website, backend, and detection engine. One complete product.
          </h2>
        </div>

        <div className="space-y-4">
          {layers.map((layer) => (
            <article
              key={layer.title}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-7"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <span className="mb-2 inline-block text-xs font-semibold tracking-widest text-brand/60">
                    {layer.index}
                  </span>
                  <h3 className="text-base font-semibold text-zinc-100">{layer.title}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{layer.subtitle}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-zinc-500">{layer.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Approach() {
  const decisions = [
    {
      title: "Detection before display",
      body: "The detection logic had to be precise before the interface had any value. We prioritized the accuracy and structure of each finding over the surface layer.",
    },
    {
      title: "Ranked output, not raw data",
      body: "Operators do not need more data. They need prioritized action. Every finding surface is structured around recovery potential, not volume of signals.",
    },
    {
      title: "Positioning matched the product",
      body: "The website had to earn trust with a technical audience without becoming a feature list. We wrote and designed it to communicate operator-grade positioning with precision.",
    },
    {
      title: "One system, not three separate deliverables",
      body: "Website, backend, and detection engine were designed as one product. Decisions in the UX informed the data model. Positioning informed the detection categories.",
    },
  ];

  return (
    <section className="py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 md:mb-14">
          <Eyebrow>Approach</Eyebrow>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Product, UX, and system design treated as one problem.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {decisions.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-7"
            >
              <h3 className="mb-3 text-sm font-semibold text-zinc-100">{item.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Outcome() {
  const outcomes = [
    "Operators connect their Shopify and Stripe stores and get a structured view of where revenue is leaking.",
    "Each finding includes a root cause, a recovery estimate, and a fix path. Nothing to interpret manually.",
    "Findings are ranked by monthly recovery potential. Operators know what to fix first.",
    "Multi-store operators get consolidated reporting across all stores in one view.",
  ];

  return (
    <section className="border-t border-zinc-800/60 py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 md:mb-14">
          <Eyebrow>Outcome</Eyebrow>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            A working product that surfaces what standard tools miss.
          </h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800/70">
          {outcomes.map((outcome) => (
            <div
              key={outcome}
              className="flex items-start gap-4 border-b border-zinc-800/60 bg-zinc-900/25 px-6 py-5 last:border-b-0"
            >
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" aria-hidden />
              <p className="text-sm leading-relaxed text-zinc-300">{outcome}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-zinc-500">
          CheckoutLeak runs on invite-only operator access. The product is live. The
          detection engine runs automatically. Operators see recovery opportunities
          within hours of connecting their stores.
        </p>
      </div>
    </section>
  );
}

function CaseAnswers() {
  const answers = [
    {
      question: "What does this case prove about Inovense?",
      answer:
        "It proves we can design and build a complete product from scratch: website, backend infrastructure, and the core intelligence engine in one engagement.",
      linkLabel: "Build lane",
      href: "/build",
    },
    {
      question: "Which service lanes does this case support?",
      answer:
        "This case maps directly to Build and Systems. It demonstrates product design, frontend execution, backend infrastructure, and detection system architecture.",
      linkLabel: "Systems lane",
      href: "/systems",
    },
    {
      question: "Who is this most relevant for?",
      answer:
        "Founders and operators who need a full product built, not just a website. Teams who need backend infrastructure, a core software layer, and a market-ready surface delivered together.",
      linkLabel: "Start a project",
      href: "/intake",
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
          Need a full product built, not just a website?
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
          We design and build complete systems for founders and operators who need
          the website, the backend, and the core software delivered as one product.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/intake"
            className="rounded-full bg-brand px-10 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Start a project
          </Link>
          <Link
            href="/build"
            className="rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            Explore build work
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function CheckoutLeakPage() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(checkoutLeakCaseSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(checkoutLeakFaqSchema) }}
        />
        <Hero />
        <Divider />
        <Overview />
        <WhatWeBuilt />
        <Approach />
        <Outcome />
        <CaseAnswers />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

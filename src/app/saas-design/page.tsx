import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import TrustpilotSignal from "@/components/trustpilot-signal";

export const metadata: Metadata = {
  title: "SaaS Website Design and Product Interface",
  description:
    "Premium SaaS marketing sites, pricing pages, and product-grade interface design. Built for software companies where credibility and conversion are the same problem.",
  alternates: {
    canonical: "https://inovense.com/saas-design",
  },
  openGraph: {
    url: "https://inovense.com/saas-design",
    title: "SaaS Website Design and Product Interface | Inovense",
    description:
      "Premium SaaS marketing sites, pricing pages, and product-grade interface design. Built for software companies where credibility and conversion are the same problem.",
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
        className="pointer-events-none absolute left-0 top-0 h-[700px] w-[700px]"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 10% 15%, rgba(73,160,164,0.12) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-[20%] h-[500px] w-[500px]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 90% 40%, rgba(73,160,164,0.07) 0%, transparent 65%)",
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
            SaaS Design
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Build lane
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Product-grade
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Your product is credible.{" "}
          <span className="text-brand">Your website should be too.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Premium SaaS marketing sites, pricing pages, and product interface
          design for software companies where the front-end is part of the
          product experience. Designed to convert trials and close deals.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Start a SaaS project
          </Link>
          <Link
            href="/build"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            See the Build lane
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
          {[
            "Product-grade execution",
            "Interface and marketing coherence",
            "24-hour response",
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
    title: "SaaS founders whose product is ahead of their marketing site",
    body: "A strong product with a weak website loses deals before a demo is ever booked. The site is the first impression of the software's quality.",
  },
  {
    title: "B2B software teams where credibility is part of the conversion path",
    body: "When your buyer is a decision-maker evaluating multiple tools, your site needs to signal professionalism, stability, and category authority from the first scroll.",
  },
  {
    title: "Product-led companies where the marketing site drives trial starts",
    body: "In PLG businesses the website is a direct conversion surface. Friction on the site is friction in the acquisition funnel.",
  },
  {
    title: "Software companies launching into a competitive category",
    body: "Category entry with a generic website positions you as a generic entrant. The front-end is where your positioning either lands or gets lost.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Who this is for</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Built for software companies where the site is part of the sales process.
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
    title: "SaaS marketing sites",
    description:
      "Full website design and build for software products. Positioned to convert prospects, support sales conversations, and communicate the product's value architecture clearly.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "Pricing page systems",
    description:
      "Pricing pages that reduce friction and support decision-making. Plan architecture, feature comparison tables, FAQ design, and CTA hierarchy built around how software buyers actually evaluate.",
    tag: null,
  },
  {
    number: "03",
    title: "Product interface and dashboard design",
    description:
      "Interface design for SaaS products: dashboards, settings, onboarding flows, and core feature views. Designed to the same standard as the marketing surface, not treated as a separate system.",
    tag: null,
  },
  {
    number: "04",
    title: "Product screenshot and demo integration",
    description:
      "Structuring product visuals, interface screenshots, and demo content into the marketing site without breaking the visual hierarchy or undermining the brand.",
    tag: null,
  },
  {
    number: "05",
    title: "Trial and onboarding entry points",
    description:
      "Landing pages, trial start flows, and onboarding sequences designed to reduce drop-off between marketing site and first product value.",
    tag: null,
  },
  {
    number: "06",
    title: "SaaS landing pages",
    description:
      "High-conversion pages for paid acquisition, feature launches, and partnership channels. Built to perform at the bottom of the funnel where intent is highest.",
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
              What falls under
              <br />
              <span className="text-zinc-500">SaaS design.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Every SaaS design engagement is scoped to the product, the buyer,
              and the conversion goal. Not a theme. Not a template adapted
              to your colors.
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
    title: "Marketing site and product as a single trust system",
    body: "The visual language, interaction patterns, and information hierarchy of your marketing site and your product need to feel coherent. A beautiful site that leads into a clunky interface breaks trust at the moment of highest intent.",
  },
  {
    number: "02",
    title: "Conversion architecture, not just visual design",
    body: "SaaS sites fail at conversion when they describe features instead of communicating value. We design around how software buyers make decisions: social proof, risk reduction, clarity of outcome.",
  },
  {
    number: "03",
    title: "Pricing pages built for how buyers evaluate",
    body: "Pricing is not a page, it is a decision framework. Feature comparison, tier architecture, and CTA placement are designed around how your specific buyer weighs options at the bottom of the funnel.",
  },
  {
    number: "04",
    title: "Interface design with operator-grade standards",
    body: "Dashboard and interface design held to the same standard as the marketing surface. Information hierarchy, density, and interaction clarity that make users trust the product, not just use it.",
  },
  {
    number: "05",
    title: "Performance and technical quality",
    body: "SaaS sites need to load fast and render correctly at every entry point. Core Web Vitals, SEO structure, and crawlable architecture built in from the start.",
  },
  {
    number: "06",
    title: "Built to scale with the product",
    body: "Your website architecture should accommodate new features, pricing changes, and positioning pivots without requiring a full redesign every six months. We build with that in mind.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The difference</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            What separates SaaS design from generic web design.
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
            Proof of execution
          </span>
        </div>

        <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-2xl font-semibold leading-snug tracking-tight text-zinc-50 md:text-3xl">
              &ldquo;We did not build a website
              <br />
              <span className="text-brand">for SilentSpend. We built the product.&rdquo;</span>
            </p>
            <p className="mt-6 text-sm leading-relaxed text-zinc-500">
              SilentSpend is a monetization intelligence platform designed and
              built by Inovense from the ground up. Marketing surface,
              interface system, and data layer as a single coherent product.
              That is what SaaS design looks like when executed at the
              standard this category demands.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <TrustpilotSignal note="Read client reviews" />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-6">
            <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
              SilentSpend by Inovense
            </p>
            <div className="space-y-4">
              {[
                "Premium SaaS marketing site and interface system",
                "Pricing and positioning architecture designed for operator buyers",
                "Dashboard and data surface with operator-grade interaction design",
                "Marketing site and product interface as a single coherent visual system",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" aria-hidden />
                  <span className="text-sm leading-relaxed text-zinc-400">{point}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-zinc-800/60 pt-5 flex items-center gap-5">
              <Link
                href="/work/silentspend"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                Read the case
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="https://www.silentspend.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Visit silentspend.com
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M3 9L9 3M9 3H4.5M9 3v4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
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
    title: "Submit a brief",
    note: "24-hour response",
    body: "Describe your product, your target buyer, and what is not working about your current website or interface. We respond within 24 hours.",
  },
  {
    number: "02",
    title: "Product and positioning review",
    note: "Understand before designing",
    body: "We study the product, the competitive landscape, and the buyer's decision process before any design direction is proposed. Bad SaaS design usually comes from skipping this step.",
  },
  {
    number: "03",
    title: "Design direction and proposal",
    note: "Visual alignment before build",
    body: "A structured proposal with scope, visual direction, timeline, and investment. You review the design direction before a single line of production code is written.",
  },
  {
    number: "04",
    title: "Build and iteration",
    note: "One structured review cycle",
    body: "Development against the agreed design direction. One structured feedback cycle per phase. Nothing ships without your sign-off.",
  },
  {
    number: "05",
    title: "Launch and handoff",
    note: "Full ownership transfer",
    body: "Performance QA, SEO checks, and deployment. Full code ownership, CMS access where applicable, and documentation handed over at completion.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The process</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From product brief to launched site.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
            Every engagement follows the same structured approach.{" "}
            <Link href="/process" className="text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-200">
              See the full process.
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
    q: "Can you design both the marketing site and the product interface?",
    a: "Yes. In fact, that is the strongest version of this engagement. Marketing site and product interface designed as a coherent system produces far better results than treating them as separate projects with separate teams.",
  },
  {
    q: "We already have a Figma design system. Can you work with it?",
    a: "Yes. We can build from an existing design system, extend it, or audit it as part of scoping. If you have one that is working, we will work with it. If you need one established, we can include that in scope.",
  },
  {
    q: "What tech stack do you use for SaaS sites?",
    a: "Next.js with React for performance-critical SaaS marketing sites and product interfaces. Tailwind CSS for consistent, maintainable styling. We choose based on what gives the product the best foundation to scale on.",
  },
  {
    q: "Do you work with early-stage startups or only established SaaS companies?",
    a: "Both. Early-stage companies often have the most to gain from getting the front-end right early. The key is having clear product positioning and a defined target buyer, not a certain headcount or ARR.",
  },
  {
    q: "Can you help with our pricing page specifically?",
    a: "Yes. Pricing page design is one of the highest-leverage isolated engagements for a SaaS company. If that is the specific bottleneck, we can scope it as a focused project.",
  },
];

function FAQ() {
  return (
    <section className="border-t border-white/[0.06] bg-zinc-900/20 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Common questions.
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
        <Eyebrow>Start a SaaS design project</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Your product deserves
          <br className="hidden md:block" /> a front-end that matches it.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Submit a brief describing your product, your target buyer, and
          what you need to improve. We respond within 24 hours with a
          direct assessment and clear next steps.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/intake"
            className="rounded-full bg-brand px-10 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Start a project
          </Link>
          <span className="text-sm text-zinc-600">
            or email{" "}
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-400 transition-colors hover:text-zinc-50"
            >
              hello@inovense.com
            </a>
          </span>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {["Limited intake", "24-hour response", "No pitch decks"].map((item) => (
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

export default function SaaSDesignPage() {
  return (
    <>
      <Nav />
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
      <Footer />
    </>
  );
}

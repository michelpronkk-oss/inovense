import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import TrustpilotSignal from "@/components/trustpilot-signal";

export const metadata: Metadata = {
  title: "Premium Website Design and Development",
  description:
    "Custom website design built for conversion, performance, and brand. No templates. No bloat. Designed and built from brief to browser by Inovense.",
  alternates: {
    canonical: "https://inovense.com/web-design",
  },
  openGraph: {
    url: "https://inovense.com/web-design",
    title: "Premium Website Design and Development | Inovense",
    description:
      "Custom website design built for conversion, performance, and brand. No templates. No bloat. Designed and built from brief to browser by Inovense.",
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
            Web Design
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Build lane
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            No templates
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Websites that hold up{" "}
          <span className="text-brand">under scrutiny.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Conversion-focused, performance-first website design and development
          for founders, operators, and brands that compete on quality. Built
          from brief to browser. Nothing templated.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Start a project
          </Link>
          <Link
            href="/process"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            See how we work
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
          {["No templates", "Full ownership on delivery", "24-hour response"].map(
            (item) => (
              <span key={item} className="flex items-center gap-2 text-xs text-zinc-700">
                <span className="h-1 w-1 shrink-0 rounded-full bg-brand/50" />
                {item}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Who this is for ───────────────────────────────────────────────────── */

const audience = [
  {
    title: "Founders launching a serious brand presence",
    body: "First impressions are commercial decisions. If your site looks like a template, it is competing like one.",
  },
  {
    title: "Operators who have outgrown their current site",
    body: "When the business has moved forward but the website has not, the site becomes the limiting factor.",
  },
  {
    title: "Brands that need better conversion without sacrificing look",
    body: "Performance and aesthetics are not in tension when both are built to the same standard from the start.",
  },
  {
    title: "Product teams launching a dedicated web experience",
    body: "New product launches deserve a front-end built around the product, not dragged out of a multipurpose theme.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Who this is for</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Built for companies that cannot afford to look average.
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
    title: "Brand websites",
    description:
      "The complete digital presence. Architecture, design, and build owned by one team. Structured to convert and built to hold up under sustained traffic and scrutiny.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "Landing pages",
    description:
      "High-conversion pages for campaigns, product launches, and lead capture. Every element earns its place. Fast, focused, and worth the ad spend behind it.",
    tag: null,
  },
  {
    number: "03",
    title: "Shopify and ecommerce",
    description:
      "Online stores built around how people actually buy. Brand-level finish, mobile-first, and structured to convert from product page through checkout.",
    tag: null,
  },
  {
    number: "04",
    title: "Microsites",
    description:
      "Standalone experiences for launches, campaigns, and brand moments that deserve more than a page on your main site.",
    tag: null,
  },
  {
    number: "05",
    title: "Redesigns",
    description:
      "Existing sites rebuilt from the ground up when patching no longer makes sense. We assess what is worth keeping, then design forward from there.",
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
              <span className="text-zinc-500">web design.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Every project is scoped from your brief. Nothing reskinned,
              nothing pulled from a starter kit, nothing built twice.
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
    title: "Performance architecture",
    body: "Core Web Vitals, load speed, and server performance are designed in from day one. Not patched in at the end. We target green across the board because slow sites cost money.",
  },
  {
    number: "02",
    title: "Conversion-led layout",
    body: "Every section, headline, and CTA placement is informed by how your target user makes decisions. We design for outcomes, not aesthetics in isolation.",
  },
  {
    number: "03",
    title: "Brand-level mobile finish",
    body: "Typography, spacing, touch targets, and responsive behavior executed at the standard your positioning demands. Not what a component library defaults to.",
  },
  {
    number: "04",
    title: "Built from scratch, every time",
    body: "We do not start from a theme and customize outward. We start from your brief and build in. Every component exists because it needs to.",
  },
  {
    number: "05",
    title: "SEO-ready on launch",
    body: "Semantic structure, metadata, Open Graph, and performance baked in before go-live. You launch with what search engines reward, not what you retrofit later.",
  },
  {
    number: "06",
    title: "Full ownership, no lock-in",
    body: "You own the code, the CMS access, and the deployment. Documented handoff with no ongoing dependency on Inovense to keep your site running.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The difference</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            What separates our builds from the default.
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

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="mb-12 flex items-center justify-center gap-5">
          <div className="h-px w-16 bg-zinc-800" />
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-brand/60">
            Build Standard
          </span>
          <div className="h-px w-16 bg-zinc-800" />
        </div>

        <p className="text-3xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-4xl">
          &ldquo;Every pixel earns its place.
          <br />
          <span className="text-brand">Every build ships production-ready.&rdquo;</span>
        </p>

        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-zinc-500">
          We hold every web project to the same standard regardless of scope.
          Clean code, documented handoff, and no shortcuts taken at the
          expense of performance or conversion.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <TrustpilotSignal note="Read client reviews" />
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
    body: "Describe the project, your goals, and what a good outcome looks like. We review every brief ourselves and respond within 24 hours.",
  },
  {
    number: "02",
    title: "Scope and proposal",
    note: "Clear deliverables, clear price",
    body: "A structured proposal covering scope, timeline, and investment. No hidden costs. No scope ambiguity. You know exactly what you are getting before any work begins.",
  },
  {
    number: "03",
    title: "Deposit and kickoff",
    note: "Your slot is locked",
    body: "A deposit secures your start date. We confirm the schedule and collect the onboarding brief before work begins.",
  },
  {
    number: "04",
    title: "Design and build",
    note: "One structured feedback cycle",
    body: "Design direction reviewed and agreed before development. One structured feedback cycle per phase. No open-ended iteration loops.",
  },
  {
    number: "05",
    title: "Review and launch",
    note: "Nothing goes live without your sign-off",
    body: "Cross-device QA, performance testing, and your final review before deployment. We handle the launch and confirm everything is working as expected.",
  },
  {
    number: "06",
    title: "Handoff",
    note: "Full ownership transfer",
    body: "Code, assets, CMS access, and documentation handed over. No ongoing dependency on Inovense.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The process</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From brief to browser.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
            Every project follows the same structure.{" "}
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
    q: "Do you use templates or page builders?",
    a: "No. Every project is built from brief to browser. We do not reskin themes, use page builders, or start from multipurpose starter kits. The code exists because your project needs it.",
  },
  {
    q: "What do I need to provide before work starts?",
    a: "We handle the onboarding brief as part of our process. Before build begins, we align on brand assets, copy direction, references, and any existing technical setup. You do not need to have everything ready on day one.",
  },
  {
    q: "How long does a website project typically take?",
    a: "Timeline depends on scope. A focused landing page can be delivered in one to two weeks. A full brand website typically runs four to eight weeks. Scope, feedback cycles, and asset readiness are the main variables.",
  },
  {
    q: "What platforms do you build on?",
    a: "Next.js and React for performance-critical or product-grade builds. Shopify for ecommerce. We choose the platform that fits the project, not the other way around.",
  },
  {
    q: "Can I update the site myself after launch?",
    a: "Yes. CMS access is included on applicable projects. We configure it, document it, and hand it over. You should not need to call us to change a headline.",
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
        <Eyebrow>Start a web design project</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Ready to build a website
          <br className="hidden md:block" /> worth being proud of?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          We take on a small number of projects at a time. Submit a brief and
          we will respond within 24 hours with a clear direction, not a
          proposal template.
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

export default function WebDesignPage() {
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

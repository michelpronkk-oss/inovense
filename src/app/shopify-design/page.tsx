import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import TrustpilotSignal from "@/components/trustpilot-signal";

export const metadata: Metadata = {
  title: "Shopify Storefronts Built for Conversion",
  description:
    "Shopify storefronts built around product pages, offer structure, trust elements, and checkout paths for a cleaner buying experience.",
  alternates: {
    canonical: "https://inovense.com/shopify-design",
    languages: {
      en: "https://inovense.com/shopify-design",
      nl: "https://inovense.com/nl/shopify-design",
      "x-default": "https://inovense.com/shopify-design",
    },
  },
  openGraph: {
    url: "https://inovense.com/shopify-design",
    title: "Shopify Storefronts Built for Conversion | Inovense",
    description:
      "Ecommerce conversion architecture for product pages, offer structure, trust elements, and checkout paths.",
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
            "radial-gradient(ellipse 70% 55% at 50% 5%, rgba(73,160,164,0.12) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center rounded-full border border-brand/25 bg-brand/8 px-3 py-1 text-[11px] font-medium tracking-wide text-brand">
            Shopify conversion
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Storefront systems
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Ecommerce trust layer
          </span>
        </div>

        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Shopify storefronts built for{" "}
          <span className="text-brand">trust and conversion.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Product pages, offer structure, trust elements, and checkout paths shaped for a cleaner buying experience.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Request a Shopify review
          </Link>
          <Link
            href="/build"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            Explore website systems
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            "No theme reskins",
            "Mobile-first execution",
            "Full ownership on delivery",
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
    title: "DTC brands that have grown past a stock theme",
    body: "At some point the gap between your brand standard and your Shopify theme becomes visible to customers. That gap costs you.",
  },
  {
    title: "Products at a price point where presentation signals value",
    body: "When your product costs more than a commodity, your store needs to communicate that before a customer reads a single word of copy.",
  },
  {
    title: "Brands entering a market with high visual standards",
    body: "Launching in a category where competitors have invested in their store means your default appearance puts you at a disadvantage from day one.",
  },
  {
    title: "Businesses where design has become the conversion limiter",
    body: "If traffic and offers are not the problem but conversion is, the store experience is usually where the answer lives.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Who this is for</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Built for brands where the store is part of the product experience.
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
    title: "Custom Shopify themes",
    description:
      "Built from scratch or from a minimal base. Not a premium theme reskinned with your colors. A store designed around your specific products, brand, and buyer.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "Product page systems",
    description:
      "Visual hierarchy, trust architecture, and persuasion logic designed around your product. Every element on the page earns its place by building trust or moving the purchase forward.",
    tag: null,
  },
  {
    number: "03",
    title: "Collection and category architecture",
    description:
      "Category structures, filtering systems, and browse experiences designed around how your customers actually shop, not how Shopify defaults to organizing products.",
    tag: null,
  },
  {
    number: "04",
    title: "Mobile-first store builds",
    description:
      "Designed and tested for the purchase flows that happen on iPhone. Not a desktop design adapted to mobile. Mobile experience designed as the primary surface.",
    tag: null,
  },
  {
    number: "05",
    title: "Store redesigns",
    description:
      "Existing stores rebuilt when patching is no longer the answer. We assess what is working structurally and design forward from there.",
    tag: null,
  },
  {
    number: "06",
    title: "Checkout and cart optimization",
    description:
      "Reducing friction at the moment of highest intent. Cart experience, upsell architecture, and checkout flow reviewed and improved.",
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
              <span className="text-zinc-500">Shopify design.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Every Shopify project is scoped to your actual brand, product,
              and conversion goals. Nothing generic, nothing templated.
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
    title: "No theme reskins",
    body: "We do not buy a Shopify theme and replace the logo and colors. We build from your brief. Every component exists because your brand and product requires it.",
  },
  {
    number: "02",
    title: "Conversion-conscious product pages",
    body: "Product page layout is a commercial decision, not just a design one. Every element earns its place by building trust or moving the purchase forward. Nothing decorative without function.",
  },
  {
    number: "03",
    title: "Brand-level mobile finish",
    body: "Most ecommerce purchases happen on mobile. We design for that environment first, not as an afterthought. Typography, spacing, and touch targets executed at the standard your brand demands.",
  },
  {
    number: "04",
    title: "Performance optimization",
    body: "Load speed affects both conversion and organic search ranking. We build Shopify stores that load fast because slow stores cost money, especially on mobile connections.",
  },
  {
    number: "05",
    title: "Full ownership on delivery",
    body: "You own the theme code, the assets, and the deployment. Full documentation and access transfer. No ongoing dependency on Inovense to run your store.",
  },
  {
    number: "06",
    title: "SEO-ready architecture",
    body: "Clean semantic markup, structured data, and crawlable architecture built in. Your store launches with what search engines reward, not something to retrofit later.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The difference</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            What separates a built store from a configured one.
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
          &ldquo;Your store is part of your brand.
          <br />
          <span className="text-brand">Build it to the same standard.&rdquo;</span>
        </p>

        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-zinc-500">
          A Shopify store built to the Inovense standard: conversion-conscious
          layouts, brand-level mobile finish, and performance optimized before
          launch. Not a theme configured to approximate your brief.
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
    body: "Describe your brand, your products, and what is not working about your current store. We review every brief ourselves and respond within 24 hours.",
  },
  {
    number: "02",
    title: "Design direction",
    note: "Visual alignment before any build",
    body: "We present a design direction covering layout, visual language, and component structure. You review and approve before a single line of production code is written.",
  },
  {
    number: "03",
    title: "Proposal and deposit",
    note: "Clear scope, locked slot",
    body: "A structured proposal with deliverables, timeline, and investment. Deposit confirms your start date.",
  },
  {
    number: "04",
    title: "Build and staging",
    note: "Full preview before go-live",
    body: "Theme development on Shopify staging. One structured feedback cycle before launch. Nothing ships until you have reviewed and approved it.",
  },
  {
    number: "05",
    title: "QA and launch",
    note: "Cross-device, cross-browser",
    body: "Mobile, desktop, and checkout flow tested. Performance and SEO checks completed. We handle the launch and confirm everything is running correctly.",
  },
  {
    number: "06",
    title: "Handoff",
    note: "Full ownership transfer",
    body: "Theme code, asset files, and documentation handed over. You own the store and can operate it independently from day one.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The process</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From brief to live store.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
            Every project follows the same structured approach.{" "}
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
    q: "Can you redesign just part of my store, like the product pages?",
    a: "Yes. Focused redesigns of specific templates, such as product pages, collection pages, or the homepage, are a common scope. We assess what is worth keeping and build forward from there.",
  },
  {
    q: "How is this different from buying a premium Shopify theme?",
    a: "A premium theme is built for everyone and therefore optimized for no one. We build for your specific products, brand, and buyer. The result is a store that reflects your positioning rather than the theme developer's assumptions.",
  },
  {
    q: "Do you work with Shopify Plus?",
    a: "Yes. Shopify Plus unlocks checkout extensibility, custom flows, and additional scripting options. If you are on Plus, we work with those capabilities where relevant to the project.",
  },
  {
    q: "Will I be able to update products and content myself after launch?",
    a: "Yes. Shopify's admin is your content layer. We configure the theme so that you can update products, collections, copy, and images without touching code.",
  },
  {
    q: "What if I want to migrate from another platform to Shopify?",
    a: "We handle Shopify migrations as part of build projects. Data migration, product catalog setup, and redirect architecture are scoped as part of the overall engagement.",
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
        <Eyebrow>Request a Shopify review</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Ready to build a store
          <br className="hidden md:block" /> your brand deserves?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Submit a brief. We review every project ourselves and respond within
          24 hours with a clear direction on fit, scope, and next steps.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/intake"
            className="rounded-full bg-brand px-10 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Request a Shopify review
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

export default function ShopifyDesignPage() {
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

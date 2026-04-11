import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import TrustpilotSignal from "@/components/trustpilot-signal";

export const metadata: Metadata = {
  title: "AI Automation for Lead Flow and Business Operations",
  description:
    "AI-powered automation for lead routing, qualification, follow-up, and internal operations. Real workflow leverage, not vague AI promises. Inovense builds systems that handle the work.",
  alternates: {
    canonical: "https://inovense.com/ai-automation",
    languages: {
      en: "https://inovense.com/ai-automation",
      nl: "https://inovense.com/nl/ai-automation",
      "x-default": "https://inovense.com/ai-automation",
    },
  },
  openGraph: {
    url: "https://inovense.com/ai-automation",
    title: "AI Automation for Lead Flow and Business Operations | Inovense",
    description:
      "AI-powered automation for lead routing, qualification, follow-up, and internal operations. Real workflow leverage, not vague AI promises. Inovense builds systems that handle the work.",
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
        className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 80% 10%, rgba(73,160,164,0.11) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-[30%] h-[500px] w-[500px]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 50%, rgba(73,160,164,0.08) 0%, transparent 65%)",
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
            AI Automation
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Systems lane
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Practical systems
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Automation built around{" "}
          <span className="text-brand">how your business actually runs.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          AI-powered workflows, lead routing, and operational automation for
          companies that want their team focused on real work rather than
          manual process. Practical systems. Not vague AI promises.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Start an automation project
          </Link>
          <Link
            href="/systems"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            See the Systems lane
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
          {[
            "Built on your existing stack",
            "Documented and maintainable",
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
    title: "Operations-heavy companies with too much manual process",
    body: "When qualified people spend significant time on repetitive, low-leverage tasks, the business is underperforming relative to its headcount.",
  },
  {
    title: "Sales teams with broken or missing lead routing",
    body: "Leads coming in through multiple channels with no consistent qualification or assignment logic mean slower follow-up and worse conversion.",
  },
  {
    title: "Founders whose business runs on disconnected tools",
    body: "Spreadsheets, copy-paste between apps, and manual data entry are fine until they are not. At some point the cost becomes visible.",
  },
  {
    title: "Companies buying tools that do not talk to each other",
    body: "Most SaaS tools solve a narrow problem well. The friction lives between them. That is where automation creates the most leverage.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Who this is for</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Built for businesses where manual process is the bottleneck.
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
    title: "Lead capture and routing",
    description:
      "Automatically qualify, score, and route inbound leads to the right person or pipeline stage. Faster follow-up, no leads falling through gaps.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "CRM sync and data pipelines",
    description:
      "Keep customer data current and consistent across your tools without manual intervention. Enrichment, deduplication, and field-level sync built around your actual CRM.",
    tag: null,
  },
  {
    number: "03",
    title: "Reporting and alert systems",
    description:
      "Automated summaries, performance reports, and threshold-triggered alerts delivered to the right person at the right time. Useful signal, not data noise.",
    tag: null,
  },
  {
    number: "04",
    title: "Document and approval workflows",
    description:
      "Proposal generation, contract pipelines, and structured approval flows. High-friction manual processes replaced with reliable automated sequences.",
    tag: null,
  },
  {
    number: "05",
    title: "Internal tools and dashboards",
    description:
      "Custom operator-facing tools built around your actual workflow. Not another SaaS subscription, not a generic dashboard. Something that fits how your team works.",
    tag: null,
  },
  {
    number: "06",
    title: "Integration pipelines",
    description:
      "Connect disconnected tools and surface data where your team actually operates. The friction between your apps is usually where the most leverage lives.",
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
              <span className="text-zinc-500">AI automation.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Every system is scoped to your actual workflow. We do not
              build generic automation templates. We build what your
              specific operation needs.
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
    title: "Systems thinking, not shortcut automation",
    body: "Every workflow is mapped end-to-end before anything is built. We understand the full picture, including failure modes, before writing a single integration.",
  },
  {
    number: "02",
    title: "Built around your existing stack",
    body: "We work with the tools you already have. No forced migrations, no replacing platforms that are working. The system fits your operation, not the other way around.",
  },
  {
    number: "03",
    title: "Reliability before feature count",
    body: "A workflow that runs correctly 98% of the time is actively harmful if it fails silently the other 2%. We build for reliability first, with error handling, logging, and alerting included.",
  },
  {
    number: "04",
    title: "Documented and maintainable",
    body: "Everything we build comes with documentation your team can follow without calling us. The system should outlast the engagement, not depend on it.",
  },
  {
    number: "05",
    title: "Highest leverage first",
    body: "We scope to the automations that remove the most friction immediately. Not full operational rewrites. The right first system creates momentum for what comes next.",
  },
  {
    number: "06",
    title: "No black boxes",
    body: "Your team will understand what the system does and why. If something breaks, you should be able to diagnose it. We do not build systems that require us to maintain them forever.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The difference</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            What separates operational systems from hacks.
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
            Systems proof
          </span>
        </div>

        <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-2xl font-semibold leading-snug tracking-tight text-zinc-50 md:text-3xl">
              &ldquo;Internal leverage,
              <br />
              <span className="text-brand">built to last.&rdquo;</span>
            </p>
            <p className="mt-6 text-sm leading-relaxed text-zinc-500">
              Inovense built SilentSpend, a monetization intelligence platform,
              using the same systems architecture principles we apply to client
              automation engagements. Complex data pipelines, structured signal
              processing, and operator-grade interaction design.
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
                "Monetization change detection across digital products",
                "Signal feed with structured evidence and audit trail",
                "Decision layer for operators, founders, and pricing teams",
                "Built on Next.js, Supabase, and a custom intelligence pipeline",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" aria-hidden />
                  <span className="text-sm leading-relaxed text-zinc-400">{point}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-zinc-800/60 pt-5">
              <Link
                href="/work/silentspend"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                Read the case
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
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
    body: "Describe the manual process or operational bottleneck you want to fix. Be specific about what is costing you time or introducing error.",
  },
  {
    number: "02",
    title: "Systems audit",
    note: "Map before build",
    body: "We map your current tools, data flows, and failure points before scoping any implementation. Understanding the full picture prevents building the wrong thing.",
  },
  {
    number: "03",
    title: "Scope and proposal",
    note: "Clear deliverables, clear price",
    body: "A proposal covering the specific systems to build, implementation approach, timeline, and investment. Prioritized to the highest-leverage work first.",
  },
  {
    number: "04",
    title: "Build and testing",
    note: "Staging before production",
    body: "All workflows built and tested in a staging environment before any production deployment. Error handling and logging included.",
  },
  {
    number: "05",
    title: "Handoff and documentation",
    note: "Full ownership transfer",
    body: "Complete documentation, access credentials, and workflow diagrams handed over. Your team should be able to understand, monitor, and modify what was built.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The process</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From brief to running system.
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
    q: "What tools and platforms do you work with?",
    a: "We work across the major automation and integration platforms including Make, n8n, Zapier, and custom-coded pipelines where the use case requires it. We also build directly against APIs, Supabase, Airtable, and most modern SaaS stacks.",
  },
  {
    q: "Do I need a developer to maintain what you build?",
    a: "No. Part of what we deliver is documentation thorough enough that your team can monitor and adjust the system. For more complex custom builds we will scope in a handoff session. The goal is always an operation you can own.",
  },
  {
    q: "Can you work with our existing CRM and toolstack?",
    a: "Yes. We build around what you have. We are not trying to replace your stack with our preferred tools. If your CRM is HubSpot, Salesforce, or something custom, we work with it.",
  },
  {
    q: "How is this different from hiring a no-code freelancer?",
    a: "The difference is systems thinking and reliability standards. A no-code freelancer can wire things together. What we deliver is a mapped, documented, error-handled system that someone on your team can understand and maintain.",
  },
  {
    q: "We already have some automation. Can you audit and improve it?",
    a: "Yes. Systems audits are part of how we start most engagements. If you have existing automations that are fragile, undocumented, or not performing correctly, we can assess, rebuild, or extend them.",
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
        <Eyebrow>Start an automation project</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Tell us what is slowing
          <br className="hidden md:block" /> your team down.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Submit a brief describing the bottleneck. We will respond within
          24 hours with a direct assessment of whether and how we can help.
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

export default function AIAutomationPage() {
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

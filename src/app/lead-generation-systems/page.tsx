import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import TrustpilotSignal from "@/components/trustpilot-signal";
import {
  INOVENSE_ORGANIZATION_ID,
  INOVENSE_URL,
  INOVENSE_WEBSITE_ID,
  toJsonLd,
} from "@/lib/geo";

export const metadata: Metadata = {
  title: "Lead Generation Systems for Operators and Growing Brands",
  description:
    "Lead capture, routing, qualification, and follow-up built as a single designed system. For operators with real demand who lose too much between capture and close.",
  alternates: {
    canonical: "https://inovense.com/lead-generation-systems",
  },
  openGraph: {
    url: "https://inovense.com/lead-generation-systems",
    title: "Lead Generation Systems | Inovense",
    description:
      "Lead capture, routing, qualification, and follow-up built as a single designed system. For operators with real demand who lose too much between capture and close.",
  },
};

const leadGenerationServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${INOVENSE_URL}/lead-generation-systems#service`,
  name: "Inovense Lead Generation Systems",
  serviceType: "Lead generation systems and conversion operations",
  provider: {
    "@id": INOVENSE_ORGANIZATION_ID,
  },
  areaServed: "Global",
  audience: {
    "@type": "Audience",
    audienceType: "Teams with demand that leaks between capture and close",
  },
  isPartOf: {
    "@id": INOVENSE_WEBSITE_ID,
  },
  url: `${INOVENSE_URL}/lead-generation-systems`,
  description:
    "Lead capture, routing, qualification, and follow-up systems designed as one coherent conversion infrastructure.",
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
        className="pointer-events-none absolute right-[-5%] top-[-10%] h-[800px] w-[700px]"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 75% 20%, rgba(73,160,164,0.10) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-5%] top-[40%] h-[500px] w-[500px]"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 15% 60%, rgba(73,160,164,0.07) 0%, transparent 65%)",
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
            Lead Generation Systems
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Systems lane
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            End-to-end, not piecemeal
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Demand is not the problem.
          <span className="text-brand"> Capture and conversion are.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Most lead leakage happens after someone expresses interest, not before.
          We build the capture, routing, qualification, and follow-up layer
          as a single coherent system so that demand that exists actually converts.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Start a project
          </Link>
          <Link
            href="/growth"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
          >
            See the Growth lane
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
          {[
            "One system, not five disconnected tools",
            "Built for your commercial motion",
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
    title: "Operators who have demand but lose leads before they close",
    body: "Traffic exists. Inquiries come in. But response times are inconsistent, routing is manual, and follow-up depends on whoever happens to be available. The system is the gap.",
  },
  {
    title: "Service businesses running lead flow through a patchwork of tools",
    body: "Form submissions go to email. Qualified leads get logged in a spreadsheet. Follow-up is tracked nowhere. Each handoff is a leak point. The commercial outcome depends on how diligent the team is on any given day.",
  },
  {
    title: "Companies scaling past the point where manual qualification works",
    body: "At low volume, a founder can personally handle every inquiry. Past a certain point, the qualification and routing needs to work without them. Manual processes do not scale gracefully.",
  },
  {
    title: "Businesses that have tried point solutions and added complexity",
    body: "A form tool here, a CRM there, an automation platform in the middle. Each solved a narrow problem and created a new integration problem. The system feels bigger but the conversion rate did not move.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Who this is for</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Built for operators where demand exists but conversion does not keep up.
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
    title: "Lead capture systems",
    description:
      "Intake forms, landing pages, and entry points designed around your specific commercial motion. Structured to collect the right information for qualification without creating drop-off through unnecessary friction.",
    tag: "Foundation",
  },
  {
    number: "02",
    title: "Routing and assignment logic",
    description:
      "Automated routing that sends the right lead to the right person or queue immediately on submission. Based on service type, geography, lead score, or any other qualifier relevant to your operation.",
    tag: null,
  },
  {
    number: "03",
    title: "Qualification and scoring",
    description:
      "Structured qualification logic that surfaces your highest-value leads without requiring manual review of every submission. Built around the signals that actually predict conversion in your market.",
    tag: null,
  },
  {
    number: "04",
    title: "Automated follow-up sequences",
    description:
      "Triggered email and notification sequences that respond immediately after capture and maintain contact through the decision window. Branded, intentional, and written for your buyer, not generic drip copy.",
    tag: null,
  },
  {
    number: "05",
    title: "CRM integration and pipeline visibility",
    description:
      "Every lead lands in a structured CRM view with full context: source, score, intake responses, and follow-up history. No manual data entry. No leads logged in two places. One source of truth.",
    tag: null,
  },
  {
    number: "06",
    title: "Conversion reporting and attribution",
    description:
      "End-to-end visibility from capture source to closed deal. Which channels produce qualified leads. Where leads stall in the pipeline. What follow-up cadence drives response. Data that makes the system improvable.",
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
              What a lead generation
              <br />
              <span className="text-zinc-500">system includes.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Each piece of the system is built to work with the others.
              Capture feeds routing. Routing feeds qualification. Qualification
              feeds follow-up. The result is a closed loop, not a set of
              connected tools that still require manual coordination.
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
    title: "Commercial motion first, tools second",
    body: "A lead generation system is only as good as its understanding of how your buyers make decisions. Before any tool is configured or built, we map the full commercial motion: entry points, qualification criteria, decision timeline, and drop-off patterns.",
  },
  {
    number: "02",
    title: "The system is the product, not the parts",
    body: "Most operators have pieces of a lead system: a form, a CRM, an email tool. The problem is the transitions between them. We design the handoffs as carefully as the individual components, because that is where conversion is lost.",
  },
  {
    number: "03",
    title: "Qualification built around real signals",
    body: "Generic lead scoring does not work because generic signals do not predict conversion in a specific market. We build qualification logic around the intake data, behavioral signals, and context markers that actually matter in your category.",
  },
  {
    number: "04",
    title: "Follow-up written for your buyer",
    body: "Automated follow-up fails when it sounds automated. Every sequence is written to match your brand voice and the specific context of the lead's inquiry. It should feel like a thoughtful response, not a triggered campaign.",
  },
  {
    number: "05",
    title: "Speed as a commercial variable",
    body: "Response time within the first hour has an outsized effect on conversion in most service categories. The system is built to respond immediately, route correctly, and surface the lead to the right person without manual intervention.",
  },
  {
    number: "06",
    title: "One source of truth for every lead",
    body: "When leads exist in multiple systems with partial information in each, accountability disappears. The system consolidates everything: source, intake data, qualification score, follow-up history, and pipeline status into a single view.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The difference</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Why a designed system converts where disconnected tools do not.
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
            Systems that produce commercial outcomes
          </span>
        </div>

        <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-2xl font-semibold leading-snug tracking-tight text-zinc-50 md:text-3xl">
              &ldquo;The system converted demand
              <br />
              <span className="text-brand">that was already there.&rdquo;</span>
            </p>
            <p className="mt-6 text-sm leading-relaxed text-zinc-500">
              Most businesses do not have a demand problem. They have a conversion
              infrastructure problem. The leads exist. The follow-up fails, the routing
              is manual, or the first response arrives too late. A designed system
              closes that gap without adding headcount.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <TrustpilotSignal note="Read client reviews" />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-6">
            <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
              What a complete lead system handles
            </p>
            <div className="space-y-4">
              {[
                "Immediate response at the moment of capture, regardless of time of day",
                "Qualification logic that surfaces high-value leads without manual review",
                "Routing to the right owner with full context, not just a notification",
                "Pipeline visibility from first touch to closed deal in one view",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" aria-hidden />
                  <span className="text-sm leading-relaxed text-zinc-400">{point}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-zinc-800/60 pt-5">
              <Link
                href="/systems"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                See the full Systems lane
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
    body: "Describe your current lead flow and where you are losing ground. Include your intake points, average volume, and how leads are currently being routed and followed up. Specificity helps.",
  },
  {
    number: "02",
    title: "Commercial motion audit",
    note: "Map before build",
    body: "We map your full commercial motion: where leads enter, how they are currently qualified, what follow-up happens, where they stall, and what a closed deal looks like. The system is designed around that map, not around a template.",
  },
  {
    number: "03",
    title: "System design and proposal",
    note: "Scoped to highest leverage",
    body: "A proposal that designs the full system: capture, routing, qualification, follow-up, and reporting. Phased where appropriate. Clear on what each component does and what commercial outcome it targets.",
  },
  {
    number: "04",
    title: "Build and integration",
    note: "One structured feedback cycle",
    body: "Each component is built and connected. Forms, automation logic, CRM integration, follow-up sequences, and reporting layer. One structured review cycle per phase before production deployment.",
  },
  {
    number: "05",
    title: "Handoff and documentation",
    note: "Operate and iterate independently",
    body: "Full system documentation, sequence copy, automation logic, and CRM configuration handed over. Your team can update sequences, adjust routing rules, and extend the system without returning to us.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The process</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From lead flow audit to running system.
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
    q: "How is this different from just setting up a CRM?",
    a: "A CRM is where lead data lives. A lead generation system is what gets leads into the CRM with the right structure, routes them correctly, triggers follow-up without manual action, and gives you visibility into where conversion happens and where it does not. The CRM is one component. The system is the whole commercial motion.",
  },
  {
    q: "We already have a CRM and a form tool. Can you work with what we have?",
    a: "Often yes. We audit your current stack first. If the existing tools are capable and the problem is the configuration and handoffs between them, we build around what you have. If the tools are creating the problem, we scope a cleaner replacement. We recommend what is actually right, not what requires the most build.",
  },
  {
    q: "What does the follow-up look like? Is it just drip email?",
    a: "Triggered sequences, yes, but written specifically for your buyer and the context of their inquiry. Not generic campaign copy. The goal is that the follow-up feels like a considered response from your business, not a marketing automation sequence. Timing, content, and channel are designed around your specific commercial motion.",
  },
  {
    q: "How do you define a high-value lead for qualification purposes?",
    a: "That depends entirely on your business. Part of the commercial motion audit is establishing what signals, intake responses, and behavioral markers predict a qualified lead in your market. We build the scoring logic around those signals, not a generic scoring model borrowed from a different category.",
  },
  {
    q: "We get leads from multiple channels. Can the system consolidate them?",
    a: "Yes. A unified lead system is often the primary goal. Web forms, WhatsApp, social DMs, referrals, inbound calls: all routed into the same CRM with source attribution, normalized data, and consistent follow-up regardless of entry point.",
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
        <Eyebrow>Start a lead generation systems project</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Stop losing leads you
          <br className="hidden md:block" /> already earned.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Describe your current lead flow and where conversion breaks down.
          We will respond within 24 hours with a clear read on what a designed
          system would look like for your operation.
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

export default function LeadGenerationSystemsPage() {
  const leadGenerationFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${INOVENSE_URL}/lead-generation-systems#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(leadGenerationServiceSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(leadGenerationFaqSchema) }}
        />
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

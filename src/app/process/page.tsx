import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import ProcessHero from "./_hero";

export const metadata: Metadata = {
  title: "Project Process and Client Delivery",
  description:
    "From brief to handoff in eight steps. Learn exactly how Inovense structures every engagement: intake, proposal, payment, onboarding, execution, launch, and handoff.",
  alternates: {
    canonical: "https://inovense.com/process",
  },
  openGraph: {
    url: "https://inovense.com/process",
    title: "Project Process and Client Delivery | Inovense",
    description:
      "From brief to handoff in eight steps. Learn exactly how Inovense structures every engagement: intake, proposal, payment, onboarding, execution, launch, and handoff.",
  },
};

/* ─── Shared primitives ─────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
      {children}
    </p>
  );
}


/* ─── Workflow stages ───────────────────────────────────────────────────── */

const stages = [
  {
    number: "01",
    title: "Inquiry and review",
    note: "24-hour response",
    body: "You submit a brief through the intake form. We review it carefully and respond within 24 hours. If there is a clear fit, we confirm and move straight to scoping. If there is not, we say so honestly.",
  },
  {
    number: "02",
    title: "Fit and scope",
    note: "One call. No pitch decks.",
    body: "A short call or direct exchange to align on goals, deliverables, timeline, and budget. We do not pitch. We ask the right questions so scope is clear before anything is written up.",
  },
  {
    number: "03",
    title: "Proposal",
    note: "Clear scope, clear price",
    body: "A structured proposal covering scope, timeline, and investment. No hidden fees. No scope ambiguity. You know exactly what you are getting and what it costs.",
  },
  {
    number: "04",
    title: "Deposit and kickoff",
    note: "Your start date is locked",
    body: "A deposit secures your project slot and start date. Once received, we confirm the schedule and prepare onboarding. The remaining balance is tied to agreed project milestones.",
  },
  {
    number: "05",
    title: "Onboarding brief",
    note: "10 minutes. High value.",
    body: "A short structured brief so we have everything we need before work starts: brand assets, access credentials, preferences, reference points. This is what keeps execution clean.",
  },
  {
    number: "06",
    title: "Execution",
    note: "Structured progress, no surprises",
    body: "We build. Progress updates at agreed intervals. Feedback is collected in one structured cycle per phase, not in open-ended back-and-forth. This protects quality and keeps the project on track.",
  },
  {
    number: "07",
    title: "Review and launch",
    note: "Nothing ships without your sign-off",
    body: "A final QA pass, cross-device review, and performance check. You review and approve before anything goes live. We handle deployment and confirm everything is working as expected.",
  },
  {
    number: "08",
    title: "Handoff",
    note: "You leave with everything",
    body: "Full ownership transfer. Code, assets, access, and documentation. There are no ongoing dependencies on Inovense unless you choose to continue the relationship.",
  },
];

function HowWeWork() {
  return (
    <section id="how-we-work" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16">
          <Eyebrow>Project stages</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From brief to handoff, step by step.
          </h2>
        </div>

        <div className="divide-y divide-zinc-800/70">
          {stages.map((stage) => (
            <div
              key={stage.number}
              className="group flex flex-col gap-6 py-8 transition-colors md:flex-row md:items-start md:gap-0 md:py-10 md:-mx-6 md:rounded-xl md:px-6 hover:bg-zinc-900/20"
            >
              {/* Number */}
              <div className="shrink-0 md:w-16">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/30 bg-brand/8 font-mono text-xs font-semibold text-brand">
                  {stage.number}
                </span>
              </div>

              {/* Title and note */}
              <div className="shrink-0 md:w-[230px] md:pr-8 md:pt-1.5">
                <h3 className="mb-1.5 text-base font-semibold text-zinc-100">
                  {stage.title}
                </h3>
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                  {stage.note}
                </span>
              </div>

              {/* Body */}
              <p className="flex-1 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400 md:pt-1.5">
                {stage.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── What you get ──────────────────────────────────────────────────────── */

const deliverables = [
  {
    title: "Full code and asset ownership",
    body: "Everything built for your project belongs to you. Source code, design files, assets. No licensing, no lock-in.",
  },
  {
    title: "Documented handoff package",
    body: "A structured handoff with setup instructions, CMS guides where relevant, and system notes. Your team can take over without a call.",
  },
  {
    title: "CMS access where applicable",
    body: "Build projects include full CMS configuration and access. No reliance on Inovense to update content after handoff.",
  },
  {
    title: "Post-launch support window",
    body: "A dedicated window after launch to address any bugs, adjustments, or questions. Covered in the project fee, no extra invoice.",
  },
  {
    title: "Single point of contact",
    body: "One person manages your project from intake to handoff. No handoffs to account managers. No ambiguity over who is responsible.",
  },
  {
    title: "No ongoing dependency",
    body: "Inovense is not designed as a retainer business. You take ownership and operate independently. We are here if you need us.",
  },
];

function WhatYouGet() {
  return (
    <section className="border-t border-zinc-800/60 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16">
          <Eyebrow>Deliverables</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            What you have when we are done.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
            Every project ends with a complete, well-documented handoff. These
            are the standards we hold ourselves to on every engagement.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-zinc-800/60 rounded-xl overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
          {deliverables.map((item) => (
            <div
              key={item.title}
              className="bg-zinc-950 p-6 transition-colors hover:bg-zinc-900/60"
            >
              <div className="mb-1 h-px w-8 bg-brand/40" />
              <h3 className="mt-4 mb-2 text-sm font-semibold text-zinc-100">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Operating principles ──────────────────────────────────────────────── */

const principles = [
  {
    number: "I",
    title: "Alignment before execution",
    body: "We do not start building until scope, goals, and expectations are clear and agreed. This protects your budget and our output.",
  },
  {
    number: "II",
    title: "Structured feedback",
    body: "Each phase has one structured feedback cycle. This is not a limitation. It is what keeps work from drifting and ensures every decision is intentional.",
  },
  {
    number: "III",
    title: "Selective intake",
    body: "We take on a small number of projects at a time so every engagement gets full focus. If we take your project, it is because we are confident we can deliver it well.",
  },
  {
    number: "IV",
    title: "Honest over comfortable",
    body: "If something is not a fit, we say so. If a timeline is not realistic, we say so. Honest communication at every stage produces better outcomes for both sides.",
  },
];

function OperatingPrinciples() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16">
          <Eyebrow>How we operate</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            The principles that govern every project.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {principles.map((p) => (
            <div
              key={p.number}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-7"
            >
              <span className="mb-5 inline-block font-mono text-xs font-semibold tracking-widest text-brand/60">
                {p.number}
              </span>
              <h3 className="mb-3 text-base font-semibold text-zinc-100">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Lane-specific notes ───────────────────────────────────────────────── */

const laneNotes = [
  {
    lane: "Build",
    href: "/build",
    color: "text-sky-400",
    border: "border-sky-400/20",
    bg: "bg-sky-400/5",
    dot: "bg-sky-400/50",
    points: [
      "Design direction is reviewed and approved before any production code is written.",
      "One staging environment. One structured feedback cycle before launch.",
      "Full CMS setup and access included on applicable projects.",
      "Cross-device QA and performance benchmarking before sign-off.",
    ],
  },
  {
    lane: "Systems",
    href: "/systems",
    color: "text-violet-400",
    border: "border-violet-400/20",
    bg: "bg-violet-400/5",
    dot: "bg-violet-400/50",
    points: [
      "Integration-heavy projects start with a technical audit or scoping call to map existing stack.",
      "All workflows and automation logic are documented before build.",
      "System diagrams and full configuration notes handed over at completion.",
      "Testing conducted in a staging environment before production deployment.",
    ],
  },
  {
    lane: "Growth",
    href: "/growth",
    color: "text-emerald-400",
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/5",
    dot: "bg-emerald-400/50",
    points: [
      "Strategy and positioning delivered before any execution begins.",
      "All assets, copy, and creative handed over each cycle. You own everything.",
      "Monthly review cadence with clear reporting on what is working and what is being adjusted.",
      "No long-term lock-in. Engagements run cycle by cycle.",
    ],
  },
];

function LaneNotes() {
  return (
    <section className="border-t border-zinc-800/60 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16">
          <Eyebrow>By lane</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            How process varies across our three lanes.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
            The core structure stays the same. These are the specifics that
            differ by lane type.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {laneNotes.map((lane) => (
            <div
              key={lane.lane}
              className={`rounded-xl border ${lane.border} ${lane.bg} p-7`}
            >
              <Link
                href={lane.href}
                className={`mb-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${lane.color} transition-opacity hover:opacity-75`}
              >
                {lane.lane}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M2.5 6h7M6.5 3l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <ul className="space-y-4">
                {lane.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${lane.dot}`}
                      aria-hidden
                    />
                    <span className="text-sm leading-relaxed text-zinc-400">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ───────────────────────────────────────────────────────────────── */

function ProcessCTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] py-24 md:py-32">
      {/* Gradient separator */}
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

      {/* Bottom glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 50% 110%, rgba(73,160,164,0.11) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Eyebrow>Ready to start</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Now you know what to expect.
          <br className="hidden md:block" /> Let us get to work.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Submit your brief. We will review it within 24 hours and come back
          with a clear direction. No pitch decks, no automated responses.
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
          {["Limited intake", "24-hour response", "No pitch decks"].map(
            (item) => (
              <span
                key={item}
                className="flex items-center gap-2 text-xs text-zinc-700"
              >
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

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function ProcessPage() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <ProcessHero />
        <HowWeWork />
        <WhatYouGet />
        <OperatingPrinciples />
        <LaneNotes />
        <ProcessCTA />
      </main>
      <Footer />
    </>
  );
}

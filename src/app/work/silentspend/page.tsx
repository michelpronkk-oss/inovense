import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "SilentSpend Case Study",
  description:
    "How Inovense designed and built the SilentSpend product: a B2B spend visibility platform that surfaces hidden software costs and unused subscriptions across a business.",
  alternates: {
    canonical: "https://inovense.com/work/silentspend",
  },
  openGraph: {
    url: "https://inovense.com/work/silentspend",
    title: "SilentSpend Case Study | Inovense",
    description:
      "How Inovense designed and built the SilentSpend product: a B2B spend visibility platform that surfaces hidden software costs and unused subscriptions across a business.",
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

function Divider() {
  return <div className="border-t border-zinc-800/60" />;
}

/* ─── Hero ──────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 md:pb-32 md:pt-44">
      {/* Grid texture */}
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

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[900px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 10%, rgba(73,160,164,0.13) 0%, transparent 65%)",
        }}
      />

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--background))",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Back link */}
        <Link
          href="/intake"
          className="mb-10 inline-flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
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
          Work
        </Link>

        {/* Tags */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-brand/25 bg-brand/8 px-3 py-1 text-[11px] font-medium tracking-wide text-brand">
            Build lane
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Product
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            B2B SaaS
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Fintech
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          SilentSpend: spend visibility{" "}
          <span className="text-brand">built to surface what accounting misses.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          A B2B platform that connects to a company&rsquo;s financial stack and
          maps every recurring software cost, abandoned subscription, and
          untracked vendor charge. Designed, built, and shipped by Inovense.
        </p>

        {/* Key signals */}
        <div className="mt-12 flex flex-wrap gap-x-10 gap-y-5">
          {[
            { label: "Client", value: "SilentSpend" },
            { label: "Engagement type", value: "Product build" },
            { label: "Lane", value: "Build" },
            { label: "Stack", value: "Next.js, Supabase, Plaid API" },
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

/* ─── Visual divider strip ──────────────────────────────────────────────── */

function VisualDivider() {
  return (
    <div className="relative mx-auto max-w-5xl px-6">
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(73,160,164,0.3) 30%, rgba(73,160,164,0.3) 70%, transparent 100%)",
        }}
      />
    </div>
  );
}

/* ─── Overview ──────────────────────────────────────────────────────────── */

function Overview() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_1.6fr]">
          <div>
            <Eyebrow>The product</Eyebrow>
            <h2 className="text-2xl font-semibold leading-snug tracking-tight text-zinc-50 md:text-3xl">
              What SilentSpend is and who it is for.
            </h2>
          </div>
          <div className="space-y-5 text-base leading-relaxed text-zinc-400">
            <p>
              Most companies have software spend they cannot fully account for.
              SaaS licenses tied to ex-employees, tools that auto-renewed
              without review, shadow IT purchased on personal cards and
              expensed months later. As headcount grows, the gap between what
              finance thinks is being spent and what is actually going out widens.
            </p>
            <p>
              SilentSpend is a B2B spend intelligence platform built for
              finance and operations teams. It connects to a company&rsquo;s
              banking and accounting data, identifies every recurring vendor
              charge, and maps it against active headcount and tool usage.
              The result is a single, always-current view of software spend
              with clear flags for waste, duplication, and exposure.
            </p>
            <p>
              The product was brought to Inovense at the idea-to-production
              stage. No existing codebase. No design system. Just a clear
              problem, a well-defined target buyer, and a founder who knew
              exactly what they needed to build.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Challenge ─────────────────────────────────────────────────────────── */

function Challenge() {
  const problems = [
    {
      title: "Financial data is sensitive and structurally complex",
      body: "Connecting to live banking data via Plaid, normalising transaction history across multiple accounts, and presenting it safely to business users required a carefully designed data layer with zero tolerance for leakage.",
    },
    {
      title: "The core value is classification, not just aggregation",
      body: "Raw transaction data is not the product. The platform needed to classify recurring charges reliably, match them against known vendors, flag anomalies, and do it without requiring manual tagging by the user.",
    },
    {
      title: "Finance teams have zero patience for noise",
      body: "The target user is a CFO or Head of Finance. They do not want dashboards full of charts. They want signal: what is wasted, what needs review, what can be cut. The UI had to answer those questions immediately on load.",
    },
    {
      title: "Trust had to be established before adoption would follow",
      body: "Asking a business to connect their bank accounts to a new SaaS product is a high-trust ask. The onboarding flow, security messaging, and overall product feel needed to project the same confidence as an enterprise-grade tool, not a startup MVP.",
    },
  ];

  return (
    <section className="border-t border-zinc-800/60 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16">
          <Eyebrow>The challenge</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Four problems that made this build harder than most.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
            The idea was clear. Executing it without cutting corners on data
            integrity, classification quality, or buyer trust was the work.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {problems.map((item, i) => (
            <div
              key={item.title}
              className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-7"
            >
              <span className="mb-5 inline-block font-mono text-xs font-semibold tracking-widest text-brand/50">
                0{i + 1}
              </span>
              <h3 className="mb-3 text-sm font-semibold text-zinc-100">
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

/* ─── What was built ────────────────────────────────────────────────────── */

function WhatWasBuilt() {
  const deliverables = [
    {
      area: "Core product",
      items: [
        "Bank and accounting connection layer via Plaid Link integration",
        "Transaction ingestion pipeline with recurring charge detection logic",
        "Vendor classification engine against a curated SaaS vendor registry",
        "Spend map view: all recurring costs by category, vendor, and seat count",
        "Waste flagging: auto-identified charges with no active user match",
        "Alert system for new recurring charges, price increases, and anomalies",
      ],
    },
    {
      area: "Dashboard and UX",
      items: [
        "Finance team dashboard with signal-first information hierarchy",
        "Per-vendor drill-down: cost history, renewal dates, usage signals",
        "Exportable spend reports in CSV and structured PDF",
        "Onboarding flow designed to establish trust and reduce friction on first connection",
        "Admin settings for multi-entity and multi-currency support",
      ],
    },
    {
      area: "Infrastructure",
      items: [
        "Next.js 15 App Router with server components for secure data rendering",
        "Supabase for data persistence, row-level security, and realtime updates",
        "Encrypted credential storage with zero plaintext exposure",
        "Role-based access: owner, finance admin, read-only viewer",
        "Deployed on Vercel with environment-isolated staging and production",
      ],
    },
  ];

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16">
          <Eyebrow>The build</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            What Inovense designed and built, end to end.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
            From data model to production deployment. Every layer owned and
            delivered by a single team.
          </p>
        </div>

        <div className="space-y-10">
          {deliverables.map((section) => (
            <div
              key={section.area}
              className="overflow-hidden rounded-xl border border-zinc-800/60"
            >
              <div className="border-b border-zinc-800/60 bg-zinc-900/50 px-6 py-3.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">
                  {section.area}
                </p>
              </div>
              <ul className="divide-y divide-zinc-800/40">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3.5 px-6 py-4"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50"
                      aria-hidden
                    />
                    <span className="text-sm leading-relaxed text-zinc-400">{item}</span>
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

/* ─── Execution ─────────────────────────────────────────────────────────── */

function Execution() {
  const principles = [
    {
      title: "Data model first",
      body: "Before any UI was designed, the entire data model was mapped, reviewed, and locked. Every downstream decision, from classification logic to report export, depended on getting the schema right at the start.",
    },
    {
      title: "Security as a first-class constraint",
      body: "Financial data handling informed every architectural decision. Row-level security was configured from day one. Plaid credentials were encrypted at rest. No shortcuts were made in exchange for faster delivery.",
    },
    {
      title: "Signal-first UI direction",
      body: "Design started from the question: what does a CFO need to see in the first 10 seconds? Every layout decision prioritised actionable signal over completeness. Charts and secondary data were surfaced only where they answered a specific question.",
    },
    {
      title: "One structured feedback cycle per phase",
      body: "The project ran across three defined phases: foundation, core product, and dashboard polish. Each phase had one structured review before moving forward. No open-ended iteration loops that erode scope and timeline.",
    },
  ];

  return (
    <section className="border-t border-zinc-800/60 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16">
          <Eyebrow>How we executed</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            The principles that governed this project.
          </h2>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {principles.map((item) => (
            <div
              key={item.title}
              className="group flex flex-col gap-4 py-8 md:flex-row md:items-start md:gap-12 md:py-10 md:-mx-4 md:rounded-xl md:px-4 transition-colors hover:bg-zinc-900/20"
            >
              <h3 className="shrink-0 text-sm font-semibold text-zinc-100 md:w-[220px]">
                {item.title}
              </h3>
              <p className="flex-1 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Outcome ───────────────────────────────────────────────────────────── */

function Outcome() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_1.6fr]">
          <div>
            <Eyebrow>The outcome</Eyebrow>
            <h2 className="text-2xl font-semibold leading-snug tracking-tight text-zinc-50 md:text-3xl">
              What SilentSpend launched with.
            </h2>
          </div>
          <div className="space-y-5 text-base leading-relaxed text-zinc-400">
            <p>
              SilentSpend launched with a fully functional product: bank
              connections live, classification engine running, and a dashboard
              their first users could navigate without a demo. The onboarding
              flow connected accounts reliably and surfaced actionable spend
              data on first load.
            </p>
            <p>
              The data layer held clean across the first tranche of test
              companies. Recurring charges were identified correctly at a rate
              that made the core value proposition demonstrable immediately,
              without manual curation or human review in the loop.
            </p>
            <p>
              The founder went into their first customer conversations with a
              product that looked and functioned like it had been in market for
              longer than it had. The positioning held: finance teams understood
              what SilentSpend was for and why they needed it within the first
              minute of seeing it.
            </p>
            <p className="text-zinc-500">
              We do not publish client revenue figures or growth metrics here.
              What we can say is that SilentSpend shipped clean, on scope, and
              with nothing deferred to a second phase that should have been
              in the first.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Why it matters ────────────────────────────────────────────────────── */

function WhyItMatters() {
  const points = [
    {
      heading: "Product work requires real product thinking",
      body: "Building a SaaS product is not the same as building a marketing site or an automation workflow. SilentSpend required architectural decisions that would hold at scale, not just work for the demo. That kind of thinking is what Inovense brings to build engagements.",
    },
    {
      heading: "A partner who can hold the whole build",
      body: "SilentSpend needed one team to own the data model, the integrations, the UI, and the deployment infrastructure. Not a developer, a designer, and a contractor managed separately. One clear scope, one point of accountability.",
    },
    {
      heading: "Speed without compromising the foundation",
      body: "The founder needed to move fast. We did not sacrifice data security, classification quality, or UX integrity to hit the timeline. The product that shipped was the product that was scoped, not a stripped-down version with technical debt built in.",
    },
    {
      heading: "Handoff that means something",
      body: "At completion, the founder had full ownership of the codebase, the Supabase project, the Vercel deployment, and the Plaid application. There was no ongoing dependency on Inovense to operate the product or update content.",
    },
  ];

  return (
    <section className="border-t border-zinc-800/60 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16">
          <Eyebrow>What this means for you</Eyebrow>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Why this engagement is relevant if you are building a product.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
            SilentSpend is an example of what a full-stack product engagement
            with Inovense looks like from intake to handoff.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-zinc-800/60 overflow-hidden rounded-xl sm:grid-cols-2">
          {points.map((item) => (
            <div
              key={item.heading}
              className="bg-zinc-950 p-7 transition-colors hover:bg-zinc-900/60"
            >
              <div className="mb-4 h-px w-8 bg-brand/40" />
              <h3 className="mb-3 text-sm font-semibold text-zinc-100">
                {item.heading}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ───────────────────────────────────────────────────────────────── */

function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] py-24 md:py-32">
      {/* Gradient line */}
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
            "radial-gradient(ellipse 55% 55% at 50% 110%, rgba(73,160,164,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Eyebrow>Start a build project</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Building something that matters.
          <br className="hidden md:block" /> Let us scope it.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Submit a brief through our intake form. We will review it within
          24 hours and come back with a direct response on fit, scope, and
          next steps.
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
            See the Build lane
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            "Limited intake",
            "24-hour response",
            "No pitch decks",
          ].map((item) => (
            <span
              key={item}
              className="flex items-center gap-2 text-xs text-zinc-700"
            >
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

export default function SilentSpendPage() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <Hero />
        <VisualDivider />
        <Overview />
        <Challenge />
        <WhatWasBuilt />
        <Execution />
        <Outcome />
        <WhyItMatters />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

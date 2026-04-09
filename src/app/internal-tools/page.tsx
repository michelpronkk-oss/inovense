import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import TrustpilotSignal from "@/components/trustpilot-signal";

export const metadata: Metadata = {
  title: "Custom Internal Tools and Operator Dashboards",
  description:
    "Purpose-built internal software, operator dashboards, and admin tooling for companies that have outgrown the SaaS tools designed for everyone else.",
  alternates: {
    canonical: "https://inovense.com/internal-tools",
  },
  openGraph: {
    url: "https://inovense.com/internal-tools",
    title: "Custom Internal Tools and Operator Dashboards | Inovense",
    description:
      "Purpose-built internal software, operator dashboards, and admin tooling for companies that have outgrown the SaaS tools designed for everyone else.",
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
            Internal Tools
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Build lane
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
            Purpose-built software
          </span>
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl md:leading-[1.06]">
          Tools built around
          <span className="text-brand"> how your team actually works.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Custom dashboards, admin panels, and operator tooling for
          businesses where off-the-shelf software no longer fits.
          Built to the exact shape of your operation. Not configured
          to approximate it.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90"
          >
            Start a project
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
            "Built for your operation specifically",
            "Not another SaaS subscription",
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
    title: "Operators managing complex workflows across disconnected tools",
    body: "When your team's daily workflow involves switching between five tabs, exporting to spreadsheets, and manually updating two systems, the tooling is the bottleneck.",
  },
  {
    title: "Businesses with processes too specific for any SaaS product",
    body: "SaaS tools are built for the median use case. If your operation is specific enough, the nearest off-the-shelf tool adds friction rather than removing it.",
  },
  {
    title: "Teams that have grown past spreadsheets and manual tracking",
    body: "Spreadsheets work until they do not. When visibility, handoffs, and accountability become problems, the operation needs a real tool, not a better spreadsheet.",
  },
  {
    title: "Founders who need a clean internal system before scaling",
    body: "Scaling broken internal processes makes them more broken faster. Getting the operational tooling right before headcount grows is significantly cheaper than retrofitting it later.",
  },
];

function WhoThisIsFor() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>Who this is for</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Built for operations that have outgrown the tools designed for everyone.
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
    title: "Operator dashboards",
    description:
      "Real-time views of the data your team needs to make decisions and manage operations daily. Signal-first information architecture. No decorative charts. Built for daily use, not for demos.",
    tag: "Most requested",
  },
  {
    number: "02",
    title: "Admin and management panels",
    description:
      "Internal admin interfaces for managing customers, orders, leads, content, or operational records. Built to the exact shape of your data model and workflow, not a generic CRUD panel.",
    tag: null,
  },
  {
    number: "03",
    title: "CRM and pipeline tooling",
    description:
      "Custom CRM-adjacent tools when standard platforms do not fit your sales or relationship management process. Built around how your team actually works rather than how a platform expects them to.",
    tag: null,
  },
  {
    number: "04",
    title: "Review and approval interfaces",
    description:
      "Structured internal tools for reviewing submissions, approving requests, routing decisions, and tracking status. Replaces ad-hoc email chains and shared spreadsheets with a purpose-built flow.",
    tag: null,
  },
  {
    number: "05",
    title: "Data visibility and reporting tools",
    description:
      "Internal tools that surface performance data, operational metrics, and decision-relevant information in a structured, always-current view. Not dashboards built for investors, but tools built for operators.",
    tag: null,
  },
  {
    number: "06",
    title: "Workflow and handoff systems",
    description:
      "Tools that manage structured workflows where tasks, ownership, and status matter. Replaces manual coordination between team members with a reliable system that tracks progress and surfaces blockers.",
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
              <span className="text-zinc-500">internal tools.</span>
            </h2>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Every internal tool is built around your specific operation.
              No SaaS template configured to fit. Software built to the
              exact shape of what your team needs.
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
    title: "Map the workflow before designing the tool",
    body: "Internal tools fail when they are designed around data models rather than actual workflows. Before any interface is designed, we map exactly how your team works, where handoffs happen, and where friction lives.",
  },
  {
    number: "02",
    title: "Operator-grade information design",
    body: "Internal tools are used daily under time pressure. Information hierarchy, density, and interaction design matter more here than anywhere else. The tool needs to surface the right signal immediately.",
  },
  {
    number: "03",
    title: "Built to fit your data, not the other way around",
    body: "Off-the-shelf tools require you to adapt your data to their schema. Custom tools are built around your data model exactly as it exists. The result is a tool that actually reflects your operation.",
  },
  {
    number: "04",
    title: "Performance where it counts",
    body: "Internal tools used by dozens of people daily need to be fast. Slow admin interfaces cost time in aggregate. We build with performance as a production constraint, not a nice-to-have.",
  },
  {
    number: "05",
    title: "Secure by design",
    body: "Internal tools often handle sensitive business data. Authentication, row-level access control, and audit logging are included in scope, not added after the fact.",
  },
  {
    number: "06",
    title: "Yours to operate and extend",
    body: "Full code ownership and documentation handed over at completion. Your team or a future developer can extend the tool without starting over. No vendor lock-in, no ongoing dependency on Inovense.",
  },
];

function OurApproach() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The difference</Eyebrow>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            What separates purpose-built software from configured SaaS.
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
            Built by operators, for operators
          </span>
        </div>

        <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-2xl font-semibold leading-snug tracking-tight text-zinc-50 md:text-3xl">
              &ldquo;We run our own business
              <br />
              <span className="text-brand">on internal tools we built.&rdquo;</span>
            </p>
            <p className="mt-6 text-sm leading-relaxed text-zinc-500">
              The Inovense CRM is a custom-built internal tool. Lead
              management, onboarding, proposals, payments, and project
              tracking: all in a purpose-built system built to the exact
              shape of how we operate. We build for clients what we build
              for ourselves.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <TrustpilotSignal note="Read client reviews" />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-6">
            <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
              What an internal tool build looks like
            </p>
            <div className="space-y-4">
              {[
                "Workflow mapped before any interface is designed",
                "Signal-first information hierarchy for daily operational use",
                "Row-level security and role-based access built in from day one",
                "Full code ownership and documentation on handoff",
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
                See SilentSpend, a full product build
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
    body: "Describe the workflow or operational problem the tool needs to solve. Be specific: what does your team do today, and where does it break down?",
  },
  {
    number: "02",
    title: "Workflow audit",
    note: "Map before build",
    body: "We map your current workflow, your data model, and where the friction lives before scoping any interface. Building the right tool requires understanding the operation, not just the feature list.",
  },
  {
    number: "03",
    title: "Scope and proposal",
    note: "Prioritized to highest leverage",
    body: "A proposal scoped to the tool that removes the most friction immediately. Phased where it makes sense. Clear deliverables, timeline, and investment.",
  },
  {
    number: "04",
    title: "Build and review",
    note: "One structured feedback cycle",
    body: "Interface built against the agreed workflow map. One structured review per phase before moving forward. Staged deployment for your team to test before production cutover.",
  },
  {
    number: "05",
    title: "Handoff and documentation",
    note: "Operate it independently",
    body: "Full code ownership, database access, and workflow documentation handed over. Your team can operate, extend, and modify the tool without calling us.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <Eyebrow>The process</Eyebrow>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            From operational brief to running tool.
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
    q: "How is a custom internal tool different from configuring something like Notion or Airtable?",
    a: "No-code platforms are powerful for simple use cases. When your workflow has enough specificity, enough data complexity, or enough performance requirements, configuring a general-purpose tool becomes the thing that slows you down. Custom software is built to the exact shape of your operation with no configuration compromises.",
  },
  {
    q: "What tech stack do you use for internal tools?",
    a: "Next.js and React for the interface layer. Supabase for the database, authentication, and row-level security. Deployed on Vercel. A stack proven in production and maintainable by any competent developer after handoff.",
  },
  {
    q: "How long does a custom internal tool take to build?",
    a: "A focused internal tool with a clear scope typically runs four to eight weeks. Complexity, number of integrations, and feedback cycles are the main variables. We scope to be accurate, not optimistic.",
  },
  {
    q: "Can you integrate with our existing tools and data sources?",
    a: "Yes. Integration with existing databases, CRMs, third-party APIs, and SaaS platforms is often a core part of internal tool builds. The specifics are scoped during the workflow audit phase.",
  },
  {
    q: "We have a partial internal tool that needs to be extended. Can you pick it up?",
    a: "Depends on the existing codebase quality and stack. We can assess what was built, determine whether extension is viable or a rebuild is cleaner, and give you an honest recommendation before committing to scope.",
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
        <Eyebrow>Start an internal tools project</Eyebrow>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Stop working around
          <br className="hidden md:block" /> tools that do not fit.
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Describe the operational bottleneck. We will respond within 24 hours
          with a clear view on whether a custom tool is the right answer and
          what that build would look like.
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

export default function InternalToolsPage() {
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

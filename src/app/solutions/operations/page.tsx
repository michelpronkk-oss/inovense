import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  PageShell,
  PageHero,
  MktCard,
  SectionDivider,
  PageCTA,
  StepRow,
} from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Operations",
  description: "AI operators for business operations. Recurring task execution, cross-team coordination, process documentation, and vendor management.",
  alternates: {
    canonical: "https://inovense.com/solutions/operations",
  },
  openGraph: {
    url: "https://inovense.com/solutions/operations",
    title: "Operations | Auterim",
    description: "AI operators for business operations. Recurring task execution, cross-team coordination, process documentation, and vendor management.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Operations | Auterim",
    description: "AI operators for business operations. Recurring task execution, cross-team coordination, process documentation, and vendor management.",
  },
};

const useCases = [
  {
    title: "Recurring task execution",
    description: "Operator runs defined tasks on schedule. Weekly reports, data syncs, and routine processes execute without a trigger.",
  },
  {
    title: "Cross-team coordination",
    description: "Routes tasks across functions with full context. Status updates flow automatically. No one has to chase down a handoff.",
  },
  {
    title: "Process documentation",
    description: "Operator captures what ran, what changed, and what was decided. Process documentation stays current without manual maintenance.",
  },
  {
    title: "Vendor management",
    description: "Invoice matching, payment alerts, and vendor communication tracked and surfaced through the approval layer.",
  },
];

const steps = [
  {
    number: "01",
    title: "Map your recurring processes",
    description: "Connect the tools involved and define the process. The operator runs it on the schedule you set.",
  },
  {
    number: "02",
    title: "Set approval thresholds",
    description: "Define what runs automatically and what surfaces for your review. Every step is logged regardless.",
  },
  {
    number: "03",
    title: "Operator handles the coordination",
    description: "Tasks route, statuses update, and exceptions surface. Your team focuses on decisions, not administration.",
  },
];

const blueprint = [
  { label: "Recommended operator", value: "Operations Operator" },
  { label: "Required connectors", value: "Slack, docs connector, CRM, calendar, internal webhook sources" },
  { label: "Approval rules", value: "External communications and high-impact changes require approval." },
  { label: "Expected outcome", value: "Weekly digests, routed tasks, and cleaner internal reporting with full logs." },
];

export default function OperationsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Solutions"
            heading="The operational layer that runs under your business."
            description="Recurring tasks, cross-team coordination, and process execution handled by operators. Your team focuses on decisions that move the business forward."
          >
            <Link
              href="/app/onboarding"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px"
              style={{
                background: "#4DE8E1",
                color: "#04130F",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)",
              }}
            >
              Get Starter
            </Link>
            <Link
              href="/workflows"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              See workflows
            </Link>
          </PageHero>

          {/* Use cases */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Where operations teams use Auterim
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Four functions. One ops coordinator.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {useCases.map((uc) => (
                  <MktCard key={uc.title}>
                    <h3
                      className="mb-2 text-base font-semibold"
                      style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                    >
                      {uc.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                      {uc.description}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                How it works
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                From process definition to continuous execution.
              </h2>
              <StepRow steps={steps} />
            </div>
            <SectionDivider />
          </section>

          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Implementation blueprint
              </span>
              <h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                Recommended setup for operations teams.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {blueprint.map((item) => (
                  <MktCard key={item.label}>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>{item.label}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>{item.value}</p>
                  </MktCard>
                ))}
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Deploy your Ops Coordinator today."
            sub="Route recurring work through operators, policies, and approvals from day one."
            primary="Get Starter"
            primaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

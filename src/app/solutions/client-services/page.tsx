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
  title: "AI Client Onboarding & Service Operations",
  description: "Prepare onboarding plans, client updates and handoffs with AI operators that coordinate work across your approved service systems.",
  alternates: {
    canonical: "https://auterim.com/solutions/client-services",
  },
  openGraph: {
    url: "https://auterim.com/solutions/client-services",
    title: "AI Client Onboarding & Service Operations | Auterim",
    description: "Prepare onboarding plans, client updates and handoffs with AI operators that coordinate work across your approved service systems.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Client Onboarding & Service Operations | Auterim",
    description: "Prepare onboarding plans, client updates and handoffs with AI operators that coordinate work across your approved service systems.",
  },
};

const useCases = [
  {
    title: "Client onboarding",
    description: "Structured onboarding workflows that run from signed contract to fully active client without manual coordination at each step.",
  },
  {
    title: "Status reporting",
    description: "Operator pulls project data and drafts client-facing status updates on a defined schedule. Review and approve before they send.",
  },
  {
    title: "Account health monitoring",
    description: "Operator tracks engagement signals, usage data, and communication patterns to surface at-risk accounts before they churn.",
  },
  {
    title: "Escalation routing",
    description: "When a defined threshold is crossed, the operator flags the account and routes it to the right person with full context.",
  },
];

const steps = [
  {
    number: "01",
    title: "Map your client journey",
    description: "Connect your CRM and communication tools. Define the stages from onboarding to renewal.",
  },
  {
    number: "02",
    title: "Deploy the operator",
    description: "The operator runs each stage on schedule, surfaces anomalies, and drafts client communications for your review.",
  },
  {
    number: "03",
    title: "Approve and deliver",
    description: "Every client-facing action goes through your approval gate. The operator executes once you approve.",
  },
];

const blueprint = [
  { label: "Recommended operator", value: "Client Flow Operator" },
  { label: "Required connectors", value: "CRM, Gmail or Outlook, Slack, docs connector, calendar" },
  { label: "Approval rules", value: "Client-facing outbound updates and schedule changes require approval." },
  { label: "Expected outcome", value: "Structured onboarding and communication with fewer handoff delays." },
];

export default function ClientServicesPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Solutions"
            heading="Client services that scale without adding headcount."
            description="Onboarding automation, status updates, and account health monitoring that runs without a dedicated ops hire. Every client gets a consistent, high-quality experience."
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
              href="/agents"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              See agents
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
                Where client services teams use Auterim
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Four functions. One client layer.
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
                From client intake to renewal, fully structured.
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
                Recommended setup for client services teams.
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
            heading="Deploy your client services operator today."
            sub="Run onboarding and client communication with clear approvals and traceable execution."
            primary="Get Starter"
            primaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

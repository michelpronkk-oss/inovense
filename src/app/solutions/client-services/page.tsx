import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  PageShell,
  Eyebrow,
  MktCard,
  SectionDivider,
  PageCTA,
  StepRow,
} from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Client Services",
  description: "AI operators for client-facing teams. Onboarding automation, status reporting, account health monitoring, and escalation routing at scale.",
  alternates: {
    canonical: "https://inovense.com/solutions/client-services",
  },
  openGraph: {
    url: "https://inovense.com/solutions/client-services",
    title: "Client Services | Inovense",
    description: "AI operators for client-facing teams. Onboarding automation, status reporting, account health monitoring, and escalation routing at scale.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Client Services | Inovense",
    description: "AI operators for client-facing teams. Onboarding automation, status reporting, account health monitoring, and escalation routing at scale.",
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
          <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-28 pt-40 text-center">
            <Eyebrow>Solutions</Eyebrow>
            <h1
              className="mb-5 max-w-[20ch] text-5xl font-semibold md:text-6xl"
              style={{ color: "#ECEFF3", letterSpacing: "-0.035em", lineHeight: 1.03 }}
            >
              Client services that scale without adding headcount.
            </h1>
            <p
              className="mb-10 max-w-[52ch] text-lg leading-relaxed"
              style={{ color: "#A4ABB4" }}
            >
              Onboarding automation, status updates, and account health monitoring that runs without a dedicated ops hire. Every client gets a consistent, high-quality experience.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
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
            </div>
          </section>

          {/* Use cases */}
          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Where client services teams use Inovense
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
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
          <section className="relative py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                How it works
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                From client intake to renewal, fully structured.
              </h2>
              <StepRow steps={steps} />
            </div>
            <SectionDivider />
          </section>

          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Implementation blueprint
              </span>
              <h2 className="mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
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

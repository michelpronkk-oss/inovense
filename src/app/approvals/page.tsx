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
  title: "AI Approval Workflows & Controls",
  description: "Set the approval boundaries that matter. Auterim operators can prepare work automatically and pause for a decision when a policy requires it.",
  alternates: {
    canonical: "https://auterim.com/approvals",
  },
  openGraph: {
    url: "https://auterim.com/approvals",
    title: "AI Approval Workflows & Controls | Auterim",
    description: "Set the approval boundaries that matter. Auterim operators can prepare work automatically and pause for a decision when a policy requires it.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Approval Workflows & Controls | Auterim",
    description: "Set the approval boundaries that matter. Auterim operators can prepare work automatically and pause for a decision when a policy requires it.",
  },
};

const steps = [
  {
    number: "01",
    title: "Operator proposes",
    description: "The operator prepares an action with the relevant context and policy information.",
  },
  {
    number: "02",
    title: "You review in inbox",
    description: "Review the proposed action when the policy for that work requires a decision.",
  },
  {
    number: "03",
    title: "Approved action executes",
    description: "Once approved, the action can continue within the scope you set. Activity is recorded in the product.",
  },
];

const approvalProperties = [
  {
    label: "Policy-driven review",
    value: "Only where you require it",
  },
  {
    label: "Context shown",
    value: "What agent wants and why",
  },
  {
    label: "One-click approve or reject",
    value: "In your inbox",
  },
  {
    label: "Activity record",
    value: "Approvals and execution context",
  },
];

const riskyActions = [
  "Outbound emails to external recipients",
  "Proposal or pricing communications",
  "CRM record changes above policy thresholds",
  "External calendar invites",
];

export default function ApprovalsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Platform"
            heading="Act at speed. Stay in control."
            description="Approval rules shape how operators work. Routine work can continue within the scopes you set; sensitive actions pause for a decision when you want them to."
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
              Start preview
            </Link>
            <Link
              href="/docs"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              Read the docs
            </Link>
          </PageHero>

          {/* 3-step flow */}
          <section className="relative py-12 md:py-20">
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
                Three steps between proposal and execution.
              </h2>
              <StepRow steps={steps} />
            </div>
          </section>

          {/* Properties grid */}
          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Approval properties
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Designed for speed without sacrificing oversight.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {approvalProperties.map((p) => (
                  <MktCard key={p.label}>
                    <p
                      className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em]"
                      style={{ color: "#4A4F57" }}
                    >
                      {p.label}
                    </p>
                    <p
                      className="text-base font-semibold"
                      style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                    >
                      {p.value}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
            <SectionDivider />
          </section>

          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Common approval triggers
              </span>
              <h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                Actions that wait for human review.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {riskyActions.map((item) => (
                  <MktCard key={item}>
                    <p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>{item}</p>
                  </MktCard>
                ))}
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Approval that does not slow you down."
            sub="Median review time: 4 minutes."
            primary="Get Starter"
            primaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

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
  title: "Approvals",
  description: "Human-in-the-loop approval gates between agent proposals and execution. Operators act at speed, humans stay in control. Every decision is logged.",
  alternates: {
    canonical: "https://inovense.com/approvals",
  },
  openGraph: {
    url: "https://inovense.com/approvals",
    title: "Approvals | Inovense",
    description: "Human-in-the-loop approval gates between agent proposals and execution. Operators act at speed, humans stay in control. Every decision is logged.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Approvals | Inovense",
    description: "Human-in-the-loop approval gates between agent proposals and execution. Operators act at speed, humans stay in control. Every decision is logged.",
  },
};

const steps = [
  {
    number: "01",
    title: "Operator proposes",
    description: "The agent drafts an action and surfaces it to your inbox with full context on what it wants to do and why.",
  },
  {
    number: "02",
    title: "You review in inbox",
    description: "See the proposed action, the reasoning behind it, and any relevant data in a single focused view.",
  },
  {
    number: "03",
    title: "Approved action executes",
    description: "One click to approve. One click to reject. The decision is logged with a timestamp and your identity.",
  },
];

const approvalProperties = [
  {
    label: "Response time",
    value: "4m median",
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
    label: "Full log of every decision",
    value: "Permanent, timestamped",
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
          <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-28 pt-40 text-center">
            <Eyebrow>Platform</Eyebrow>
            <h1
              className="mb-5 max-w-[20ch] text-5xl font-semibold md:text-6xl"
              style={{ color: "#ECEFF3", letterSpacing: "-0.035em", lineHeight: 1.03 }}
            >
              Act at speed. Stay in control.
            </h1>
            <p
              className="mb-10 max-w-[52ch] text-lg leading-relaxed"
              style={{ color: "#A4ABB4" }}
            >
              Approval gates sit between agent proposals and execution. Operators move fast. You stay in the loop on every decision that matters. Every approval and rejection is logged.
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
            </div>
          </section>

          {/* 3-step flow */}
          <section className="relative py-20">
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
                Three steps between proposal and execution.
              </h2>
              <StepRow steps={steps} />
            </div>
          </section>

          {/* Properties grid */}
          <section className="relative py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Approval properties
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
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

          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Common approval triggers
              </span>
              <h2 className="mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
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

import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  PageShell,
  PageHero,
  MktCard,
  MockupWindow,
  SectionDivider,
  PageCTA,
  PropList,
} from "@/components/marketing-ui";
import Reveal from "@/components/reveal";
import { staticOgImage } from "@/lib/static-og";

export const metadata: Metadata = {
  title: "AI Workflow Automation",
  description: "Auterim workflows coordinate operators, connected systems and approval gates so repeatable business work moves without manual chasing.",
  alternates: {
    canonical: "https://auterim.com/workflows",
  },
  openGraph: {
    url: "https://auterim.com/workflows",
    title: "AI Workflow Automation | Auterim",
    description: "Auterim workflows coordinate operators, connected systems and approval gates so repeatable business work moves without manual chasing.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/workflows")],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Workflow Automation | Auterim",
    description: "Auterim workflows coordinate operators, connected systems and approval gates so repeatable business work moves without manual chasing.",
    images: [staticOgImage("/workflows")],
  },
};

const features = [
  {
    title: "A defined business signal",
    description: "A workflow begins with useful context: an inbox thread, a CRM record, a Trello card, or a deliberate operator check.",
  },
  {
    title: "A prepared next step",
    description: "The operator turns that context into a specific draft, update, handoff, or internal escalation rather than a generic suggestion.",
  },
  {
    title: "A controlled decision",
    description: "External sends, CRM writes, card changes, and Slack messages pause when the workspace policy requires an owner to decide.",
  },
];

const properties = [
  "Connector context from the systems you approve",
  "Role-specific preparation instead of generic automation",
  "Policy checks before consequential tool actions",
  "Approval gates for external and high-impact steps",
  "Manual operator checks where a human should initiate the review",
  "Execution logs that retain the outcome and decision",
];

export default function WorkflowsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <Reveal>
            <PageHero
              eyebrow="Platform"
            heading="Controlled workflows that move the next piece of work."
            description="Auterim connects the signal, the relevant company context, the operator’s prepared action, and the approval decision in one reviewable flow."
            mobileHeading="Workflows that keep moving"
            mobileDescription="Structured work moves across operators, connectors and approval gates. Every step is logged."
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
                Start with a workflow
              </Link>
              <Link
                href="/operators"
                className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  color: "#ECEFF3",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                Explore operators
              </Link>
            </PageHero>
          </Reveal>

          <section className="relative py-8">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1fr_1.2fr]">
              <Reveal>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Execution blueprint</p>
                  <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                    A useful workflow is more than a trigger.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed" style={{ color: "#A4ABB4" }}>
                    It starts from the systems that already hold the work, prepares one clear next step, and gives the right person control before anything consequential happens.
                  </p>
                </div>
              </Reveal>
              <Reveal delayMs={120}>
                <MockupWindow
                  title="Inbound opportunity workflow"
                  subtitle="context / prepare / approve / log"
                  rows={[
                    { label: "Read the inbox and CRM context", meta: "Gmail, Microsoft 365, HubSpot, or Salesforce", status: "ok" },
                    { label: "Prepare the follow-up", meta: "Revenue Operator draft", status: "ok" },
                    { label: "Request approval", meta: "external send or CRM change", status: "pending" },
                    { label: "Record the outcome", meta: "execution and decision log", status: "live" },
                  ]}
                />
              </Reveal>
            </div>
          </section>

          {/* Feature grid */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Core capabilities
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Designed for production, not demos.
              </h2>
              <div className="grid gap-5 md:grid-cols-3">
                {features.map((f) => (
                  <MktCard key={f.title}>
                    <h3
                      className="mb-2 text-base font-semibold"
                      style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                    >
                      {f.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                      {f.description}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          {/* Spec list */}
          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Workflow properties
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                The mechanics that keep control attached to the work.
              </h2>
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <PropList items={properties} />
                <MockupWindow
                  title="Blocked task workflow"
                  subtitle="Trello context / internal follow-through"
                  rows={[
                    { label: "Find stalled or blocked work", meta: "Trello board and card context", status: "ok" },
                    { label: "Prepare an escalation or card action", meta: "Operations Operator", status: "live" },
                    { label: "Approve the internal action", meta: "message, move, comment, or new card", status: "pending" },
                    { label: "Keep the result visible", meta: "run and approval history", status: "ok" },
                  ]}
                />
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Start with the business loop that is already getting delayed."
            sub="Choose the signal, the operator, and the control boundary before you connect more systems."
            primary="Start with a workflow"
            primaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

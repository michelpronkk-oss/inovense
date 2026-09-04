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
  StepRow,
} from "@/components/marketing-ui";
import Reveal from "@/components/reveal";
import { staticOgImage } from "@/lib/static-og";

export const metadata: Metadata = {
  title: "AI Operators for Business",
  description: "See how Auterim AI operators use company context, approved tools, and clear boundaries to prepare and run business work.",
  alternates: {
    canonical: "https://auterim.com/agents",
  },
  openGraph: {
    url: "https://auterim.com/agents",
    title: "AI Operators for Business | Auterim",
    description: "See how Auterim AI operators use company context, approved tools, and clear boundaries to prepare and run business work.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/agents")],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Operators for Business | Auterim",
    description: "See how Auterim AI operators use company context, approved tools, and clear boundaries to prepare and run business work.",
    images: [staticOgImage("/agents")],
  },
};

const agentTypes = [
  {
    label: "Revenue",
    name: "Revenue Operator",
    description: "Pipeline management, follow-up sequencing, and deal intelligence across your CRM.",
  },
  {
    label: "Marketing",
    name: "Marketing Operator",
    description: "Campaign briefs, content workflows, SEO pipelines, and performance summaries.",
  },
  {
    label: "Client flow",
    name: "Client Flow Operator",
    description: "Onboarding flows, handoffs, reminders, and client communication with approvals.",
  },
  {
    label: "Operations",
    name: "Operations Operator",
    description: "Cross-team task routing, status updates, and recurring execution on schedule.",
  },
  {
    label: "Support",
    name: "Support Operator",
    description: "Drafted support replies, triage routing, and escalation flows with policy controls.",
  },
  {
    label: "Content",
    name: "Content Operator",
    description: "Editorial planning, structured drafts, approval loops, and publishing coordination.",
  },
];

const steps = [
  {
    number: "01",
    title: "Deploy",
    description: "Select an operator type and connect it to your stack in minutes.",
  },
  {
    number: "02",
    title: "Configure policies",
    description: "Define exactly what the operator can do, what requires approval, and what is off-limits.",
  },
  {
    number: "03",
    title: "Approve actions",
    description: "Review proposals in your inbox. One click to approve, one click to reject.",
  },
];

export default function AgentsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <Reveal>
            <PageHero
              eyebrow="Platform"
            heading="Specialized operators for every function"
            description="Operators are not chatbots. They run structured workflows through connectors, policies, approvals, memory, and execution logs. They propose actions first, then execute only when allowed."
            mobileHeading="Operators built for real work"
            mobileDescription="Defined roles that prepare work, follow your policies and execute only within the boundaries you set."
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
                Deploy your first operator
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
          </Reveal>

          <section className="relative py-8">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1fr_1.15fr]">
              <Reveal>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Live operator layer</p>
                  <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                    Real operators with scoped execution.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed" style={{ color: "#A4ABB4" }}>
                    Each operator has role-specific goals, connector permissions, and policy constraints before any action can run.
                  </p>
                </div>
              </Reveal>
              <Reveal delayMs={120}>
                <MockupWindow
                  title="Operators - Live status"
                  subtitle="workspace: auterim / production"
                  rows={[
                    { label: "Revenue Operator", meta: "Drafting 14 follow-ups", status: "live" },
                    { label: "Marketing Operator", meta: "Building Q3 campaign brief", status: "live" },
                    { label: "Client Flow Operator", meta: "Awaiting onboarding approval", status: "pending" },
                    { label: "Operations Operator", meta: "Weekly digest run complete", status: "ok" },
                  ]}
                />
              </Reveal>
            </div>
          </section>

          {/* Agent type grid */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Operator types
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                One operator per function. All under the same policy layer.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {agentTypes.map((agent) => (
                  <MktCard key={agent.name}>
                    <p
                      className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em]"
                      style={{ color: "#4DE8E1" }}
                    >
                      {agent.label}
                    </p>
                    <h3
                      className="mb-2 text-base font-semibold"
                      style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                    >
                      {agent.name}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                      {agent.description}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Runtime model
              </span>
              <h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                How an operator run executes.
              </h2>
              <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                <MktCard>
                  <div className="space-y-3">
                    {[
                      { t: "Load goal and context", m: "memory.search + workspace state", s: "ok" },
                      { t: "Generate deterministic plan", m: "step-level risk markers", s: "ok" },
                      { t: "Evaluate policy for each tool action", m: "allow / require approval / block", s: "live" },
                      { t: "Escalate risky actions", m: "approval inbox continuation", s: "pending" },
                      { t: "Execute approved actions", m: "connector executor", s: "live" },
                      { t: "Write memory and execution logs", m: "auditable run result", s: "ok" },
                    ].map((item) => (
                      <div
                        key={item.t}
                        className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                        style={{ background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
                      >
                        <span
                          className="mt-1.5 h-2 w-2 rounded-full"
                          style={{
                            background: item.s === "pending" ? "#F5C26B" : item.s === "ok" ? "#51D88A" : "#4DE8E1",
                            boxShadow: item.s === "pending" ? "0 0 8px rgba(245,194,107,0.8)" : item.s === "ok" ? "0 0 8px rgba(81,216,138,0.8)" : "0 0 8px rgba(77,232,225,0.8)",
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#ECEFF3" }}>{item.t}</p>
                          <p className="font-mono text-[10.5px]" style={{ color: "#6B7178" }}>{item.m}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </MktCard>
                <MockupWindow
                  title="Agent run - Revenue Operator"
                  subtitle="run id: #4,812 / status: awaiting approval"
                  rows={[
                    { label: "Step 1 - Lead qualified", meta: "score: 78 / ICP match", status: "ok" },
                    { label: "Step 2 - CRM enriched", meta: "hubspot.updateLead", status: "ok" },
                    { label: "Step 3 - Draft generated", meta: "gmail.createDraft", status: "ok" },
                    { label: "Step 4 - Send outbound email", meta: "policy: require approval", status: "pending" },
                  ]}
                />
              </div>
            </div>
            <SectionDivider />
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
                From deploy to execution in three steps.
              </h2>
              <StepRow steps={steps} />
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Deploy your first operator."
            sub="Start with one. Expand when the value is proven."
            primary="Deploy your first operator"
            primaryHref="/app/onboarding"
            secondary="Read the docs"
            secondaryHref="/docs"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

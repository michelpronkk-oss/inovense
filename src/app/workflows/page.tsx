import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  PageShell,
  Eyebrow,
  MktCard,
  MockupWindow,
  SectionDivider,
  PageCTA,
  PropList,
} from "@/components/marketing-ui";
import Reveal from "@/components/reveal";

export const metadata: Metadata = {
  title: "Workflows",
  description: "Structured execution chains that move work across agents, connectors, and approval gates without manual handoff. Every step logged and auditable.",
  alternates: {
    canonical: "https://inovense.com/workflows",
  },
  openGraph: {
    url: "https://inovense.com/workflows",
    title: "Workflows | Inovense",
    description: "Structured execution chains that move work across agents, connectors, and approval gates without manual handoff. Every step logged and auditable.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Workflows | Inovense",
    description: "Structured execution chains that move work across agents, connectors, and approval gates without manual handoff. Every step logged and auditable.",
  },
};

const features = [
  {
    title: "Trigger-based execution",
    description: "Workflows start on schedule, inbound events, or connector state changes.",
  },
  {
    title: "Step planning and branching",
    description: "Each run creates step-level plans with branching conditions and fallbacks.",
  },
  {
    title: "Approval-first actions",
    description: "Risky steps pause in approval inbox until a reviewer approves or skips.",
  },
];

const properties = [
  "Event, scheduled, and manual triggers",
  "Agent plan steps with status tracking",
  "Connector tool actions with policy checks",
  "Approval gates on risky steps",
  "Suggested workflows from workspace activity",
  "Execution logs linked to run IDs",
];

export default function WorkflowsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <Reveal>
            <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-28 pt-40 text-center">
            <Eyebrow>Platform</Eyebrow>
            <h1
              className="mb-5 max-w-[20ch] text-5xl font-semibold md:text-6xl"
              style={{ color: "#ECEFF3", letterSpacing: "-0.035em", lineHeight: 1.03 }}
            >
              Execution chains with no manual handoff
            </h1>
            <p
              className="mb-10 max-w-[52ch] text-lg leading-relaxed"
              style={{ color: "#A4ABB4" }}
            >
              Structured workflows that move work across agents, connectors, and approval gates. Build once. Run continuously. Every step logged and auditable.
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
          </Reveal>

          <section className="relative py-8">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1fr_1.2fr]">
              <Reveal>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Execution blueprint</p>
                  <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                    Production-style workflow runs.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed" style={{ color: "#A4ABB4" }}>
                    Triggers, agent steps, tool actions, and approval gates execute as a deterministic run with full observability.
                  </p>
                </div>
              </Reveal>
              <Reveal delayMs={120}>
                <MockupWindow
                  title="Inbound Revenue - Run #4,812"
                  subtitle="agent runtime / policy engine / approvals"
                  rows={[
                    { label: "Trigger - New lead submitted", meta: "forms / crm", status: "ok" },
                    { label: "Qualify lead and enrich context", meta: "memory + hubspot", status: "ok" },
                    { label: "Draft outbound reply", meta: "gmail.createDraft", status: "ok" },
                    { label: "Send email", meta: "approval required", status: "pending" },
                  ]}
                />
              </Reveal>
            </div>
          </section>

          {/* Feature grid */}
          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Core capabilities
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
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
          <section className="relative py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Workflow properties
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Every configuration you need to run production workflows.
              </h2>
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <PropList items={properties} />
                <MockupWindow
                  title="Workflow branch preview"
                  subtitle="inbound revenue / policy-aware path"
                  rows={[
                    { label: "Trigger - new form lead", meta: "event bus", status: "ok" },
                    { label: "Branch - score >= 70", meta: "continue to follow-up", status: "live" },
                    { label: "Branch - score < 70", meta: "route to nurture queue", status: "ok" },
                    { label: "Outbound send", meta: "approval gate before execute", status: "pending" },
                  ]}
                />
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Build your first workflow."
            sub="Start with controlled workflow volume, then expand by operator count and execution needs."
            primary="Get Starter"
            primaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

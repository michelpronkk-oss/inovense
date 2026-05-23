import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  PageShell,
  PageHero,
  MktCardHover,
  MockupWindow,
  SectionDivider,
  PageCTA,
} from "@/components/marketing-ui";
import Reveal from "@/components/reveal";

export const metadata: Metadata = {
  title: "Docs",
  description: "Guides, API reference, and architecture documentation for the Inovense operating layer. Deploy, configure, and scale your operators.",
  alternates: {
    canonical: "https://inovense.com/docs",
  },
  openGraph: {
    url: "https://inovense.com/docs",
    title: "Docs | Inovense",
    description: "Guides, API reference, and architecture documentation for the Inovense operating layer. Deploy, configure, and scale your operators.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Docs | Inovense",
    description: "Guides, API reference, and architecture documentation for the Inovense operating layer. Deploy, configure, and scale your operators.",
  },
};

const docSections = [
  {
    label: "Getting started",
    title: "Getting started",
    description: "Onboard your workspace, connect core systems, and deploy your first controlled operator.",
    href: "/app/onboarding",
  },
  {
    label: "Connectors",
    title: "Connectors",
    description: "Connector categories, read scopes, write scopes, and approval-required actions.",
    href: "/integrations",
  },
  {
    label: "Operators",
    title: "Operators",
    description: "Agent definitions, allowed tools, required connectors, and runtime behavior.",
    href: "/agents",
  },
  {
    label: "Workflows",
    title: "Workflows",
    description: "Triggers, branching, tool actions, approval gates, and execution logs.",
    href: "/workflows",
  },
  {
    label: "Policies",
    title: "Policies",
    description: "Policy engine decisions: allow, require approval, or block before execution.",
    href: "/security",
  },
  {
    label: "Approvals",
    title: "Approvals",
    description: "Inbox behavior, reviewer roles, approval continuity, and logged decisions.",
    href: "/approvals",
  },
  {
    label: "Memory",
    title: "Memory",
    description: "Company memory graph, scoped retrieval, writes, and memory auditability.",
    href: "/memory",
  },
  {
    label: "API and webhooks",
    title: "API and webhooks",
    description: "Current API surface and webhook event model for workflow and approval events.",
    href: "/api-reference",
  },
];

export default function DocsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <Reveal>
            <PageHero
              eyebrow="Documentation"
              heading="Everything you need to operate."
              description="Guides, API reference, and architecture docs for every layer of the Inovense platform."
            >
              <Link
                href="/api-reference"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px"
                style={{
                  background: "#4DE8E1",
                  color: "#04130F",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)",
                }}
              >
                API Reference
              </Link>
              <Link
                href="/architecture"
                className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  color: "#ECEFF3",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                Architecture
              </Link>
            </PageHero>
          </Reveal>

          <section className="relative py-8">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1fr_1.1fr]">
              <Reveal>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Documentation map</p>
                  <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                    From onboarding to runtime control.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed" style={{ color: "#A4ABB4" }}>
                    Follow a clear path through connectors, operators, workflows, approvals, memory, and API events.
                  </p>
                </div>
              </Reveal>
              <Reveal delayMs={120}>
                <MockupWindow
                  title="Docs navigation"
                  subtitle="getting started / architecture / reference"
                  rows={[
                    { label: "Onboarding and workspace setup", meta: "deploy first operator in minutes", status: "ok" },
                    { label: "Policy engine and approvals", meta: "enforced guardrails before tool actions", status: "live" },
                    { label: "Workflow runs and execution logs", meta: "step-level observability", status: "ok" },
                    { label: "Webhooks and API events", meta: "preview surface available", status: "pending" },
                  ]}
                />
              </Reveal>
            </div>
          </section>

          {/* Doc sections grid */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Documentation sections
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Pick a starting point.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {docSections.map((section) => (
                  <Link key={section.title} href={section.href} className="block">
                    <MktCardHover>
                      <p
                        className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em]"
                        style={{ color: "#4A4F57" }}
                      >
                        {section.label}
                      </p>
                      <h3
                        className="mb-2 text-base font-semibold"
                        style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                      >
                        {section.title}
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                        {section.description}
                      </p>
                    </MktCardHover>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Quick start */}
          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Quick start
              </span>
              <h2 className="mb-8 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                Start from the product surface you are implementing.
              </h2>
              <pre
                className="overflow-x-auto rounded-xl p-6 font-mono text-sm leading-relaxed"
                style={{
                  background: "#0A0C10",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "#A4ABB4",
                }}
              >
                <code>
                  <span style={{ color: "#4A4F57" }}>1.</span> <span style={{ color: "#4DE8E1" }}>Onboarding</span> {"->"} connect Gmail, HubSpot, Slack{"\n"}
                  <span style={{ color: "#4A4F57" }}>2.</span> <span style={{ color: "#4DE8E1" }}>Operators</span> {"->"} deploy Revenue Operator{"\n"}
                  <span style={{ color: "#4A4F57" }}>3.</span> <span style={{ color: "#4DE8E1" }}>Workflows</span> {"->"} install Inbound Revenue Operator{"\n"}
                  <span style={{ color: "#4A4F57" }}>4.</span> <span style={{ color: "#4DE8E1" }}>Approvals</span> {"->"} approve risky outbound actions{"\n"}
                  <span style={{ color: "#4A4F57" }}>5.</span> <span style={{ color: "#4DE8E1" }}>Logs</span> {"->"} inspect full execution history
                </code>
              </pre>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Full API access from day one."
            primary="API Reference"
            primaryHref="/api-reference"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

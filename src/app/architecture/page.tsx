import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  PageShell,
  Eyebrow,
  SectionDivider,
  PageCTA,
  PropList,
} from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Architecture",
  description: "Technical overview of the Inovense operating layer. Agent runtime, policy engine, approval gates, persistent memory, and the connector framework.",
  alternates: {
    canonical: "https://inovense.com/architecture",
  },
  openGraph: {
    url: "https://inovense.com/architecture",
    title: "Architecture | Inovense",
    description: "Technical overview of the Inovense operating layer. Agent runtime, policy engine, approval gates, persistent memory, and the connector framework.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Architecture | Inovense",
    description: "Technical overview of the Inovense operating layer. Agent runtime, policy engine, approval gates, persistent memory, and the connector framework.",
  },
};

const layers = [
  {
    number: "1",
    title: "Your tools",
    subtitle: "Connectors",
    description: "CRMs, communication platforms, finance systems, and data sources connected via native integrations or webhooks.",
  },
  {
    number: "2",
    title: "Tool registry",
    subtitle: "Action layer",
    description: "Standardized tool definitions map operator intents to connector actions with clear input and output contracts.",
  },
  {
    number: "3",
    title: "Connector executor",
    subtitle: "Execution layer",
    description: "Checks connector availability, scopes, and policy decisions before any action reaches a connected system.",
  },
  {
    number: "4",
    title: "Agent runtime",
    subtitle: "Execution layer",
    description: "Stateless operator execution that processes tasks, applies context from memory, and surfaces proposals before any action is taken.",
  },
  {
    number: "5",
    title: "Policy engine",
    subtitle: "Enforcement layer",
    description: "Runtime policy evaluation that determines whether a proposed action is permitted, requires approval, or is blocked outright.",
  },
  {
    number: "6",
    title: "Approval layer",
    subtitle: "Human control layer",
    description: "Approval-required actions wait in inbox until reviewer decision. Approved actions continue run execution with full traceability.",
  },
  {
    number: "7",
    title: "Memory layer",
    subtitle: "Context layer",
    description: "Persistent company knowledge accessible to every operator in the account. Scoped by role and owner-controlled.",
  },
  {
    number: "8",
    title: "Execution logs",
    subtitle: "Audit layer",
    description: "Every policy decision, approval outcome, and tool action is recorded and linked to workflow and agent runs.",
  },
];

const properties = [
  "Stateless agent execution",
  "Tool registry and connector executor",
  "Policy-enforced boundaries",
  "Persistent memory layer",
  "Async approval queues",
  "OAuth-ready and webhook connectors",
  "Immutable audit logs",
];

export default function ArchitecturePage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-28 pt-40 text-center">
            <Eyebrow>Resources</Eyebrow>
            <h1
              className="mb-5 max-w-[20ch] text-5xl font-semibold md:text-6xl"
              style={{ color: "#ECEFF3", letterSpacing: "-0.035em", lineHeight: 1.03 }}
            >
              Built to run your business, not just assist it.
            </h1>
            <p
              className="mb-10 max-w-[52ch] text-lg leading-relaxed"
              style={{ color: "#A4ABB4" }}
            >
              A technical overview of how the Inovense operating layer works. Five distinct layers, each with a clear responsibility.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px"
                style={{
                  background: "#4DE8E1",
                  color: "#04130F",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)",
                }}
              >
                Read the docs
              </Link>
              <Link
                href="/security"
                className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  color: "#ECEFF3",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                Security model
              </Link>
            </div>
          </section>

          {/* Layer stack */}
          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Platform layers
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Five layers. One operating system.
              </h2>
              <div className="flex flex-col">
                {layers.map((layer, i) => (
                  <div
                    key={layer.number}
                    className="flex gap-5 py-6"
                    style={{
                      borderLeft: "2px solid rgba(77,232,225,0.20)",
                      paddingLeft: 16,
                      borderBottom:
                        i !== layers.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : undefined,
                    }}
                  >
                    <span
                      className="w-6 shrink-0 font-mono text-2xl font-light"
                      style={{ color: "rgba(255,255,255,0.10)" }}
                    >
                      {layer.number}
                    </span>
                    <div>
                      <p
                        className="mb-0.5 font-mono text-[11px] uppercase tracking-[0.14em]"
                        style={{ color: "#4DE8E1" }}
                      >
                        {layer.subtitle}
                      </p>
                      <h3
                        className="mb-1.5 text-base font-semibold"
                        style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                      >
                        {layer.title}
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                        {layer.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Properties */}
          <section className="relative py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Design properties
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                The principles the system is built on.
              </h2>
              <PropList items={properties} />
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="See how every layer connects."
            primary="Read the docs"
            primaryHref="/docs"
            secondary="Security model"
            secondaryHref="/security"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

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
} from "@/components/marketing-ui";
import Reveal from "@/components/reveal";
import { staticOgImage } from "@/lib/static-og";

export const metadata: Metadata = {
  title: "Business AI Integrations",
  description: "Connect the business systems Auterim operators use for context and approved actions, with explicit scopes and approval boundaries.",
  alternates: {
    canonical: "https://auterim.com/integrations",
  },
  openGraph: {
    url: "https://auterim.com/integrations",
    title: "Business AI Integrations | Auterim",
    description: "Connect the business systems Auterim operators use for context and approved actions, with explicit scopes and approval boundaries.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/integrations")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Business AI Integrations | Auterim",
    description: "Connect the business systems Auterim operators use for context and approved actions, with explicit scopes and approval boundaries.",
    images: [staticOgImage("/integrations")],
  },
};

const currentIntegrations = [
  { name: "Gmail", label: "Email context", adds: "Recent inbox and thread context.", enables: "Draft follow-up and send approved external email.", improves: "Revenue and Client Flow Operators." },
  { name: "Microsoft 365", label: "Mail and calendar", adds: "Outlook mail context and calendar visibility.", enables: "Draft and approved email; calendar changes after approval.", improves: "Revenue and Client Flow Operators." },
  { name: "HubSpot", label: "CRM", adds: "Contact, deal, pipeline, and association context.", enables: "Approval-gated contact and deal updates.", improves: "Revenue Operator." },
  { name: "Salesforce", label: "CRM context", adds: "Contact, lead, account, and open opportunity context.", enables: "Read-context foundation only; Salesforce writes are not enabled.", improves: "Revenue Operator." },
  { name: "Trello", label: "Project work", adds: "Boards, lists, cards, and stalled-work signals.", enables: "Prepared card moves, comments, and new cards after approval.", improves: "Operations Operator." },
  { name: "Slack", label: "Team chat", adds: "Allowed channel and message context.", enables: "Prepared internal messages and alerts after approval.", improves: "Operations, Client Flow, and Revenue Operators." },
];

const permissionModel = [
  "Every connector has explicit read scopes and write scopes.",
  "Connector actions are evaluated by the policy engine before execution.",
  "Risky external actions move to approval inbox before any tool action runs.",
  "Disconnected connectors block dependent workflow steps with a clear reason.",
];

export default function IntegrationsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <Reveal>
            <PageHero
              eyebrow="Platform"
            heading="Connect the systems your work already depends on."
            description="Auterim does not ask a team to rebuild its stack. It reads approved business context and prepares controlled actions in the systems already carrying the work."
            mobileHeading="Connect the systems your work already uses"
            mobileDescription="Auterim reads approved context and prepares work within the scopes you set."
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
                Start with your systems
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
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1fr_1.1fr]">
              <Reveal>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Connector executor</p>
                  <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                    Tool access with boundaries.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed" style={{ color: "#A4ABB4" }}>
                    Every current connector has a defined purpose. Context can improve an operator without granting it write access; any consequential action still moves through policy and approval.
                  </p>
                </div>
              </Reveal>
              <Reveal delayMs={120}>
                <MockupWindow
                  title="Connector health and scopes"
                  subtitle="connected systems / permission model"
                  rows={[
                    { label: "Gmail — inbox and thread context", meta: "draft, then approval-gated send", status: "live" },
                    { label: "HubSpot — contact and deal context", meta: "writes require approval", status: "ok" },
                    { label: "Salesforce — opportunity context", meta: "read-context foundation", status: "ok" },
                    { label: "Trello — board and card signals", meta: "actions prepared for approval", status: "pending" },
                  ]}
                />
              </Reveal>
            </div>
          </section>

          {/* Category grid */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Current integrations
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Six live connections, with their real boundaries.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {currentIntegrations.map((connector) => (
                  <MktCard key={connector.name}>
                    <p
                      className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em]"
                      style={{ color: "#4A4F57" }}
                    >
                      {connector.label}
                    </p>
                    <h3 className="mb-4 text-lg font-semibold" style={{ color: "#ECEFF3", letterSpacing: "-0.02em" }}>{connector.name}</h3>
                    <div className="space-y-3 text-sm leading-relaxed" style={{ color: "#A4ABB4" }}><p><strong style={{ color: "#ECEFF3" }}>Adds:</strong> {connector.adds}</p><p><strong style={{ color: "#ECEFF3" }}>Enables:</strong> {connector.enables}</p><p><strong style={{ color: "#4DE8E1" }}>Useful for:</strong> {connector.improves}</p></div>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Permission model
              </span>
              <h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                Context first. Permissions second. Approval before consequential action.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {permissionModel.map((item) => (
                  <MktCard key={item}>
                    <p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>
                      {item}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Start with the systems that make the first operator useful."
            sub="Connection is scoped. Setup stays explicit. The value starts with the work you need to move."
            primary="Start with your systems"
            primaryHref="/app/onboarding"
            secondary="Meet the operators"
            secondaryHref="/operators"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

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
} from "@/components/marketing-ui";
import Reveal from "@/components/reveal";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Native connectors for CRMs, communication platforms, finance systems, and data sources. Connect your stack to the Inovense operating layer.",
  alternates: {
    canonical: "https://inovense.com/integrations",
  },
  openGraph: {
    url: "https://inovense.com/integrations",
    title: "Integrations | Inovense",
    description: "Native connectors for CRMs, communication platforms, finance systems, and data sources. Connect your stack to the Inovense operating layer.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Integrations | Inovense",
    description: "Native connectors for CRMs, communication platforms, finance systems, and data sources. Connect your stack to the Inovense operating layer.",
  },
};

const categories = [
  {
    label: "CRM & Sales",
    connectors: ["HubSpot", "Salesforce", "Pipedrive", "Airtable"],
  },
  {
    label: "Communication",
    connectors: ["Gmail", "Outlook", "Slack", "Microsoft Teams"],
  },
  { label: "Calendar & Scheduling", connectors: ["Google Calendar", "Outlook Calendar", "Calendly"] },
  { label: "Docs & Knowledge", connectors: ["Notion", "Google Drive", "Confluence", "Google Sheets"] },
  { label: "Payments & Commerce", connectors: ["Stripe", "Shopify"] },
  { label: "Support", connectors: ["Intercom", "Zendesk"] },
  { label: "Work Management", connectors: ["Linear", "ClickUp", "Monday", "Asana"] },
  { label: "Automation & Custom", connectors: ["Zapier", "Make", "n8n", "Webhooks", "Custom API"] },
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
            <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-28 pt-40 text-center">
            <Eyebrow>Platform</Eyebrow>
            <h1
              className="mb-5 max-w-[20ch] text-5xl font-semibold md:text-6xl"
              style={{ color: "#ECEFF3", letterSpacing: "-0.035em", lineHeight: 1.03 }}
            >
              Your stack, connected
            </h1>
            <p
              className="mb-10 max-w-[52ch] text-lg leading-relaxed"
              style={{ color: "#A4ABB4" }}
            >
              Native connectors for the tools your business already runs on. CRMs, communication platforms, finance systems, and data sources wired into a single operating layer so your agents have full context.
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
                Browse connectors
              </Link>
            </div>
            </section>
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
                    Connectors expose explicit read/write scopes. Every action is checked by policy and approvals before execution.
                  </p>
                </div>
              </Reveal>
              <Reveal delayMs={120}>
                <MockupWindow
                  title="Connector health and scopes"
                  subtitle="connected systems / permission model"
                  rows={[
                    { label: "Gmail - read threads, write drafts", meta: "approval on send_external_email", status: "live" },
                    { label: "HubSpot - read/update leads", meta: "crm.updateRecord allowed", status: "ok" },
                    { label: "Slack - post summaries", meta: "internal channel only", status: "ok" },
                    { label: "Stripe - read customer events", meta: "refund_create blocked", status: "pending" },
                  ]}
                />
              </Reveal>
            </div>
          </section>

          {/* Category grid */}
          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Connector categories
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Built for the tools teams actually use.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {categories.map((cat) => (
                  <MktCard key={cat.label}>
                    <p
                      className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em]"
                      style={{ color: "#4A4F57" }}
                    >
                      {cat.label}
                    </p>
                    <ul className="space-y-2">
                      {cat.connectors.map((c) => (
                        <li key={c} className="flex items-center gap-2">
                          <span
                            className="h-1 w-1 rounded-full"
                            style={{ background: "rgba(77,232,225,0.55)" }}
                            aria-hidden
                          />
                          <span
                            className="font-mono text-[11px] uppercase tracking-[0.12em]"
                            style={{ color: "#6B7178" }}
                          >
                            {c}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </MktCard>
                ))}
              </div>

              {/* Webhook callout */}
              <div
                className="mt-8 rounded-xl px-6 py-5"
                style={{
                  background: "rgba(13,16,21,0.6)",
                  boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.15)",
                }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "#4DE8E1", opacity: 0.85 }}>
                  Missing a connector? Every integration is configurable via webhook. Bring any tool into your operating layer.
                </p>
              </div>
            </div>
          </section>

          <section className="relative py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Permission model
              </span>
              <h2 className="mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                OAuth-ready connector architecture with policy enforcement.
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
            heading="Connect your stack."
            sub="Deploy operators that know your tools."
            primary="Get Starter"
            primaryHref="/app/onboarding"
            secondary="Browse connectors"
            secondaryHref="/docs"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

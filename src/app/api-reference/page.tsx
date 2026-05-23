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
} from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "API Reference",
  description: "Complete REST API for Inovense. Agents, workflows, connectors, approvals, memory, and execution logs. Full programmatic control over every platform layer.",
  alternates: {
    canonical: "https://inovense.com/api-reference",
  },
  openGraph: {
    url: "https://inovense.com/api-reference",
    title: "API Reference | Inovense",
    description: "Complete REST API for Inovense. Agents, workflows, connectors, approvals, memory, and execution logs. Full programmatic control over every platform layer.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "API Reference | Inovense",
    description: "Complete REST API for Inovense. Agents, workflows, connectors, approvals, memory, and execution logs. Full programmatic control over every platform layer.",
  },
};

const apiGroups = [
  {
    title: "Workflow runs",
    basePath: "/v1/workflow-runs",
    endpoints: [
      "POST /v1/workflow-runs",
      "GET /v1/workflow-runs/:id",
      "GET /v1/workflow-runs?status=awaiting_approval",
    ],
  },
  {
    title: "Approval events",
    basePath: "/v1/approvals",
    endpoints: [
      "GET /v1/approvals",
      "POST /v1/approvals/:id/approve",
      "POST /v1/approvals/:id/skip",
    ],
  },
  {
    title: "Connector events",
    basePath: "/v1/connectors",
    endpoints: [
      "GET /v1/connectors",
      "POST /v1/connectors/:id/test",
      "POST /v1/connectors/:id/resync",
    ],
  },
  {
    title: "Webhooks",
    basePath: "/v1/webhooks",
    endpoints: [
      "POST /v1/webhooks",
      "GET /v1/webhooks",
      "DELETE /v1/webhooks/:id",
    ],
  },
];

export default function ApiReferencePage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Resources"
            heading="Programmatic control over every layer."
            description="This page covers the current API shape available in product preview. It focuses on workflow runs, approval decisions, connector events, and webhooks."
          >
            <Link
              href="/app/api-keys"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px"
              style={{
                background: "#4DE8E1",
                color: "#04130F",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)",
              }}
            >
              Open API keys
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
              Documentation hub
            </Link>
          </PageHero>

          {/* API groups */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                API surface
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Current endpoints and event model.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {apiGroups.map((group) => (
                  <MktCard key={group.title}>
                    <h3
                      className="mb-1 text-base font-semibold"
                      style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                    >
                      {group.title}
                    </h3>
                    <p
                      className="mb-4 font-mono text-xs"
                      style={{ color: "#4DE8E1" }}
                    >
                      {group.basePath}
                    </p>
                    <ul className="space-y-1.5">
                      {group.endpoints.map((ep) => (
                        <li key={ep}>
                          <code
                            className="font-mono text-xs"
                            style={{ color: "#6B7178" }}
                          >
                            {ep}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </MktCard>
                ))}
              </div>

              {/* Auth callout */}
              <div
                className="mt-8 rounded-xl px-6 py-5"
                style={{
                  background: "rgba(13,16,21,0.6)",
                  boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.15)",
                }}
              >
                <p
                  className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em]"
                  style={{ color: "#4A4F57" }}
                >
                  Authentication
                </p>
                <p className="text-sm" style={{ color: "#A4ABB4" }}>
                  All API requests require a Bearer token. Generate yours in{" "}
                  <Link
                    href="/app/api-keys"
                    className="underline underline-offset-2"
                    style={{ color: "#4DE8E1" }}
                  >
                    Settings &gt; API keys
                  </Link>
                  . Full endpoint docs will expand as the public API stabilizes.
                </p>
              </div>
            </div>
          </section>

          <PageCTA
            heading="Get your API key."
            primary="Open API settings"
            primaryHref="/app/api-keys"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

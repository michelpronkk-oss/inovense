import type { Metadata } from "next";
import type { CSSProperties } from "react";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicCta } from "@/components/home-v3/public-page-components";
import { ConnectionLayer, StorySection } from "@/components/home-v3/public-story-components";
import { ProviderLogo } from "@/components/connectors/provider-logo";
import { CONNECTOR_CATALOG, connectorCategoryLabel } from "@/lib/connectors/registry";
import RevealMount from "@/components/home-v3/reveal-mount";
import { staticOgImage } from "@/lib/static-og";

const title = "Auterim Connectors";
const description = "Explore the email, CRM, collaboration, work-management, document, and support systems currently available to connect with Auterim.";
const liveOperatorLabels: Record<string, string> = {
  revenue: "Revenue Operator",
  client_flow: "Client Flow Operator",
  operations: "Operations Operator",
  support: "Support Operator",
};

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/connectors" },
  openGraph: { url: "https://auterim.com/connectors", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/integrations")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/integrations")] },
  robots: { index: true, follow: true },
};

const available = Object.values(CONNECTOR_CATALOG).filter((connector) => connector.status === "available");

export default function ConnectorsPage() {
  const categories = [...new Set(available.map((connector) => connector.category))];
  return <PublicSiteFrame>
    <PublicHero action label="Connected systems" title="Keep the tools you trust. Add Auterim on top." description="Connect the tools you already use. Auterim combines their context and turns important signals into governed work." secondary={{ label: "Browse connectors", href: "#category-email" }} visual={<ConnectionLayer connectorCount={available.length} className="connector-hero-map" />} />
    <StorySection className="connector-catalog" label="Available to connect" title="Your stack, with a clearer next move." description="Explore the systems available today. Exact read and write capabilities depend on provider permissions and workspace setup.">
      <nav className="connector-category-nav" aria-label="Browse available connector categories">{categories.map((category) => {
        const count = available.filter((connector) => connector.category === category).length;
        return <a href={`#category-${category}`} key={category}><span>{connectorCategoryLabel({ category })}</span><small>{String(count).padStart(2, "0")}</small></a>;
      })}</nav>
      <div className="connector-categories rv">{categories.map((category) => <section className="connector-category" id={`category-${category}`} key={category}>
        <div className="connector-category-heading"><div><span className="connector-category-index">{String(categories.indexOf(category) + 1).padStart(2, "0")} / SYSTEM GROUP</span><h3>{connectorCategoryLabel({ category })}</h3></div><span className="connector-category-count">{String(available.filter((connector) => connector.category === category).length).padStart(2, "0")} available</span></div>
        <div className="connector-marketplace">{available.filter((connector) => connector.category === category).map((connector) => {
          const operators = connector.usedByOperators.map((key) => liveOperatorLabels[key]).filter(Boolean);
          return <article className="connector-entry" key={connector.connectorKey} style={{ "--connector-accent": connector.color } as CSSProperties}>
            <div className="connector-entry-top"><span className="connector-live"><i aria-hidden="true" />Available today</span><span className="connector-entry-index">{String(available.indexOf(connector) + 1).padStart(2, "0")}</span></div>
            <div className="connector-identity"><ProviderLogo connectorKey={connector.connectorKey} name={connector.displayName} fallbackLetter={connector.letter} fallbackColor={connector.color} box={52} size={31} radius={14} className="connector-provider-logo" style={{ background: "color-mix(in srgb, var(--connector-accent) 12%, #111820)", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--connector-accent) 30%, transparent)" }} /><div className="connector-identity-copy"><h4>{connector.displayName}</h4><span>{connectorCategoryLabel(connector)}</span></div></div>
            <p>{connector.description}</p>
            <div className="connector-capability-summary"><span>Access profile</span><strong>{connector.writeActions.length ? "Read + approval-gated actions" : "Read context"}</strong></div>
            <div className="connector-operator-tags" aria-label={`Compatible operators for ${connector.displayName}`}><span className="connector-operator-label">Used by</span>{operators.map((operator) => <span className="connector-operator-tag" key={operator}>{operator.replace(" Operator", "")}</span>)}</div>
            <details className="public-disclosure"><summary>Explore capabilities<span className="sr-only">: {connector.displayName}</span></summary><dl className="connector-capabilities">
              <div><dt>Read</dt><dd>{connector.readActions.join(". ") || "No read capability is currently listed."}</dd></div>
              <div><dt>Write</dt><dd>{connector.writeActions.join(". ") || "No write action is currently enabled."}</dd></div>
              <div><dt>Approval required</dt><dd>{connector.approvalRequiredActions.join(". ") || "No approval-gated write action is listed."}</dd></div>
            </dl></details>
          </article>;
        })}</div>
      </section>)}</div>
    </StorySection>
    <div className="rv"><PublicCta title="Start with the systems behind one delayed workflow." description="Tell us which tools hold the context and where the next action should land." /></div>
    <RevealMount />
  </PublicSiteFrame>;
}

import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicRows, PublicCta } from "@/components/home-v3/public-page-components";
import { CONNECTOR_CATALOG, connectorCategoryLabel } from "@/lib/connectors/registry";
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
  const rows = available.map((connector) => {
    const read = connector.readActions.length ? `Read: ${connector.readActions.join(", ")}.` : "No read capability is currently listed.";
    const writes = connector.writeActions.length ? `Write: ${connector.writeActions.join(", ")}.` : "No write action is currently enabled.";
    const approval = connector.approvalRequiredActions.length ? `Approval required for: ${connector.approvalRequiredActions.join(", ")}.` : "No approval-gated write action is listed.";
    const operators = connector.usedByOperators.map((key) => liveOperatorLabels[key]).filter(Boolean);
    return {
      kicker: connectorCategoryLabel(connector),
      title: connector.displayName,
      body: connector.description,
      bullets: [read, writes, approval, `Operators: ${operators.length ? operators.join(", ") : "Available connector; role availability depends on workspace setup."}`],
    };
  });

  return <PublicSiteFrame>
    <PublicHero label="Connected systems" title="Keep the tools you trust. Add Auterim on top." description="A connector gives an operator approved context and, where supported, a controlled way to prepare or execute work. The connected provider remains the system of record." secondary={{ label: "See available Operators", href: "/operators" }} />
    <PublicRows label="Available to connect" title="Connector → capability → Operator." rows={rows} note="Only connectors marked available in the product registry appear here. Availability does not mean a system is already connected, and provider scopes or workspace setup may limit a capability." />
    <PublicCta title="Start with the systems behind one delayed workflow." description="Tell us which tools hold the context and where the next action should land." />
  </PublicSiteFrame>;
}

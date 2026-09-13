import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicRows } from "@/components/home-v3/public-page-components";
import { staticOgImage } from "@/lib/static-og";

const title = "Auterim Documentation";
const description = "Start with Auterim Early Access, learn about Operators, connectors, policies, workflows, billing, and troubleshooting through current product guides.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/docs" },
  openGraph: { url: "https://auterim.com/docs", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/docs")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/docs")] },
  robots: { index: true, follow: true },
};

export default function DocumentationPage() {
  return <PublicSiteFrame>
    <PublicHero label="Documentation" title="A clear path through the product." description="Documentation is expanding during Early Access. These public guides describe the current product surface and link to working pages, not placeholder manuals." secondary={{ label: "Getting started", href: "/getting-started" }} />
    <PublicRows label="Product guides" title="Start with the part of Auterim you need to understand." rows={[
      { kicker: "Access", title: "Getting started", body: "How a request, invitation, workspace setup, and explicit trial start fit together.", links: [{ label: "Read the onboarding path", href: "/getting-started" }] },
      { kicker: "Roles", title: "Operators", body: "The current Revenue, Client Flow, Operations, and Support responsibilities and their boundaries.", links: [{ label: "View Operators", href: "/operators" }] },
      { kicker: "Connections", title: "Connectors", body: "Available provider connections, their read and write capabilities, and the operator roles they support.", links: [{ label: "Browse connectors", href: "/connectors" }] },
      { kicker: "Governance", title: "Policies and approvals", body: "How Auterim separates preparation, policy evaluation, approval, execution, and follow-through.", links: [{ label: "Control model", href: "/control" }, { label: "Security", href: "/security" }] },
      { kicker: "Workflow", title: "Workflows", body: "Current workflow patterns and the approval boundaries that apply to them.", links: [{ label: "Explore workflows", href: "/workflows" }] },
      { kicker: "Plans", title: "Billing and Early Access", body: "Canonical plan names and prices, plus the difference between requesting access and explicitly starting a trial.", links: [{ label: "View pricing", href: "/pricing" }] },
      { kicker: "Help", title: "Troubleshooting and support", body: "For a question about an account, connection, approval, or run, contact the Auterim team.", links: [{ label: "Contact Auterim", href: "/contact" }] },
    ]} note="This page does not claim a public API-key guide or a full self-serve documentation system. Additional guides will be added as those product surfaces are ready." />
  </PublicSiteFrame>;
}

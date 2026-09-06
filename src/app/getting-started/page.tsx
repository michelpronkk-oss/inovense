import type { Metadata } from "next";
import { appHref } from "@/lib/urls";
import { StrategicPage } from "@/components/home-v3/strategic-page";

export const metadata: Metadata = {
  title: "Getting Started: AI Workforce Preview",
  description: "Start with your company context, preview the right Auterim operators and connect systems when you are ready.",
  alternates: { canonical: "https://auterim.com/getting-started" },
  openGraph: { url: "https://auterim.com/getting-started", siteName: "Auterim", title: "Getting Started with Auterim", description: "Start with company context. Connect systems when you are ready.", type: "website", images: [{ url: "/og/og-getting-started.png", width: 1200, height: 630, alt: "Getting started with Auterim" }] },
  twitter: { card: "summary_large_image", title: "Getting Started with Auterim", description: "Start with company context. Connect systems when you are ready.", images: [{ url: "/og/og-getting-started.png", width: 1200, height: 630, alt: "Getting started with Auterim" }] },
};

export default function GettingStartedPage() { return <StrategicPage eyebrow="Start with your company" title="Start with one useful business loop, not a blank AI canvas." intro="The practical path is small by design: make the workspace context clear, connect only the system that gives the first operator useful evidence, define the approval boundary, and then review what the operator prepares." cta={{ label: "Start preview", href: appHref("/app/onboarding"), secondaryLabel: "See current operators", secondaryHref: "/operators" }} sections={[
  { label: "01 / Create the workspace", title: "Make the operating context explicit.", body: "Set the company basics, the work that needs attention first, and who owns the decisions. Missing information remains visible instead of becoming a guess.", links: [{ label: "Company context", href: "/memory" }] },
  { label: "02 / Connect one useful system", title: "Give the first operator real evidence.", body: "Connect Gmail or Microsoft 365 for communication context, Trello for internal work, or the CRM context relevant to revenue. Connections stay scoped to the role you are setting up.", links: [{ label: "Current integrations", href: "/integrations" }] },
  { label: "03 / Choose the first operator", title: "Start from the job that is already getting delayed.", body: "Revenue handles prepared follow-up, Client Flow prepares communication and handoffs, and Operations finds stalled Trello work. Each role has a different connector requirement and boundary.", links: [{ label: "Available operators", href: "/operators" }, { label: "Use cases", href: "/use-cases" }] },
  { label: "04 / Define control, then activate", title: "Keep consequential work with the right owner.", body: "Set what must be approved, activate the operator only when required setup is ready, and use the resulting approvals and logs to review what changed.", links: [{ label: "Approval model", href: "/approvals" }, { label: "Controlled workflows", href: "/workflows" }] },
]} />; }

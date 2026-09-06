import type { Metadata } from "next";
import { appHref } from "@/lib/urls";
import { StrategicPage } from "@/components/home-v3/strategic-page";

export const metadata: Metadata = {
  title: "AI Workforce Use Cases",
  description: "See how Auterim operators prepare and coordinate revenue, client, operations, marketing and recurring business work.",
  alternates: { canonical: "https://auterim.com/use-cases" },
  openGraph: { url: "https://auterim.com/use-cases", siteName: "Auterim", title: "AI Workforce Use Cases | Auterim", description: "See how Auterim operators prepare and coordinate real business work.", type: "website", images: [{ url: "/og/og-use-cases.png", width: 1200, height: 630, alt: "Auterim AI workforce use cases" }] },
  twitter: { card: "summary_large_image", title: "AI Workforce Use Cases | Auterim", description: "See how Auterim operators prepare and coordinate real business work.", images: [{ url: "/og/og-use-cases.png", width: 1200, height: 630, alt: "Auterim AI workforce use cases" }] },
};

export default function UseCasesPage() { return <StrategicPage eyebrow="Where work moves" title="Put a defined operator around the business loop that keeps getting delayed." intro="These are the current operational patterns Auterim can support today. Each begins with approved context, prepares one next step, and keeps the final decision visible to the person accountable for it." cta={{ label: "Start preview", href: appHref("/app/onboarding"), secondaryLabel: "Meet the operators", secondaryHref: "/operators" }} sections={[
  { label: "Revenue · Available today", title: "Keep qualified follow-up from going quiet.", body: "Auterim reads approved email and CRM context, prepares a follow-up, then routes the external send or HubSpot update for approval. Salesforce adds read context; it does not write records today.", links: [{ label: "Revenue teams", href: "/solutions/revenue-teams" }, { label: "Current integrations", href: "/integrations" }] },
  { label: "Client flow · Available today", title: "Make the next client handoff prepared.", body: "Auterim turns approved client context into a draft update, onboarding summary, or handoff checklist. Client-facing messages remain under the approval policy you define.", links: [{ label: "Client services", href: "/solutions/client-services" }, { label: "Approval model", href: "/approvals" }] },
  { label: "Operations · Available today", title: "Surface the blocked work before it becomes a delay.", body: "Auterim monitors Trello work for stalled, overdue, or blocked cards and prepares an internal escalation, card action, or update for approval.", links: [{ label: "Operations", href: "/solutions/operations" }, { label: "Controlled workflows", href: "/workflows" }] },
  { label: "Marketing · Expanding workforce", title: "Keep campaign work ready for a controlled handoff.", body: "Marketing is an expanding role in the workforce. It is not presented as current production automation; the registry makes the planned scope and control boundary explicit.", links: [{ label: "Marketing direction", href: "/solutions/marketing" }, { label: "Operator registry", href: "/operators" }] },
  { label: "Founder operations · Expanding workforce", title: "Give a lean team a clearer operating picture.", body: "Founder operations describes where the workforce can grow. Today, teams begin with the available Revenue, Client Flow, or Operations Operator that matches the work at hand.", links: [{ label: "Founders and operations", href: "/solutions/founders-ops" }, { label: "Available operators", href: "/operators" }] },
  { label: "The boundary", title: "Prepared does not mean uncontrolled.", body: "Auterim separates preparation from execution. Operators work automatically inside your rules, pause where judgment matters and leave a record of what happened.", links: [{ label: "Security", href: "/security" }, { label: "Architecture", href: "/architecture" }] },
]} />; }

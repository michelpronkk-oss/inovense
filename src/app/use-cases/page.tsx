import type { Metadata } from "next";
import { appHref } from "@/lib/urls";
import { StrategicPage } from "@/components/home-v3/strategic-page";

export const metadata: Metadata = {
  title: "AI Workforce Use Cases | Auterim",
  description: "See how Auterim operators prepare and coordinate revenue, client, operations, marketing and recurring business work.",
  alternates: { canonical: "https://auterim.com/use-cases" },
  openGraph: { url: "https://auterim.com/use-cases", siteName: "Auterim", title: "AI Workforce Use Cases | Auterim", description: "See how Auterim operators prepare and coordinate real business work.", type: "website", images: [{ url: "/og/og-use-cases.png", width: 1200, height: 630, alt: "Auterim AI workforce use cases" }] },
  twitter: { card: "summary_large_image", title: "AI Workforce Use Cases | Auterim", description: "See how Auterim operators prepare and coordinate real business work.", images: [{ url: "/og/og-use-cases.png", width: 1200, height: 630, alt: "Auterim AI workforce use cases" }] },
};

export default function UseCasesPage() { return <StrategicPage eyebrow="Where work moves" title="Put the right operator around the work that keeps getting delayed." intro="Auterim finds repeatable work across your business, recommends the right role and gives it the context, tools and boundaries to prepare the next step." cta={{ label: "Start preview", href: appHref("/app/onboarding"), secondaryLabel: "Meet the operators", secondaryHref: "/operators" }} sections={[
  { label: "Revenue", title: "Keep every qualified lead moving.", body: "Revenue Operators qualify inbound demand, prepare relevant follow-up and keep CRM next steps current. Messages and deal-stage changes wait at the policy boundary you set.", links: [{ label: "Revenue teams", href: "/solutions/revenue-teams" }, { label: "Approvals", href: "/approvals" }] },
  { label: "Client flow", title: "Make onboarding a prepared handoff.", body: "Client Flow Operators gather details, build the next checklist and keep the team aligned across inbox, calendar and project tools.", links: [{ label: "Client services", href: "/solutions/client-services" }, { label: "Workflows", href: "/workflows" }] },
  { label: "Operations", title: "Surface the work that quietly stalls.", body: "Operations Operators watch recurring work, blockers and pending decisions, then prepare the brief or update needed to move it forward.", links: [{ label: "Operations", href: "/solutions/operations" }, { label: "Company memory", href: "/memory" }] },
  { label: "Marketing", title: "Turn campaign intent into coordinated work.", body: "Marketing Operators prepare briefs, content drafts and campaign next steps from your approved context, with publishing and spend kept behind a gate.", links: [{ label: "Marketing", href: "/solutions/marketing" }, { label: "Operators", href: "/operators" }] },
  { label: "Founder operations", title: "Give a lean team more operating range.", body: "Founders can start with one operator that understands the company, handles a defined loop and shows exactly what is ready for a decision.", links: [{ label: "Founders' ops", href: "/solutions/founders-ops" }, { label: "Pricing", href: "/pricing" }] },
  { label: "The boundary", title: "Prepared does not mean uncontrolled.", body: "Auterim separates preparation from execution. Operators work automatically inside your rules, pause where judgment matters and leave a record of what happened.", links: [{ label: "Security", href: "/security" }, { label: "Architecture", href: "/architecture" }] },
]} />; }

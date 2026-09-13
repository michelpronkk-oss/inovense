import type { Metadata } from "next";
import { StrategicPage } from "@/components/home-v3/strategic-page";
import { UseCasesHeroVisual } from "@/components/home-v3/page-specific-hero-visuals";
import { staticOgImage } from "@/lib/static-og";

const title = "Business AI Operator Use Cases";
const description = "See how Auterim operators prepare revenue follow-up, client handoffs, operations work, and support follow-through within clear approval boundaries.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://auterim.com/use-cases" },
  openGraph: { url: "https://auterim.com/use-cases", siteName: "Auterim", title: `${title} | Auterim`, description, type: "website", images: [staticOgImage("/use-cases")] },
  twitter: { card: "summary_large_image", title: `${title} | Auterim`, description, images: [staticOgImage("/use-cases")] },
  robots: { index: true, follow: true },
};

export default function UseCasesPage() {
  return <StrategicPage
    eyebrow="Where work moves"
    title="Useful work, prepared before the next handoff slips."
    intro="Auterim watches approved business context for signals that need attention. Operators prepare a specific next step, keep external actions behind the right approval, and record what happened."
    visual={<UseCasesHeroVisual />}
    cta={{ label: "Request early access", href: "#request", secondaryLabel: "Meet the operators", secondaryHref: "/operators" }}
    sections={[
      { label: "Revenue · available today", title: "Keep qualified interest moving.", body: "The Revenue Operator works from connected email and CRM context to surface pricing intent, stalled opportunities, proposal follow-up, competitor evaluation, and renewal or expansion signals.", scenario: { problem: "A buyer asks about pricing. The next reply waits while context sits across email and CRM.", signal: "Pricing intent in the connected conversation.", next: "A relevant follow-up draft, ready for review before it is sent.", outcome: "The deal owner has a clear next move." }, links: [{ label: "Revenue operator", href: "/operators" }, { label: "Revenue teams", href: "/solutions/revenue-teams" }] },
      { label: "Client Flow · available today", title: "Make the next handoff easier to carry.", body: "The Client Flow Operator prepares onboarding summaries, delivery coordination, handoff notes, and client follow-up from the context your workspace connects. Client-facing communication follows your approval policy.", scenario: { problem: "A client is ready to move forward, but open onboarding items have no clear handoff.", signal: "Missing steps and unanswered follow-up in connected context.", next: "A handoff checklist and a prepared update for the owner.", outcome: "The team can see what remains and who should act." }, links: [{ label: "Client services", href: "/solutions/client-services" }, { label: "Approval model", href: "/approvals" }] },
      { label: "Operations · available today", title: "Find the blocker before it travels.", body: "The Operations Operator watches connected work for blocked tasks, overdue items, delivery risk, project health changes, and cross-system issues. It prepares a focused update or escalation for the assigned owner.", scenario: { problem: "An overdue Trello card starts to hold up the work around it.", signal: "A stalled task and the available context around its blocker.", next: "A focused update or escalation, subject to approval policy.", outcome: "The assigned owner has the context to move the task." }, links: [{ label: "Operations", href: "/solutions/operations" }, { label: "Controlled workflows", href: "/workflows" }] },
      { label: "Support · available today", title: "Keep an unresolved issue in view.", body: "The Support Operator helps surface escalations, unresolved ticket risk, SLA pressure, and customer issue follow-through. Replies and ticket changes remain subject to the connected systems and workspace policy.", scenario: { problem: "A customer issue remains open while the service target gets closer.", signal: "Unresolved ticket risk or an escalation signal.", next: "A bounded reply or escalation summary for review.", outcome: "The support owner can take the next step with the issue in context." }, links: [{ label: "Operator registry", href: "/operators" }, { label: "Connectors", href: "/connectors" }] },
    ]}
  />;
}

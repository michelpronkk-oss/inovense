import type { Metadata } from "next";
import { StrategicPage } from "@/components/home-v3/strategic-page";
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
    cta={{ label: "Request early access", href: "#request", secondaryLabel: "Meet the operators", secondaryHref: "/operators" }}
    sections={[
      { label: "Revenue · available today", title: "Keep qualified interest moving.", body: "The Revenue Operator works from connected email and CRM context to surface pricing intent, stalled opportunities, proposal follow-up, competitor evaluation, and renewal or expansion signals.", links: [{ label: "Revenue operator", href: "/operators" }, { label: "Revenue teams", href: "/solutions/revenue-teams" }] },
      { label: "Client Flow · available today", title: "Make onboarding and handoffs easier to carry.", body: "The Client Flow Operator prepares onboarding summaries, delivery coordination, handoff notes, and client follow-up from the context your workspace connects. Client-facing communication follows your approval policy.", links: [{ label: "Client services", href: "/solutions/client-services" }, { label: "Approval model", href: "/approvals" }] },
      { label: "Operations · available today", title: "Find blocked work while there is still time to move it.", body: "The Operations Operator watches connected work for blocked tasks, overdue items, delivery risk, project health changes, and cross-system issues. It prepares a focused update or escalation for the assigned owner.", links: [{ label: "Operations", href: "/solutions/operations" }, { label: "Controlled workflows", href: "/workflows" }] },
      { label: "Support · available today", title: "Keep unresolved customer issues from going quiet.", body: "The Support Operator helps surface escalations, unresolved ticket risk, SLA pressure, and customer issue follow-through. Replies and ticket changes remain subject to the connected systems and workspace policy.", links: [{ label: "Operator registry", href: "/operators" }, { label: "Connectors", href: "/connectors" }] },
    ]}
  />;
}

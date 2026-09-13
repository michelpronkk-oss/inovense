import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicRows, PublicCta } from "@/components/home-v3/public-page-components";
import { staticOgImage } from "@/lib/static-og";

const title = "How Auterim Works";
const description = "See how Auterim connects business systems, finds work that needs attention, prepares a controlled next move, and measures the outcome.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/how-it-works" },
  openGraph: { url: "https://auterim.com/how-it-works", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/")] },
  robots: { index: true, follow: true },
};

const loop = [
  { title: "Connect the tools your business already uses.", body: "Auterim sits on top of connected systems. Those systems remain the systems of record; the operator only receives the context and capabilities granted to it." },
  { title: "Notice a signal that needs attention.", body: "Operators watch approved context in a defined area of work, such as an open deal, a client handoff, a blocked task, or an unresolved support issue." },
  { title: "Understand the surrounding work.", body: "The operator gathers relevant connected context and workspace rules. Missing evidence stays missing rather than being treated as fact." },
  { title: "Prioritize the next move.", body: "Auterim routes a problem to one primary operator owner so responsibility stays clear, even when the work touches more than one system." },
  { title: "Prepare a specific action.", body: "The operator prepares a draft, update, checklist, or internal next step that can be reviewed in context." },
  { title: "Check the action against policy.", body: "Workspace rules determine whether a step can run, needs an approval, or must stop. The policy boundary applies before execution." },
  { title: "Ask for approval when required.", body: "External communication and other sensitive actions can pause for a named person to review. Preparation does not itself send a message or change a provider record." },
  { title: "Execute only within the boundary.", body: "Actions permitted by the workspace may run through the connected provider. Provider permissions and availability still apply." },
  { title: "Follow through and observe evidence.", body: "An executed action is not the same as a resolved business outcome. Auterim looks for available follow-through signals and keeps their evidence distinguishable from assumptions." },
  { title: "Measure what changed.", body: "Runs and outcomes can be reviewed together. Attribution stays conservative where connected systems do not provide reliable evidence of cause." },
];

export default function HowItWorksPage() {
  return <PublicSiteFrame>
    <PublicHero label="The operating loop" title="Auterim finds the work before your team has to." description="Connect the tools your business already uses. Auterim watches what matters, prepares the next move, and acts under your rules." secondary={{ label: "Meet the Operators", href: "/operators" }} />
    <PublicRows label="From context to outcome" title="A controlled operating loop, not a generic automation flow." rows={loop.map((step) => ({ ...step, kicker: "Auterim cycle" }))} />
    <PublicCta title="Start with the work your team keeps chasing." description="Tell us what should move first. Early Access requests are reviewed before workspace invitations are sent." />
  </PublicSiteFrame>;
}

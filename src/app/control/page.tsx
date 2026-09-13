import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicRows, PublicCta } from "@/components/home-v3/public-page-components";
import { staticOgImage } from "@/lib/static-og";

const title = "Control and Governance for AI Operators";
const description = "See how Auterim uses workspace policies, approvals, permissions, ownership, and activity records to keep operator actions within defined boundaries.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/control" },
  openGraph: { url: "https://auterim.com/control", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/security")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/security")] },
  robots: { index: true, follow: true },
};

const controls = [
  { title: "Policies decide the execution path.", body: "Each proposed action is evaluated against workspace policy. A permitted action can continue, a gated action pauses for approval, and a blocked action stops." },
  { title: "One primary owner keeps work accountable.", body: "Operators have defined responsibilities. When a problem spans several systems, Auterim routes it to one primary operator owner and keeps the next decision visible." },
  { title: "Approval gates protect consequential actions.", body: "External messages and selected provider writes can require explicit approval. An approval decision is tied to the action that is waiting to proceed." },
  { title: "Permissions stay bounded by the connected provider.", body: "OAuth scopes and connector capabilities limit what an operator can read or do. Your provider may require additional consent for specific scopes." },
  { title: "Activity remains reviewable.", body: "Auterim records operator runs, policy decisions, approvals, and execution results for workspace review. The record reflects what the product observed, not a guarantee that a business outcome followed." },
  { title: "Retry behavior is scoped to the action.", body: "Idempotency and deduplication controls are used where the workflow and provider support them. External systems can return an ambiguous result, so exactly-once execution cannot be promised for every action." },
  { title: "Outcome attribution stays conservative.", body: "A completed action is evidence that a step ran. Auterim does not treat that alone as proof that revenue, resolution, or another business result was caused by the action." },
];

export default function ControlPage() {
  return <PublicSiteFrame>
    <PublicHero label="Governance" title="Your rules come first." description="Auterim can move work only inside the boundaries your workspace defines. The product makes the path to approval, execution, or a stop visible before consequential work continues." secondary={{ label: "Security details", href: "/security" }} />
    <PublicRows label="Control model" title="Every next step has an owner and a boundary." rows={controls.map((item) => ({ ...item, kicker: "Policy and execution" }))} note="Control depends on configured policies, connected-provider permissions, and the specific action. The product does not guarantee that every provider outcome is reversible or unambiguous." />
    <PublicCta title="See where your work needs a gate." description="Describe a real workflow and the decisions you want to keep with your team." />
  </PublicSiteFrame>;
}

import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { PageShell, PageHero, MktCard, SectionDivider, PageCTA, StepRow } from "@/components/marketing-ui";
import { staticOgImage } from "@/lib/static-og";

const title = "AI Approval Workflows & Human Control | Auterim";
const description = "Auterim uses policy-driven AI approval workflows so operators can prepare work automatically while consequential actions stay visible to the right person.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://auterim.com/approvals" },
  openGraph: { url: "https://auterim.com/approvals", title, description, type: "website", siteName: "Auterim", images: [staticOgImage("/approvals")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/approvals")] },
};

const steps = [
  { number: "01", title: "Prepare", description: "The operator assembles the proposed action and the approved context that makes it reviewable." },
  { number: "02", title: "Review", description: "When policy requires it, the accountable person can approve or reject the specific action." },
  { number: "03", title: "Execute and log", description: "Approved work continues within its scope and the decision becomes part of the activity record." },
];

const principles = [
  { title: "Policy-driven, not blanket manual work", description: "Not every action requires approval. Low-risk work can continue where policy allows; consequential work can pause at a meaningful decision boundary." },
  { title: "Human-in-the-loop AI where judgment matters", description: "Human-in-the-loop AI does not make someone operate every step. It brings the right person into the decision that changes the outside world." },
  { title: "A reviewable decision, not a vague handoff", description: "The review is about a prepared action with visible context, rather than a generic request to trust an operator." },
  { title: "A record after the decision", description: "Approval and execution context remain visible in the product so work can be understood after it moves." },
];

const examples = [
  "An external follow-up email prepared from approved business context.",
  "A supported HubSpot CRM update prepared by Revenue Operator.",
  "A Trello card action prepared from a blocked or stalled-work signal.",
  "An internal Slack escalation where the configured policy requires review.",
];

const related = [["See how operators work", "/operators"], ["Explore controlled workflows", "/workflows"], ["Revenue follow-up", "/solutions/revenue-teams"], ["Operations monitoring", "/solutions/operations"], ["Security", "/security"], ["Trust center", "/trust"]] as const;

export default function ApprovalsPage() {
  return <><Nav /><main><PageShell>
    <PageHero eyebrow="Execution control" heading="Let AI prepare consequential work. Keep the decision visible." description="Auterim uses AI approval workflows to separate preparation from execution. Operators can continue low-risk work within policy while actions that need judgment pause for the person accountable for the decision." mobileHeading="Prepared by AI. Decided by you." mobileDescription="Use approval boundaries where judgment matters, without turning every step into manual work.">
      <Link href="/operators" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px" style={{ background: "#4DE8E1", color: "#04130F", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)" }}>See how operators stay controlled</Link>
      <Link href="/workflows" className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors" style={{ background: "rgba(255,255,255,0.03)", color: "#ECEFF3", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>Explore controlled workflows</Link>
    </PageHero>

    <section className="relative py-12 md:py-20"><SectionDivider /><div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16"><span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>The approval loop</span><h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>Prepare, review, approve or reject, execute, log.</h2><StepRow steps={steps} /></div></section>

    <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}><SectionDivider /><div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16"><span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Decision boundaries</span><h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>Control that keeps useful work moving.</h2><div className="grid gap-5 sm:grid-cols-2">{principles.map((item) => <MktCard key={item.title}><h3 className="mb-2 text-base font-semibold" style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}>{item.title}</h3><p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>{item.description}</p></MktCard>)}</div></div><SectionDivider /></section>

    <section className="relative py-12 md:py-20"><SectionDivider /><div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16"><span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Examples in the current product</span><h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>Where an approval boundary can belong.</h2><div className="grid gap-5 sm:grid-cols-2">{examples.map((item) => <MktCard key={item}><p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>{item}</p></MktCard>)}</div><div className="mt-8 flex flex-wrap gap-x-5 gap-y-3">{related.map(([label, href]) => <Link key={href} href={href} className="text-sm font-medium" style={{ color: "#4DE8E1" }}>{label} →</Link>)}</div></div><SectionDivider /></section>

    <PageCTA heading="Explore approval-driven execution." sub="Start with one controlled business loop, then decide which actions need review and which can move within policy." primary="Start a controlled operator" primaryHref="/app/onboarding" secondary="Meet the operators" secondaryHref="/operators" />
  </PageShell></main><Footer /></>;
}

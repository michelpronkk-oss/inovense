import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { PageShell, PageHero, MktCard, SectionDivider, PageCTA, StepRow } from "@/components/marketing-ui";
import { staticOgImage } from "@/lib/static-og";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";

const title = "AI Operations Monitoring for Blocked Work | Auterim";
const description = "Auterim monitors blocked, overdue, due-soon, and stalled Trello work, then prepares controlled internal next steps with optional Slack visibility.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://auterim.com/solutions/operations" },
  openGraph: { url: "https://auterim.com/solutions/operations", title, description, type: "website", siteName: "Auterim", images: [staticOgImage("/solutions/operations")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/solutions/operations")] },
};

const capabilities = [
  { title: "See the work that slips through", description: "Operations Operator reads Trello board and card context for blocked, overdue, due-soon, stalled, checklist, and ownership signals." },
  { title: "Focus attention on a useful signal", description: "The operator turns an issue in the work into a specific internal next step instead of sending a generic activity summary." },
  { title: "Prepare a controlled response", description: "It can prepare a card action, internal update, or escalation with the context needed by the next owner." },
  { title: "Keep internal action visible", description: "Policy can require approval before a Trello change or Slack message. Slack is an optional enhancement for internal visibility." },
];

const steps = [
  { number: "01", title: "Detect a Trello signal", description: "A card becomes blocked, overdue, due soon, stale, incomplete, or unclear in ownership." },
  { number: "02", title: "Prepare the next step", description: "Operations Operator evaluates the business importance of the signal and prepares the most useful internal follow-through." },
  { number: "03", title: "Apply the policy and log", description: "A Trello change or optional Slack notification proceeds only within its approval boundary, leaving a reviewable record." },
];

const setup = [
  { label: "Recommended operator", value: "Operations Operator" },
  { label: "Current systems", value: "Trello for work context. Slack can add approval-gated internal channel visibility." },
  { label: "Control boundary", value: "Card actions and Slack messages can be prepared for approval before they are carried out." },
  { label: "Business outcome", value: "Blocked and stalled work is surfaced with a named next step before it becomes a delivery delay." },
];

const related = [["Meet Operations Operator", "/operators"], ["See current integrations", "/integrations"], ["Explore approval boundaries", "/approvals"], ["See controlled workflows", "/workflows"], ["View pricing", "/pricing"]] as const;

export default function OperationsPage() {
  return <><BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Operations", path: "/solutions/operations" }]} /><Nav /><main><PageShell>
    <PageHero eyebrow="Operations" heading="Surface blocked work before it turns into a delivery delay." description="Auterim provides focused AI operations monitoring for Trello work: it finds blocked, overdue, and stalled signals, prepares the next internal action, and applies the approval boundary your team defines." mobileHeading="Blocked work, made visible" mobileDescription="Use Trello signals to prepare a clear next step before a delivery delay spreads.">
      <Link href="/operators" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px" style={{ background: "#4DE8E1", color: "#04130F", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)" }}>Explore Operations Operator</Link>
      <Link href="/workflows" className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors" style={{ background: "rgba(255,255,255,0.03)", color: "#ECEFF3", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>See controlled workflows</Link>
    </PageHero>

    <section className="relative py-12 md:py-20"><SectionDivider /><div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16"><span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>What the operator monitors</span><h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>Work signals that deserve a real next action.</h2><div className="grid gap-5 sm:grid-cols-2">{capabilities.map((item) => <MktCard key={item.title}><h3 className="mb-2 text-base font-semibold" style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}>{item.title}</h3><p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>{item.description}</p></MktCard>)}</div></div></section>

    <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}><SectionDivider /><div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16"><span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Blocked-work workflow</span><h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>Detect, evaluate, prepare, control, record.</h2><StepRow steps={steps} /></div><SectionDivider /></section>

    <section className="relative py-12 md:py-20"><SectionDivider /><div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16"><span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Current scope</span><h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>Start from the project signals your team already trusts.</h2><div className="grid gap-5 sm:grid-cols-2">{setup.map((item) => <MktCard key={item.label}><p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>{item.label}</p><p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>{item.value}</p></MktCard>)}</div><div className="mt-8 flex flex-wrap gap-x-5 gap-y-3">{related.map(([label, href]) => <Link key={href} href={href} className="text-sm font-medium" style={{ color: "#4DE8E1" }}>{label} →</Link>)}</div></div><SectionDivider /></section>

    <PageCTA heading="Start with the Operations Operator." sub="Connect Trello, define the approval boundary, and turn blocked work into a controlled internal next step." primary="Start with Operations Operator" primaryHref="/app/onboarding" secondary="Explore approval-driven execution" secondaryHref="/approvals" />
  </PageShell></main><Footer /></>;
}

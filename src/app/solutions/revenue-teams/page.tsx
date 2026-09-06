import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { PageShell, PageHero, MktCard, SectionDivider, PageCTA, StepRow } from "@/components/marketing-ui";
import { staticOgImage } from "@/lib/static-og";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";

const title = "AI Sales Follow-Up Automation | Auterim";
const description = "Auterim prepares sales follow-up from inbound email and connected CRM context, then keeps external sends and supported CRM changes under approval.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://auterim.com/solutions/revenue-teams" },
  openGraph: { url: "https://auterim.com/solutions/revenue-teams", title, description, type: "website", siteName: "Auterim", images: [staticOgImage("/solutions/revenue-teams")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/solutions/revenue-teams")] },
};

const capabilities = [
  { title: "Detect inbound commercial signals", description: "Revenue Operator starts from relevant email conversations so qualified interest does not disappear between an inbox and a next step." },
  { title: "Add the context that is available", description: "Gmail or Microsoft 365 provides communication context. HubSpot can add CRM context and approval-gated updates; Salesforce adds read context only." },
  { title: "Prepare the follow-up", description: "The operator prepares a follow-up draft and the next commercial action from the approved context, ready for the accountable owner." },
  { title: "Keep consequential work reviewable", description: "External sends and supported HubSpot changes wait for approval. Salesforce writes are not enabled." },
];

const steps = [
  { number: "01", title: "Find the signal", description: "An inbound commercial conversation provides the starting context for a focused follow-up." },
  { number: "02", title: "Prepare the next action", description: "The operator combines the email thread with available CRM context and prepares the draft or supported CRM work." },
  { number: "03", title: "Approve, act, and record", description: "A policy can pause an external send or supported CRM change for review before the controlled action and its outcome are logged." },
];

const setup = [
  { label: "Recommended operator", value: "Revenue Operator" },
  { label: "Current systems", value: "Gmail or Microsoft 365; HubSpot for supported approval-gated CRM updates; Salesforce for read context." },
  { label: "Control boundary", value: "External email and supported HubSpot changes remain reviewable. Salesforce does not write records." },
  { label: "Business outcome", value: "A clearer, prepared path from qualified inbound interest to the next accountable action." },
];

const related = [["Meet Revenue Operator", "/operators"], ["See current integrations", "/integrations"], ["Explore approval boundaries", "/approvals"], ["See controlled workflows", "/workflows"], ["View pricing", "/pricing"]] as const;

export default function RevenuePage() {
  return <><BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Revenue teams", path: "/solutions/revenue-teams" }]} /><Nav /><main><PageShell>
    <PageHero eyebrow="Revenue teams" heading="AI sales follow-up that keeps qualified interest moving." description="Auterim monitors inbound commercial conversations, adds available email and CRM context, prepares the next follow-up, and keeps consequential external action under the approval boundary your team sets." mobileHeading="Prepared sales follow-up, under control" mobileDescription="Start from inbound commercial context, prepare the right next step, and review external action before it happens.">
      <Link href="/operators" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px" style={{ background: "#4DE8E1", color: "#04130F", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)" }}>Explore Revenue Operator</Link>
      <Link href="/integrations" className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors" style={{ background: "rgba(255,255,255,0.03)", color: "#ECEFF3", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>See current systems</Link>
    </PageHero>

    <section className="relative py-12 md:py-20"><SectionDivider /><div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16"><span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>The operating loop</span><h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>From an inbound opportunity to a controlled next step.</h2><div className="grid gap-5 sm:grid-cols-2">{capabilities.map((item) => <MktCard key={item.title}><h3 className="mb-2 text-base font-semibold" style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}>{item.title}</h3><p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>{item.description}</p></MktCard>)}</div></div></section>

    <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}><SectionDivider /><div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16"><span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Inbound opportunity workflow</span><h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>Signal, context, preparation, approval, action, record.</h2><StepRow steps={steps} /></div><SectionDivider /></section>

    <section className="relative py-12 md:py-20"><SectionDivider /><div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16"><span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Current scope</span><h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>Start with the systems that make follow-up specific.</h2><div className="grid gap-5 sm:grid-cols-2">{setup.map((item) => <MktCard key={item.label}><p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>{item.label}</p><p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>{item.value}</p></MktCard>)}</div><div className="mt-8 flex flex-wrap gap-x-5 gap-y-3">{related.map(([label, href]) => <Link key={href} href={href} className="text-sm font-medium" style={{ color: "#4DE8E1" }}>{label} →</Link>)}</div></div><SectionDivider /></section>

    <PageCTA heading="Start with the Revenue Operator." sub="Connect the context that matters, define the approval boundary, and review the next commercial action before it leaves your business." primary="Start with Revenue Operator" primaryHref="/app/onboarding" secondary="Explore approval-driven execution" secondaryHref="/approvals" />
  </PageShell></main><Footer /></>;
}

import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  PageShell,
  PageHero,
  MktCard,
  SectionDivider,
  PageCTA,
  StepRow,
} from "@/components/marketing-ui";
import { staticOgImage } from "@/lib/static-og";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";

export const metadata: Metadata = {
  title: "AI Operators for Revenue Teams",
  description: "Prepare lead follow-up, keep CRM context current and surface stalled deals with AI operators that work within your revenue policies.",
  alternates: {
    canonical: "https://auterim.com/solutions/revenue-teams",
  },
  openGraph: {
    url: "https://auterim.com/solutions/revenue-teams",
    title: "AI Operators for Revenue Teams | Auterim",
    description: "Prepare lead follow-up, keep CRM context current and surface stalled deals with AI operators that work within your revenue policies.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/solutions/revenue-teams")],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Operators for Revenue Teams | Auterim",
    description: "Prepare lead follow-up, keep CRM context current and surface stalled deals with AI operators that work within your revenue policies.",
    images: [staticOgImage("/solutions/revenue-teams")],
  },
};

const useCases = [
  {
    title: "Pipeline management",
    description: "Operator monitors your CRM, surfaces stalled deals, and keeps pipeline data current without manual updates.",
  },
  {
    title: "Lead follow-up sequencing",
    description: "Every inbound lead gets a structured follow-up sequence. No manual triggers, no leads left without contact.",
  },
  {
    title: "Deal intelligence",
    description: "Operator aggregates signals across email, CRM activity, and notes to surface deal health before a rep has to ask.",
  },
  {
    title: "CRM hygiene automation",
    description: "Prepares contact and deal updates from approved context, with HubSpot changes held behind approval.",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect the context that matters",
    description: "Connect Gmail or Microsoft 365 for follow-up context. Add HubSpot for approval-gated CRM updates or Salesforce for read context.",
  },
  {
    number: "02",
    title: "Deploy Revenue Operator",
    description: "Define which external sends and HubSpot changes require a named approver before they are carried out.",
  },
  {
    number: "03",
    title: "Review the prepared next step",
    description: "The operator prepares follow-up and relevant CRM work from approved context. You retain the final decision on external communication and record changes.",
  },
];

const blueprint = [
  { label: "Recommended operator", value: "Revenue Operator" },
  { label: "Start with", value: "Gmail or Microsoft 365. HubSpot adds approval-gated CRM updates; Salesforce adds read context." },
  { label: "Approval rules", value: "External outbound email and pricing communications require approval." },
  { label: "Expected outcome", value: "Faster lead response, cleaner CRM updates, and consistent follow-up execution." },
];

export default function RevenuePage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Revenue teams", path: "/solutions/revenue-teams" }]} />
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Solutions"
            heading="Revenue teams that run without manual coordination."
            description="Prepare lead follow-up from approved email and CRM context, then route the external action through the approval boundary your team sets."
            mobileHeading="Revenue work without manual coordination"
            mobileDescription="Operators manage follow-ups, pipeline signals and deal intelligence so no lead goes quiet."
          >
            <Link
              href="/app/onboarding"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px"
              style={{
                background: "#4DE8E1",
                color: "#04130F",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)",
              }}
            >
              Get Starter
            </Link>
            <Link
              href="/agents"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              See agents
            </Link>
          </PageHero>

          {/* Use cases */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Where revenue teams use Auterim
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Four functions. One operator layer.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {useCases.map((uc) => (
                  <MktCard key={uc.title}>
                    <h3
                      className="mb-2 text-base font-semibold"
                      style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                    >
                      {uc.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                      {uc.description}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                How it works
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                From connection to execution in three steps.
              </h2>
              <StepRow steps={steps} />
            </div>
            <SectionDivider />
          </section>

          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Implementation blueprint
              </span>
              <h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                Recommended setup for revenue teams.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {blueprint.map((item) => (
                  <MktCard key={item.label}>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>{item.label}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>{item.value}</p>
                  </MktCard>
                ))}
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Deploy your Revenue Operator today."
            sub="Connect CRM, email, and Slack. Run follow-ups with approval-first execution."
            primary="Get Starter"
            primaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

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

export const metadata: Metadata = {
  title: "Founders & Ops",
  description: "AI operators for founders running lean. Business intelligence, communications management, hiring workflow, and finance monitoring without an ops hire.",
  alternates: {
    canonical: "https://inovense.com/solutions/founders-ops",
  },
  openGraph: {
    url: "https://inovense.com/solutions/founders-ops",
    title: "Founders & Ops | Auterim",
    description: "AI operators for founders running lean. Business intelligence, communications management, hiring workflow, and finance monitoring without an ops hire.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Founders & Ops | Auterim",
    description: "AI operators for founders running lean. Business intelligence, communications management, hiring workflow, and finance monitoring without an ops hire.",
  },
};

const useCases = [
  {
    title: "Business intelligence",
    description: "Operator pulls data from your tools and surfaces a weekly business summary. Revenue, pipeline, and operational signals in one view.",
  },
  {
    title: "Email and comms management",
    description: "Operator triages inbound, drafts responses to common request types, and surfaces what needs your direct attention.",
  },
  {
    title: "Hiring workflow",
    description: "From job post to first interview scheduled. Operator manages candidate communications and surfaces qualified applicants for your review.",
  },
  {
    title: "Finance monitoring",
    description: "Expense review, invoice matching, and payment alerts run automatically. No manual reconciliation at month end.",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect your tools",
    description: "Link your email, CRM, finance, and data sources. The operator builds a view of your business in hours.",
  },
  {
    number: "02",
    title: "Define what matters",
    description: "Set the policies. Define what needs your attention and what the operator can handle autonomously.",
  },
  {
    number: "03",
    title: "Run lean",
    description: "Operators handle the coordination work. You focus on the decisions that only you can make.",
  },
];

const blueprint = [
  { label: "Recommended operator", value: "Revenue Operator plus Operations Operator baseline" },
  { label: "Required connectors", value: "Gmail or Outlook, CRM, Slack, docs connector, finance events" },
  { label: "Approval rules", value: "External sends, pricing updates, and high-risk actions require approval." },
  { label: "Expected outcome", value: "One operating layer across leads, clients, approvals, and weekly execution." },
];

export default function FoundersOpsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Solutions"
            heading="Move faster than a team twice your size."
            description="For founders running lean. Deploy operators that handle the work you would otherwise delegate or do yourself. Institutional knowledge stays in memory. Coordination happens automatically."
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
              href="/pricing"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              See pricing
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
                Where founders use Auterim
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Four functions. One operating layer.
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
                From setup to full operator coverage in a day.
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
                Recommended setup for founders and ops.
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
            heading="Start running your business on Auterim."
            sub="Start with one controlled operator, then expand into a full operating layer."
            primary="Get Starter"
            primaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

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
  title: "Marketing",
  description: "AI operators for marketing teams. Content production, campaign tracking, SEO workflow automation, and social scheduling without a coordinator.",
  alternates: {
    canonical: "https://auterim.com/solutions/marketing",
  },
  openGraph: {
    url: "https://auterim.com/solutions/marketing",
    title: "Marketing | Auterim",
    description: "AI operators for marketing teams. Content production, campaign tracking, SEO workflow automation, and social scheduling without a coordinator.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketing | Auterim",
    description: "AI operators for marketing teams. Content production, campaign tracking, SEO workflow automation, and social scheduling without a coordinator.",
  },
};

const useCases = [
  {
    title: "Content production",
    description: "Operator drafts blog posts, newsletters, and social content per your brand guidelines. Review in your inbox before anything publishes.",
  },
  {
    title: "Campaign tracking",
    description: "Pulls performance data from your ad platforms and analytics tools. Surfaces what is working and what needs attention without a manual pull.",
  },
  {
    title: "SEO workflow",
    description: "Keyword gap analysis, internal linking, and content brief generation runs on a defined schedule. No coordinator needed.",
  },
  {
    title: "Social scheduling",
    description: "Drafts and queues posts across LinkedIn and email. You approve the calendar. The operator executes it.",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect your channels",
    description: "Link your email platform, social accounts, and analytics tools. The Content Operator reads your brand guidelines from memory.",
  },
  {
    number: "02",
    title: "Define content policies",
    description: "Set tone, approval requirements, and publishing rules. Everything runs inside the boundaries you define.",
  },
  {
    number: "03",
    title: "Review and publish",
    description: "Drafts surface in your inbox for approval. Approved content publishes on schedule. Every action is logged.",
  },
];

const blueprint = [
  { label: "Recommended operator", value: "Marketing Operator and Content Operator" },
  { label: "Required connectors", value: "Google Drive or Notion, Slack, Gmail, analytics source, webhooks" },
  { label: "Approval rules", value: "Customer-facing campaign copy and publish actions require approval." },
  { label: "Expected outcome", value: "Consistent content velocity with policy-safe review and performance digests." },
];

export default function MarketingPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Solutions"
            heading="Marketing that executes without a coordinator."
            description="Operators that run content workflows, track campaign performance, and surface optimization opportunities. Marketing at the pace of the business, not the calendar."
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
              href="/workflows"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              See workflows
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
                Where marketing teams use Auterim
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Four functions. One content operator.
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
                From brand guidelines to published content.
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
                Recommended setup for marketing teams.
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
            heading="Deploy your Content Operator today."
            sub="Connect channels, set approval rules, and run marketing workflows with full logs."
            primary="Get Starter"
            primaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

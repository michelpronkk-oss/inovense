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
  title: "Revenue Teams",
  description: "AI operators for revenue teams. Pipeline management, lead follow-up sequencing, deal intelligence, and CRM hygiene automation.",
  alternates: {
    canonical: "https://inovense.com/solutions/revenue-teams",
  },
  openGraph: {
    url: "https://inovense.com/solutions/revenue-teams",
    title: "Revenue Teams | Inovense",
    description: "AI operators for revenue teams. Pipeline management, lead follow-up sequencing, deal intelligence, and CRM hygiene automation.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Revenue Teams | Inovense",
    description: "AI operators for revenue teams. Pipeline management, lead follow-up sequencing, deal intelligence, and CRM hygiene automation.",
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
    description: "Fields updated, contacts deduplicated, and records enriched on a continuous basis. CRM stays clean without a dedicated ops role.",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect your CRM",
    description: "Link HubSpot, Salesforce, or Pipedrive. The Revenue Operator reads your pipeline and begins working immediately.",
  },
  {
    number: "02",
    title: "Deploy Revenue Operator",
    description: "Define what the operator can do autonomously and what requires your sign-off. Approvals happen in your inbox.",
  },
  {
    number: "03",
    title: "Watch pipeline work itself",
    description: "Follow-ups execute on schedule. Signals surface automatically. Your team focuses on conversations that close deals.",
  },
];

const blueprint = [
  { label: "Recommended operator", value: "Revenue Operator" },
  { label: "Required connectors", value: "Gmail or Outlook, HubSpot or Salesforce, Slack" },
  { label: "Approval rules", value: "External outbound email and pricing communications require approval." },
  { label: "Expected outcome", value: "Faster lead response, cleaner CRM updates, and consistent follow-up execution." },
];

export default function RevenuePage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Solutions"
            heading="Revenue teams that run without manual coordination."
            description="Pipeline management, follow-up sequencing, and deal intelligence that runs autonomously. Your operators work every lead, surface every signal, and never miss a follow-up."
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
                Where revenue teams use Inovense
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

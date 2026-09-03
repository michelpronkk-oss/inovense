import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { PageShell, PageHero, SectionDivider, PageCTA, MktCard, MockupWindow } from "@/components/marketing-ui";
import Reveal from "@/components/reveal";
import { PricingPlans } from "@/components/pricing/pricing-plans";
import { pricingPlans } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "AI Workforce Pricing",
  description: "Start free, then pay for the AI operators, connected systems and controlled runs your company puts into production.",
  alternates: {
    canonical: "https://auterim.com/pricing",
  },
  openGraph: {
    url: "https://auterim.com/pricing",
    title: "AI Workforce Pricing | Auterim",
    description: "Start free, then pay for the AI operators, connected systems and controlled runs your company puts into production.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Workforce Pricing | Auterim",
    description: "Start free, then pay for the AI operators, connected systems and controlled runs your company puts into production.",
  },
};

const capacityRows = [
  { label: "Operators", values: ["2", "Up to 5", "Up to 12", "Unlimited"] },
  { label: "Connected tools", values: ["5", "15", "All standard", "Custom and private"] },
  { label: "Actions per month", values: ["2,000", "25,000", "100,000", "Custom volume"] },
  { label: "Execution logs", values: ["30 days", "90 days", "180 days", "Custom retention"] },
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          <Reveal>
            <PageHero
              eyebrow="Pricing"
            heading="Pay for operating capacity, not seats."
            description="Every plan includes the core operating layer: operators, workflows, memory, approvals, connectors, policies and execution logs. Scale by volume, complexity and support."
            mobileDescription="Every plan includes operators, workflows, memory, approvals and execution logs. Scale with the work."
              descMaxWidth="56ch"
            />
          </Reveal>

          <section className="relative py-8">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1fr_1.08fr]">
              <Reveal>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Capacity economics</p>
                  <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                    Price scales with execution depth.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed" style={{ color: "#A4ABB4" }}>
                    Plans scale by active operators, connected systems, actions, policy complexity, and operational support.
                  </p>
                </div>
              </Reveal>
              <Reveal delayMs={120}>
                <MockupWindow
                  title="Live capacity usage - this month"
                  subtitle="operators / actions / logs / approvals"
                  rows={[
                    { label: "3 active operators", meta: "Revenue, Marketing, Operations", status: "live" },
                    { label: "11,840 actions executed", meta: "47.3% of Growth capacity", status: "ok" },
                    { label: "291 approvals reviewed", meta: "median review time 4m 12s", status: "ok" },
                    { label: "Audit logs retention", meta: "90 days active", status: "live" },
                  ]}
                />
              </Reveal>
            </div>
          </section>

          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-6xl px-6 pt-8 md:pt-16">
              <PricingPlans plans={pricingPlans} />
              <p className="mt-8 text-center font-mono text-[11px]" style={{ color: "#4A4F57" }}>
                Start self-serve. Upgrade when your operators need higher volume, custom workflows or private connector setup.
              </p>
            </div>
          </section>

          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Capacity model
              </span>
              <h2 className="mb-10 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                Scale by execution, not by seats.
              </h2>
              <div className="grid gap-4">
                {capacityRows.map((row) => (
                  <MktCard key={row.label} className="p-0">
                    <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-5 md:items-center">
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: "#4A4F57" }}>
                        {row.label}
                      </p>
                      {row.values.map((value) => (
                        <p key={value} className="text-sm" style={{ color: "#A4ABB4" }}>
                          {value}
                        </p>
                      ))}
                    </div>
                  </MktCard>
                ))}
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Pick a plan that matches your current operating capacity."
            sub="Deploy one operator first. Expand once workflows, approvals, and logs prove value."
            primary="Get Started"
            primaryHref="/app/onboarding"
            secondary="Book a 20-min demo"
            secondaryHref="/contact"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

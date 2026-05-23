import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { PageShell, Eyebrow, SectionDivider, PageCTA, MktCard, MockupWindow } from "@/components/marketing-ui";
import Reveal from "@/components/reveal";
import { PricingPlans } from "@/components/pricing/pricing-plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start with one operator, free forever. Expand to Growth at $149/mo or Scale with custom pricing. Transparent plans for operators at every stage.",
  alternates: {
    canonical: "https://inovense.com/pricing",
  },
  openGraph: {
    url: "https://inovense.com/pricing",
    title: "Pricing | Inovense",
    description: "Start with one operator, free forever. Expand to Growth at $149/mo or Scale with custom pricing. Transparent plans for operators at every stage.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | Inovense",
    description: "Start with one operator, free forever. Expand to Growth at $149/mo or Scale with custom pricing. Transparent plans for operators at every stage.",
  },
};

const plans = [
  {
    name: "Starter",
    price: "$149",
    period: "/mo",
    tagline: "For teams starting with one controlled AI operator.",
    features: [
      "1 active operator",
      "5 connected tools",
      "2,000 actions per month",
      "Core workflows",
      "Approval inbox",
      "30-day execution logs",
      "Basic company memory",
      "Email support",
    ],
    cta: "Get Starter",
    ctaHref: "/app/onboarding",
  },
  {
    name: "Growth",
    price: "$699",
    period: "/mo",
    tagline: "For teams running AI across revenue, client work and operations.",
    hint: "Most chosen",
    features: [
      "Up to 5 active operators",
      "15 connected tools",
      "25,000 actions per month",
      "Suggested workflows",
      "Advanced approval policies",
      "Company memory graph",
      "90-day execution logs",
      "Slack and email approvals",
      "Priority support",
    ],
    cta: "Get Growth",
    ctaHref: "/app/onboarding",
    featured: true,
  },
  {
    name: "Operator",
    price: "$2,500",
    period: "/mo",
    tagline: "For companies that want their first AI operating layer implemented with us.",
    features: [
      "Revenue Operator implementation",
      "Custom workflow setup",
      "Client onboarding flows",
      "Up to 12 active operators",
      "All standard connectors",
      "100,000 actions per month",
      "Advanced policy guardrails",
      "180-day audit logs",
      "Private onboarding session",
      "Dedicated success support",
    ],
    cta: "Get Operator",
    ctaHref: "/contact",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    tagline: "For regulated, multi-team or high-volume operations.",
    features: [
      "Unlimited operators",
      "Custom connectors and private tools",
      "SSO and SCIM",
      "Designed for SOC 2 readiness",
      "Data residency options",
      "Custom retention and audit logs",
      "Security review",
      "SLA and dedicated success",
      "Procurement support",
    ],
    cta: "Contact sales",
    ctaHref: "/contact",
  },
];

const capacityRows = [
  { label: "Operators", values: ["1", "Up to 5", "Up to 12", "Unlimited"] },
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
            <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-28 pt-40 text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h1 className="mb-5 max-w-[20ch] text-5xl font-semibold md:text-6xl" style={{ color: "#ECEFF3", letterSpacing: "-0.035em", lineHeight: 1.03 }}>
              Pay for operating capacity, not seats.
            </h1>
            <p className="mb-10 max-w-[56ch] text-lg leading-relaxed" style={{ color: "#A4ABB4" }}>
              Every plan includes the core operating layer: operators, workflows, memory, approvals, connectors, policies and execution logs. Scale by volume, complexity and support.
            </p>
            </section>
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

          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-6xl px-6 pt-16">
              <PricingPlans plans={plans} />
              <p className="mt-8 text-center font-mono text-[11px]" style={{ color: "#4A4F57" }}>
                Start self-serve. Upgrade when your operators need higher volume, custom workflows or private connector setup.
              </p>
            </div>
          </section>

          <section className="relative py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
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
            primary="Get Starter"
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

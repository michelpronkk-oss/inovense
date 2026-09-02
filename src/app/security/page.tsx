import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  PageShell,
  PageHero,
  MktCard,
  MockupWindow,
  SectionDivider,
  PageCTA,
  PropList,
} from "@/components/marketing-ui";
import Reveal from "@/components/reveal";

export const metadata: Metadata = {
  title: "Security",
  description: "Policy enforcement, approval gates, and immutable audit logs. Every agent action runs inside your defined boundaries. Operators propose, policies enforce, humans approve.",
  alternates: {
    canonical: "https://auterim.com/security",
  },
  openGraph: {
    url: "https://auterim.com/security",
    title: "Security | Auterim",
    description: "Policy enforcement, approval gates, and immutable audit logs. Every agent action runs inside your defined boundaries. Operators propose, policies enforce, humans approve.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security | Auterim",
    description: "Policy enforcement, approval gates, and immutable audit logs. Every agent action runs inside your defined boundaries. Operators propose, policies enforce, humans approve.",
  },
};

const model = [
  {
    badge: "PE",
    title: "Policy Engine",
    description: "Define what agents can and cannot do before a single action is taken. Policies are enforced at runtime on every execution.",
  },
  {
    badge: "AG",
    title: "Approval Gates",
    description: "Human-in-the-loop gates between proposal and execution. Operators surface the action and the reason. You approve or reject.",
  },
  {
    badge: "EL",
    title: "Execution Logs",
    description: "Complete audit trail for every run. What executed, what was approved, what was blocked, and when.",
  },
];

const properties = [
  "All actions proposed before execution",
  "Policy rules enforced at runtime",
  "Approval required for configurable action types",
  "Immutable execution logs",
  "Role-based access control",
  "Data stays within your connector boundaries",
  "Designed for SOC 2 readiness",
];

export default function SecurityPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <Reveal>
            <PageHero
              eyebrow="Platform"
              heading="Operators act. Policies decide. Humans approve."
              description="Every agent runs inside your defined policy boundaries. No action executes without passing the policy engine. No sensitive action executes without your approval. Full audit trail for everything that runs."
            >
              <Link
                href="/architecture"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px"
                style={{
                  background: "#4DE8E1",
                  color: "#04130F",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)",
                }}
              >
                View architecture
              </Link>
              <Link
                href="/trust"
                className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  color: "#ECEFF3",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                Trust center
              </Link>
            </PageHero>
          </Reveal>

          <section className="relative py-8">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1fr_1.1fr]">
              <Reveal>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>Guardrail pipeline</p>
                  <h2 className="mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                    Policy-enforced before execution.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed" style={{ color: "#A4ABB4" }}>
                    Operators can propose actions. The policy engine and approval layer determine what can run.
                  </p>
                </div>
              </Reveal>
              <Reveal delayMs={120}>
                <MockupWindow
                  title="Policy evaluation stream"
                  subtitle="allow / require approval / block"
                  rows={[
                    { label: "email.send to external domain", meta: "require_approval - reviewer: admin", status: "pending" },
                    { label: "crm.updateRecord stage change", meta: "allowed by CRM auto-write policy", status: "ok" },
                    { label: "payment.refund", meta: "blocked by payment guardrail", status: "pending" },
                    { label: "memory.write onboarding context", meta: "allowed and logged", status: "live" },
                  ]}
                />
              </Reveal>
            </div>
          </section>

          {/* 3-column model */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Security model
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Three layers between intention and execution.
              </h2>
              <div className="grid gap-5 md:grid-cols-3">
                {model.map((item) => (
                  <MktCard key={item.title}>
                    <span
                      className="mb-4 inline-block rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
                      style={{
                        background: "rgba(77,232,225,0.08)",
                        color: "#4DE8E1",
                        border: "1px solid rgba(77,232,225,0.18)",
                      }}
                    >
                      {item.badge}
                    </span>
                    <h3
                      className="mb-2 text-base font-semibold"
                      style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                      {item.description}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          {/* Properties */}
          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Security properties
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                What you get out of the box.
              </h2>
              <PropList items={properties} />
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Built for teams that need enforceable control."
            sub="Deploy one controlled operator first, then expand with policy-safe execution."
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

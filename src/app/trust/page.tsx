import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  PageShell,
  PageHero,
  MktCard,
  MktCardHover,
  SectionDivider,
  PageCTA,
} from "@/components/marketing-ui";
import { staticOgImage } from "@/lib/static-og";

export const metadata: Metadata = {
  title: "Trust Center: Data, Permissions & Controls",
  description: "Learn how Auterim uses connector permissions, approval boundaries and activity logs to keep AI work visible and controlled.",
  alternates: {
    canonical: "https://auterim.com/trust",
  },
  openGraph: {
    url: "https://auterim.com/trust",
    title: "Trust Center: Data, Permissions & Controls | Auterim",
    description: "Learn how Auterim uses connector permissions, approval boundaries and activity logs to keep AI work visible and controlled.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/trust")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trust Center: Data, Permissions & Controls | Auterim",
    description: "Learn how Auterim uses connector permissions, approval boundaries and activity logs to keep AI work visible and controlled.",
    images: [staticOgImage("/trust")],
  },
};

const trustProperties = [
  {
    title: "Data boundaries",
    description: "Agent data only flows to connectors you explicitly authorize. No data moves outside your defined scope.",
  },
  {
    title: "Purpose-limited access",
    description: "Operators use the records available through the connector scopes and tasks you authorize for a workspace.",
  },
  {
    title: "Audit trail",
    description: "Operator activity and approval decisions are recorded so teams can review what happened in a run.",
  },
  {
    title: "Role-based access",
    description: "Team members access only what their role permits. Scoped at the agent, workflow, and connector level.",
  },
];

const navLinks = [
  {
    label: "Security model",
    href: "/security",
    desc: "Policy engine, approval gates, and audit logs",
  },
  {
    label: "Privacy policy",
    href: "/privacy",
    desc: "How we handle and store your data",
  },
  {
    label: "Architecture",
    href: "/architecture",
    desc: "Technical overview of every platform layer",
  },
];

export default function TrustPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Company"
            heading="You run the system. We run the infrastructure."
            description="Security posture and data handling for the Auterim platform. Built for operators who need to know exactly what happens to their business data."
          >
            <Link
              href="/security"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px"
              style={{
                background: "#4DE8E1",
                color: "#04130F",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)",
              }}
            >
              Security overview
            </Link>
            <Link
              href="/privacy"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              Privacy policy
            </Link>
          </PageHero>

          {/* Trust properties */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Trust properties
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                What you can depend on.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {trustProperties.map((prop) => (
                  <MktCard key={prop.title}>
                    <h3
                      className="mb-2 text-base font-semibold"
                      style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                    >
                      {prop.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                      {prop.description}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          {/* Navigation links */}
          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Documentation
              </span>
              <h2
                className="mb-8 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Go deeper on the details.
              </h2>
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <Link key={link.label} href={link.href} className="block">
                    <MktCardHover className="flex items-center justify-between">
                      <div>
                        <p
                          className="mb-0.5 text-sm font-semibold"
                          style={{ color: "#ECEFF3" }}
                        >
                          {link.label}
                        </p>
                        <p className="text-xs" style={{ color: "#4A4F57" }}>
                          {link.desc}
                        </p>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden
                        style={{ color: "#4A4F57" }}
                      >
                        <path
                          d="M6 3l5 5-5 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </MktCardHover>
                  </Link>
                ))}
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Questions about data handling?"
            sub="We respond to every security inquiry directly."
            primary="Contact us"
            primaryHref="/contact"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

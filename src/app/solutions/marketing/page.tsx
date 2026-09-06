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
  title: "Marketing Operator Direction | Auterim",
  description: "Explore the planned marketing direction for Auterim's expanding workforce. Marketing automation is not a current production-ready capability.",
  alternates: {
    canonical: "https://auterim.com/solutions/marketing",
  },
  openGraph: {
    url: "https://auterim.com/solutions/marketing",
    title: "Marketing Operator Direction | Auterim",
    description: "Explore the planned marketing direction for Auterim's expanding workforce. Marketing automation is not a current production-ready capability.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/solutions/marketing")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketing Operator Direction | Auterim",
    description: "Explore the planned marketing direction for Auterim's expanding workforce. Marketing automation is not a current production-ready capability.",
    images: [staticOgImage("/solutions/marketing")],
  },
};

const useCases = [
  {
    title: "Content production",
    description: "A future role direction for preparing content from approved brand context, before any future publishing capability is introduced.",
  },
  {
    title: "Campaign tracking",
    description: "A future direction for connecting campaign signals to a more useful review and planning loop.",
  },
  {
    title: "SEO workflow",
    description: "A future direction for making research and preparation more structured, with a clear human review boundary.",
  },
  {
    title: "Social scheduling",
    description: "A future direction for approval-led publishing work. No social publishing automation is available today.",
  },
];

const steps = [
  {
    number: "01",
    title: "Start with current business context",
    description: "Today, begin with Revenue, Client Flow, or Operations where the supported systems and operating loops are explicit.",
  },
  {
    number: "02",
    title: "Make future boundaries explicit",
    description: "The marketing direction is being designed around approved context and visible decisions, rather than broad autonomous publishing.",
  },
  {
    number: "03",
    title: "Expand when the role is available",
    description: "Marketing Operator is not a current production-ready automation surface and should not be activated as one.",
  },
];

const blueprint = [
  { label: "Workforce status", value: "Expanding workforce. Marketing Operator is not a current production-ready automation surface." },
  { label: "Current starting point", value: "Use a current operator for a supported revenue, client-flow, or operations loop." },
  { label: "Design direction", value: "Future marketing work will keep preparation, approval, and external execution visibly separate." },
];

export default function MarketingPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Marketing", path: "/solutions/marketing" }]} />
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Expanding workforce"
            heading="A future direction for controlled marketing work."
            description="Marketing Operator is part of Auterim's expanding workforce. It is not a current production-ready marketing automation capability; teams should begin with the supported operator that fits the work at hand."
            mobileDescription="Marketing is an expanding workforce direction, not a live automation surface today."
          >
            <Link
              href="/operators"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px"
              style={{
                background: "#4DE8E1",
                color: "#04130F",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)",
              }}
            >
              See available operators
            </Link>
            <Link
              href="/operators"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              See current roles
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
                Planned role scope
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                The work this future role is being designed to support.
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
                How the workforce expands
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Start with a live role, then expand deliberately.
              </h2>
              <StepRow steps={steps} />
            </div>
            <SectionDivider />
          </section>

          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Availability boundary
              </span>
              <h2 className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                What is available today and what remains future-facing.
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
            heading="Start with the workforce available today."
            sub="Revenue, Client Flow, and Operations have defined current systems and approval boundaries. Marketing remains an expanding role direction."
            primary="See available operators"
            primaryHref="/operators"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

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
  title: "Founder Operations Direction | Auterim",
  description: "Explore a future direction for founder operations in Auterim's expanding workforce. There is no current Founder Operations production operator.",
  alternates: {
    canonical: "https://auterim.com/solutions/founders-ops",
  },
  openGraph: {
    url: "https://auterim.com/solutions/founders-ops",
    title: "Founder Operations Direction | Auterim",
    description: "Explore a future direction for founder operations in Auterim's expanding workforce. There is no current Founder Operations production operator.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/solutions/founders-ops")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Founder Operations Direction | Auterim",
    description: "Explore a future direction for founder operations in Auterim's expanding workforce. There is no current Founder Operations production operator.",
    images: [staticOgImage("/solutions/founders-ops")],
  },
};

const useCases = [
  {
    title: "Business intelligence",
    description: "A future direction for joining operating signals into a clearer leadership review without implying a live universal business summary.",
  },
  {
    title: "Email and comms management",
    description: "A future direction. Today, Revenue and Client Flow cover narrower, supported communication preparation loops.",
  },
  {
    title: "Hiring workflow",
    description: "A future workforce direction; Auterim does not currently provide a hiring workflow operator.",
  },
  {
    title: "Finance monitoring",
    description: "A future workforce direction for making financial and operating signals easier to review without handing over financial control.",
  },
];

const steps = [
  {
    number: "01",
    title: "Begin with one supported system",
    description: "Current roles begin from Gmail, Microsoft 365, HubSpot, Salesforce read context, Trello, or Slack according to the selected operator.",
  },
  {
    number: "02",
    title: "Define what matters",
    description: "Set the policy boundary first. Today, begin with the available operator that matches the work you need to move.",
  },
  {
    number: "03",
    title: "Expand only when capability is available",
    description: "Founder Operations is not a current production operator. Future scope stays separate from the roles available today.",
  },
];

const blueprint = [
  { label: "Recommended operator", value: "Revenue Operator plus Operations Operator baseline" },
  { label: "Status", value: "Expanding workforce. Start today with Revenue, Client Flow, or Operations based on the work at hand." },
  { label: "Approval rules", value: "External sends, pricing updates, and high-risk actions require approval." },
  { label: "Current starting point", value: "Start with Revenue, Client Flow, or Operations for a supported, controlled business loop." },
];

export default function FoundersOpsPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Founders and operations", path: "/solutions/founders-ops" }]} />
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Expanding workforce"
            heading="A future direction for founder operating context."
            description="Founder Operations is part of Auterim's expanding workforce, not a current production operator. Today, start with an available role and a small, controlled business loop."
            mobileDescription="Founder Operations is future-facing. Start with a supported operator today."
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
                Where the workforce can expand, clearly separated from today.
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
                Begin with a current role, then expand deliberately.
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
            heading="Start with the operators available today."
            sub="Revenue, Client Flow, and Operations provide the current, controlled starting points for work that needs attention."
            primary="See available operators"
            primaryHref="/operators"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

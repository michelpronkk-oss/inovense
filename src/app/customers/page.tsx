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
} from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Customers",
  description: "How operators use Auterim to run more of their business with fewer manual handoffs. Real use cases from revenue teams, founders, and content operators.",
  alternates: {
    canonical: "https://auterim.com/customers",
  },
  openGraph: {
    url: "https://auterim.com/customers",
    title: "Customers | Auterim",
    description: "How operators use Auterim to run more of their business with fewer manual handoffs. Real use cases from revenue teams, founders, and content operators.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Customers | Auterim",
    description: "How operators use Auterim to run more of their business with fewer manual handoffs. Real use cases from revenue teams, founders, and content operators.",
  },
  robots: { index: false, follow: true },
};

const useCases = [
  {
    context: "Illustrative use case · consulting team",
    description:
      "A consulting team can use a Client Flow Operator to prepare client follow-ups and onboarding coordination from its existing systems.",
  },
  {
    context: "Illustrative use case · B2B sales team",
    description:
      "A Revenue Operator can qualify inbound signals, prepare follow-ups and keep CRM next steps current for a B2B sales team.",
  },
  {
    context: "Illustrative use case · content team",
    description:
      "A Marketing Operator can prepare content drafts and publishing plans from approved brand context, with external publishing held for review.",
  },
];

export default function CustomersPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Company"
            heading="Illustrative operating patterns for early teams."
            description="These examples show how Auterim operators can prepare and coordinate work. They are not customer case studies or performance claims."
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
              Start preview
            </Link>
          </PageHero>

          {/* Use case cards */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-3xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Operating patterns
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Where teams start and what they run first.
              </h2>
              <div className="flex flex-col gap-5">
                {useCases.map((uc) => (
                  <MktCard key={uc.context}>
                    <p
                      className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em]"
                      style={{ color: "#4A4F57" }}
                    >
                      {uc.context}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>
                      {uc.description}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          <PageCTA
            heading="Start with your operating profile."
            sub="See the operators and work patterns that fit your company before connecting a system."
            primary="Book a 20-min demo"
            primaryHref="/contact"
            secondary="Start preview"
            secondaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

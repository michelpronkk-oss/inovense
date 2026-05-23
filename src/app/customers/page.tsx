import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import {
  PageShell,
  Eyebrow,
  MktCard,
  SectionDivider,
  PageCTA,
} from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Customers",
  description: "How operators use Inovense to run more of their business with fewer manual handoffs. Real use cases from revenue teams, founders, and content operators.",
  alternates: {
    canonical: "https://inovense.com/customers",
  },
  openGraph: {
    url: "https://inovense.com/customers",
    title: "Customers | Inovense",
    description: "How operators use Inovense to run more of their business with fewer manual handoffs. Real use cases from revenue teams, founders, and content operators.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Customers | Inovense",
    description: "How operators use Inovense to run more of their business with fewer manual handoffs. Real use cases from revenue teams, founders, and content operators.",
  },
};

const useCases = [
  {
    context: "Design partner · consulting team",
    description:
      "A founder running a 4-person consultancy uses Inovense to manage client follow-ups and onboarding without a dedicated ops hire. One operator handles the work that would otherwise require a full-time coordinator.",
  },
  {
    context: "Design partner · B2B SaaS sales team",
    description:
      "A sales team at a B2B SaaS company deployed a Revenue Operator to work every lead in their CRM. Follow-ups run on schedule, deal intelligence surfaces automatically, and the team focuses on closing.",
  },
  {
    context: "Design partner · distributed content team",
    description:
      "A content team uses an Operator to draft and schedule across LinkedIn and email without a coordinator. Brand guidelines live in memory. Every post passes through an approval gate before it goes out.",
  },
];

export default function CustomersPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-28 pt-40 text-center">
            <Eyebrow>Company</Eyebrow>
            <h1
              className="mb-5 max-w-[20ch] text-5xl font-semibold md:text-6xl"
              style={{ color: "#ECEFF3", letterSpacing: "-0.035em", lineHeight: 1.03 }}
            >
              Early design partners running Inovense in production workflows.
            </h1>
            <p
              className="mb-10 max-w-[52ch] text-lg leading-relaxed"
              style={{ color: "#A4ABB4" }}
            >
              We work with early design partners who are building real operator workflows. No logo wall, no fictional case studies, only implementation patterns we can stand behind.
            </p>
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
          </section>

          {/* Use case cards */}
          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-3xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Design partner patterns
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
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
            heading="Become an early design partner."
            sub="Work directly with our team to shape your first operator workflows."
            primary="Book a 20-min demo"
            primaryHref="/contact"
            secondary="Get Starter"
            secondaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

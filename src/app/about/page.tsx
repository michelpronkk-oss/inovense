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
  title: "About",
  description: "Auterim is an AI workforce platform for businesses. It understands the business first, recommends controlled AI workforces, and measures business impact.",
  alternates: {
    canonical: "https://auterim.com/about",
  },
  openGraph: {
    url: "https://auterim.com/about",
    title: "About | Auterim",
    description: "Auterim is an AI workforce platform for businesses. It understands the business first, recommends controlled AI workforces, and measures business impact.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About | Auterim",
    description: "Auterim is an AI workforce platform for businesses. It understands the business first, recommends controlled AI workforces, and measures business impact.",
  },
};

const principles = [
  "Operators propose. Policies enforce. Humans approve.",
  "Build for depth, not demos.",
  "Every action leaves a log.",
  "Trust is earned through transparency.",
];

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Company"
            heading="We are building the OS for serious operators."
            description="Auterim understands how a business runs, identifies where value is lost, and deploys a controlled AI workforce to improve it."
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
              href="/contact"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              Contact us
            </Link>
          </PageHero>

          {/* Mission */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-3xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Mission
              </span>
              <h2
                className="mb-8 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                The next decade of business runs inside an OS.
              </h2>
              <div className="space-y-6">
                <p style={{ color: "#A4ABB4", fontSize: 17, lineHeight: 1.6 }}>
                  Most businesses today run on a mix of SaaS tools, manual coordination, and individual judgment. That works up to a point. But it does not scale. Every new hire is a new coordination layer. Every new process is another thing to maintain.
                </p>
                <p style={{ color: "#A4ABB4", fontSize: 17, lineHeight: 1.6 }}>
                  Most AI tools automate what users tell them to automate. Auterim starts by understanding the business, diagnosing where value is lost, and recommending the right workforce with policy boundaries, approvals, and measurable outcomes.
                </p>
                <p style={{ color: "#A4ABB4", fontSize: 17, lineHeight: 1.6 }}>
                  Operators who adopt this model early will move faster, operate with fewer people in the coordination layer, and accumulate institutional knowledge that compounds over time. The businesses that do not adopt it will be competing against those that do.
                </p>
              </div>
            </div>
          </section>

          {/* Operating principles */}
          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                How we work
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Operating principles.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {principles.map((p, i) => (
                  <MktCard key={p} className="flex gap-4">
                    <span
                      className="shrink-0 font-mono text-xl font-light"
                      style={{ color: "rgba(255,255,255,0.10)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm font-medium leading-relaxed" style={{ color: "#A4ABB4" }}>
                      {p}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Ready to operate differently?"
            sub="Start with one controlled operator. Expand when the value is proven."
            primary="Get Starter"
            primaryHref="/app/onboarding"
            secondary="Contact us"
            secondaryHref="/contact"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

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
  title: "Memory & Context",
  description: "Persistent company memory that gives every AI operator full context, history, and institutional knowledge across every run and every agent.",
  alternates: {
    canonical: "https://inovense.com/memory",
  },
  openGraph: {
    url: "https://inovense.com/memory",
    title: "Memory & Context | Inovense",
    description: "Persistent company memory that gives every AI operator full context, history, and institutional knowledge across every run and every agent.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Memory & Context | Inovense",
    description: "Persistent company memory that gives every AI operator full context, history, and institutional knowledge across every run and every agent.",
  },
};

const features = [
  {
    title: "Company memory graph",
    description: "Accounts, documents, workflows, CRM records, inbox threads, and decisions connected in one graph.",
  },
  {
    title: "Scoped retrieval",
    description: "Operators retrieve only the memory slices they are authorized to read by role and policy.",
  },
  {
    title: "Auditable writes",
    description: "Memory writes are logged with actor, timestamp, and linked run IDs for traceability.",
  },
];

const examples = [
  "Agent knows your pricing tiers before drafting a proposal.",
  "Operator references last quarter's decisions without being prompted.",
  "New agent deploys with full company context from day one.",
];

export default function MemoryPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Platform"
            heading="Your business, remembered"
            description="Persistent company memory that gives every agent context, history, and institutional knowledge. Agents know who your clients are, what was decided, and what your standards are before they take a single action."
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
              href="/docs"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              Read the docs
            </Link>
          </PageHero>

          {/* 3-feature row */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                How memory works
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                One memory layer for every operator in your account.
              </h2>
              <div className="grid gap-5 md:grid-cols-3">
                {features.map((f) => (
                  <MktCard key={f.title}>
                    <h3
                      className="mb-2 text-base font-semibold"
                      style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                    >
                      {f.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                      {f.description}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          {/* Use case examples */}
          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-3xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                In practice
              </span>
              <h2
                className="mb-6 md:mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                What memory-aware operators look like.
              </h2>
              <div className="flex flex-col gap-5">
                {examples.map((ex) => (
                  <div
                    key={ex}
                    className="py-5 pl-4"
                    style={{
                      borderLeft: "2px solid rgba(77,232,225,0.25)",
                      paddingLeft: 16,
                    }}
                  >
                    <p
                      className="text-base leading-relaxed"
                      style={{ color: "#A4ABB4" }}
                    >
                      &ldquo;{ex}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Memory that compounds."
            sub="Every operator starts with full context. Every run adds to it."
            primary="Get Starter"
            primaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

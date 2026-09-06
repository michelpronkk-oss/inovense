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
import { staticOgImage } from "@/lib/static-og";

export const metadata: Metadata = {
  title: "Company Context & AI Memory",
  description: "Give Auterim operators the company context they need to prepare the right work, with access shaped by your approved tools and policies.",
  alternates: {
    canonical: "https://auterim.com/memory",
  },
  openGraph: {
    url: "https://auterim.com/memory",
    title: "Company Context & AI Memory | Auterim",
    description: "Give Auterim operators the company context they need to prepare the right work, with access shaped by your approved tools and policies.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/memory")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Company Context & AI Memory | Auterim",
    description: "Give Auterim operators the company context they need to prepare the right work, with access shaped by your approved tools and policies.",
    images: [staticOgImage("/memory")],
  },
};

const features = [
  {
    title: "Shared workspace context",
    description: "The operating facts, goals, policies, and ownership rules a workspace makes available to its operators.",
  },
  {
    title: "Connected business signals",
    description: "Email, CRM, board, and channel context improves an operator only after your workspace connects and authorizes the relevant system.",
  },
  {
    title: "Continuity you can inspect",
    description: "Prepared work, approval decisions, and execution results remain visible in the workspace so the next review starts with context.",
  },
];

const examples = [
  "A Revenue Operator starts from the email and CRM context your workspace has approved.",
  "A Client Flow Operator can prepare a handoff from the client details and ownership rules already in the workspace.",
  "An Operations Operator can explain why a card was flagged and leave the next decision visible for the team.",
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
            heading="Business context that stays attached to the work."
            description="Auterim uses the workspace facts, connected system context, policy rules, and review history you approve to make the next operator action specific. It does not treat memory as an unbounded record of everything."
            mobileDescription="Approved workspace facts, connected context, policy rules, and review history for the next operator action."
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
                Context is useful only when its source and boundary are clear.
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
                What context-aware operators look like.
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
            heading="Start with the context that makes the first operator useful."
            sub="Connect only the systems you need, make the policy boundary explicit, and keep the next decision reviewable."
            primary="Get Starter"
            primaryHref="/app/onboarding"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

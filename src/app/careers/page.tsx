import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { PageShell, PageHero, MktCard, SectionDivider, PageCTA } from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join Auterim and help build the AI workforce platform for businesses.",
  alternates: {
    canonical: "https://auterim.com/careers",
  },
  openGraph: {
    url: "https://auterim.com/careers",
    title: "Careers | Auterim",
    description: "Join Auterim and help build the AI workforce platform for businesses.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers | Auterim",
    description: "Join Auterim and help build the AI workforce platform for businesses.",
  },
};

const focusAreas = [
  {
    title: "Product engineering",
    description: "Agent runtime, connector executor, policy engine, and execution UX.",
  },
  {
    title: "AI systems",
    description: "Deterministic planning, tool orchestration, and safe approval continuity.",
  },
  {
    title: "Go-to-market and customer implementation",
    description: "Operator onboarding, workflow rollout, and design partner success.",
  },
];

const workingPrinciples = [
  "Async-first, remote",
  "Operators propose, you decide",
  "Bias for shipping",
  "Write it down",
];

export default function CareersPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Company"
            heading="Build the OS for the next decade of business."
            description="A small, focused team working on a hard problem at the intersection of AI, product design, and business execution. If that interests you, we want to hear from you."
          />

          {/* Roles */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-3xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Team status
              </span>
              <h2
                className="mb-10 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                We are an early team.
              </h2>
              <div className="rounded-xl border border-white/[0.07] bg-zinc-900/40 p-6">
                <p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>
                  We are not publicly listing specific open roles at the moment. If you are strong in one of the focus areas below and want to help build Auterim&apos;s AI workforce platform, send us a direct note.
                </p>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                {focusAreas.map((area) => (
                  <MktCard key={area.title}>
                    <h3 className="mb-2 text-base font-semibold" style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}>
                      {area.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                      {area.description}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          {/* How we work */}
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
                {workingPrinciples.map((p, i) => (
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
            heading="Do not see your role?"
            sub="Send us a note anyway. We read every message."
            primary="hello@auterim.com"
            primaryHref="mailto:hello@auterim.com"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

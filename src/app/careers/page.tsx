import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { PageShell, Eyebrow, MktCard, SectionDivider, PageCTA } from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join Inovense. Build the OS for the next decade of business. Open roles: Senior Product Engineer, AI Systems Researcher, GTM Lead.",
  alternates: {
    canonical: "https://inovense.com/careers",
  },
  openGraph: {
    url: "https://inovense.com/careers",
    title: "Careers | Inovense",
    description: "Join Inovense. Build the OS for the next decade of business. Open roles: Senior Product Engineer, AI Systems Researcher, GTM Lead.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers | Inovense",
    description: "Join Inovense. Build the OS for the next decade of business. Open roles: Senior Product Engineer, AI Systems Researcher, GTM Lead.",
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
          <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-28 pt-40 text-center">
            <Eyebrow>Company</Eyebrow>
            <h1
              className="mb-5 max-w-[20ch] text-5xl font-semibold md:text-6xl"
              style={{ color: "#ECEFF3", letterSpacing: "-0.035em", lineHeight: 1.03 }}
            >
              Build the OS for the next decade of business.
            </h1>
            <p
              className="mb-10 max-w-[52ch] text-lg leading-relaxed"
              style={{ color: "#A4ABB4" }}
            >
              A small, focused team working on a hard problem at the intersection of AI, product design, and business execution. If that interests you, we want to hear from you.
            </p>
          </section>

          {/* Roles */}
          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-3xl px-6 pt-16">
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
                  We are not publicly listing specific open roles at the moment. If you are strong in one of the focus areas below and want to build the Inovense operating layer, send us a direct note.
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
          <section className="relative py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                How we work
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
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
            primary="hello@inovense.com"
            primaryHref="mailto:hello@inovense.com"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import {
  PageShell,
  Eyebrow,
  MktCard,
  SectionDivider,
  PageCTA,
} from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Press",
  description: "Press resources and media inquiries for Inovense. For interview requests, editorial coverage, or brand assets, contact hello@inovense.com.",
  alternates: {
    canonical: "https://inovense.com/press",
  },
  openGraph: {
    url: "https://inovense.com/press",
    title: "Press | Inovense",
    description: "Press resources and media inquiries for Inovense. For interview requests, editorial coverage, or brand assets, contact hello@inovense.com.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Press | Inovense",
    description: "Press resources and media inquiries for Inovense. For interview requests, editorial coverage, or brand assets, contact hello@inovense.com.",
  },
};

const coveragePoints = [
  {
    label: "What we build",
    description: "AI operating layer for businesses. Structured agents, policy enforcement, persistent memory, and human approval gates.",
  },
  {
    label: "Who it is for",
    description: "Revenue teams, founders running lean, and operators who need structured execution with full audit trails.",
  },
  {
    label: "What makes it different",
    description: "Operators propose, policies enforce, humans approve, and every action is logged before and after execution.",
  },
  {
    label: "Stage and traction",
    description: "Product preview stage. Contact us for current roadmap and implementation updates.",
  },
];

const pressKit = [
  { label: "Company name", value: "Inovense" },
  { label: "Category", value: "AI operating layer for modern businesses" },
  { label: "Boilerplate", value: "Inovense helps teams run operator workflows with connectors, policies, approvals, memory, and execution logs." },
  { label: "Press contact", value: "hello@inovense.com" },
];

export default function PressPage() {
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
              Press
            </h1>
            <p
              className="mb-10 max-w-[52ch] text-lg leading-relaxed"
              style={{ color: "#A4ABB4" }}
            >
              For interview requests, editorial coverage, or brand assets, reach out directly. We respond quickly.
            </p>
            <a
              href="mailto:hello@inovense.com"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-px"
              style={{
                background: "#4DE8E1",
                color: "#04130F",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)",
              }}
            >
              hello@inovense.com
            </a>
          </section>

          {/* What to include in coverage */}
          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Coverage guide
              </span>
              <h2
                className="mb-12 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                What to include.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {coveragePoints.map((point) => (
                  <MktCard key={point.label}>
                    <p
                      className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em]"
                      style={{ color: "#4A4F57" }}
                    >
                      {point.label}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>
                      {point.description}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
          </section>

          <section className="relative py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-5xl px-6 pt-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                Press kit
              </span>
              <h2 className="mb-12 mt-3 text-3xl font-semibold md:text-4xl" style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}>
                Company information for editorial use.
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {pressKit.map((item) => (
                  <MktCard key={item.label}>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>
                      {item.label}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>
                      {item.value}
                    </p>
                  </MktCard>
                ))}
              </div>
            </div>
            <SectionDivider />
          </section>

          <PageCTA
            heading="Get in touch."
            sub="We respond to every press inquiry directly."
            primary="hello@inovense.com"
            primaryHref="mailto:hello@inovense.com"
          />
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

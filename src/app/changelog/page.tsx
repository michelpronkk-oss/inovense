import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import {
  PageShell,
  Eyebrow,
  SectionDivider,
} from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Updates and improvements across the Inovense operating layer. Agent runtime, workflow execution, connector framework, and platform releases.",
  alternates: {
    canonical: "https://inovense.com/changelog",
  },
  openGraph: {
    url: "https://inovense.com/changelog",
    title: "Changelog | Inovense",
    description: "Updates and improvements across the Inovense operating layer. Agent runtime, workflow execution, connector framework, and platform releases.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog | Inovense",
    description: "Updates and improvements across the Inovense operating layer. Agent runtime, workflow execution, connector framework, and platform releases.",
  },
};

const entries = [
  {
    date: "May 2026",
    version: "Preview v0.4",
    title: "Golden path onboarding and approval continuation",
    changes: [
      "New workspace onboarding now seeds connectors, default policies, memory, and first operator state.",
      "Approval decisions now continue pending runtime actions and update linked run steps and logs.",
      "Operator runs now expose step-level status with policy decision traceability.",
    ],
  },
  {
    date: "April 2026",
    version: "Preview v0.3",
    title: "Connector layer and policy guardrails",
    changes: [
      "Connector lifecycle added: connect, disconnect, test connection, resync, and permission inspection.",
      "Structured policy model introduced with deterministic allow, require approval, and block decisions.",
      "Execution logs standardized for connector and policy events.",
    ],
  },
  {
    date: "March 2026",
    version: "Preview v0.2",
    title: "Inovense OS foundation",
    changes: [
      "Core app experience launched across operators, workflows, approvals, memory, connectors, and logs.",
      "Initial agent runtime and mock tool execution flow established for local end-to-end behavior.",
      "Premium dashboard shell released as baseline interface for operating-layer workflows.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-28 pt-40 text-center">
            <Eyebrow>Resources</Eyebrow>
            <h1
              className="mb-5 max-w-[20ch] text-5xl font-semibold md:text-6xl"
              style={{ color: "#ECEFF3", letterSpacing: "-0.035em", lineHeight: 1.03 }}
            >
              What shipped.
            </h1>
            <p
              className="mb-10 max-w-[52ch] text-lg leading-relaxed"
              style={{ color: "#A4ABB4" }}
            >
              Continuous releases across the Inovense operating layer. Updated with every version.
            </p>
          </section>

          {/* Timeline */}
          <section className="relative py-20">
            <SectionDivider />
            <div className="mx-auto max-w-2xl px-6 pt-16">
              <div className="relative flex flex-col gap-0">
                {/* Vertical line */}
                <div
                  className="absolute bottom-2 left-[7px] top-2 w-px"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                  aria-hidden
                />
                {entries.map((entry) => (
                  <div key={entry.version} className="relative flex gap-6 pb-12 last:pb-0">
                    {/* Cyan dot */}
                    <div className="relative mt-1 shrink-0">
                      <span
                        className="block h-3.5 w-3.5 rounded-full border-2"
                        style={{
                          background: "#06070A",
                          borderColor: "#4DE8E1",
                          boxShadow: "0 0 8px rgba(77,232,225,0.3)",
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <span
                          className="font-mono text-xs"
                          style={{ color: "#4A4F57" }}
                        >
                          {entry.date}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-0.5 font-mono text-[11px]"
                          style={{
                            border: "1px solid rgba(77,232,225,0.25)",
                            color: "#4DE8E1",
                          }}
                        >
                          {entry.version}
                        </span>
                      </div>
                      <h3
                        className="mb-4 text-base font-semibold"
                        style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
                      >
                        {entry.title}
                      </h3>
                      <ul className="space-y-2.5">
                        {entry.changes.map((change) => (
                          <li key={change} className="flex items-start gap-2.5">
                            <span
                              className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                              style={{ background: "#4A4F57" }}
                            />
                            <span className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
                              {change}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <p
                className="mt-16 text-center font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Releases ship continuously.
              </p>
            </div>
          </section>
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

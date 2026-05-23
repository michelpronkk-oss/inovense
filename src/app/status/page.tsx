import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import {
  PageShell,
  PageHero,
  MktCard,
  SectionDivider,
} from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Status",
  description: "Live status for Inovense platform services. Agent runtime, workflow execution, connector APIs, approval queue, and memory layer.",
  alternates: {
    canonical: "https://inovense.com/status",
  },
  openGraph: {
    url: "https://inovense.com/status",
    title: "Status | Inovense",
    description: "Live status for Inovense platform services. Agent runtime, workflow execution, connector APIs, approval queue, and memory layer.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Status | Inovense",
    description: "Live status for Inovense platform services. Agent runtime, workflow execution, connector APIs, approval queue, and memory layer.",
  },
};

const systems = [
  "API",
  "Dashboard",
  "Connector runtime",
  "Agent runtime",
  "Workflow execution",
  "Webhooks",
];

const metrics = [
  { label: "API uptime (30d)", value: "99.9%" },
  { label: "Workflow success rate", value: "99.4%" },
  { label: "Approval queue review", value: "4m median" },
];

export default function StatusPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          {/* Hero */}
          <PageHero
            eyebrow="Resources"
            heading="System Status"
            description="All systems operational."
          >
            <div className="flex items-center justify-center gap-2.5">
              <span
                className="h-3 w-3 rounded-full bg-emerald-400"
                style={{ boxShadow: "0 0 10px rgba(52,211,153,0.6)" }}
              />
              <span
                className="font-mono text-xs uppercase tracking-[0.16em]"
                style={{ color: "#34D399" }}
              >
                All systems operational
              </span>
            </div>
            <span
              className="inline-block rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em]"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "#4A4F57",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)",
              }}
            >
              v1.18.2
            </span>
          </PageHero>

          {/* System list */}
          <section className="relative py-12 md:py-20">
            <SectionDivider />
            <div className="mx-auto max-w-3xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Services
              </span>
              <h2
                className="mb-10 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                All services running normally.
              </h2>
              <p className="mb-8 text-sm" style={{ color: "#6B7178" }}>
                Status reflects the current product preview environment.
              </p>
              <div className="flex flex-col gap-3">
                {systems.map((system) => (
                  <div
                    key={system}
                    className="flex items-center justify-between rounded-xl px-5 py-4"
                    style={{
                      background: "rgba(13,16,21,0.6)",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-sm font-medium" style={{ color: "#A4ABB4" }}>
                        {system}
                      </span>
                    </div>
                    <span className="font-mono text-xs" style={{ color: "#34D399" }}>
                      Operational
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Metrics */}
          <section className="relative py-12 md:py-20" style={{ background: "rgba(13,16,21,0.5)" }}>
            <SectionDivider />
            <div className="mx-auto max-w-3xl px-6 pt-8 md:pt-16">
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                Performance
              </span>
              <h2
                className="mb-10 mt-3 text-3xl font-semibold md:text-4xl"
                style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
              >
                Response time metrics.
              </h2>
              <div className="grid gap-5 sm:grid-cols-3">
                {metrics.map((m) => (
                  <MktCard key={m.label} className="text-center">
                    <p
                      className="mb-1 font-mono text-2xl font-semibold"
                      style={{ color: "#ECEFF3" }}
                    >
                      {m.value}
                    </p>
                    <p className="text-xs" style={{ color: "#4A4F57" }}>
                      {m.label}
                    </p>
                  </MktCard>
                ))}
              </div>

              {/* Incident row */}
              <p
                className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "#4A4F57" }}
              >
                No incidents in the last 30 days.
              </p>
            </div>
            <SectionDivider />
          </section>

          {/* Subscribe */}
          <section className="relative py-12 md:py-20">
            <div className="mx-auto max-w-4xl px-6 text-center">
              <p className="mb-6 text-sm" style={{ color: "#6B7178" }}>
                Subscribe to status updates for real-time incident alerts.
              </p>
              <a
                href="mailto:hello@inovense.com?subject=Status updates subscription"
                className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  color: "#ECEFF3",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                Subscribe to updates
              </a>
            </div>
          </section>
        </PageShell>
      </main>
      <Footer />
    </>
  );
}

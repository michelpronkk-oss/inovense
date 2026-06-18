import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Reveal from "@/components/reveal";
import { PageShell, Eyebrow } from "@/components/marketing-ui";
import { OperatorCard } from "@/components/operators/operator-card";
import { OPERATORS } from "@/data/operators";
import { appHref } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Operators",
  description:
    "Fifteen AI operators that run the same Detect, Prepare, Approve, Execute, Log loop across revenue, delivery, operations and growth.",
  alternates: {
    canonical: "https://inovense.com/operators",
  },
  openGraph: {
    url: "https://inovense.com/operators",
    title: "Operators | Inovense",
    description:
      "Fifteen AI operators that run the same Detect, Prepare, Approve, Execute, Log loop across revenue, delivery, operations and growth.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Operators | Inovense",
    description:
      "Fifteen AI operators that run the same Detect, Prepare, Approve, Execute, Log loop across revenue, delivery, operations and growth.",
  },
};

const LOOP_STEPS = [
  { label: "Detect", gate: false },
  { label: "Prepare", gate: false },
  { label: "Approve", gate: true },
  { label: "Execute", gate: false },
  { label: "Log", gate: false },
];

const WAVES = [
  {
    tag: "Launch wave",
    heading: "The first nine operators.",
    intro: "The roster that covers revenue, delivery, operations and growth from day one.",
    items: OPERATORS.slice(0, 9),
    start: 0,
  },
  {
    tag: "Expanding",
    heading: "Six more as you scale.",
    intro: "Switched on once the first operators have proven their loop inside your business.",
    items: OPERATORS.slice(9),
    start: 9,
  },
];

export default function OperatorsPage() {
  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <Nav />
      <main>
        <PageShell>
          {/* Intro */}
          <section className="mx-auto w-full max-w-[1240px] px-5 pb-10 pt-28 sm:px-6 sm:pt-32 md:pt-36 lg:px-8">
            <Reveal>
              <Eyebrow>Operators</Eyebrow>
              <h1
                className="font-medium"
                style={{
                  color: "#ECEFF3",
                  fontSize: "clamp(40px, 5.4vw, 68px)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.035em",
                  maxWidth: "16ch",
                }}
              >
                Fifteen operators.
                <br />
                One operating layer<span style={{ color: "#4DE8E1" }}>.</span>
              </h1>
              <p
                className="mt-[22px] text-lg leading-[1.55] text-pretty"
                style={{ color: "#9AA1AA", maxWidth: "56ch" }}
              >
                Each Inovense operator owns a role and runs the same disciplined loop: it detects the work, prepares the output, asks for approval where it matters, executes through your real tools, and logs everything it learns.
              </p>
            </Reveal>

            {/* Loop legend */}
            <Reveal delayMs={120}>
              <div
                className="mt-10 flex flex-wrap items-stretch gap-2.5 rounded-2xl p-[18px]"
                style={{
                  background: "linear-gradient(180deg, rgba(13,16,21,0.7), rgba(8,10,14,0.5))",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)",
                }}
              >
                <div
                  className="flex w-full flex-col justify-center gap-[3px] border-b py-0 pb-3 pr-0 sm:w-auto sm:border-b-0 sm:border-r sm:py-1 sm:pr-[18px] sm:pb-1"
                  style={{ borderColor: "rgba(255,255,255,0.055)" }}
                >
                  <span
                    className="font-mono text-[10px] uppercase"
                    style={{ color: "#646A72", letterSpacing: "0.12em" }}
                  >
                    Every operator
                  </span>
                  <span className="text-sm font-medium" style={{ color: "#ECEFF3", letterSpacing: "-0.01em" }}>
                    runs one loop
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {LOOP_STEPS.map((step, i) => (
                    <span key={step.label} className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-2 rounded-[10px] px-[13px] py-2 text-[13px] font-medium"
                        style={
                          step.gate
                            ? {
                                background: "rgba(245,194,107,0.12)",
                                boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.30)",
                                color: "#F5C26B",
                              }
                            : {
                                background: "rgba(255,255,255,0.025)",
                                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)",
                                color: "#9AA1AA",
                              }
                        }
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: step.gate ? "#F5C26B" : "#4DE8E1",
                            boxShadow: step.gate ? "0 0 6px #F5C26B" : "0 0 6px #4DE8E1",
                          }}
                        />
                        {step.label}
                      </span>
                      {i < LOOP_STEPS.length - 1 && (
                        <span style={{ color: "#454A51" }} className="text-sm">
                          &rarr;
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>

          {/* Waves */}
          {WAVES.map((wave, waveIdx) => (
            <section
              key={wave.tag}
              className={`mx-auto w-full max-w-[1240px] px-5 sm:px-6 lg:px-8 ${waveIdx === 0 ? "pt-12 md:pt-16" : "pt-16 md:pt-20"}`}
            >
              <Reveal>
                <div
                  className="mb-7 flex flex-col items-start gap-2.5 border-b pb-[22px] min-[881px]:flex-row min-[881px]:items-end min-[881px]:justify-between min-[881px]:gap-6"
                  style={{ borderColor: "rgba(255,255,255,0.055)" }}
                >
                  <div>
                    <span
                      className="inline-flex whitespace-nowrap rounded-full px-3 py-[5px] font-mono text-[10.5px] uppercase"
                      style={{
                        color: "#4DE8E1",
                        letterSpacing: "0.1em",
                        background: "rgba(77,232,225,0.10)",
                        boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.26)",
                      }}
                    >
                      {wave.tag}
                    </span>
                    <h2
                      className="mt-2 font-medium"
                      style={{ color: "#ECEFF3", fontSize: "27px", lineHeight: 1.1, letterSpacing: "-0.025em" }}
                    >
                      {wave.heading}
                    </h2>
                  </div>
                  <p className="text-[14.5px]" style={{ color: "#646A72", maxWidth: "42ch" }}>
                    {wave.intro}
                  </p>
                </div>
              </Reveal>

              <div className="grid gap-4 min-[881px]:grid-cols-2">
                {wave.items.map((operator, i) => (
                  <Reveal key={operator.name} delayMs={(i % 2) * 80}>
                    <OperatorCard operator={operator} index={wave.start + i} />
                  </Reveal>
                ))}
              </div>
            </section>
          ))}

          {/* Final CTA */}
          <section className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-6 md:py-20 lg:px-8">
            <Reveal>
              <div
                className="relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-8 md:py-20"
                style={{
                  background: "linear-gradient(180deg, #0A0D12, #06080B)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055), 0 60px 120px -50px rgba(0,0,0,0.6)",
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[-200px] h-[500px] w-[800px] -translate-x-1/2 blur-3xl"
                  style={{ background: "radial-gradient(ellipse at center, rgba(77,232,225,0.16), transparent 60%)" }}
                />
                <div className="relative flex flex-col items-center gap-4">
                  <div
                    className="mb-1.5 grid h-[60px] w-[60px] place-items-center rounded-2xl"
                    style={{ background: "rgba(77,232,225,0.06)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.26)" }}
                  >
                    <svg width="30" height="30" viewBox="0 0 32 32" fill="#4DE8E1" aria-hidden>
                      <rect x="5" y="5" width="22" height="4.5" />
                      <rect x="13" y="9.5" width="6" height="6" />
                      <rect x="13" y="16.5" width="6" height="6" />
                      <rect x="5" y="22.5" width="22" height="4.5" />
                    </svg>
                  </div>
                  <h2
                    className="font-medium"
                    style={{ color: "#ECEFF3", fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: 1.12, letterSpacing: "-0.025em", maxWidth: "20ch" }}
                  >
                    Start with one operator. Add the rest as it earns trust.
                  </h2>
                  <p className="text-base" style={{ color: "#9AA1AA", maxWidth: "52ch" }}>
                    Deploy a single operator inside your boundaries today, watch every action it prepares, and expand into a full operating team when the value is undeniable.
                  </p>
                  <div className="mt-2.5 flex flex-wrap justify-center gap-3">
                    <Link
                      href={appHref("/app/onboarding")}
                      className="inline-flex items-center gap-2 rounded-xl px-[22px] py-3.5 text-[15px] font-medium transition-all duration-150 hover:-translate-y-px"
                      style={{
                        background: "#4DE8E1",
                        color: "#04130F",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 24px -10px rgba(77,232,225,0.55)",
                      }}
                    >
                      Start preview
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                    <Link
                      href="/"
                      className="inline-flex items-center rounded-xl px-[22px] py-3.5 text-[15px] font-medium transition-colors duration-150"
                      style={{ background: "rgba(255,255,255,0.025)", color: "#ECEFF3", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.085)" }}
                    >
                      View platform
                    </Link>
                  </div>
                  <div
                    className="mt-3.5 flex flex-wrap justify-center gap-4 font-mono text-[11.5px]"
                    style={{ color: "#646A72" }}
                  >
                    <span>Approval before execution</span>
                    <span style={{ color: "#454A51" }}>&middot;</span>
                    <span>Every action logged</span>
                    <span style={{ color: "#454A51" }}>&middot;</span>
                    <span>SOC 2 Type II</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        </PageShell>
      </main>
      <Footer />
    </div>
  );
}

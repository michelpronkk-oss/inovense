"use client";

import Reveal from "@/components/reveal";
import { Eyebrow } from "@/components/marketing-ui";
import { useEarlyAccess } from "@/components/early-access/early-access-provider";
import { Icon } from "./icons";
import { pricingPlans } from "@/lib/pricing";

const LINE = "rgba(255,255,255,0.055)";
const LINE_2 = "rgba(255,255,255,0.085)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const CYAN = "#4DE8E1";
const CYAN_LINE = "rgba(77,232,225,0.28)";

export default function PricingSection() {
  const { openEarlyAccess, hasSubmitted } = useEarlyAccess();
  return (
    <section id="pricing" className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-6 md:py-24 lg:px-8">
      <Reveal>
        <div className="mb-12 flex flex-col items-center text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2
            className="font-medium"
            style={{ color: TEXT, fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.12, letterSpacing: "-0.03em" }}
          >
            Pay for outcomes,
            <br />
            not seats.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: TEXT_MUTE, maxWidth: "52ch" }}>
            Every plan includes the full operating layer — operators, workflows, memory, approvals, audit and
            connectors. Scale changes the volume, not the surface.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-4 min-[881px]:grid-cols-3">
        {pricingPlans.map((t, i) => (
          <Reveal key={t.plan_tier} delayMs={i * 70}>
            <div
              className="relative flex h-full flex-col rounded-2xl p-6 pt-7"
              style={
                t.featured
                  ? {
                      background: "linear-gradient(180deg, #0E141A, #07090C)",
                      boxShadow: `inset 0 0 0 1px ${CYAN_LINE}, 0 0 0 1px rgba(77,232,225,0.04), 0 30px 80px -30px rgba(77,232,225,0.18)`,
                    }
                  : {
                      background: "linear-gradient(180deg, #0D1015, #08090D)",
                      boxShadow: `inset 0 0 0 1px ${LINE}`,
                    }
              }
            >
              {t.featured && (
                <span
                  className="absolute -top-2.5 left-6 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.10em]"
                  style={{ background: CYAN, color: "#04130F" }}
                >
                  Most chosen
                </span>
              )}
              <div className="text-[18px] font-medium" style={{ color: TEXT, letterSpacing: "-0.015em" }}>
                {t.plan_name}
              </div>
              <div className="mt-1.5 text-[13.5px]" style={{ color: TEXT_MUTE }}>
                {t.tagline}
              </div>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-[40px] font-medium" style={{ color: TEXT, letterSpacing: "-0.03em" }}>
                  {t.price}
                </span>
                {t.period && (
                  <span className="font-mono text-[12.5px]" style={{ color: TEXT_MUTE }}>
                    {t.period}
                  </span>
                )}
              </div>
              <div className="mt-1 font-mono text-[11.5px]" style={{ color: TEXT_MUTE }}>
                {t.billingLabel}
              </div>

              <button
                  type="button"
                  onClick={(event) => openEarlyAccess({ plan: t.plan_tier, trigger: event.currentTarget })}
                  className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-medium transition-all duration-150 hover:-translate-y-px`}
                  style={
                    t.featured
                      ? { background: CYAN, color: "#04130F", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 24px -10px rgba(77,232,225,0.55)" }
                      : { background: "rgba(255,255,255,0.025)", color: TEXT, boxShadow: `inset 0 0 0 1px ${LINE_2}` }
                  }
                >
                  {hasSubmitted ? "Request received" : "Request early access"}
                  {!hasSubmitted && <Icon name="arrow" size={13} />}
              </button>

              <div className="my-5 h-px" style={{ background: LINE }} />

              <ul className="flex flex-col gap-2.5">
                {t.features.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-[13.5px]" style={{ color: TEXT_DIM }}>
                    <Icon name="check" size={12} style={{ color: CYAN, flexShrink: 0 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="mt-7 text-center font-mono text-[12px]" style={{ color: TEXT_MUTE }}>
          Need volume actions, custom operators, or a private deployment?{" "}
          <a href="mailto:hello@auterim.com?subject=Sales%20inquiry" style={{ color: CYAN }}>
            Talk to us
          </a>
          .
        </p>
      </Reveal>
    </section>
  );
}

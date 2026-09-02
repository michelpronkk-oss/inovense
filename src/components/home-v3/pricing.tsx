import Link from "next/link";
import Reveal from "@/components/reveal";
import { Eyebrow } from "@/components/marketing-ui";
import { Icon } from "./icons";
import { appHref } from "@/lib/urls";

const LINE = "rgba(255,255,255,0.055)";
const LINE_2 = "rgba(255,255,255,0.085)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const CYAN = "#4DE8E1";
const CYAN_LINE = "rgba(77,232,225,0.28)";

const TIERS = [
  {
    name: "Starter",
    tagline: "For a single operator inside one team.",
    price: "$0",
    unit: "/ workspace",
    hint: "Free during preview",
    bullets: ["1 operator", "5 connectors", "1,000 actions / mo", "Slack + email approvals", "Community support"],
    cta: "Start preview",
    featured: false,
  },
  {
    name: "Growth",
    tagline: "When AI starts running real workflows.",
    price: "$1,200",
    unit: "/ workspace · month",
    hint: "Billed annually",
    bullets: ["Up to 8 operators", "All connectors", "50k actions / mo", "Approval policies & roles", "Audit logs · 90 days", "Email + Slack support"],
    cta: "Start preview",
    featured: true,
  },
  {
    name: "Enterprise",
    tagline: "For regulated, multi-team operations.",
    price: "Custom",
    unit: "",
    hint: "Annual contract",
    bullets: ["Unlimited operators", "Custom connectors & private models", "SSO/SCIM · SOC 2 · HIPAA", "Data residency · KMS", "Dedicated success + SLA", "Procurement & legal review"],
    cta: "Contact sales",
    featured: false,
  },
];

export default function PricingSection() {
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
        {TIERS.map((t, i) => (
          <Reveal key={t.name} delayMs={i * 70}>
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
                {t.name}
              </div>
              <div className="mt-1.5 text-[13.5px]" style={{ color: TEXT_MUTE }}>
                {t.tagline}
              </div>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-[40px] font-medium" style={{ color: TEXT, letterSpacing: "-0.03em" }}>
                  {t.price}
                </span>
                {t.unit && (
                  <span className="font-mono text-[12.5px]" style={{ color: TEXT_MUTE }}>
                    {t.unit}
                  </span>
                )}
              </div>
              <div className="mt-1 font-mono text-[11.5px]" style={{ color: TEXT_MUTE }}>
                {t.hint}
              </div>

              {t.cta === "Contact sales" ? (
                <a
                  href="mailto:hello@auterim.com?subject=Sales%20inquiry"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-medium transition-colors duration-150"
                  style={{ background: "rgba(255,255,255,0.025)", color: TEXT, boxShadow: `inset 0 0 0 1px ${LINE_2}` }}
                >
                  {t.cta}
                  <Icon name="arrow" size={13} />
                </a>
              ) : (
                <Link
                  href={appHref("/app/onboarding")}
                  className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-medium transition-all duration-150 hover:-translate-y-px`}
                  style={
                    t.featured
                      ? { background: CYAN, color: "#04130F", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 24px -10px rgba(77,232,225,0.55)" }
                      : { background: "rgba(255,255,255,0.025)", color: TEXT, boxShadow: `inset 0 0 0 1px ${LINE_2}` }
                  }
                >
                  {t.cta}
                  <Icon name="arrow" size={13} />
                </Link>
              )}

              <div className="my-5 h-px" style={{ background: LINE }} />

              <ul className="flex flex-col gap-2.5">
                {t.bullets.map((b) => (
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

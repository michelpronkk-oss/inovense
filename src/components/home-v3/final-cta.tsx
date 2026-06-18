import Link from "next/link";
import Reveal from "@/components/reveal";
import { Icon } from "./icons";
import { appHref } from "@/lib/urls";

const LINE = "rgba(255,255,255,0.055)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const TEXT_FAINT = "#454A51";
const CYAN = "#4DE8E1";
const CYAN_LINE = "rgba(77,232,225,0.26)";

function InovenseMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <g fill={CYAN}>
        <rect x="10" y="10" width="44" height="9" />
        <rect x="26" y="19" width="12" height="12" />
        <rect x="26" y="33" width="12" height="12" />
        <rect x="10" y="45" width="44" height="9" />
      </g>
    </svg>
  );
}

export default function FinalCTA() {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-5 py-12 sm:px-6 md:py-16 lg:px-8">
      <Reveal>
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-8 md:py-24"
          style={{
            background: "linear-gradient(180deg, #0A0D12, #06080B)",
            boxShadow: `inset 0 0 0 1px ${LINE}, 0 60px 120px -40px rgba(0,0,0,0.6)`,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 80%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-200px] h-[500px] w-[900px] -translate-x-1/2 blur-3xl"
            style={{ background: "radial-gradient(ellipse at center, rgba(77,232,225,0.18), transparent 60%)" }}
          />

          <div className="relative flex flex-col items-center gap-4">
            <div
              className="mb-1.5 rounded-2xl p-4"
              style={{ background: "rgba(77,232,225,0.06)", boxShadow: `inset 0 0 0 1px ${CYAN_LINE}` }}
            >
              <InovenseMark size={36} />
            </div>
            <h2
              className="font-medium"
              style={{ color: TEXT, fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15, letterSpacing: "-0.03em", maxWidth: "20ch" }}
            >
              The next decade of business
              <br />
              will be run inside an OS.
            </h2>
            <p className="text-base leading-[1.6]" style={{ color: TEXT_DIM, maxWidth: "52ch" }}>
              Inovense is building the operating layer it deserves. Start with one operator today, expand
              into a full operating team when the value is undeniable.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Link
                href={appHref("/app/onboarding")}
                className="inline-flex items-center gap-2 rounded-xl px-[22px] py-3.5 text-[15px] font-medium transition-all duration-150 hover:-translate-y-px"
                style={{
                  background: CYAN,
                  color: "#04130F",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 24px -10px rgba(77,232,225,0.55)",
                }}
              >
                Start preview
                <Icon name="arrow" size={14} />
              </Link>
              <a
                href="mailto:hello@inovense.com?subject=Book%20a%2020-min%20demo"
                className="inline-flex items-center rounded-xl px-[22px] py-3.5 text-[15px] font-medium transition-colors duration-150"
                style={{ background: "rgba(255,255,255,0.025)", color: TEXT, boxShadow: `inset 0 0 0 1px ${LINE}` }}
              >
                Book a 20-min demo
              </a>
            </div>
            <div className="mt-3.5 flex flex-wrap justify-center gap-4 font-mono text-[11.5px]" style={{ color: TEXT_MUTE }}>
              <span>No credit card</span>
              <span style={{ color: TEXT_FAINT }}>&middot;</span>
              <span>SOC 2 Type II</span>
              <span style={{ color: TEXT_FAINT }}>&middot;</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

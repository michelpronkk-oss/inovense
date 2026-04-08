import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  CREATIVE_FORMAT_SPECS,
  CREATIVE_MODE_SPECS,
  CREATIVE_TEMPLATE_SPECS,
  SERVICE_LANE_STYLES,
  type BackgroundMode,
  type CreativeFormatId,
  type CreativeMode,
  type CreativeState,
  type ServiceLaneStyle,
} from "./types";

interface CreativeCanvasProps {
  state: CreativeState;
  className?: string;
}

interface TemplateProps {
  state: CreativeState;
  format: CreativeFormatId;
  laneStyle: ServiceLaneStyle;
  accentStrength: number;
}

const HEADLINE_SIZE: Record<CreativeFormatId, string> = {
  square: "text-[clamp(1.6rem,4.8vw,3.2rem)] leading-[1.06]",
  portrait: "text-[clamp(1.5rem,4.3vw,3rem)] leading-[1.08]",
  story: "text-[clamp(1.8rem,5.6vw,3.6rem)] leading-[1.04]",
  landscape: "text-[clamp(1.35rem,2.9vw,2.5rem)] leading-[1.08]",
};

const BODY_SIZE: Record<CreativeFormatId, string> = {
  square: "text-[clamp(0.85rem,1.8vw,1.02rem)] leading-relaxed",
  portrait: "text-[clamp(0.83rem,1.6vw,0.98rem)] leading-relaxed",
  story: "text-[clamp(0.92rem,2vw,1.08rem)] leading-relaxed",
  landscape: "text-[clamp(0.8rem,1.12vw,0.94rem)] leading-relaxed",
};

const CTA_SIZE: Record<CreativeFormatId, string> = {
  square: "text-[11px]",
  portrait: "text-[11px]",
  story: "text-[12px]",
  landscape: "text-[10px]",
};

function alphaColor(accentRgb: string, alpha: number) {
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${accentRgb} / ${clamped})`;
}

function modeChipStyles(mode: CreativeMode) {
  switch (mode) {
    case "Brand":
      return "border-zinc-600/70 bg-zinc-900/80 text-zinc-200";
    case "Social":
      return "border-sky-300/35 bg-sky-300/10 text-sky-200";
    case "Ad":
      return "border-brand/40 bg-brand/15 text-zinc-100";
    default:
      return "border-zinc-600/70 bg-zinc-900/80 text-zinc-200";
  }
}

export function CreativeCanvas({ state, className }: CreativeCanvasProps) {
  const format = CREATIVE_FORMAT_SPECS[state.format];
  const laneStyle = SERVICE_LANE_STYLES[state.serviceLane];
  const accentStrength = state.accentIntensity / 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[900px]">
        <div
          className="relative overflow-hidden rounded-[1.55rem] border border-zinc-700/70 bg-[#05060a] shadow-[0_34px_130px_rgba(0,0,0,0.72)]"
          style={{ aspectRatio: `${format.width} / ${format.height}` }}
        >
          <CanvasBackdrop
            mode={state.mode}
            backgroundMode={state.backgroundMode}
            accentRgb={laneStyle.accentRgb}
            accentStrength={accentStrength}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-black/42" />

          <div className="relative z-10 flex h-full flex-col p-[clamp(1rem,2.15vw,2rem)]">
            <FrameMeta state={state} laneStyle={laneStyle} accentStrength={accentStrength} />
            <div className="mt-3.5 flex flex-1">{renderTemplate({ state, format: state.format, laneStyle, accentStrength })}</div>
          </div>

          {state.showLogo && (
            <div className="pointer-events-none absolute bottom-[clamp(0.8rem,1.8vw,1.35rem)] right-[clamp(0.85rem,1.8vw,1.35rem)] z-20 opacity-95">
              <Image
                src="/logo.png"
                alt="Inovense"
                width={124}
                height={28}
                className="h-auto w-[clamp(78px,10vw,124px)]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CanvasBackdrop({
  mode,
  backgroundMode,
  accentRgb,
  accentStrength,
}: {
  mode: CreativeMode;
  backgroundMode: BackgroundMode;
  accentRgb: string;
  accentStrength: number;
}) {
  const softGlow = 0.08 + accentStrength * 0.1;
  const mediumGlow = 0.17 + accentStrength * 0.18;

  return (
    <>
      <div className="absolute inset-0 bg-[#05060a]" />
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_-12%,rgba(255,255,255,0.1)_0%,rgba(5,6,10,1)_58%)]" />

      <div
        className="absolute -left-[22%] top-[-40%] h-[90%] w-[88%] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${alphaColor(accentRgb, softGlow)} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute right-[-16%] top-[25%] h-[60%] w-[54%] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${alphaColor(accentRgb, softGlow * 0.85)} 0%, transparent 72%)`,
        }}
      />

      {backgroundMode === "Grid" && (
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "58px 58px",
          }}
        />
      )}

      {backgroundMode === "Spotlight" && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 62% 34%, ${alphaColor(accentRgb, mediumGlow)} 0%, transparent 45%), radial-gradient(circle at 22% 78%, rgba(255,255,255,0.08) 0%, transparent 44%)`,
          }}
        />
      )}

      {backgroundMode === "Panel" && (
        <>
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(113deg, transparent 0%, rgba(255,255,255,0.16) 49%, transparent 50%), linear-gradient(113deg, transparent 16%, rgba(255,255,255,0.1) 16.35%, transparent 16.7%)",
              backgroundSize: "135% 130%",
            }}
          />
          <div className="absolute left-[8%] top-[14%] h-[24%] w-[42%] rounded-2xl border border-zinc-700/55 bg-zinc-900/30" />
          <div className="absolute right-[7%] bottom-[12%] h-[26%] w-[31%] rounded-2xl border border-zinc-700/55 bg-zinc-900/24" />
        </>
      )}

      {mode === "Ad" && (
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${alphaColor(accentRgb, 0.52 + accentStrength * 0.28)} 50%, transparent 100%)`,
          }}
        />
      )}
    </>
  );
}

function FrameMeta({
  state,
  laneStyle,
  accentStrength,
}: {
  state: CreativeState;
  laneStyle: ServiceLaneStyle;
  accentStrength: number;
}) {
  const proof = state.proofBadge.trim();
  const templateLabel = CREATIVE_TEMPLATE_SPECS[state.template].label;

  return (
    <div className="flex items-start justify-between gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em]", modeChipStyles(state.mode))}>
          {CREATIVE_MODE_SPECS[state.mode].label}
        </span>

        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
            laneStyle.textColor,
          )}
          style={{
            borderColor: alphaColor(laneStyle.accentRgb, 0.36 + accentStrength * 0.22),
            backgroundColor: alphaColor(laneStyle.accentRgb, 0.1 + accentStrength * 0.13),
          }}
        >
          {state.serviceLane}
        </span>

        <span className="inline-flex rounded-full border border-zinc-700/70 bg-zinc-950/75 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
          {state.eyebrow || templateLabel}
        </span>
      </div>

      {proof ? (
        <span className="inline-flex rounded-full border border-zinc-600/75 bg-zinc-950/75 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-300">
          {proof}
        </span>
      ) : null}
    </div>
  );
}

function CtaPill({
  text,
  laneStyle,
  accentStrength,
  format,
  strong,
}: {
  text: string;
  laneStyle: ServiceLaneStyle;
  accentStrength: number;
  format: CreativeFormatId;
  strong?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-4 py-1.5 font-semibold uppercase tracking-[0.12em]",
        CTA_SIZE[format],
        strong ? "text-white" : "text-zinc-100",
      )}
      style={{
        borderColor: alphaColor(laneStyle.accentRgb, strong ? 0.52 + accentStrength * 0.3 : 0.4 + accentStrength * 0.24),
        backgroundColor: alphaColor(laneStyle.accentRgb, strong ? 0.24 + accentStrength * 0.22 : 0.14 + accentStrength * 0.16),
        boxShadow: `0 0 28px ${alphaColor(laneStyle.accentRgb, 0.18 + accentStrength * 0.2)}`,
      }}
    >
      {text || "Learn more"}
    </span>
  );
}

function renderTemplate(props: TemplateProps) {
  switch (props.state.template) {
    case "silent_statement":
      return <SilentStatementTemplate {...props} />;
    case "founder_signal":
      return <FounderSignalTemplate {...props} />;
    case "brand_thesis":
      return <BrandThesisTemplate {...props} />;
    case "authority_quote":
      return <AuthorityQuoteTemplate {...props} />;
    case "case_spotlight":
      return <CaseSpotlightTemplate {...props} />;
    case "proof_card":
      return <ProofCardTemplate {...props} />;
    case "launch_post":
      return <LaunchPostTemplate {...props} />;
    case "insight_post":
      return <InsightPostTemplate {...props} />;
    case "offer_ad":
      return <OfferAdTemplate {...props} />;
    case "pain_point_ad":
      return <PainPointAdTemplate {...props} />;
    case "service_cta_ad":
      return <ServiceCtaAdTemplate {...props} />;
    case "landing_page_ad":
      return <LandingPageAdTemplate {...props} />;
    case "systems_ad":
      return <SystemsAdTemplate {...props} />;
    case "growth_ad":
      return <GrowthAdTemplate {...props} />;
    default:
      return null;
  }
}

function SilentStatementTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="relative flex w-full flex-col justify-center rounded-[1.28rem] border border-zinc-700/65 bg-zinc-950/35 p-[clamp(1rem,2.35vw,2rem)]">
      <div
        className="pointer-events-none absolute left-0 top-[16%] h-[68%] w-1 rounded-r"
        style={{
          background: `linear-gradient(to bottom, ${alphaColor(laneStyle.accentRgb, 0.08)}, ${alphaColor(laneStyle.accentRgb, 0.58 + accentStrength * 0.26)}, ${alphaColor(laneStyle.accentRgb, 0.08)})`,
        }}
      />

      <h2 className={cn("max-w-[92%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
      <p className={cn("mt-6 max-w-[84%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

      <div className="mt-8 border-t border-zinc-700/70 pt-4">
        <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Inovense position</span>
      </div>
    </section>
  );
}

function FounderSignalTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="grid w-full grid-cols-[1.08fr_0.92fr] gap-3">
      <div className="rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/40 p-[clamp(1rem,2.15vw,1.75rem)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Founder note</p>
        <h2 className={cn("mt-3 max-w-[96%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[94%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <aside className="flex flex-col justify-between rounded-[1.2rem] border border-zinc-700/70 bg-zinc-950/62 p-[clamp(0.95rem,1.95vw,1.45rem)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Signal</p>
          <div className="mt-3 space-y-2 text-[12px] text-zinc-300">
            <p>Clarity before velocity.</p>
            <p>Infrastructure before spend.</p>
            <p>Compounding execution.</p>
          </div>
        </div>

        <div
          className="rounded-xl border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-200"
          style={{
            borderColor: alphaColor(laneStyle.accentRgb, 0.4),
            backgroundColor: alphaColor(laneStyle.accentRgb, 0.14 + accentStrength * 0.12),
          }}
        >
          {state.ctaText || "From the founder"}
        </div>
      </aside>
    </section>
  );
}

function BrandThesisTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const points = [
    "Web, systems, and growth must be one operating stack.",
    "Authority is built through repeatable delivery, not noise.",
    "Decision speed rises when execution surfaces are aligned.",
  ];

  return (
    <section className="grid w-full grid-cols-[1.3fr_1fr] gap-3">
      <div className="rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/40 p-[clamp(1rem,2.15vw,1.8rem)]">
        <h2 className={cn("max-w-[96%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[92%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <aside className="rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/62 p-[clamp(0.9rem,1.85vw,1.45rem)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Thesis pillars</p>
        <div className="mt-3 space-y-2.5">
          {points.map((point, index) => (
            <div key={point} className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">0{index + 1}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-300">{point}</p>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} />
        </div>
      </aside>
    </section>
  );
}

function AuthorityQuoteTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="relative flex w-full flex-col justify-center rounded-[1.25rem] border border-zinc-700/60 bg-zinc-950/40 p-[clamp(1rem,2.2vw,1.9rem)]">
      <span className="pointer-events-none absolute left-[clamp(0.7rem,1.4vw,1.3rem)] top-[clamp(0.3rem,1vw,0.9rem)] font-serif text-[clamp(4rem,12vw,8rem)] leading-none text-zinc-700" aria-hidden>
        &quot;
      </span>

      <blockquote className="relative z-10 max-w-[94%]">
        <p className={cn("font-medium tracking-tight text-zinc-100", HEADLINE_SIZE[format])}>{state.title}</p>
        <p className={cn("mt-5 max-w-[86%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </blockquote>

      <div className="mt-8 flex items-center justify-between border-t border-zinc-700/65 pt-4">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Editorial authority</span>
        <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} />
      </div>
    </section>
  );
}

function CaseSpotlightTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const isWide = format === "landscape";

  return (
    <section className={cn("grid w-full gap-3", isWide ? "grid-cols-[1.35fr_1fr]" : "grid-cols-1")}>
      <div className="rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/38 p-[clamp(0.95rem,2vw,1.7rem)]">
        <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Case narrative</p>
        <h2 className={cn("mt-3 max-w-[95%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[95%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            ["Timeline", "8 weeks"],
            ["Focus", "Conversion + ops"],
            ["Lift", state.proofBadge || "Measured growth"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.13em] text-zinc-500">{k}</p>
              <p className="mt-1 text-[12px] font-medium text-zinc-200">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="flex flex-col justify-between rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/62 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Execution stack</p>
          <ul className="mt-3 space-y-2 text-[12px] text-zinc-300">
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand/70" />Funnel architecture rewrite</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand/60" />Automation route cleanup</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand/55" />Paid + content alignment</li>
          </ul>
        </div>

        <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} />
      </aside>
    </section>
  );
}

function ProofCardTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const proof = state.proofBadge || "Verified result";

  return (
    <section className="grid w-full grid-cols-[1.1fr_1fr] gap-3">
      <div
        className="flex flex-col justify-between rounded-[1.2rem] border px-[clamp(1rem,2vw,1.6rem)] py-[clamp(0.95rem,1.9vw,1.5rem)]"
        style={{
          borderColor: alphaColor(laneStyle.accentRgb, 0.44),
          backgroundColor: alphaColor(laneStyle.accentRgb, 0.13 + accentStrength * 0.16),
        }}
      >
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-100/80">Proof signal</span>
        <h2 className={cn("max-w-[95%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
        <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-100/80">{proof}</span>
      </div>

      <aside className="flex flex-col justify-between rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/62 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <p className={cn("max-w-[94%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

        <div className="mt-5 border-t border-zinc-700/65 pt-4">
          <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} />
        </div>
      </aside>
    </section>
  );
}

function LaunchPostTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const milestones = ["Define", "Build", "Ship", "Optimize"];

  return (
    <section className="relative flex w-full flex-col rounded-[1.24rem] border border-zinc-700/65 bg-zinc-950/40 p-[clamp(0.95rem,2vw,1.75rem)]">
      <h2 className={cn("max-w-[96%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
      <p className={cn("mt-4 max-w-[90%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {milestones.map((step, index) => (
          <div key={step} className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-2.5 py-2 text-center">
            <p className="text-[9px] uppercase tracking-[0.13em] text-zinc-500">0{index + 1}</p>
            <p className="mt-1 text-[11px] font-medium text-zinc-200">{step}</p>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-zinc-700/70 pt-4">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Launch communication</span>
        <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} />
      </div>
    </section>
  );
}

function InsightPostTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="grid w-full grid-cols-[1.25fr_1fr] gap-3">
      <div className="rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/36 p-[clamp(0.95rem,2vw,1.7rem)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Insight</p>
        <h2 className={cn("mt-3 max-w-[95%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[93%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <aside className="flex flex-col justify-between rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/62 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <div className="space-y-2">
          {["Context", "Constraint", "Move"].map((item, index) => (
            <div key={item} className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">0{index + 1} {item}</p>
            </div>
          ))}
        </div>

        <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} />
      </aside>
    </section>
  );
}

function OfferAdTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="relative grid w-full grid-cols-[1.2fr_1fr] gap-3">
      <div className="rounded-[1.22rem] border border-zinc-700/60 bg-zinc-950/35 p-[clamp(0.95rem,2.1vw,1.8rem)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Offer ad</p>
        <h2 className={cn("mt-3 max-w-[96%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[92%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <aside className="flex flex-col justify-between rounded-[1.22rem] border border-zinc-700/65 bg-zinc-950/66 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <div
          className="rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-100"
          style={{
            borderColor: alphaColor(laneStyle.accentRgb, 0.48 + accentStrength * 0.24),
            backgroundColor: alphaColor(laneStyle.accentRgb, 0.2 + accentStrength * 0.2),
          }}
        >
          {state.proofBadge || "Limited availability"}
        </div>

        <div className="space-y-2 text-[12px] text-zinc-300">
          <p>Strategic scope</p>
          <p>Implementation blueprint</p>
          <p>Leadership handoff</p>
        </div>

        <CtaPill
          text={state.ctaText || "Apply now"}
          laneStyle={laneStyle}
          accentStrength={accentStrength}
          format={format}
          strong
        />
      </aside>
    </section>
  );
}

function PainPointAdTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="grid w-full grid-cols-[1fr_1fr] gap-3">
      <div className="rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/62 p-[clamp(0.9rem,1.9vw,1.45rem)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Pain</p>
        <h2 className={cn("mt-3 max-w-[95%] font-semibold tracking-tight text-zinc-100", HEADLINE_SIZE[format])}>{state.title}</h2>
        <p className={cn("mt-4 text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <aside
        className="flex flex-col justify-between rounded-[1.2rem] border px-[clamp(0.9rem,1.9vw,1.45rem)] py-[clamp(0.9rem,1.9vw,1.45rem)]"
        style={{
          borderColor: alphaColor(laneStyle.accentRgb, 0.44 + accentStrength * 0.22),
          backgroundColor: alphaColor(laneStyle.accentRgb, 0.14 + accentStrength * 0.16),
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-100/85">Outcome</p>
        <p className="text-[14px] leading-relaxed text-zinc-100">
          Replace manual friction with one operating system for capture, routing, and delivery.
        </p>

        <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} strong />
      </aside>
    </section>
  );
}

function ServiceCtaAdTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="grid w-full grid-cols-[1.25fr_1fr] gap-3">
      <div className="rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/36 p-[clamp(0.95rem,2vw,1.7rem)]">
        <h2 className={cn("max-w-[94%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[92%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <aside className="rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/64 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">What you get</p>
        <div className="mt-3 space-y-2 text-[12px] text-zinc-300">
          <p className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">Strategy + execution</p>
          <p className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">Single accountable team</p>
          <p className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">Commercial clarity</p>
        </div>

        <div className="mt-3">
          <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} strong />
        </div>
      </aside>
    </section>
  );
}

function LandingPageAdTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="grid w-full grid-cols-[1.18fr_1fr] gap-3">
      <div className="rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/38 p-[clamp(0.95rem,1.9vw,1.6rem)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Landing page ad</p>
        <h2 className={cn("mt-3 max-w-[95%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[92%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <aside className="rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/64 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <div className="rounded-xl border border-zinc-700/55 bg-zinc-900/45 p-3">
          <div className="mb-2 h-2 w-24 rounded-full bg-zinc-700/70" />
          <div className="mb-1.5 h-1.5 w-full rounded-full bg-zinc-800" />
          <div className="mb-1.5 h-1.5 w-[84%] rounded-full bg-zinc-800" />
          <div className="mb-3 h-1.5 w-[71%] rounded-full bg-zinc-800" />
          <div
            className="h-7 w-28 rounded-full border"
            style={{
              borderColor: alphaColor(laneStyle.accentRgb, 0.45),
              backgroundColor: alphaColor(laneStyle.accentRgb, 0.16 + accentStrength * 0.14),
            }}
          />
        </div>

        <div className="mt-3">
          <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} strong />
        </div>
      </aside>
    </section>
  );
}

function SystemsAdTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const nodes = ["Capture", "Route", "Assign", "Deliver"];

  return (
    <section className="flex w-full flex-col rounded-[1.22rem] border border-zinc-700/65 bg-zinc-950/44 p-[clamp(0.95rem,2.05vw,1.75rem)]">
      <h2 className={cn("max-w-[92%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
      <p className={cn("mt-4 max-w-[90%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

      <div className="mt-5 flex items-center">
        {nodes.map((node, index) => (
          <div key={node} className="flex items-center">
            <div
              className="rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-100"
              style={{
                borderColor: alphaColor(laneStyle.accentRgb, 0.4),
                backgroundColor: alphaColor(laneStyle.accentRgb, 0.14 + accentStrength * 0.13),
              }}
            >
              {node}
            </div>
            {index < nodes.length - 1 ? <div className="mx-1.5 h-px w-5 bg-zinc-700/70" /> : null}
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-zinc-700/70 pt-4">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Automation-ready architecture</span>
        <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} strong />
      </div>
    </section>
  );
}

function GrowthAdTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const bars = [28, 32, 35, 33, 38, 42, 45, 49];
  const max = 49;

  return (
    <section className="grid w-full grid-cols-[1.15fr_1fr] gap-3">
      <div className="rounded-[1.22rem] border border-zinc-700/60 bg-zinc-950/38 p-[clamp(0.95rem,2.05vw,1.75rem)]">
        <h2 className={cn("max-w-[95%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[92%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

        <div className="mt-5 flex h-16 items-end gap-1.5 rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-2 py-2">
          {bars.map((value, index) => (
            <div
              key={index}
              className="flex-1 rounded-sm"
              style={{
                height: `${(value / max) * 100}%`,
                background:
                  index >= bars.length - 2
                    ? alphaColor(laneStyle.accentRgb, 0.72)
                    : alphaColor(laneStyle.accentRgb, 0.33),
              }}
            />
          ))}
        </div>
      </div>

      <aside className="flex flex-col justify-between rounded-[1.22rem] border border-zinc-700/65 bg-zinc-950/64 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.13em] text-zinc-300">
          {[
            "SEO",
            "Paid",
            "Content",
            "CRO",
          ].map((channel) => (
            <span key={channel} className="rounded-full border border-zinc-700/65 bg-zinc-900/50 px-2.5 py-1">
              {channel}
            </span>
          ))}
        </div>

        <div
          className="rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-100"
          style={{
            borderColor: alphaColor(laneStyle.accentRgb, 0.44),
            backgroundColor: alphaColor(laneStyle.accentRgb, 0.16 + accentStrength * 0.16),
          }}
        >
          {state.proofBadge || "Performance engine"}
        </div>

        <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} format={format} strong />
      </aside>
    </section>
  );
}

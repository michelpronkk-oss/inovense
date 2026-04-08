import type { CSSProperties } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  CREATIVE_FORMAT_SPECS,
  CREATIVE_TEMPLATE_SPECS,
  SERVICE_LANE_STYLES,
  type BackgroundMode,
  type CreativeFormatId,
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

const DISPLAY_SIZE: Record<CreativeFormatId, string> = {
  square: "text-[clamp(2rem,6vw,3.6rem)] leading-[1.02]",
  portrait: "text-[clamp(2rem,5vw,3.4rem)] leading-[1.03]",
  story: "text-[clamp(2.2rem,6.2vw,4rem)] leading-[1.02]",
  landscape: "text-[clamp(2rem,4.2vw,3.2rem)] leading-[1.06]",
};

const HEADLINE_SIZE: Record<CreativeFormatId, string> = {
  square: "text-[clamp(1.5rem,4.4vw,2.5rem)] leading-[1.08]",
  portrait: "text-[clamp(1.55rem,4vw,2.45rem)] leading-[1.1]",
  story: "text-[clamp(1.65rem,4.4vw,2.8rem)] leading-[1.08]",
  landscape: "text-[clamp(1.45rem,3vw,2.15rem)] leading-[1.1]",
};

const BODY_SIZE: Record<CreativeFormatId, string> = {
  square: "text-[clamp(0.86rem,1.8vw,1.03rem)] leading-relaxed",
  portrait: "text-[clamp(0.84rem,1.6vw,0.99rem)] leading-relaxed",
  story: "text-[clamp(0.9rem,2vw,1.07rem)] leading-relaxed",
  landscape: "text-[clamp(0.82rem,1.2vw,0.96rem)] leading-relaxed",
};

function alphaColor(accentRgb: string, alpha: number) {
  const normalized = Math.max(0, Math.min(1, alpha));
  return `rgba(${accentRgb} / ${normalized})`;
}

export function CreativeCanvas({ state, className }: CreativeCanvasProps) {
  const format = CREATIVE_FORMAT_SPECS[state.format];
  const template = CREATIVE_TEMPLATE_SPECS[state.template];
  const laneStyle = SERVICE_LANE_STYLES[state.serviceLane];
  const accentStrength = state.accentIntensity / 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[860px]">
        <div
          className="relative overflow-hidden rounded-[1.55rem] border border-zinc-700/70 bg-[#06070b] shadow-[0_30px_120px_rgba(0,0,0,0.72)]"
          style={{ aspectRatio: `${format.width} / ${format.height}` }}
        >
          <CanvasBackdrop
            mode={state.backgroundMode}
            accentRgb={laneStyle.accentRgb}
            accentStrength={accentStrength}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black/35" />

          <div className="relative z-10 flex h-full flex-col p-[clamp(1rem,2.2vw,2rem)]">
            {renderTemplate({ state, format: state.format, laneStyle, accentStrength })}
          </div>

          {state.showLogo && (
            <div className="pointer-events-none absolute bottom-[clamp(0.85rem,2vw,1.35rem)] right-[clamp(0.85rem,2vw,1.35rem)] z-20 opacity-95">
              <Image
                src="/logo.png"
                alt="Inovense"
                width={120}
                height={28}
                className="h-auto w-[clamp(76px,10vw,120px)]"
              />
            </div>
          )}

          <div className="pointer-events-none absolute left-[clamp(0.85rem,2vw,1.35rem)] bottom-[clamp(0.85rem,2vw,1.35rem)] z-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-950/65 px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-zinc-500 backdrop-blur-sm">
              {template.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvasBackdrop({
  mode,
  accentRgb,
  accentStrength,
}: {
  mode: BackgroundMode;
  accentRgb: string;
  accentStrength: number;
}) {
  const glowSoft = 0.1 + accentStrength * 0.12;
  const glowStrong = 0.2 + accentStrength * 0.2;

  return (
    <>
      <div className="absolute inset-0 bg-[#07080c]" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_92%_at_50%_-10%,rgba(255,255,255,0.11)_0%,rgba(6,8,11,1)_58%)]" />

      <div
        className="absolute -left-[24%] top-[-42%] h-[88%] w-[88%] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, ${alphaColor(accentRgb, glowSoft)} 0%, transparent 72%)`,
        }}
      />
      <div
        className="absolute right-[-20%] top-[20%] h-[62%] w-[62%] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, ${alphaColor(accentRgb, glowSoft * 0.85)} 0%, transparent 70%)`,
        }}
      />

      {mode === "Grid" && (
        <>
          <div
            className="absolute inset-0 opacity-65"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "58px 58px",
            }}
          />
          <div className="absolute inset-y-0 left-[42%] w-px bg-zinc-700/45" />
        </>
      )}

      {mode === "Spotlight" && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 58% 40%, ${alphaColor(accentRgb, glowStrong)} 0%, transparent 42%), radial-gradient(circle at 22% 78%, rgba(255,255,255,0.09) 0%, transparent 45%)`,
          }}
        />
      )}

      {mode === "Panel" && (
        <>
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(112deg, transparent 0%, rgba(255,255,255,0.15) 47%, transparent 48%), linear-gradient(112deg, transparent 16%, rgba(255,255,255,0.12) 16.4%, transparent 17%)",
              backgroundSize: "130% 130%",
            }}
          />
          <div className="absolute left-[8%] top-[15%] h-[22%] w-[44%] rounded-2xl border border-zinc-700/55 bg-zinc-900/28" />
          <div className="absolute right-[8%] bottom-[12%] h-[26%] w-[30%] rounded-2xl border border-zinc-700/55 bg-zinc-900/24" />
        </>
      )}
    </>
  );
}

function renderTemplate(props: TemplateProps) {
  switch (props.state.template) {
    case "square_post":
      return <SquarePostTemplate {...props} />;
    case "story_reel_cover":
      return <StoryReelTemplate {...props} />;
    case "landscape_ad":
      return <LandscapeAdTemplate {...props} />;
    case "quote_card":
      return <QuoteCardTemplate {...props} />;
    case "case_spotlight":
      return <CaseSpotlightTemplate {...props} />;
    case "offer_cta":
      return <OfferCtaTemplate {...props} />;
    default:
      return null;
  }
}

function HeaderChips({
  state,
  laneStyle,
  accentStrength,
}: {
  state: CreativeState;
  laneStyle: ServiceLaneStyle;
  accentStrength: number;
}) {
  const proof = state.proofBadge.trim();
  const eyebrow = state.eyebrow.trim() || "Inovense";

  const laneStyleInline = {
    borderColor: alphaColor(laneStyle.accentRgb, 0.35 + accentStrength * 0.3),
    boxShadow: `inset 0 0 0 1px ${alphaColor(laneStyle.accentRgb, 0.26 + accentStrength * 0.22)}`,
    backgroundColor: alphaColor(laneStyle.accentRgb, 0.1 + accentStrength * 0.14),
  } satisfies CSSProperties;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.15em]",
            laneStyle.textColor,
          )}
          style={laneStyleInline}
        >
          {state.serviceLane}
        </span>
        <span className="inline-flex items-center rounded-full border border-zinc-700/70 bg-zinc-950/65 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">
          {eyebrow}
        </span>
      </div>

      {proof && (
        <span className="inline-flex items-center rounded-full border border-zinc-600/80 bg-zinc-950/75 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-300">
          {proof}
        </span>
      )}
    </div>
  );
}

function CtaPill({
  text,
  laneStyle,
  accentStrength,
}: {
  text: string;
  laneStyle: ServiceLaneStyle;
  accentStrength: number;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-100"
      style={{
        borderColor: alphaColor(laneStyle.accentRgb, 0.44 + accentStrength * 0.3),
        backgroundColor: alphaColor(laneStyle.accentRgb, 0.16 + accentStrength * 0.2),
        boxShadow: `0 0 30px ${alphaColor(laneStyle.accentRgb, 0.2 + accentStrength * 0.22)}`,
      }}
    >
      {text || "Learn more"}
    </span>
  );
}

function SquarePostTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <div className="flex h-full flex-col">
      <HeaderChips state={state} laneStyle={laneStyle} accentStrength={accentStrength} />

      <div className="relative mt-4 flex flex-1 flex-col justify-between rounded-[1.25rem] border border-zinc-700/60 bg-zinc-950/35 p-[clamp(1rem,2.2vw,1.8rem)]">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-[1.25rem]"
          style={{
            background: `linear-gradient(to bottom, ${alphaColor(laneStyle.accentRgb, 0.12)}, ${alphaColor(
              laneStyle.accentRgb,
              0.55 + accentStrength * 0.3,
            )}, ${alphaColor(laneStyle.accentRgb, 0.12)})`,
          }}
        />

        <h2 className={cn("max-w-[95%] font-semibold tracking-tight text-zinc-50", DISPLAY_SIZE[format])}>
          {state.title}
        </h2>

        <div className="mt-6 flex flex-col gap-5">
          <p className={cn("max-w-[90%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

          <div className="flex items-center justify-between border-t border-zinc-700/65 pt-4">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Operator grade creative</span>
            <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryReelTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <div className="flex h-full flex-col">
      <HeaderChips state={state} laneStyle={laneStyle} accentStrength={accentStrength} />

      <div className="relative mt-4 flex flex-1 flex-col overflow-hidden rounded-[1.35rem] border border-zinc-700/65 bg-zinc-950/40 p-[clamp(1rem,2.3vw,2rem)]">
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-1.5"
          style={{
            background: `linear-gradient(to bottom, ${alphaColor(laneStyle.accentRgb, 0.08)}, ${alphaColor(
              laneStyle.accentRgb,
              0.5 + accentStrength * 0.3,
            )}, ${alphaColor(laneStyle.accentRgb, 0.18)})`,
          }}
        />

        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Story cover</p>

        <h2
          className={cn(
            "mt-4 max-w-[95%] font-semibold tracking-tight text-zinc-50",
            DISPLAY_SIZE[format],
          )}
          style={{ textWrap: "balance" }}
        >
          {state.title}
        </h2>

        <p className={cn("mt-6 max-w-[90%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

        <div className="mt-auto flex items-center justify-between border-t border-zinc-700/70 pt-5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Inovense editorial</span>
          <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} />
        </div>
      </div>
    </div>
  );
}

function LandscapeAdTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <div className="flex h-full flex-col">
      <HeaderChips state={state} laneStyle={laneStyle} accentStrength={accentStrength} />

      <div className="mt-4 grid flex-1 grid-cols-[1.45fr_1fr] gap-3">
        <section className="flex h-full flex-col rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/35 p-[clamp(0.95rem,1.8vw,1.6rem)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Campaign creative</p>
          <h2 className={cn("mt-3 max-w-[95%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>
            {state.title}
          </h2>
          <p className={cn("mt-4 max-w-[92%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

          <div className="mt-auto pt-5">
            <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} />
          </div>
        </section>

        <aside className="flex h-full flex-col justify-between rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/62 p-[clamp(0.9rem,1.6vw,1.45rem)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Why this converts</p>
            <ul className="mt-3 space-y-2.5 text-[12px] text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand/70" />
                Tight promise and high signal positioning.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand/50" />
                Clear lane framing for better audience fit.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand/50" />
                CTA hierarchy without visual noise.
              </li>
            </ul>
          </div>

          <div
            className="rounded-xl border px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-zinc-300"
            style={{
              borderColor: alphaColor(laneStyle.accentRgb, 0.42),
              backgroundColor: alphaColor(laneStyle.accentRgb, 0.12 + accentStrength * 0.12),
            }}
          >
            Paid-ready layout
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuoteCardTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <div className="flex h-full flex-col">
      <HeaderChips state={state} laneStyle={laneStyle} accentStrength={accentStrength} />

      <div className="relative mt-4 flex flex-1 flex-col justify-center rounded-[1.25rem] border border-zinc-700/60 bg-zinc-950/40 p-[clamp(1rem,2.2vw,1.9rem)]">
        <span
          className="pointer-events-none absolute left-[clamp(0.75rem,1.5vw,1.4rem)] top-[clamp(0.4rem,1vw,1rem)] font-serif text-[clamp(4.5rem,13vw,8rem)] leading-none text-zinc-700"
          aria-hidden
        >
          &quot;
        </span>

        <blockquote className="relative z-10 max-w-[95%]">
          <p className={cn("font-medium tracking-tight text-zinc-100", HEADLINE_SIZE[format])}>{state.title}</p>
          <p className={cn("mt-5 max-w-[88%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
        </blockquote>

        <div className="mt-8 flex items-center justify-between border-t border-zinc-700/65 pt-4">
          <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Inovense perspective</span>
          <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} />
        </div>
      </div>
    </div>
  );
}

function CaseSpotlightTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <div className="flex h-full flex-col">
      <HeaderChips state={state} laneStyle={laneStyle} accentStrength={accentStrength} />

      <div className="mt-4 grid flex-1 grid-cols-[1.35fr_1fr] gap-3">
        <section className="flex h-full flex-col rounded-[1.25rem] border border-zinc-700/60 bg-zinc-950/35 p-[clamp(0.95rem,1.8vw,1.65rem)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Case spotlight</p>
          <h2 className={cn("mt-3 max-w-[95%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>
            {state.title}
          </h2>
          <p className={cn("mt-4 max-w-[95%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

          <div className="mt-auto border-t border-zinc-700/65 pt-4">
            <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} />
          </div>
        </section>

        <aside className="flex h-full flex-col rounded-[1.25rem] border border-zinc-700/65 bg-zinc-950/65 p-[clamp(0.9rem,1.6vw,1.45rem)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Outcome signal</p>

          <div
            className="mt-3 rounded-xl border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-200"
            style={{
              borderColor: alphaColor(laneStyle.accentRgb, 0.42),
              backgroundColor: alphaColor(laneStyle.accentRgb, 0.14 + accentStrength * 0.1),
            }}
          >
            {state.proofBadge.trim() || "Proof backed execution"}
          </div>

          <dl className="mt-5 space-y-3 text-zinc-300">
            <div className="rounded-lg border border-zinc-700/55 bg-zinc-900/40 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Timeline</dt>
              <dd className="mt-1 text-sm font-medium">8 weeks</dd>
            </div>
            <div className="rounded-lg border border-zinc-700/55 bg-zinc-900/40 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Primary shift</dt>
              <dd className="mt-1 text-sm font-medium">Unified channel stack</dd>
            </div>
            <div className="rounded-lg border border-zinc-700/55 bg-zinc-900/40 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Operator lift</dt>
              <dd className="mt-1 text-sm font-medium">Faster decision loops</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

function OfferCtaTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <div className="flex h-full flex-col">
      <HeaderChips state={state} laneStyle={laneStyle} accentStrength={accentStrength} />

      <div className="relative mt-4 flex flex-1 flex-col justify-center rounded-[1.3rem] border border-zinc-700/65 bg-zinc-950/44 p-[clamp(1rem,2.2vw,1.9rem)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${alphaColor(
              laneStyle.accentRgb,
              0.52 + accentStrength * 0.24,
            )} 50%, transparent 100%)`,
          }}
        />

        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Offer</p>
        <h2 className={cn("mt-3 max-w-[96%] font-semibold tracking-tight text-zinc-50", DISPLAY_SIZE[format])}>
          {state.title}
        </h2>
        <p className={cn("mt-4 max-w-[90%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <CtaPill text={state.ctaText} laneStyle={laneStyle} accentStrength={accentStrength} />
          <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">High intent intake</span>
        </div>
      </div>
    </div>
  );
}

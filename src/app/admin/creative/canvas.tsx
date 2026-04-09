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
  square: "text-[clamp(1.55rem,4.8vw,3.1rem)] leading-[1.06]",
  portrait: "text-[clamp(1.42rem,4.1vw,2.9rem)] leading-[1.08]",
  story: "text-[clamp(1.75rem,5.5vw,3.5rem)] leading-[1.04]",
  landscape: "text-[clamp(1.26rem,2.8vw,2.45rem)] leading-[1.08]",
};

const BODY_SIZE: Record<CreativeFormatId, string> = {
  square: "text-[clamp(0.84rem,1.72vw,1.01rem)] leading-relaxed",
  portrait: "text-[clamp(0.82rem,1.52vw,0.96rem)] leading-relaxed",
  story: "text-[clamp(0.9rem,1.95vw,1.08rem)] leading-relaxed",
  landscape: "text-[clamp(0.79rem,1.1vw,0.93rem)] leading-relaxed",
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
      return "border-brand/45 bg-brand/18 text-zinc-100";
    default:
      return "border-zinc-600/70 bg-zinc-900/80 text-zinc-200";
  }
}

function modeSubline(mode: CreativeMode) {
  switch (mode) {
    case "Brand":
      return "Editorial authority system";
    case "Social":
      return "Proof-led distribution asset";
    case "Ad":
      return "Campaign conversion frame";
    default:
      return "Creative output";
  }
}

function modeFrameClass(mode: CreativeMode) {
  switch (mode) {
    case "Brand":
      return "border-zinc-700/65 bg-zinc-950/34";
    case "Social":
      return "border-sky-900/35 bg-zinc-950/44";
    case "Ad":
      return "border-brand/30 bg-zinc-950/50";
    default:
      return "border-zinc-700/65 bg-zinc-950/38";
  }
}

function modeHeadlineClass(mode: CreativeMode, format: CreativeFormatId) {
  if (mode === "Brand") {
    return cn("font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format]);
  }

  if (mode === "Ad") {
    return cn("font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format]);
  }

  return cn("font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format]);
}

export function CreativeCanvas({ state, className }: CreativeCanvasProps) {
  const format = CREATIVE_FORMAT_SPECS[state.format];
  const laneStyle = SERVICE_LANE_STYLES[state.serviceLane];
  const accentStrength = state.accentIntensity / 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[920px]">
        <div
          className="relative overflow-hidden rounded-[1.5rem] border border-zinc-700/70 bg-[#05060a] shadow-[0_34px_130px_rgba(0,0,0,0.72)]"
          style={{ aspectRatio: `${format.width} / ${format.height}` }}
        >
          <CanvasBackdrop
            mode={state.mode}
            backgroundMode={state.backgroundMode}
            accentRgb={laneStyle.accentRgb}
            accentStrength={accentStrength}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black/35" />

          <div className="relative z-10 flex h-full flex-col p-[clamp(0.95rem,2.05vw,2rem)]">
            <FrameMeta state={state} laneStyle={laneStyle} accentStrength={accentStrength} />
            <div className="mt-3.5 flex flex-1">
              {renderTemplate({
                state,
                format: state.format,
                laneStyle,
                accentStrength,
              })}
            </div>
          </div>

          {state.showLogo && (
            <div className="pointer-events-none absolute bottom-[clamp(0.75rem,1.7vw,1.3rem)] right-[clamp(0.8rem,1.7vw,1.3rem)] z-20 opacity-95">
              <Image
                src="/logo.png"
                alt="Inovense"
                width={124}
                height={28}
                className="h-auto w-[clamp(74px,10vw,122px)]"
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
  const mediumGlow = 0.14 + accentStrength * 0.16;

  return (
    <>
      <div className="absolute inset-0 bg-[#05060a]" />
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_-12%,rgba(255,255,255,0.09)_0%,rgba(5,6,10,1)_58%)]" />

      <div
        className="absolute -left-[23%] top-[-44%] h-[95%] w-[90%] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${alphaColor(accentRgb, softGlow)} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute right-[-15%] top-[20%] h-[62%] w-[56%] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${alphaColor(accentRgb, softGlow * 0.84)} 0%, transparent 72%)`,
        }}
      />

      {backgroundMode === "Grid" && (
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "58px 58px",
          }}
        />
      )}

      {backgroundMode === "Spotlight" && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 64% 32%, ${alphaColor(accentRgb, mediumGlow)} 0%, transparent 46%), radial-gradient(circle at 18% 74%, rgba(255,255,255,0.065) 0%, transparent 43%)`,
          }}
        />
      )}

      {backgroundMode === "Panel" && (
        <>
          <div
            className="absolute inset-0 opacity-24"
            style={{
              backgroundImage:
                "linear-gradient(114deg, transparent 0%, rgba(255,255,255,0.14) 49%, transparent 50%), linear-gradient(114deg, transparent 17%, rgba(255,255,255,0.085) 17.4%, transparent 17.8%)",
              backgroundSize: "136% 132%",
            }}
          />
          <div className="absolute left-[7%] top-[13%] h-[23%] w-[40%] rounded-2xl border border-zinc-700/50 bg-zinc-900/24" />
          <div className="absolute right-[8%] bottom-[11%] h-[25%] w-[30%] rounded-2xl border border-zinc-700/50 bg-zinc-900/22" />
        </>
      )}

      {mode === "Brand" && (
        <>
          <div className="absolute inset-y-0 left-[11%] w-px bg-white/[0.06]" />
          <div className="absolute inset-y-0 right-[12%] w-px bg-white/[0.04]" />
        </>
      )}

      {mode === "Social" && (
        <>
          <div className="absolute right-[6%] top-[12%] h-[42%] w-[22%] rounded-xl border border-sky-300/15 bg-sky-400/[0.03]" />
          <div className="absolute right-[7.7%] top-[18%] h-px w-[18%] bg-sky-200/15" />
          <div className="absolute right-[7.7%] top-[24%] h-px w-[14%] bg-sky-200/15" />
          <div className="absolute right-[7.7%] top-[30%] h-px w-[16%] bg-sky-200/15" />
        </>
      )}

      {mode === "Ad" && (
        <>
          <div
            className="absolute right-[-12%] top-[-24%] h-[75%] w-[52%] rotate-12"
            style={{
              background: `linear-gradient(180deg, ${alphaColor(accentRgb, 0.16 + accentStrength * 0.2)} 0%, transparent 74%)`,
            }}
          />
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${alphaColor(accentRgb, 0.52 + accentStrength * 0.3)} 50%, transparent 100%)`,
            }}
          />
        </>
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
  const templateLabel = CREATIVE_TEMPLATE_SPECS[state.template].label;
  const proof = state.proofBadge.trim();

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em]",
              modeChipStyles(state.mode),
            )}
          >
            {CREATIVE_MODE_SPECS[state.mode].label}
          </span>

          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
              laneStyle.textColor,
            )}
            style={{
              borderColor: alphaColor(laneStyle.accentRgb, 0.34 + accentStrength * 0.2),
              backgroundColor: alphaColor(laneStyle.accentRgb, 0.09 + accentStrength * 0.11),
            }}
          >
            {state.serviceLane}
          </span>
        </div>

        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
          {state.eyebrow || templateLabel}
        </p>
      </div>

      <div className="text-right">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">{templateLabel}</p>
        {proof && state.mode !== "Brand" ? (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-300">{proof}</p>
        ) : (
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">{modeSubline(state.mode)}</p>
        )}
      </div>
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
        borderColor: alphaColor(
          laneStyle.accentRgb,
          strong ? 0.54 + accentStrength * 0.3 : 0.4 + accentStrength * 0.22,
        ),
        backgroundColor: alphaColor(
          laneStyle.accentRgb,
          strong ? 0.24 + accentStrength * 0.24 : 0.14 + accentStrength * 0.14,
        ),
        boxShadow: `0 0 28px ${alphaColor(laneStyle.accentRgb, 0.17 + accentStrength * 0.2)}`,
      }}
    >
      {text || "Learn more"}
    </span>
  );
}

function renderTemplate(props: TemplateProps) {
  switch (props.state.template) {
    case "statement_card":
      return <StatementCardTemplate {...props} />;
    case "operator_memo":
      return <OperatorMemoTemplate {...props} />;
    case "quote_editorial":
      return <QuoteEditorialTemplate {...props} />;
    case "proof_card":
      return <ProofCardTemplate {...props} />;
    case "case_spotlight":
      return <CaseSpotlightTemplate {...props} />;
    case "trust_card":
      return <TrustCardTemplate {...props} />;
    case "offer_panel":
      return <OfferPanelTemplate {...props} />;
    case "ad_frame":
      return <AdFrameTemplate {...props} />;
    default:
      return null;
  }
}

function StatementCardTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section
      className={cn(
        "relative flex w-full flex-col justify-between rounded-[1.25rem] border p-[clamp(0.95rem,2.2vw,1.9rem)]",
        modeFrameClass(state.mode),
      )}
    >
      <div
        className="pointer-events-none absolute left-0 top-[14%] h-[70%] w-[3px] rounded-r"
        style={{
          background: `linear-gradient(to bottom, ${alphaColor(laneStyle.accentRgb, 0.08)}, ${alphaColor(laneStyle.accentRgb, 0.62 + accentStrength * 0.24)}, ${alphaColor(laneStyle.accentRgb, 0.08)})`,
        }}
      />

      <div>
        <h2 className={modeHeadlineClass(state.mode, format)}>{state.title}</h2>
        <p className={cn("mt-5 max-w-[88%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-zinc-700/70 pt-4">
        <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Positioning layer</span>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
            laneStyle.textColor,
          )}
          style={{
            borderColor: alphaColor(laneStyle.accentRgb, 0.33 + accentStrength * 0.18),
            backgroundColor: alphaColor(laneStyle.accentRgb, 0.1 + accentStrength * 0.09),
          }}
        >
          {state.serviceLane}
        </span>
      </div>
    </section>
  );
}

function OperatorMemoTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="grid w-full grid-cols-[1.18fr_0.82fr] gap-3 max-[740px]:grid-cols-1">
      <div className={cn("rounded-[1.2rem] border p-[clamp(0.95rem,2.1vw,1.8rem)]", modeFrameClass(state.mode))}>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          <span>Operator memo</span>
          <span>Internal note</span>
        </div>

        <h2 className={cn("mt-4", modeHeadlineClass(state.mode, format))}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[92%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <aside className="flex flex-col justify-between rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/62 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Memo structure</p>
          <div className="mt-3 space-y-2 text-[12px] text-zinc-300">
            <div className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">Observation</div>
            <div className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">Constraint</div>
            <div className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">Decision</div>
          </div>
        </div>

        <CtaPill
          text={state.ctaText || "Read memo"}
          laneStyle={laneStyle}
          accentStrength={accentStrength}
          format={format}
        />
      </aside>
    </section>
  );
}

function QuoteEditorialTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className={cn("relative flex w-full flex-col rounded-[1.25rem] border p-[clamp(1rem,2.2vw,1.9rem)]", modeFrameClass(state.mode))}>
      <span
        className="pointer-events-none absolute left-[clamp(0.6rem,1.2vw,1.2rem)] top-[clamp(0.15rem,0.6vw,0.6rem)] font-serif text-[clamp(4rem,11vw,7.5rem)] leading-none text-zinc-700/95"
        aria-hidden
      >
        &quot;
      </span>

      <blockquote className="relative z-10 max-w-[95%]">
        <p className={cn(modeHeadlineClass(state.mode, format), "font-medium text-zinc-100")}>{state.title}</p>
        <p className={cn("mt-5 max-w-[87%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </blockquote>

      <div className="mt-auto flex items-center justify-between border-t border-zinc-700/65 pt-4">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Editorial authority</span>
        <CtaPill
          text={state.ctaText || "Share quote"}
          laneStyle={laneStyle}
          accentStrength={accentStrength}
          format={format}
        />
      </div>
    </section>
  );
}

function ProofCardTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const proof = state.proofBadge || "Measured outcome";

  return (
    <section className="grid w-full grid-cols-[1.06fr_0.94fr] gap-3 max-[740px]:grid-cols-1">
      <div
        className="flex flex-col justify-between rounded-[1.2rem] border px-[clamp(0.95rem,2vw,1.6rem)] py-[clamp(0.95rem,1.9vw,1.5rem)]"
        style={{
          borderColor: alphaColor(laneStyle.accentRgb, 0.45),
          backgroundColor: alphaColor(laneStyle.accentRgb, 0.13 + accentStrength * 0.16),
        }}
      >
        <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-100/80">Measured proof</span>
        <p className="mt-3 text-[clamp(1.25rem,3.2vw,2rem)] font-semibold tracking-tight text-zinc-50">{proof}</p>
        <p className={cn("mt-4 max-w-[92%] text-zinc-100", BODY_SIZE[format])}>{state.title}</p>
      </div>

      <aside className="flex flex-col justify-between rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/62 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <p className={cn("max-w-[95%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.13em] text-zinc-500 max-[460px]:grid-cols-1">
          <span className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-2.5 py-2">Capture</span>
          <span className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-2.5 py-2">Routing</span>
          <span className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-2.5 py-2">Follow-up</span>
        </div>

        <div className="mt-4 border-t border-zinc-700/65 pt-4">
          <CtaPill
            text={state.ctaText || "See proof"}
            laneStyle={laneStyle}
            accentStrength={accentStrength}
            format={format}
          />
        </div>
      </aside>
    </section>
  );
}

function CaseSpotlightTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const stats = [
    ["Timeline", "8 weeks"],
    ["Focus", "Workflow redesign"],
    ["Impact", state.proofBadge || "Measured lift"],
  ];

  return (
    <section className="grid w-full grid-cols-[1.2fr_0.8fr] gap-3 max-[740px]:grid-cols-1">
      <div className="rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/40 p-[clamp(0.95rem,2vw,1.7rem)]">
        <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Case spotlight</p>
        <h2 className={cn("mt-3", modeHeadlineClass(state.mode, format))}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[93%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

        <div className="mt-5 grid grid-cols-3 gap-2 max-[460px]:grid-cols-1">
          {stats.map(([key, value]) => (
            <div key={key} className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.13em] text-zinc-500">{key}</p>
              <p className="mt-1 text-[12px] font-medium text-zinc-200">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="flex flex-col justify-between rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/62 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Execution moves</p>
          <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/70" />
              Funnel architecture rebuilt for intent quality.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/62" />
              Routing and handoff logic consolidated.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/55" />
              Reporting layer aligned to commercial decisions.
            </li>
          </ul>
        </div>

        <CtaPill
          text={state.ctaText || "Open case"}
          laneStyle={laneStyle}
          accentStrength={accentStrength}
          format={format}
        />
      </aside>
    </section>
  );
}

function TrustCardTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const stars = Array.from({ length: 5 });

  return (
    <section className="grid w-full grid-cols-[1.1fr_0.9fr] gap-3 max-[740px]:grid-cols-1">
      <div className="rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/40 p-[clamp(0.95rem,2vw,1.7rem)]">
        <div className="flex items-center gap-1">
          {stars.map((_, index) => (
            <span key={index} className="text-[14px] leading-none text-amber-300/95">
              &#9733;
            </span>
          ))}
        </div>

        <h2 className={cn("mt-3", modeHeadlineClass(state.mode, format))}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[93%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

        <p className="mt-5 text-[10px] uppercase tracking-[0.14em] text-zinc-500">Trustpilot review layer</p>
      </div>

      <aside className="flex flex-col justify-between rounded-[1.2rem] border border-zinc-700/65 bg-zinc-950/62 p-[clamp(0.9rem,1.8vw,1.45rem)]">
        <div
          className="rounded-lg border px-3 py-2"
          style={{
            borderColor: alphaColor(laneStyle.accentRgb, 0.4),
            backgroundColor: alphaColor(laneStyle.accentRgb, 0.12 + accentStrength * 0.12),
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.13em] text-zinc-100/85">{state.proofBadge || "Verified reviews"}</p>
        </div>

        <div className="space-y-2 text-[12px] text-zinc-300">
          <p className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">Trusted by operators and founders</p>
          <p className="rounded-lg border border-zinc-700/55 bg-zinc-900/45 px-3 py-2">Delivery quality called out by clients</p>
        </div>

        <CtaPill
          text={state.ctaText || "Read reviews"}
          laneStyle={laneStyle}
          accentStrength={accentStrength}
          format={format}
          strong
        />
      </aside>
    </section>
  );
}

function OfferPanelTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="grid w-full grid-cols-[1.12fr_0.88fr] gap-3 max-[740px]:grid-cols-1">
      <div className="rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/38 p-[clamp(0.95rem,2vw,1.72rem)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Offer panel</p>
        <h2 className={cn("mt-3", modeHeadlineClass(state.mode, format))}>{state.title}</h2>
        <p className={cn("mt-4 max-w-[92%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <aside
        className="flex flex-col justify-between rounded-[1.2rem] border px-[clamp(0.9rem,1.8vw,1.45rem)] py-[clamp(0.9rem,1.8vw,1.45rem)]"
        style={{
          borderColor: alphaColor(laneStyle.accentRgb, 0.5 + accentStrength * 0.2),
          backgroundColor: alphaColor(laneStyle.accentRgb, 0.18 + accentStrength * 0.2),
        }}
      >
        <div
          className="rounded-lg border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-100"
          style={{
            borderColor: alphaColor(laneStyle.accentRgb, 0.56),
            backgroundColor: alphaColor(laneStyle.accentRgb, 0.2 + accentStrength * 0.14),
          }}
        >
          {state.proofBadge || "Limited intake"}
        </div>

        <div className="space-y-2 text-[12px] text-zinc-100">
          <p>Scoped strategy</p>
          <p>Execution blueprint</p>
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

function AdFrameTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="flex w-full flex-col overflow-hidden rounded-[1.2rem] border border-brand/25 bg-zinc-950/58">
      <div className="border-b border-zinc-700/65 px-[clamp(0.95rem,2vw,1.65rem)] py-[clamp(0.85rem,1.7vw,1.25rem)]">
        <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Campaign hook</p>
        <h2 className={cn("mt-2", modeHeadlineClass(state.mode, format))}>{state.title}</h2>
        <p className={cn("mt-3 max-w-[94%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <div className="grid flex-1 grid-cols-[1fr_1fr] gap-3 px-[clamp(0.9rem,1.8vw,1.45rem)] py-[clamp(0.9rem,1.8vw,1.45rem)] max-[740px]:grid-cols-1">
        <div className="rounded-xl border border-zinc-700/55 bg-zinc-900/45 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Why this converts</p>
          <div className="mt-3 space-y-2 text-[12px] text-zinc-300">
            <p>Clear pain framing for high-intent buyers.</p>
            <p>Proof signal anchored near the hook.</p>
            <p>Single CTA with no decision noise.</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700/55 bg-zinc-900/45 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Ad-ready structure</p>
          <div className="mt-3 space-y-2">
            <div className="h-2.5 w-[72%] rounded-full bg-zinc-700/80" />
            <div className="h-2.5 w-[90%] rounded-full bg-zinc-700/80" />
            <div className="h-2.5 w-[62%] rounded-full bg-zinc-700/80" />
            <div
              className="mt-3 h-8 w-32 rounded-full border"
              style={{
                borderColor: alphaColor(laneStyle.accentRgb, 0.52),
                backgroundColor: alphaColor(laneStyle.accentRgb, 0.18 + accentStrength * 0.16),
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-700/65 px-[clamp(0.95rem,2vw,1.65rem)] py-[clamp(0.8rem,1.7vw,1.2rem)]">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Campaign conversion frame</span>
        <CtaPill
          text={state.ctaText || "Book audit"}
          laneStyle={laneStyle}
          accentStrength={accentStrength}
          format={format}
          strong
        />
      </div>
    </section>
  );
}

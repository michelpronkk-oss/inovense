import Image from "next/image";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import {
  CREATIVE_FORMAT_SPECS,
  CREATIVE_TEMPLATE_SPECS,
  SERVICE_LANE_STYLES,
  type CreativeFormatId,
  type CreativeMode,
  type CreativeState,
  type CreativeTemplateId,
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
  square: "text-[clamp(1.55rem,4.8vw,3.2rem)] leading-[1.04]",
  portrait: "text-[clamp(1.5rem,4.5vw,3rem)] leading-[1.05]",
  story: "text-[clamp(1.9rem,6.2vw,3.85rem)] leading-[1.02]",
  landscape: "text-[clamp(1.3rem,2.95vw,2.58rem)] leading-[1.06]",
};

const BODY_SIZE: Record<CreativeFormatId, string> = {
  square: "text-[clamp(0.84rem,1.75vw,1.01rem)] leading-relaxed",
  portrait: "text-[clamp(0.82rem,1.55vw,0.96rem)] leading-relaxed",
  story: "text-[clamp(0.92rem,2vw,1.1rem)] leading-relaxed",
  landscape: "text-[clamp(0.79rem,1.12vw,0.93rem)] leading-relaxed",
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

function modeSubline(mode: CreativeMode) {
  switch (mode) {
    case "Brand":
      return "Editorial brand output";
    case "Social":
      return "Publishing proof output";
    case "Ad":
      return "Campaign conversion output";
    default:
      return "Creative output";
  }
}

function previewMaxWidth(format: CreativeFormatId) {
  if (format === "story") return "max-w-[430px]";
  if (format === "portrait") return "max-w-[560px]";
  return "max-w-[940px]";
}

const KONVA_TEMPLATE_IDS: ReadonlySet<CreativeTemplateId> = new Set([
  "poster_scene",
  "campaign_cta",
  "proof_metric",
  "editorial_frame",
  "gradient_statement",
]);

const KonvaTemplateCanvas = dynamic(
  () => import("./konva-template-canvas").then((mod) => mod.KonvaTemplateCanvas),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-zinc-950/65" />,
  },
);

function defaultMetricFromTitle(title: string) {
  const match = title.match(/[+-]?\d+%/);
  return match?.[0] ?? "+38%";
}

export function CreativeCanvas({ state, className }: CreativeCanvasProps) {
  const format = CREATIVE_FORMAT_SPECS[state.format];
  const laneStyle = SERVICE_LANE_STYLES[state.serviceLane];
  const accentStrength = state.accentIntensity / 100;
  const useKonvaRenderer = KONVA_TEMPLATE_IDS.has(state.template);

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("mx-auto w-full", previewMaxWidth(state.format))}>
        <div
          className="relative overflow-hidden rounded-[1.5rem] border border-zinc-700/70 bg-[#05060a] shadow-[0_34px_130px_rgba(0,0,0,0.72)]"
          style={{ aspectRatio: `${format.width} / ${format.height}` }}
        >
          {useKonvaRenderer ? (
            <div className="relative z-10 h-full w-full">
              <KonvaTemplateCanvas
                state={state}
                format={state.format}
                laneStyle={laneStyle}
                accentStrength={accentStrength}
              />
            </div>
          ) : (
            <>
              <CanvasBackdrop
                mode={state.mode}
                template={state.template}
                accentRgb={laneStyle.accentRgb}
                accentStrength={accentStrength}
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black/45" />

              <div className="relative z-10 flex h-full flex-col p-[clamp(0.95rem,2.15vw,2rem)]">
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

              {state.showLogo && state.template !== "poster_scene" && (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CanvasBackdrop({
  mode,
  template,
  accentRgb,
  accentStrength,
}: {
  mode: CreativeMode;
  template: CreativeTemplateId;
  accentRgb: string;
  accentStrength: number;
}) {
  const softGlow = 0.08 + accentStrength * 0.12;
  const midGlow = 0.13 + accentStrength * 0.18;

  return (
    <>
      <div className="absolute inset-0 bg-[#05060a]" />

      {template === "poster_scene" ? (
        <>
          <Image
            src="/work/silentspend/hero.png"
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="object-cover opacity-42 blur-[0.7px] scale-[1.08]"
          />
          <Image
            src="/work/silentspend/evidence-view.png"
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="object-cover opacity-16 mix-blend-screen scale-[1.2]"
          />
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_8%,rgba(255,255,255,0.22)_0%,rgba(5,6,10,0.8)_58%,rgba(5,6,10,0.95)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.56)_100%)]" />
        </>
      ) : template === "gradient_statement" ? (
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(110% 95% at 82% 8%, ${alphaColor(accentRgb, 0.26 + accentStrength * 0.2)} 0%, transparent 56%),
              radial-gradient(95% 85% at 10% 88%, rgba(132, 109, 166, 0.36) 0%, transparent 60%),
              radial-gradient(120% 95% at 50% 50%, rgba(17, 24, 39, 0.82) 0%, rgba(6, 8, 12, 1) 72%)
            `,
          }}
        />
      ) : template === "campaign_cta" ? (
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(95% 72% at 76% 18%, ${alphaColor(accentRgb, 0.28 + accentStrength * 0.2)} 0%, transparent 58%),
              radial-gradient(90% 80% at 20% 84%, rgba(94, 51, 153, 0.24) 0%, transparent 58%),
              linear-gradient(155deg, rgba(16, 14, 38, 0.96) 0%, rgba(5, 6, 12, 1) 68%)
            `,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(130%_95%_at_50%_-10%,rgba(255,255,255,0.1)_0%,rgba(5,6,10,1)_58%)]" />
      )}

      <div
        className="absolute -left-[22%] top-[-36%] h-[86%] w-[88%] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${alphaColor(accentRgb, softGlow)} 0%, transparent 70%)`,
        }}
      />

      <div
        className="absolute right-[-12%] top-[22%] h-[62%] w-[58%] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${alphaColor(accentRgb, midGlow)} 0%, transparent 68%)`,
        }}
      />

      {mode === "Ad" && (
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${alphaColor(accentRgb, 0.54 + accentStrength * 0.25)} 50%, transparent 100%)`,
          }}
        />
      )}

      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.65) 0 1px, transparent 1px), radial-gradient(circle at 75% 80%, rgba(255,255,255,0.5) 0 1px, transparent 1px)",
          backgroundSize: "3px 3px, 4px 4px",
        }}
      />
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
  const showProofChip = proof && state.template !== "proof_metric" && state.template !== "campaign_cta" && state.template !== "poster_scene";

  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {state.eyebrow || CREATIVE_TEMPLATE_SPECS[state.template].label}
      </p>

      {showProofChip ? (
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
          {proof}
        </span>
      ) : (
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{modeSubline(state.mode)}</span>
      )}
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
          strong ? 0.54 + accentStrength * 0.3 : 0.4 + accentStrength * 0.2,
        ),
        backgroundColor: alphaColor(
          laneStyle.accentRgb,
          strong ? 0.24 + accentStrength * 0.24 : 0.14 + accentStrength * 0.14,
        ),
        boxShadow: `0 0 26px ${alphaColor(laneStyle.accentRgb, 0.15 + accentStrength * 0.2)}`,
      }}
    >
      {text || "Learn more"}
    </span>
  );
}

function renderTemplate(props: TemplateProps) {
  switch (props.state.template) {
    case "poster_scene":
      return <PosterSceneTemplate {...props} />;
    case "gradient_statement":
      return <GradientStatementTemplate {...props} />;
    case "campaign_cta":
      return <CampaignCtaTemplate {...props} />;
    case "proof_metric":
      return <ProofMetricTemplate {...props} />;
    case "editorial_frame":
      return <EditorialFrameTemplate {...props} />;
    default:
      return null;
  }
}

function PosterSceneTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const boardWidthClass =
    format === "landscape"
      ? "w-[56%]"
      : format === "story"
        ? "w-[76%]"
        : format === "square"
          ? "w-[70%]"
          : "w-[72%]";

  return (
    <section className="relative w-full overflow-hidden rounded-[1.15rem] border border-black/35 bg-black/26">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,10,0.14)_0%,rgba(5,6,10,0.56)_100%)]" />

      <div className={cn("absolute left-[9%] top-[12%] max-w-[620px] rounded-[0.35rem] bg-[#f2f0ea] p-[clamp(0.7rem,1.8vw,1.3rem)] text-zinc-900 shadow-[0_18px_48px_rgba(0,0,0,0.4)]", boardWidthClass)}>
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{state.eyebrow || "Poster on scene"}</p>
        <h2 className={cn("mt-2 font-semibold tracking-tight text-zinc-900", HEADLINE_SIZE[format])}>{state.title}</h2>
        <p className={cn("mt-2.5 text-zinc-700", BODY_SIZE[format])}>{state.subtitle}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Scope",
            "Strategy",
            state.ctaText || "Apply now",
          ].map((item, index) => (
            <span
              key={item}
              className="rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]"
              style={{
                borderColor:
                  index === 2
                    ? alphaColor(laneStyle.accentRgb, 0.62 + accentStrength * 0.2)
                    : "rgba(24,24,27,0.28)",
                backgroundColor:
                  index === 2
                    ? alphaColor(laneStyle.accentRgb, 0.2 + accentStrength * 0.12)
                    : "rgba(255,255,255,0.44)",
                color: index === 2 ? "rgb(9 23 24)" : "rgb(39 39 42)",
              }}
            >
              {item}
            </span>
          ))}
        </div>

        <p className="mt-3 border-t border-zinc-300/80 pt-2.5 text-[9px] uppercase tracking-[0.14em] text-zinc-500">
          {state.proofBadge || "Limited intake"}
        </p>
      </div>

      {state.showLogo && (
        <div className="absolute bottom-[5%] right-[5%] opacity-90">
          <Image src="/logo.png" alt="Inovense" width={100} height={22} className="h-auto w-[clamp(68px,10vw,100px)] brightness-200 contrast-125" />
        </div>
      )}
    </section>
  );
}

function GradientStatementTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="relative flex w-full flex-col justify-between rounded-[1.2rem] border border-zinc-700/55 bg-transparent px-[clamp(0.95rem,2.15vw,1.9rem)] py-[clamp(0.9rem,1.95vw,1.75rem)]">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-300/85">{state.eyebrow || "Gradient statement"}</p>
        <h2 className={cn("mt-3 max-w-[90%] font-medium tracking-tight text-zinc-100", HEADLINE_SIZE[format])}>
          {state.title}
        </h2>
        <p className={cn("mt-4 max-w-[80%] text-zinc-200/88", BODY_SIZE[format])}>{state.subtitle}</p>
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3 border-t border-white/20 pt-4">
        <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-300/85">Inovense authority layer</span>

        <CtaPill
          text={state.ctaText || "Open statement"}
          laneStyle={laneStyle}
          accentStrength={accentStrength}
          format={format}
        />
      </div>
    </section>
  );
}

function CampaignCtaTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  return (
    <section className="relative flex w-full flex-col rounded-[1.2rem] border border-zinc-700/60 bg-black/28 px-[clamp(0.95rem,2.1vw,1.85rem)] py-[clamp(0.95rem,2.1vw,1.85rem)]">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-zinc-500/70 bg-zinc-950/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-300">
          {state.eyebrow || "Campaign CTA"}
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{state.proofBadge || "Limited intake"}</span>
      </div>

      <h2 className={cn("mt-5 max-w-[90%] font-semibold tracking-tight text-zinc-50", HEADLINE_SIZE[format])}>{state.title}</h2>
      <p className={cn("mt-4 max-w-[76%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

      <div className="mt-auto pt-7">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left"
          style={{
            borderColor: alphaColor(laneStyle.accentRgb, 0.6 + accentStrength * 0.18),
            backgroundColor: alphaColor(laneStyle.accentRgb, 0.22 + accentStrength * 0.2),
            boxShadow: `0 14px 34px ${alphaColor(laneStyle.accentRgb, 0.2 + accentStrength * 0.14)}`,
          }}
        >
          <span className={cn("font-semibold uppercase tracking-[0.14em] text-zinc-100", CTA_SIZE[format])}>
            {state.ctaText || "Book system audit"}
          </span>
          <span className={cn("font-semibold text-zinc-100", CTA_SIZE[format])}>{"->"}</span>
        </button>
      </div>
    </section>
  );
}

function ProofMetricTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const metric = state.proofBadge || defaultMetricFromTitle(state.title);
  const bars = [44, 52, 58, 63, 72, 79];

  return (
    <section className="relative flex w-full flex-col rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/44 px-[clamp(0.95rem,2.1vw,1.8rem)] py-[clamp(0.9rem,2vw,1.65rem)]">
      <div className="grid grid-cols-[1.05fr_0.95fr] gap-4 max-[650px]:grid-cols-1">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{state.eyebrow || "Proof metric"}</p>
          <p
            className="mt-2 font-semibold tracking-tight text-zinc-50"
            style={{ fontSize: "clamp(2.1rem,7vw,5rem)", lineHeight: 0.95 }}
          >
            {metric}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">Outcome spotlight</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.14em] text-zinc-400">
            <span className="rounded-lg border border-zinc-700/60 bg-zinc-900/55 px-2.5 py-2">Before: 6h avg</span>
            <span className="rounded-lg border border-zinc-700/60 bg-zinc-900/55 px-2.5 py-2">After: 58m avg</span>
          </div>
        </div>

        <div>
          <h2 className={cn("font-semibold tracking-tight text-zinc-100", HEADLINE_SIZE[format])}>{state.title}</h2>
          <p className={cn("mt-3 text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>
        </div>
      </div>

      <div className="mt-5 flex h-[clamp(40px,7vw,72px)] items-end gap-1.5 border-b border-zinc-700/70 pb-2">
        {bars.map((value, index) => (
          <div
            key={index}
            className="flex-1 rounded-sm"
            style={{
              height: `${value}%`,
              background:
                index >= bars.length - 2
                  ? alphaColor(laneStyle.accentRgb, 0.72)
                  : alphaColor(laneStyle.accentRgb, 0.35),
            }}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{state.serviceLane} lane</span>
        <CtaPill
          text={state.ctaText || "View methodology"}
          laneStyle={laneStyle}
          accentStrength={accentStrength}
          format={format}
        />
      </div>
    </section>
  );
}

function EditorialFrameTemplate({ state, format, laneStyle, accentStrength }: TemplateProps) {
  const isTall = format === "portrait" || format === "story";

  return (
    <section
      className={cn(
        "relative grid w-full gap-4 rounded-[1.2rem] border border-zinc-700/60 bg-zinc-950/40 px-[clamp(0.95rem,2.1vw,1.8rem)] py-[clamp(0.95rem,2.05vw,1.72rem)]",
        isTall ? "grid-cols-1" : "grid-cols-[1.2fr_0.8fr]",
      )}
    >
      {!isTall && <div className="pointer-events-none absolute bottom-[12%] left-[63%] top-[14%] w-px bg-zinc-700/65" />}

      <div className={cn(!isTall && "pr-[clamp(0.7rem,1.8vw,1.35rem)]")}>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{state.eyebrow || "Editorial frame"}</p>
        <h2 className={cn("mt-3 max-w-[95%] font-medium tracking-tight text-zinc-100", HEADLINE_SIZE[format])}>{state.title}</h2>
      </div>

      <aside className={cn("flex flex-col justify-between", !isTall && "pl-[clamp(0.7rem,1.8vw,1.35rem)]")}>
        <div className="relative mb-4 h-[clamp(92px,17vw,170px)] overflow-hidden rounded-xl border border-zinc-700/65 bg-zinc-900/45">
          <Image
            src="/work/silentspend/signal-feed.png"
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(5,6,10,0.62)_100%)]" />
          <span className="absolute bottom-2 left-2 rounded-full border border-zinc-600/75 bg-black/45 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-zinc-300">
            SilentSpend
          </span>
        </div>

        <p className={cn("max-w-[94%] text-zinc-300", BODY_SIZE[format])}>{state.subtitle}</p>

        <div className="mt-5 flex items-center justify-between border-t border-zinc-700/65 pt-4">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{state.proofBadge || "Operator perspective"}</span>
          <CtaPill
            text={state.ctaText || "Read note"}
            laneStyle={laneStyle}
            accentStrength={accentStrength}
            format={format}
            strong
          />
        </div>
      </aside>
    </section>
  );
}

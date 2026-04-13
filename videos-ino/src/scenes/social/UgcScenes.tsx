import { brandPalette, filmLayout } from "../../design/brand";
import { type } from "../../design/typography";
import { AnimatedReveal, ProgressRail, useSceneFade } from "../../motion/social-primitives";
import { Wordmark } from "../../primitives/Wordmark";

type UgcHookOverlayProps = {
  tag: string;
  hook: string;
  durationInFrames: number;
};

export const UgcHookOverlay: React.FC<UgcHookOverlayProps> = ({
  tag,
  hook,
  durationInFrames,
}) => {
  const opacity = useSceneFade(durationInFrames, 8, 12);

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <ProgressRail progress={0.34} y={132} />
      <div
        style={{
          position: "absolute",
          top: 190,
          left: filmLayout.safeX,
          right: filmLayout.safeX,
        }}
      >
        <AnimatedReveal startFrame={0} distance={18}>
          <div
            style={{
              ...type.kicker,
              display: "inline-flex",
              padding: "9px 14px",
              borderRadius: 999,
              background: "rgba(73,160,164,0.28)",
              border: "1px solid rgba(122,228,233,0.6)",
              color: "#eaffff",
            }}
          >
            {tag}
          </div>
        </AnimatedReveal>

        <AnimatedReveal startFrame={6} distance={24}>
          <h1
            style={{
              ...type.title(104),
              marginTop: 20,
              maxWidth: 920,
              whiteSpace: "pre-line",
              textShadow: "0 8px 24px rgba(2,4,8,0.72)",
            }}
          >
            {hook}
          </h1>
        </AnimatedReveal>
      </div>
    </div>
  );
};

type UgcSupportOverlayProps = {
  supportingBeat: string;
  cta: string;
  durationInFrames: number;
};

export const UgcSupportOverlay: React.FC<UgcSupportOverlayProps> = ({
  supportingBeat,
  cta,
  durationInFrames,
}) => {
  const opacity = useSceneFade(durationInFrames, 8, 10);

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <ProgressRail progress={0.74} y={132} />

      <AnimatedReveal
        startFrame={0}
        style={{
          position: "absolute",
          left: filmLayout.safeX,
          right: filmLayout.safeX,
          bottom: 280,
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 24,
          padding: "26px 30px",
          background: "rgba(7,11,15,0.64)",
          backdropFilter: "blur(8px)",
        }}
      >
        <p style={{ ...type.bodySmall, margin: 0, color: "#ecf2ff", maxWidth: 780 }}>
          {supportingBeat}
        </p>
      </AnimatedReveal>

      <AnimatedReveal
        startFrame={10}
        style={{
          position: "absolute",
          left: filmLayout.safeX,
          bottom: 166,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          padding: "14px 26px",
          border: "1px solid rgba(122,228,233,0.62)",
          background: "rgba(73,160,164,0.3)",
          boxShadow: "0 0 26px rgba(73,160,164,0.38)",
        }}
      >
        <span style={{ ...type.label, color: "#f0fcff", fontSize: 28 }}>{cta}</span>
      </AnimatedReveal>
    </div>
  );
};

type UgcEndOverlayProps = {
  endNote: string;
  durationInFrames: number;
};

export const UgcEndOverlay: React.FC<UgcEndOverlayProps> = ({
  endNote,
  durationInFrames,
}) => {
  const opacity = useSceneFade(durationInFrames, 10, 12);

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 780,
          width: 600,
          height: 600,
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(73,160,164,0.34) 0%, rgba(73,160,164,0.12) 48%, rgba(73,160,164,0) 74%)",
          filter: "blur(8px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: filmLayout.safeX,
          right: filmLayout.safeX,
          top: 700,
          textAlign: "center",
        }}
      >
        <AnimatedReveal startFrame={0}>
          <Wordmark size={64} />
        </AnimatedReveal>
        <AnimatedReveal startFrame={8}>
          <p
            style={{
              ...type.bodySmall,
              marginTop: 20,
              marginBottom: 0,
              color: "#d7e7ef",
            }}
          >
            {endNote}
          </p>
        </AnimatedReveal>
      </div>
    </div>
  );
};

export const UgcFallbackFootage: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse 70% 55% at 30% 28%, rgba(73,160,164,0.42), rgba(73,160,164,0.1) 46%, rgba(8,11,15,0.95) 82%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: filmLayout.safeX,
          right: filmLayout.safeX,
          bottom: 72,
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 16,
          padding: "12px 18px",
          background: "rgba(7,11,15,0.62)",
          color: brandPalette.textSecondary,
          fontFamily: '"IBM Plex Mono", "SFMono-Regular", Menlo, monospace',
          fontSize: 20,
          letterSpacing: "0.04em",
        }}
      >
        Add `videoSrc` to render real UGC footage background.
      </div>
    </div>
  );
};

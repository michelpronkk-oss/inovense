import { useCurrentFrame } from "remotion";
import { brandPalette, filmLayout } from "../../design/brand";
import { type } from "../../design/typography";
import { AnimatedReveal, ProgressRail, useSceneFade } from "../../motion/social-primitives";

type StatementHookSceneProps = {
  tag: string;
  hook: string;
  subline?: string;
  durationInFrames: number;
};

export const StatementHookScene: React.FC<StatementHookSceneProps> = ({
  tag,
  hook,
  subline,
  durationInFrames,
}) => {
  const opacity = useSceneFade(durationInFrames);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
      }}
    >
      <ProgressRail progress={0.2} />
      <div
        style={{
          position: "absolute",
          top: filmLayout.contentTop,
          left: filmLayout.safeX,
          right: filmLayout.safeX,
        }}
      >
        <AnimatedReveal startFrame={0}>
          <div style={type.kicker}>{tag}</div>
        </AnimatedReveal>

        <AnimatedReveal startFrame={6} distance={34}>
          <h1
            style={{
              ...type.title(114),
              marginTop: 18,
              maxWidth: 920,
              whiteSpace: "pre-line",
            }}
          >
            {hook}
          </h1>
        </AnimatedReveal>

        {subline ? (
          <AnimatedReveal startFrame={14} distance={26}>
            <p
              style={{
                ...type.bodySmall,
                marginTop: 24,
                maxWidth: 840,
              }}
            >
              {subline}
            </p>
          </AnimatedReveal>
        ) : null}
      </div>
    </div>
  );
};

type StatementBeatSceneProps = {
  beat: string;
  beatIndex: number;
  beatTotal: number;
  durationInFrames: number;
};

export const StatementBeatScene: React.FC<StatementBeatSceneProps> = ({
  beat,
  beatIndex,
  beatTotal,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const opacity = useSceneFade(durationInFrames);
  const progress = (beatIndex + 1) / Math.max(beatTotal, 1);
  const pulse = Math.sin(frame / 18) * 0.03 + 1;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
      }}
    >
      <ProgressRail progress={progress} />

      <div
        style={{
          position: "absolute",
          left: filmLayout.safeX,
          right: filmLayout.safeX,
          top: 430,
          border: "1px solid rgba(255,255,255,0.17)",
          borderRadius: 24,
          padding: "34px 36px",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.028) 100%)",
          boxShadow: "0 24px 60px rgba(3,5,11,0.48)",
          transform: `scale(${pulse})`,
        }}
      >
        <AnimatedReveal startFrame={4} distance={24}>
          <div
            style={{
              ...type.note,
              color: brandPalette.accentBright,
              marginBottom: 14,
            }}
          >
            {`Beat ${beatIndex + 1} / ${beatTotal}`}
          </div>
        </AnimatedReveal>

        <AnimatedReveal startFrame={10} distance={20}>
          <p
            style={{
              ...type.titleTight(76),
              margin: 0,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              whiteSpace: "pre-line",
            }}
          >
            {beat}
          </p>
        </AnimatedReveal>
      </div>
    </div>
  );
};

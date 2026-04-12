import { brandPalette, filmLayout } from "../../design/brand";
import { type } from "../../design/typography";
import { AnimatedReveal, ProgressRail, useSceneFade } from "../../motion/social-primitives";

type ProcessIntroSceneProps = {
  tag: string;
  headline: string;
  subline?: string;
  durationInFrames: number;
};

export const ProcessIntroScene: React.FC<ProcessIntroSceneProps> = ({
  tag,
  headline,
  subline,
  durationInFrames,
}) => {
  const opacity = useSceneFade(durationInFrames);

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <ProgressRail progress={0.12} />
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
        <AnimatedReveal startFrame={8} distance={30}>
          <h1
            style={{
              ...type.title(98),
              marginTop: 18,
              maxWidth: 930,
              whiteSpace: "pre-line",
            }}
          >
            {headline}
          </h1>
        </AnimatedReveal>
        {subline ? (
          <AnimatedReveal startFrame={14}>
            <p style={{ ...type.bodySmall, marginTop: 24, maxWidth: 840 }}>{subline}</p>
          </AnimatedReveal>
        ) : null}
      </div>
    </div>
  );
};

type ProcessStepSceneProps = {
  index: number;
  total: number;
  title: string;
  detail: string;
  durationInFrames: number;
};

export const ProcessStepScene: React.FC<ProcessStepSceneProps> = ({
  index,
  total,
  title,
  detail,
  durationInFrames,
}) => {
  const opacity = useSceneFade(durationInFrames, 10, 12);

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <ProgressRail progress={(index + 1) / total} />
      <div
        style={{
          position: "absolute",
          left: filmLayout.safeX,
          right: filmLayout.safeX,
          top: 380,
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 26,
          overflow: "hidden",
          background:
            "linear-gradient(140deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.025) 100%)",
        }}
      >
        <AnimatedReveal startFrame={0}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px minmax(0,1fr)",
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                borderRight: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(73,160,164,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ ...type.metric, fontSize: 74, color: brandPalette.accentBright }}>
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <div style={{ padding: "30px 34px" }}>
              <AnimatedReveal startFrame={5}>
                <h2 style={{ ...type.titleTight(70), margin: 0, whiteSpace: "pre-line" }}>{title}</h2>
              </AnimatedReveal>
              <AnimatedReveal startFrame={11}>
                <p style={{ ...type.bodySmall, marginTop: 14, maxWidth: 700 }}>{detail}</p>
              </AnimatedReveal>
            </div>
          </div>
        </AnimatedReveal>
      </div>
    </div>
  );
};

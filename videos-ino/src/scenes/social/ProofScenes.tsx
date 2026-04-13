import { brandPalette, filmLayout } from "../../design/brand";
import { type } from "../../design/typography";
import { AnimatedReveal, ProgressRail, useSceneFade } from "../../motion/social-primitives";

type ProofHookSceneProps = {
  tag: string;
  hook: string;
  durationInFrames: number;
};

export const ProofHookScene: React.FC<ProofHookSceneProps> = ({
  tag,
  hook,
  durationInFrames,
}) => {
  const opacity = useSceneFade(durationInFrames);

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
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

        <AnimatedReveal startFrame={7} distance={34}>
          <h1
            style={{
              ...type.title(106),
              marginTop: 18,
              maxWidth: 940,
              whiteSpace: "pre-line",
            }}
          >
            {hook}
          </h1>
        </AnimatedReveal>
      </div>
    </div>
  );
};

type ProofContextSceneProps = {
  context: string;
  outcomeLabel: string;
  outcome: string;
  durationInFrames: number;
};

export const ProofContextScene: React.FC<ProofContextSceneProps> = ({
  context,
  outcomeLabel,
  outcome,
  durationInFrames,
}) => {
  const opacity = useSceneFade(durationInFrames, 10, 12);

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <ProgressRail progress={0.52} />
      <div
        style={{
          position: "absolute",
          left: filmLayout.safeX,
          right: filmLayout.safeX,
          top: 350,
          display: "grid",
          gap: 16,
        }}
      >
        <AnimatedReveal startFrame={3}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 24,
              padding: "28px 32px",
              background:
                "linear-gradient(140deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
            }}
          >
            <p style={{ ...type.note, color: brandPalette.accentBright, margin: 0 }}>Context</p>
            <p style={{ ...type.bodySmall, marginTop: 10, marginBottom: 0, maxWidth: 770 }}>{context}</p>
          </div>
        </AnimatedReveal>

        <AnimatedReveal startFrame={10}>
          <div
            style={{
              border: "1px solid rgba(122,228,233,0.45)",
              borderRadius: 24,
              padding: "24px 32px",
              background: "rgba(73,160,164,0.16)",
              boxShadow: "0 0 32px rgba(73,160,164,0.24)",
            }}
          >
            <p style={{ ...type.note, margin: 0, color: "#d9fcff" }}>{outcomeLabel}</p>
            <p style={{ ...type.metric, marginTop: 8, marginBottom: 0, fontSize: 92 }}>{outcome}</p>
          </div>
        </AnimatedReveal>
      </div>
    </div>
  );
};

type ProofInterventionsSceneProps = {
  interventions: string[];
  durationInFrames: number;
};

export const ProofInterventionsScene: React.FC<ProofInterventionsSceneProps> = ({
  interventions,
  durationInFrames,
}) => {
  const opacity = useSceneFade(durationInFrames, 10, 14);
  const list = interventions.slice(0, 4);

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <ProgressRail progress={0.84} />
      <div
        style={{
          position: "absolute",
          left: filmLayout.safeX,
          right: filmLayout.safeX,
          bottom: filmLayout.contentBottom + 12,
          display: "grid",
          gap: 12,
        }}
      >
        {list.map((item, index) => (
          <AnimatedReveal key={`${item}-${index}`} startFrame={index * 7} distance={20}>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 20,
                padding: "16px 22px",
                display: "grid",
                gridTemplateColumns: "52px minmax(0,1fr)",
                gap: 10,
                background: index % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
              }}
            >
              <span style={{ ...type.note, marginTop: 4, color: brandPalette.accentBright }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <p style={{ ...type.bodySmall, margin: 0, fontSize: 30, lineHeight: 1.28 }}>{item}</p>
            </div>
          </AnimatedReveal>
        ))}
      </div>
    </div>
  );
};

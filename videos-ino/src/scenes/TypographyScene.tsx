import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brandPalette, filmLayout } from "../design/brand";
import { type } from "../design/typography";
import { clampFade, riseIn } from "../motion/motion-utils";

type TypographySceneProps = {
  kicker: string;
  headline: string;
  subline?: string;
  durationInFrames: number;
  accentText?: string;
  headlineSize?: number;
  align?: "top" | "center";
  maxWidth?: number;
};

const highlightAccent = (headline: string, accentText?: string) => {
  if (!accentText) {
    return headline;
  }

  const index = headline.toLowerCase().indexOf(accentText.toLowerCase());
  if (index === -1) {
    return headline;
  }

  const before = headline.slice(0, index);
  const target = headline.slice(index, index + accentText.length);
  const after = headline.slice(index + accentText.length);

  return (
    <>
      {before}
      <span style={{ color: brandPalette.accentBright }}>{target}</span>
      {after}
    </>
  );
};

export const TypographyScene: React.FC<TypographySceneProps> = ({
  kicker,
  headline,
  subline,
  durationInFrames,
  accentText,
  headlineSize = 116,
  align = "top",
  maxWidth = 880,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = clampFade(frame, 0, 16, durationInFrames - 22, durationInFrames - 2);
  const rise = riseIn(frame, fps, 0, 44);
  const sublineOpacity = interpolate(frame, [10, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: align === "top" ? filmLayout.contentTop : 600,
        left: filmLayout.safeX,
        right: filmLayout.safeX,
        bottom: filmLayout.contentBottom,
        opacity,
        transform: `translateY(${rise}px)`,
      }}
    >
      <div style={type.kicker}>{kicker}</div>
      <h1 style={{ ...type.title(headlineSize), marginTop: 20, maxWidth }}>
        {highlightAccent(headline, accentText)}
      </h1>
      {subline ? (
        <p
          style={{
            ...type.body,
            marginTop: 28,
            maxWidth: Math.min(maxWidth, 860),
            opacity: sublineOpacity,
          }}
        >
          {subline}
        </p>
      ) : null}
    </div>
  );
};

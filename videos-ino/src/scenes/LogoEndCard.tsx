import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { filmLayout } from "../design/brand";
import { type } from "../design/typography";
import { clampFade, riseIn, springIn } from "../motion/motion-utils";
import { Wordmark } from "../primitives/Wordmark";

type LogoEndCardProps = {
  headline: string;
  subline: string;
  action: string;
  durationInFrames: number;
};

export const LogoEndCard: React.FC<LogoEndCardProps> = ({
  headline,
  subline,
  action,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = clampFade(frame, 0, 12, durationInFrames - 14, durationInFrames - 2);
  const rise = riseIn(frame, fps, 0, 24);
  const actionIn = springIn(frame, fps, 12, 150, 18);
  const actionOpacity = interpolate(actionIn, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const actionY = interpolate(actionIn, [0, 1], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        transform: `translateY(${rise}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 630,
          width: 760,
          height: 760,
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(73,160,164,0.25) 0%, rgba(73,160,164,0.07) 46%, rgba(73,160,164,0) 72%)",
          filter: "blur(14px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 500,
          left: filmLayout.safeX,
          right: filmLayout.safeX,
          textAlign: "center",
        }}
      >
        <Wordmark size={58} />

        <h2
          style={{
            ...type.titleTight(88),
            marginTop: 40,
            maxWidth: 860,
            marginInline: "auto",
          }}
        >
          {headline}
        </h2>
        <p
          style={{
            ...type.bodySmall,
            marginTop: 20,
            maxWidth: 760,
            marginInline: "auto",
          }}
        >
          {subline}
        </p>

        <div
          style={{
            marginTop: 52,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            border: "1px solid rgba(122,228,233,0.45)",
            background: "rgba(73,160,164,0.12)",
            padding: "18px 40px",
            boxShadow: "0 0 26px rgba(73,160,164,0.32)",
            opacity: actionOpacity,
            transform: `translateY(${actionY}px)`,
          }}
        >
          <span style={{ ...type.label, fontSize: 30, color: "#ecfbff" }}>{action}</span>
        </div>
      </div>
    </div>
  );
};


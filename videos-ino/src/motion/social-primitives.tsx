import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type AnimatedRevealProps = {
  startFrame: number;
  durationInFrames?: number;
  distance?: number;
  children: ReactNode;
  style?: CSSProperties;
};

export const AnimatedReveal: React.FC<AnimatedRevealProps> = ({
  startFrame,
  durationInFrames = 26,
  distance = 26,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    durationInFrames,
    config: {
      damping: 18,
      stiffness: 130,
      mass: 0.92,
    },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  const y = interpolate(progress, [0, 1], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const useSceneFade = (
  durationInFrames: number,
  inFrames = 14,
  outFrames = 14,
) => {
  const frame = useCurrentFrame();
  return interpolate(
    frame,
    [0, inFrames, durationInFrames - outFrames, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    },
  );
};

type ProgressRailProps = {
  progress: number;
  y?: number;
};

export const ProgressRail: React.FC<ProgressRailProps> = ({ progress, y = 156 }) => {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div
      style={{
        position: "absolute",
        left: 86,
        right: 86,
        top: y,
        height: 2,
        background: "rgba(255,255,255,0.14)",
      }}
    >
      <div
        style={{
          width: `${clamped * 100}%`,
          height: "100%",
          background:
            "linear-gradient(90deg, rgba(122,228,233,0.95) 0%, rgba(73,160,164,0.74) 100%)",
          boxShadow: "0 0 18px rgba(73,160,164,0.5)",
        }}
      />
    </div>
  );
};

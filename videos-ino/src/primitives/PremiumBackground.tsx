import { AbsoluteFill, useCurrentFrame } from "remotion";
import { brandPalette } from "../design/brand";

type PremiumBackgroundProps = {
  intensity?: number;
};

export const PremiumBackground: React.FC<PremiumBackgroundProps> = ({
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const gridX = (frame * 0.24) % 72;
  const gridY = (frame * 0.14) % 72;
  const glowLift = Math.sin(frame / 36) * 36;
  const glowDrift = Math.cos(frame / 55) * 44;

  return (
    <AbsoluteFill style={{ backgroundColor: brandPalette.background }}>
      <AbsoluteFill
        style={{
          transform: `translate(${-gridX}px, ${-gridY}px)`,
          opacity: 0.5,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 78% 56% at 16% 0%, rgba(73,160,164,0.24) 0%, rgba(73,160,164,0.06) 52%, transparent 74%)",
          transform: `translate(${glowDrift * 0.2}px, ${glowLift * -0.2}px)`,
          opacity: intensity,
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 52% 44% at 92% 72%, rgba(73,160,164,0.16) 0%, transparent 74%)",
          transform: `translate(${glowDrift * -0.25}px, ${glowLift * 0.25}px)`,
          opacity: intensity * 0.92,
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(73,160,164,0.08) 45%, transparent 100%)",
          mixBlendMode: "screen",
          opacity: 0.65 * intensity,
          transform: `translateX(${Math.sin(frame / 48) * 26}px)`,
        }}
      />

      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 220px ${brandPalette.vignette}`,
        }}
      />

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: 0.14,
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(255,255,255,0.9) 0, rgba(255,255,255,0) 44%), radial-gradient(circle at 82% 68%, rgba(255,255,255,0.55) 0, rgba(255,255,255,0) 42%)",
          filter: "blur(22px)",
        }}
      />
    </AbsoluteFill>
  );
};

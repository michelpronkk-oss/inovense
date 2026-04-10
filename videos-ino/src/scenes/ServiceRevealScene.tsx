import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brandPalette, filmLayout } from "../design/brand";
import { type } from "../design/typography";
import { clampFade, springIn, stagger } from "../motion/motion-utils";

type ServiceItem = {
  name: string;
  detail: string;
  metric?: string;
};

type ServiceRevealSceneProps = {
  kicker: string;
  title: string;
  services: ServiceItem[];
  durationInFrames: number;
};

export const ServiceRevealScene: React.FC<ServiceRevealSceneProps> = ({
  kicker,
  title,
  services,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneOpacity = clampFade(frame, 0, 14, durationInFrames - 18, durationInFrames - 2);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: sceneOpacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: filmLayout.contentTop - 24,
          bottom: filmLayout.contentBottom + 80,
          left: filmLayout.safeX - 20,
          width: 3,
          borderRadius: 999,
          background:
            "linear-gradient(180deg, rgba(122,228,233,0.9) 0%, rgba(73,160,164,0.25) 55%, rgba(73,160,164,0) 100%)",
          boxShadow: "0 0 28px rgba(73, 160, 164, 0.42)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: filmLayout.contentTop,
          left: filmLayout.safeX,
          right: filmLayout.safeX,
        }}
      >
        <div style={type.kicker}>{kicker}</div>
        <h2 style={{ ...type.titleTight(96), marginTop: 18, maxWidth: 920 }}>{title}</h2>
      </div>

      <div
        style={{
          position: "absolute",
          left: filmLayout.safeX,
          right: filmLayout.safeX,
          bottom: filmLayout.contentBottom,
          display: "grid",
          gap: 18,
        }}
      >
        {services.map((service, index) => {
          const itemStart = 22 + stagger(index, 10);
          const progress = springIn(frame, fps, itemStart, 130, 16);
          const y = interpolate(progress, [0, 1], [40, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const opacity = interpolate(progress, [0, 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={`${service.name}-${index}`}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background:
                  "linear-gradient(120deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)",
                borderRadius: 22,
                padding: "26px 30px 24px",
                opacity,
                transform: `translateY(${y}px)`,
                boxShadow: "0 20px 50px rgba(2, 4, 12, 0.45)",
                backdropFilter: "blur(7px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 20,
                }}
              >
                <div>
                  <div style={{ ...type.label, fontSize: 18, color: brandPalette.accentBright }}>
                    {`0${index + 1}`}
                  </div>
                  <div
                    style={{
                      ...type.titleTight(54),
                      marginTop: 8,
                      lineHeight: 1.04,
                    }}
                  >
                    {service.name}
                  </div>
                  <p
                    style={{
                      ...type.bodySmall,
                      fontSize: 30,
                      marginTop: 10,
                      maxWidth: 650,
                      color: "rgba(220,227,242,0.9)",
                    }}
                  >
                    {service.detail}
                  </p>
                </div>
                {service.metric ? (
                  <div style={{ ...type.metric, fontSize: 56, color: brandPalette.accentBright }}>
                    {service.metric}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


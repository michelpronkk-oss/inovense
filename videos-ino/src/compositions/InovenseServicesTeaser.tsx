import { AbsoluteFill, Sequence } from "remotion";
import {
  type InovenseServicesTeaserProps,
  inovenseServicesTeaserSchema,
} from "../data/film-presets";
import { PremiumBackground } from "../primitives/PremiumBackground";
import { LogoEndCard } from "../scenes/LogoEndCard";
import { ServiceRevealScene } from "../scenes/ServiceRevealScene";
import { TypographyScene } from "../scenes/TypographyScene";

export { inovenseServicesTeaserSchema };

export const InovenseServicesTeaser: React.FC<InovenseServicesTeaserProps> = ({
  opener,
  services,
  outro,
}) => {
  return (
    <AbsoluteFill>
      <PremiumBackground intensity={0.95} />

      <Sequence durationInFrames={102}>
        <TypographyScene
          kicker={opener.kicker}
          headline={opener.headline}
          subline={opener.subline}
          accentText={opener.accentText}
          durationInFrames={102}
          headlineSize={106}
          align="center"
          maxWidth={930}
        />
      </Sequence>

      <Sequence from={84} durationInFrames={176}>
        <ServiceRevealScene
          kicker="Service architecture"
          title="Each lane is distinct. The craft standard stays the same."
          services={services}
          durationInFrames={176}
        />
      </Sequence>

      <Sequence from={238} durationInFrames={62}>
        <LogoEndCard
          headline={outro.headline}
          subline={outro.subline}
          action={outro.action}
          durationInFrames={62}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

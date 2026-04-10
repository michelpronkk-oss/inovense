import { AbsoluteFill, Sequence } from "remotion";
import {
  type InovenseTrailerProps,
  inovenseTrailerSchema,
} from "../data/film-presets";
import { PremiumBackground } from "../primitives/PremiumBackground";
import { LogoEndCard } from "../scenes/LogoEndCard";
import { ServiceRevealScene } from "../scenes/ServiceRevealScene";
import { TypographyScene } from "../scenes/TypographyScene";

export { inovenseTrailerSchema };

export const InovenseTrailer: React.FC<InovenseTrailerProps> = ({
  opener,
  statement,
  services,
  outro,
}) => {
  return (
    <AbsoluteFill>
      <PremiumBackground intensity={1.05} />

      <Sequence durationInFrames={124}>
        <TypographyScene
          kicker={opener.kicker}
          headline={opener.headline}
          subline={opener.subline}
          accentText={opener.accentText}
          durationInFrames={124}
          headlineSize={104}
        />
      </Sequence>

      <Sequence from={104} durationInFrames={130}>
        <TypographyScene
          kicker={statement.kicker}
          headline={statement.headline}
          subline={statement.subline}
          accentText={statement.accentText}
          durationInFrames={130}
          headlineSize={96}
        />
      </Sequence>

      <Sequence from={218} durationInFrames={104}>
        <ServiceRevealScene
          kicker="Core lanes"
          title="Build, systems, and growth in one operating layer."
          services={services}
          durationInFrames={104}
        />
      </Sequence>

      <Sequence from={300} durationInFrames={60}>
        <LogoEndCard
          headline={outro.headline}
          subline={outro.subline}
          action={outro.action}
          durationInFrames={60}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

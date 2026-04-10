import { AbsoluteFill, Sequence } from "remotion";
import {
  type InovenseLaunchFilmProps,
  inovenseLaunchFilmSchema,
} from "../data/film-presets";
import { PremiumBackground } from "../primitives/PremiumBackground";
import { LogoEndCard } from "../scenes/LogoEndCard";
import { ServiceRevealScene } from "../scenes/ServiceRevealScene";
import { TypographyScene } from "../scenes/TypographyScene";

export { inovenseLaunchFilmSchema };

export const InovenseLaunchFilm: React.FC<InovenseLaunchFilmProps> = ({
  opener,
  statement,
  caseBeat,
  services,
  outro,
}) => {
  return (
    <AbsoluteFill>
      <PremiumBackground intensity={1.12} />

      <Sequence durationInFrames={118}>
        <TypographyScene
          kicker={opener.kicker}
          headline={opener.headline}
          subline={opener.subline}
          accentText={opener.accentText}
          durationInFrames={118}
          headlineSize={98}
        />
      </Sequence>

      <Sequence from={98} durationInFrames={110}>
        <TypographyScene
          kicker={statement.kicker}
          headline={statement.headline}
          subline={statement.subline}
          accentText={statement.accentText}
          durationInFrames={110}
          headlineSize={94}
        />
      </Sequence>

      <Sequence from={188} durationInFrames={136}>
        <ServiceRevealScene
          kicker="Creative systems"
          title="Campaign-ready scenes with stronger rhythm and clearer hierarchy."
          services={services}
          durationInFrames={136}
        />
      </Sequence>

      <Sequence from={302} durationInFrames={78}>
        <TypographyScene
          kicker={caseBeat.kicker}
          headline={caseBeat.headline}
          subline={caseBeat.subline}
          accentText={caseBeat.accentText}
          durationInFrames={78}
          headlineSize={88}
          maxWidth={940}
        />
      </Sequence>

      <Sequence from={354} durationInFrames={66}>
        <LogoEndCard
          headline={outro.headline}
          subline={outro.subline}
          action={outro.action}
          durationInFrames={66}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

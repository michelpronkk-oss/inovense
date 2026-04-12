import { AbsoluteFill, Sequence } from "remotion";
import {
  statementVideoSchema,
  type StatementVideoProps,
} from "../../data/social-video-presets";
import { PremiumBackground } from "../../primitives/PremiumBackground";
import { LogoEndCard } from "../../scenes/LogoEndCard";
import {
  StatementBeatScene,
  StatementHookScene,
} from "../../scenes/social/StatementScenes";

export { statementVideoSchema };

export const InovenseStatementClip: React.FC<StatementVideoProps> = ({
  tag,
  hook,
  subline,
  beats,
  endHeadline,
  endSubline,
  cta,
}) => {
  const beatDuration = 56;
  const beatStart = 86;
  const endStart = beatStart + beats.length * beatDuration - 16;
  const totalDuration = endStart + 78;

  return (
    <AbsoluteFill>
      <PremiumBackground intensity={1.04} />

      <Sequence durationInFrames={102}>
        <StatementHookScene
          tag={tag}
          hook={hook}
          subline={subline}
          durationInFrames={102}
        />
      </Sequence>

      {beats.map((beat, index) => (
        <Sequence
          key={`${beat}-${index}`}
          from={beatStart + index * beatDuration}
          durationInFrames={beatDuration + 28}
        >
          <StatementBeatScene
            beat={beat}
            beatIndex={index}
            beatTotal={beats.length}
            durationInFrames={beatDuration + 28}
          />
        </Sequence>
      ))}

      <Sequence from={endStart} durationInFrames={totalDuration - endStart}>
        <LogoEndCard
          headline={endHeadline}
          subline={endSubline}
          action={cta}
          durationInFrames={totalDuration - endStart}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

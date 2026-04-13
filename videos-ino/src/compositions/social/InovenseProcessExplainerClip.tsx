import { AbsoluteFill, Sequence } from "remotion";
import {
  processExplainerVideoSchema,
  type ProcessExplainerVideoProps,
} from "../../data/social-video-presets";
import { PremiumBackground } from "../../primitives/PremiumBackground";
import { LogoEndCard } from "../../scenes/LogoEndCard";
import {
  ProcessIntroScene,
  ProcessStepScene,
} from "../../scenes/social/ProcessScenes";

export { processExplainerVideoSchema };

export const InovenseProcessExplainerClip: React.FC<
  ProcessExplainerVideoProps
> = ({ tag, headline, subline, steps, endHeadline, endSubline, cta }) => {
  const stepDuration = 52;
  const stepStart = 72;
  const endStart = stepStart + steps.length * stepDuration + 24;
  const totalDuration = endStart + 86;

  return (
    <AbsoluteFill>
      <PremiumBackground intensity={1.08} />

      <Sequence durationInFrames={118}>
        <ProcessIntroScene
          tag={tag}
          headline={headline}
          subline={subline}
          durationInFrames={118}
        />
      </Sequence>

      {steps.map((step, index) => (
        <Sequence
          key={`${step.title}-${index}`}
          from={stepStart + index * stepDuration}
          durationInFrames={stepDuration + 34}
        >
          <ProcessStepScene
            index={index}
            total={steps.length}
            title={step.title}
            detail={step.detail}
            durationInFrames={stepDuration + 34}
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

import { AbsoluteFill, Sequence } from "remotion";
import {
  proofResultVideoSchema,
  type ProofResultVideoProps,
} from "../../data/social-video-presets";
import { PremiumBackground } from "../../primitives/PremiumBackground";
import { LogoEndCard } from "../../scenes/LogoEndCard";
import {
  ProofContextScene,
  ProofHookScene,
  ProofInterventionsScene,
} from "../../scenes/social/ProofScenes";

export { proofResultVideoSchema };

export const InovenseProofResultClip: React.FC<ProofResultVideoProps> = ({
  tag,
  hook,
  context,
  interventions,
  outcomeLabel,
  outcome,
  endHeadline,
  cta,
}) => {
  const hookDuration = 102;
  const contextStart = 68;
  const contextDuration = 132;
  const interventionsStart = 166;
  const interventionsDuration = 136;
  const endStart = 274;
  const endDuration = 86;

  return (
    <AbsoluteFill>
      <PremiumBackground intensity={1.1} />

      <Sequence durationInFrames={hookDuration}>
        <ProofHookScene tag={tag} hook={hook} durationInFrames={hookDuration} />
      </Sequence>

      <Sequence from={contextStart} durationInFrames={contextDuration}>
        <ProofContextScene
          context={context}
          outcomeLabel={outcomeLabel}
          outcome={outcome}
          durationInFrames={contextDuration}
        />
      </Sequence>

      <Sequence from={interventionsStart} durationInFrames={interventionsDuration}>
        <ProofInterventionsScene
          interventions={interventions}
          durationInFrames={interventionsDuration}
        />
      </Sequence>

      <Sequence from={endStart} durationInFrames={endDuration}>
        <LogoEndCard
          headline={endHeadline}
          subline={outcome}
          action={cta}
          durationInFrames={endDuration}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import {
  type UgcOverlayVideoProps,
  ugcOverlayVideoSchema,
} from "../../data/social-video-presets";
import { UgcEndOverlay, UgcFallbackFootage, UgcHookOverlay, UgcSupportOverlay } from "../../scenes/social/UgcScenes";

export { ugcOverlayVideoSchema };

const resolveVideoSrc = (videoSrc?: string) => {
  if (!videoSrc) {
    return null;
  }

  if (videoSrc.startsWith("http://") || videoSrc.startsWith("https://")) {
    return videoSrc;
  }

  return staticFile(videoSrc.replace(/^\/+/, ""));
};

export const InovenseUgcOverlayClip: React.FC<UgcOverlayVideoProps> = ({
  tag,
  hook,
  supportingBeat,
  cta,
  endNote,
  videoSrc,
  overlayStrength = 0.74,
}) => {
  const resolvedVideoSrc = resolveVideoSrc(videoSrc);

  return (
    <AbsoluteFill>
      {resolvedVideoSrc ? (
        <OffthreadVideo
          src={resolvedVideoSrc}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <UgcFallbackFootage />
      )}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(4,6,10,0.55) 0%, rgba(4,6,10,0.35) 32%, rgba(4,6,10,0.78) 100%)",
          opacity: overlayStrength,
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 74% 60% at 80% 14%, rgba(73,160,164,0.34), rgba(73,160,164,0) 68%)",
          opacity: 0.9,
        }}
      />

      <Sequence durationInFrames={126}>
        <UgcHookOverlay tag={tag} hook={hook} durationInFrames={126} />
      </Sequence>

      <Sequence from={82} durationInFrames={166}>
        <UgcSupportOverlay
          supportingBeat={supportingBeat}
          cta={cta}
          durationInFrames={166}
        />
      </Sequence>

      <Sequence from={226} durationInFrames={74}>
        <UgcEndOverlay endNote={endNote} durationInFrames={74} />
      </Sequence>
    </AbsoluteFill>
  );
};

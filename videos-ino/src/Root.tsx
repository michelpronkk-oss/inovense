import "./index.css";
import { Composition } from "remotion";
import {
  InovenseLaunchFilm,
  inovenseLaunchFilmSchema,
} from "./compositions/InovenseLaunchFilm";
import {
  InovenseServicesTeaser,
  inovenseServicesTeaserSchema,
} from "./compositions/InovenseServicesTeaser";
import {
  InovenseTrailer,
  inovenseTrailerSchema,
} from "./compositions/InovenseTrailer";
import {
  InovenseProcessExplainerClip,
  processExplainerVideoSchema,
} from "./compositions/social/InovenseProcessExplainerClip";
import {
  InovenseProofResultClip,
  proofResultVideoSchema,
} from "./compositions/social/InovenseProofResultClip";
import {
  InovenseStatementClip,
  statementVideoSchema,
} from "./compositions/social/InovenseStatementClip";
import {
  InovenseUgcOverlayClip,
  ugcOverlayVideoSchema,
} from "./compositions/social/InovenseUgcOverlayClip";
import {
  inovenseLaunchFilmSample,
  inovenseServicesTeaserSample,
  inovenseTrailerSample,
} from "./data/film-presets";
import {
  processExplainerVideoSample,
  proofResultVideoSample,
  statementVideoSample,
  ugcOverlayVideoSample,
} from "./data/social-video-presets";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="InovenseTrailer"
        component={InovenseTrailer}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
        schema={inovenseTrailerSchema}
        defaultProps={inovenseTrailerSample}
      />
      <Composition
        id="InovenseServicesTeaser"
        component={InovenseServicesTeaser}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        schema={inovenseServicesTeaserSchema}
        defaultProps={inovenseServicesTeaserSample}
      />
      <Composition
        id="InovenseLaunchFilm"
        component={InovenseLaunchFilm}
        durationInFrames={420}
        fps={30}
        width={1080}
        height={1920}
        schema={inovenseLaunchFilmSchema}
        defaultProps={inovenseLaunchFilmSample}
      />
      <Composition
        id="InovenseStatementClip"
        component={InovenseStatementClip}
        durationInFrames={320}
        fps={30}
        width={1080}
        height={1920}
        schema={statementVideoSchema}
        defaultProps={statementVideoSample}
      />
      <Composition
        id="InovenseProcessExplainerClip"
        component={InovenseProcessExplainerClip}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        schema={processExplainerVideoSchema}
        defaultProps={processExplainerVideoSample}
      />
      <Composition
        id="InovenseProofResultClip"
        component={InovenseProofResultClip}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
        schema={proofResultVideoSchema}
        defaultProps={proofResultVideoSample}
      />
      <Composition
        id="InovenseUgcOverlayClip"
        component={InovenseUgcOverlayClip}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        schema={ugcOverlayVideoSchema}
        defaultProps={ugcOverlayVideoSample}
      />
    </>
  );
};

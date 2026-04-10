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
  inovenseLaunchFilmSample,
  inovenseServicesTeaserSample,
  inovenseTrailerSample,
} from "./data/film-presets";

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
    </>
  );
};

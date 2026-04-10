import { Easing, interpolate, spring } from "remotion";

export const clampFade = (
  frame: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
) =>
  interpolate(frame, [inStart, inEnd, outStart, outEnd], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

export const springIn = (
  frame: number,
  fps: number,
  startFrame = 0,
  stiffness = 120,
  damping = 18,
) =>
  spring({
    frame: frame - startFrame,
    fps,
    config: {
      stiffness,
      damping,
      mass: 0.9,
    },
  });

export const riseIn = (
  frame: number,
  fps: number,
  startFrame: number,
  distance: number,
) => {
  const progress = springIn(frame, fps, startFrame);
  return interpolate(progress, [0, 1], [distance, 0]);
};

export const stagger = (index: number, step = 7) => index * step;

import type { MotionTimeline } from '../components/posts/motion-types';

export type MotionScenePresetKey = 'statement' | 'process_hook';

export const MOTION_SCENE_PRESETS: Record<MotionScenePresetKey, MotionTimeline> = {
  statement: {
    beatDurationMs: 900,
    transition: 'fade',
    totalDurationMs: 5600,
  },
  process_hook: {
    beatDurationMs: 780,
    transition: 'slide',
    totalDurationMs: 5200,
  },
};

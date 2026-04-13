export interface MotionTimeline {
  beatDurationMs: number;
  transition: 'fade' | 'slide' | 'cut';
  totalDurationMs?: number;
}

export interface MotionStatementPostData {
  tag: string;
  headline: string;
  sub?: string;
  beats: string[];
  activeBeat?: number;
  cta?: string;
  timeline?: MotionTimeline;
}

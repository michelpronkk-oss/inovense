export type HumanEditorialLayout = 'founder_portrait' | 'walking_hook';

export interface HumanEditorialPostData {
  tag: string;
  headline: string;
  sub?: string;
  personName?: string;
  personRole?: string;
  imageSrc?: string;
  imageAlt?: string;
  cta?: string;
  layout?: HumanEditorialLayout;
}

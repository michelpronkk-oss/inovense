import type { ExplainerIconKey } from '../primitives/explainer-icons';

export interface ExplainerStep {
  icon: ExplainerIconKey;
  title: string;
  detail?: string;
  shortLabel?: string;
}

export interface ProcessCarouselSlideData {
  slideNumber: number;
  totalSlides: number;
  tag: string;
  title: string;
  subtitle?: string;
  steps: ExplainerStep[];
  cta?: string;
  isLast?: boolean;
}

export interface SystemsExplainerData {
  tag: string;
  title: string;
  subtitle: string;
  steps: ExplainerStep[];
  cta?: string;
}

export interface BuildFlowExplainerData {
  tag: string;
  title: string;
  subtitle: string;
  steps: ExplainerStep[];
  cta?: string;
}


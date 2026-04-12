export interface ProofSnippetPostData {
  tag: string;
  headline: string;
  sub?: string;
  outcomeLabel?: string;
  outcome: string;
  context: string;
  whatChanged: string[];
  cta?: string;
}

export interface ProofCarouselSlideData {
  slideNumber: number;
  totalSlides: number;
  tag: string;
  title: string;
  subtitle?: string;
  outcomeLabel?: string;
  outcome: string;
  context: string;
  whatChanged: string[];
  cta?: string;
  isLast?: boolean;
}


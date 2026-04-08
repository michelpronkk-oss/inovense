export type CreativeTemplateId =
  | "square_post"
  | "story_reel_cover"
  | "landscape_ad"
  | "quote_card"
  | "case_spotlight"
  | "offer_cta";

export type CreativeFormatId = "square" | "portrait" | "story" | "landscape";

export type ServiceLane = "Build" | "Systems" | "Growth" | "General";

export type BackgroundMode = "Grid" | "Spotlight" | "Panel";

export interface CreativeFormatSpec {
  id: CreativeFormatId;
  label: string;
  width: number;
  height: number;
}

export interface CreativeTemplateSpec {
  id: CreativeTemplateId;
  label: string;
  description: string;
  defaultFormat: CreativeFormatId;
  supportedFormats: CreativeFormatId[];
}

export interface CreativeState {
  template: CreativeTemplateId;
  format: CreativeFormatId;
  title: string;
  subtitle: string;
  eyebrow: string;
  ctaText: string;
  serviceLane: ServiceLane;
  backgroundMode: BackgroundMode;
  showLogo: boolean;
  accentIntensity: number;
  proofBadge: string;
}

export interface ServiceLaneStyle {
  accentRgb: `${number} ${number} ${number}`;
  textColor: string;
}

export const CREATIVE_FORMAT_SPECS: Record<CreativeFormatId, CreativeFormatSpec> = {
  square: {
    id: "square",
    label: "Square 1:1 (1080 x 1080)",
    width: 1080,
    height: 1080,
  },
  portrait: {
    id: "portrait",
    label: "Portrait 4:5 (1080 x 1350)",
    width: 1080,
    height: 1350,
  },
  story: {
    id: "story",
    label: "Story 9:16 (1080 x 1920)",
    width: 1080,
    height: 1920,
  },
  landscape: {
    id: "landscape",
    label: "Landscape 1.91:1 (1200 x 628)",
    width: 1200,
    height: 628,
  },
};

export const CREATIVE_TEMPLATE_SPECS: Record<CreativeTemplateId, CreativeTemplateSpec> = {
  square_post: {
    id: "square_post",
    label: "Square social post",
    description: "Balanced founder posts and authority content.",
    defaultFormat: "square",
    supportedFormats: ["square", "portrait"],
  },
  story_reel_cover: {
    id: "story_reel_cover",
    label: "Vertical story / reel cover",
    description: "Bold story covers for short form publishing.",
    defaultFormat: "story",
    supportedFormats: ["story", "portrait"],
  },
  landscape_ad: {
    id: "landscape_ad",
    label: "Landscape ad",
    description: "Campaign style ad visual for placements and hero banners.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape"],
  },
  quote_card: {
    id: "quote_card",
    label: "Quote card",
    description: "Editorial quote layout with high trust framing.",
    defaultFormat: "square",
    supportedFormats: ["square", "portrait", "landscape"],
  },
  case_spotlight: {
    id: "case_spotlight",
    label: "Case spotlight",
    description: "Credibility first case narrative with proof signal.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "square"],
  },
  offer_cta: {
    id: "offer_cta",
    label: "Offer / CTA card",
    description: "Decisive conversion creative for paid and outbound.",
    defaultFormat: "portrait",
    supportedFormats: ["portrait", "square", "landscape"],
  },
};

export const SERVICE_LANE_STYLES: Record<ServiceLane, ServiceLaneStyle> = {
  Build: {
    accentRgb: "73 160 164",
    textColor: "text-brand",
  },
  Systems: {
    accentRgb: "114 153 171",
    textColor: "text-sky-300",
  },
  Growth: {
    accentRgb: "130 166 120",
    textColor: "text-emerald-300",
  },
  General: {
    accentRgb: "159 159 171",
    textColor: "text-zinc-300",
  },
};

export const CREATIVE_TEMPLATE_OPTIONS = Object.values(CREATIVE_TEMPLATE_SPECS);
export const CREATIVE_FORMAT_OPTIONS = Object.values(CREATIVE_FORMAT_SPECS);
export const SERVICE_LANE_OPTIONS: ServiceLane[] = ["Build", "Systems", "Growth", "General"];
export const BACKGROUND_MODE_OPTIONS: BackgroundMode[] = ["Grid", "Spotlight", "Panel"];

interface TemplatePreset {
  format: CreativeFormatId;
  title: string;
  subtitle: string;
  eyebrow: string;
  ctaText: string;
  serviceLane: ServiceLane;
  backgroundMode: BackgroundMode;
  showLogo: boolean;
  accentIntensity: number;
  proofBadge: string;
}

export const CREATIVE_TEMPLATE_PRESETS: Record<CreativeTemplateId, TemplatePreset> = {
  square_post: {
    format: "square",
    title: "Execution quality is not a design preference. It is your moat.",
    subtitle:
      "For operators, the fastest growth unlock usually comes from fixing decision speed and delivery rhythm.",
    eyebrow: "Founder signal",
    ctaText: "Build your operating edge",
    serviceLane: "General",
    backgroundMode: "Grid",
    showLogo: true,
    accentIntensity: 42,
    proofBadge: "Operator playbook",
  },
  story_reel_cover: {
    format: "story",
    title: "Three systems we audit before we scale paid traffic.",
    subtitle: "No guesswork. No channel chaos. Just controlled execution.",
    eyebrow: "Inovense brief",
    ctaText: "Watch the breakdown",
    serviceLane: "Growth",
    backgroundMode: "Spotlight",
    showLogo: true,
    accentIntensity: 56,
    proofBadge: "Field notes",
  },
  landscape_ad: {
    format: "landscape",
    title: "Digital infrastructure for teams that move with intent.",
    subtitle: "Web builds, automation architecture, and growth systems engineered as one stack.",
    eyebrow: "Campaign creative",
    ctaText: "Book strategic review",
    serviceLane: "Systems",
    backgroundMode: "Panel",
    showLogo: true,
    accentIntensity: 44,
    proofBadge: "Limited Q2 intake",
  },
  quote_card: {
    format: "square",
    title: "The bottleneck is rarely effort. It is usually system design.",
    subtitle: "High-leverage operators structure decisions before they optimize output.",
    eyebrow: "From the Inovense desk",
    ctaText: "Read the full note",
    serviceLane: "Systems",
    backgroundMode: "Grid",
    showLogo: true,
    accentIntensity: 38,
    proofBadge: "Authority signal",
  },
  case_spotlight: {
    format: "landscape",
    title: "Case spotlight: from fragmented stack to integrated growth engine.",
    subtitle:
      "In 8 weeks, the team consolidated channels, rebuilt conversion paths, and launched a repeatable operating cadence.",
    eyebrow: "Case spotlight",
    ctaText: "See the breakdown",
    serviceLane: "Build",
    backgroundMode: "Panel",
    showLogo: true,
    accentIntensity: 48,
    proofBadge: "+62% qualified pipeline",
  },
  offer_cta: {
    format: "portrait",
    title: "Q2 Infrastructure Sprint",
    subtitle:
      "Two-week advisory plus implementation plan for leadership teams that need decisive execution.",
    eyebrow: "Offer",
    ctaText: "Apply for sprint",
    serviceLane: "Build",
    backgroundMode: "Spotlight",
    showLogo: true,
    accentIntensity: 58,
    proofBadge: "4 seats available",
  },
};

export const DEFAULT_TEMPLATE_ID: CreativeTemplateId = "square_post";

export function createCreativeState(template: CreativeTemplateId): CreativeState {
  const preset = CREATIVE_TEMPLATE_PRESETS[template];
  return {
    template,
    ...preset,
  };
}

export const DEFAULT_CREATIVE_STATE: CreativeState = createCreativeState(DEFAULT_TEMPLATE_ID);

export function clampAccentIntensity(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

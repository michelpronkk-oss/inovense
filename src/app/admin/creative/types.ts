export type CreativeMode = "Brand" | "Social" | "Ad";

export type CreativeTemplateId =
  | "poster_scene"
  | "gradient_statement"
  | "campaign_cta"
  | "proof_metric"
  | "editorial_frame";

export type CreativeFormatId = "square" | "portrait" | "story" | "landscape";

export type ServiceLane = "Build" | "Systems" | "Growth" | "General";

export interface CreativeFormatSpec {
  id: CreativeFormatId;
  label: string;
  width: number;
  height: number;
}

export interface CreativeModeSpec {
  id: CreativeMode;
  label: string;
  description: string;
}

export interface CreativeTemplateSpec {
  id: CreativeTemplateId;
  mode: CreativeMode;
  label: string;
  description: string;
  defaultFormat: CreativeFormatId;
  supportedFormats: CreativeFormatId[];
}

export interface CreativeState {
  mode: CreativeMode;
  template: CreativeTemplateId;
  format: CreativeFormatId;
  title: string;
  subtitle: string;
  eyebrow: string;
  ctaText: string;
  serviceLane: ServiceLane;
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

export const CREATIVE_MODE_SPECS: Record<CreativeMode, CreativeModeSpec> = {
  Brand: {
    id: "Brand",
    label: "Brand",
    description: "Editorial positioning and authority-led brand moments.",
  },
  Social: {
    id: "Social",
    label: "Social",
    description: "Proof-led formats for publishing and credibility.",
  },
  Ad: {
    id: "Ad",
    label: "Ad",
    description: "Hard CTA campaign visuals for paid and offer distribution.",
  },
};

export const CREATIVE_TEMPLATE_SPECS: Record<CreativeTemplateId, CreativeTemplateSpec> = {
  poster_scene: {
    id: "poster_scene",
    mode: "Social",
    label: "Poster on scene",
    description: "Photo-led scene with a poster board for punchy social creative.",
    defaultFormat: "portrait",
    supportedFormats: ["portrait", "square", "story"],
  },
  gradient_statement: {
    id: "gradient_statement",
    mode: "Brand",
    label: "Gradient statement",
    description: "Minimal large-type statement on a premium gradient field.",
    defaultFormat: "story",
    supportedFormats: ["story", "portrait", "square", "landscape"],
  },
  campaign_cta: {
    id: "campaign_cta",
    mode: "Ad",
    label: "Campaign CTA",
    description: "Direct-response campaign frame with one dominant action.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "portrait", "square", "story"],
  },
  proof_metric: {
    id: "proof_metric",
    mode: "Social",
    label: "Proof metric",
    description: "Outcome spotlight format with metric-first hierarchy.",
    defaultFormat: "square",
    supportedFormats: ["square", "landscape", "portrait"],
  },
  editorial_frame: {
    id: "editorial_frame",
    mode: "Brand",
    label: "Editorial frame",
    description: "Asymmetrical editorial composition for founder and case narratives.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "portrait", "square"],
  },
};

export const TEMPLATES_BY_MODE: Record<CreativeMode, CreativeTemplateId[]> = {
  Brand: ["gradient_statement", "editorial_frame"],
  Social: ["poster_scene", "proof_metric"],
  Ad: ["campaign_cta"],
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

export const CREATIVE_MODE_OPTIONS = Object.values(CREATIVE_MODE_SPECS);
export const CREATIVE_TEMPLATE_OPTIONS = Object.values(CREATIVE_TEMPLATE_SPECS);
export const CREATIVE_FORMAT_OPTIONS = Object.values(CREATIVE_FORMAT_SPECS);
export const SERVICE_LANE_OPTIONS: ServiceLane[] = ["Build", "Systems", "Growth", "General"];

interface TemplatePreset {
  format: CreativeFormatId;
  title: string;
  subtitle: string;
  eyebrow: string;
  ctaText: string;
  serviceLane: ServiceLane;
  showLogo: boolean;
  accentIntensity: number;
  proofBadge: string;
}

export const CREATIVE_TEMPLATE_PRESETS: Record<CreativeTemplateId, TemplatePreset> = {
  poster_scene: {
    format: "portrait",
    title: "Q2 Shopify Design Sprint. Build a premium store that converts.",
    subtitle:
      "Focused conversion architecture, product storytelling, and operator-grade build quality for serious ecommerce brands.",
    eyebrow: "Offer post",
    ctaText: "Apply now",
    serviceLane: "Build",
    showLogo: true,
    accentIntensity: 56,
    proofBadge: "6 sprint slots",
  },
  gradient_statement: {
    format: "story",
    title: "Execution quality is the real growth moat.",
    subtitle:
      "Authority compounds when build, systems, and growth operate at one standard across every client touchpoint.",
    eyebrow: "Authority statement",
    ctaText: "Read the thesis",
    serviceLane: "General",
    showLogo: true,
    accentIntensity: 40,
    proofBadge: "Inovense perspective",
  },
  campaign_cta: {
    format: "landscape",
    title: "Your pipeline is active. Your conversion system still leaks.",
    subtitle:
      "Deploy one operator-grade layer for lead capture, qualification, routing, and follow-up before the next spend cycle.",
    eyebrow: "Ad visual",
    ctaText: "Book 20 min audit",
    serviceLane: "Systems",
    showLogo: true,
    accentIntensity: 66,
    proofBadge: "Response in 24h",
  },
  proof_metric: {
    format: "square",
    title: "Qualified lead-to-call conversion improved after routing redesign.",
    subtitle:
      "Manual inbox triage was replaced with structured scoring and assignment logic across one systems layer.",
    eyebrow: "Proof post",
    ctaText: "View methodology",
    serviceLane: "Systems",
    showLogo: true,
    accentIntensity: 50,
    proofBadge: "+42%",
  },
  editorial_frame: {
    format: "landscape",
    title: "SilentSpend: global monetization intelligence built and shipped by Inovense.",
    subtitle:
      "Pricing shifts, paywall movement, packaging changes, and trial strategy tracked as one operator-grade decision layer.",
    eyebrow: "Case snippet",
    ctaText: "Open /work/silentspend",
    serviceLane: "Systems",
    showLogo: true,
    accentIntensity: 44,
    proofBadge: "Internal product case",
  },
};

export const DEFAULT_TEMPLATE_ID: CreativeTemplateId = "poster_scene";

export function getModeForTemplate(template: CreativeTemplateId): CreativeMode {
  return CREATIVE_TEMPLATE_SPECS[template].mode;
}

export function getTemplatesForMode(mode: CreativeMode): CreativeTemplateId[] {
  return TEMPLATES_BY_MODE[mode];
}

export function resolveTemplateForMode(
  mode: CreativeMode,
  preferredTemplate?: CreativeTemplateId,
): CreativeTemplateId {
  if (preferredTemplate && CREATIVE_TEMPLATE_SPECS[preferredTemplate].mode === mode) {
    return preferredTemplate;
  }

  return TEMPLATES_BY_MODE[mode][0];
}

export function createCreativeState(template: CreativeTemplateId): CreativeState {
  const preset = CREATIVE_TEMPLATE_PRESETS[template];
  const mode = getModeForTemplate(template);

  return {
    mode,
    template,
    ...preset,
  };
}

export function createCreativeStateForMode(
  mode: CreativeMode,
  preferredTemplate?: CreativeTemplateId,
): CreativeState {
  const template = resolveTemplateForMode(mode, preferredTemplate);
  return createCreativeState(template);
}

export const DEFAULT_CREATIVE_STATE: CreativeState = createCreativeState(DEFAULT_TEMPLATE_ID);

export function clampAccentIntensity(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

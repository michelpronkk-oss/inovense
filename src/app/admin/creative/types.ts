export type CreativeMode = "Brand" | "Social" | "Ad";

export type CreativeTemplateId =
  | "statement_card"
  | "operator_memo"
  | "quote_editorial"
  | "proof_card"
  | "case_spotlight"
  | "trust_card"
  | "offer_panel"
  | "ad_frame";

export type CreativeFormatId = "square" | "portrait" | "story" | "landscape";

export type ServiceLane = "Build" | "Systems" | "Growth" | "General";

export type BackgroundMode = "Grid" | "Spotlight" | "Panel";

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

export const CREATIVE_MODE_SPECS: Record<CreativeMode, CreativeModeSpec> = {
  Brand: {
    id: "Brand",
    label: "Brand",
    description: "Editorial authority, positioning clarity, and founder voice.",
  },
  Social: {
    id: "Social",
    label: "Social",
    description: "Proof-led publishing assets for authority and trust.",
  },
  Ad: {
    id: "Ad",
    label: "Ad",
    description: "Campaign-grade conversion visuals with clear CTA framing.",
  },
};

export const CREATIVE_TEMPLATE_SPECS: Record<CreativeTemplateId, CreativeTemplateSpec> = {
  statement_card: {
    id: "statement_card",
    mode: "Brand",
    label: "Statement card",
    description: "Text-first positioning statement with high visual restraint.",
    defaultFormat: "square",
    supportedFormats: ["square", "portrait", "landscape"],
  },
  operator_memo: {
    id: "operator_memo",
    mode: "Brand",
    label: "Operator memo",
    description: "Founder or operator perspective with memo-style hierarchy.",
    defaultFormat: "portrait",
    supportedFormats: ["portrait", "square", "landscape"],
  },
  quote_editorial: {
    id: "quote_editorial",
    mode: "Brand",
    label: "Quote/editorial card",
    description: "Editorial quote frame for authority-led publishing.",
    defaultFormat: "square",
    supportedFormats: ["square", "portrait", "landscape"],
  },
  proof_card: {
    id: "proof_card",
    mode: "Social",
    label: "Proof card",
    description: "Result-focused post format with evidence and action context.",
    defaultFormat: "square",
    supportedFormats: ["square", "portrait", "landscape"],
  },
  case_spotlight: {
    id: "case_spotlight",
    mode: "Social",
    label: "Case spotlight",
    description: "Before and after case snippet with execution lens.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "square", "portrait"],
  },
  trust_card: {
    id: "trust_card",
    mode: "Social",
    label: "Trust card",
    description: "Review and credibility visual for trust reinforcement.",
    defaultFormat: "portrait",
    supportedFormats: ["portrait", "square", "landscape", "story"],
  },
  offer_panel: {
    id: "offer_panel",
    mode: "Ad",
    label: "Offer panel",
    description: "Offer-led ad layout with concise scope and direct CTA.",
    defaultFormat: "portrait",
    supportedFormats: ["portrait", "square", "landscape", "story"],
  },
  ad_frame: {
    id: "ad_frame",
    mode: "Ad",
    label: "Ad frame",
    description: "Hook, proof, and conversion CTA in a campaign frame.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "portrait", "square", "story"],
  },
};

export const TEMPLATES_BY_MODE: Record<CreativeMode, CreativeTemplateId[]> = {
  Brand: ["statement_card", "operator_memo", "quote_editorial"],
  Social: ["proof_card", "case_spotlight", "trust_card"],
  Ad: ["offer_panel", "ad_frame"],
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
  statement_card: {
    format: "square",
    title: "Execution quality compounds quietly, then all at once.",
    subtitle:
      "The strongest brands in the category are built through consistent delivery, not louder messaging.",
    eyebrow: "Brand statement",
    ctaText: "Read the position",
    serviceLane: "General",
    backgroundMode: "Grid",
    showLogo: true,
    accentIntensity: 32,
    proofBadge: "Positioning signal",
  },
  operator_memo: {
    format: "portrait",
    title: "Operator memo: clarity before velocity.",
    subtitle:
      "If qualification, routing, and reporting are misaligned, growth spend only amplifies inconsistency.",
    eyebrow: "Operator memo",
    ctaText: "Read the memo",
    serviceLane: "Systems",
    backgroundMode: "Panel",
    showLogo: true,
    accentIntensity: 40,
    proofBadge: "Founder/operator",
  },
  quote_editorial: {
    format: "square",
    title: "Authority is not a voice style. It is what your systems make repeatedly true.",
    subtitle:
      "Premium execution is visible in cadence, quality control, and measured operating outcomes.",
    eyebrow: "Editorial",
    ctaText: "Share perspective",
    serviceLane: "General",
    backgroundMode: "Spotlight",
    showLogo: true,
    accentIntensity: 36,
    proofBadge: "Quote frame",
  },
  proof_card: {
    format: "square",
    title: "Proof: +38% faster response after lead-flow redesign.",
    subtitle:
      "Capture points, assignment logic, and follow-up timing were rebuilt into one operating system with measurable latency reduction.",
    eyebrow: "Proof",
    ctaText: "View method",
    serviceLane: "Systems",
    backgroundMode: "Panel",
    showLogo: true,
    accentIntensity: 48,
    proofBadge: "+38% response speed",
  },
  case_spotlight: {
    format: "landscape",
    title: "Case spotlight: fragmented execution replaced by one commercial engine.",
    subtitle:
      "In 8 weeks the team aligned website flow, qualification logic, and performance reporting across one delivery stack.",
    eyebrow: "Case spotlight",
    ctaText: "Open case",
    serviceLane: "Build",
    backgroundMode: "Grid",
    showLogo: true,
    accentIntensity: 46,
    proofBadge: "+62% qualified pipeline",
  },
  trust_card: {
    format: "portrait",
    title: "Rated 4.7 on Trustpilot.",
    subtitle:
      "Feedback from verified client engagements focused on delivery quality, communication clarity, and operating reliability.",
    eyebrow: "Trust signal",
    ctaText: "Read reviews",
    serviceLane: "General",
    backgroundMode: "Spotlight",
    showLogo: true,
    accentIntensity: 34,
    proofBadge: "Verified reviews",
  },
  offer_panel: {
    format: "portrait",
    title: "Offer panel: Q2 systems sprint.",
    subtitle:
      "Two-week strategy and implementation scope for teams that need cleaner lead flow and tighter execution rhythm.",
    eyebrow: "Offer panel",
    ctaText: "Apply now",
    serviceLane: "Systems",
    backgroundMode: "Panel",
    showLogo: true,
    accentIntensity: 62,
    proofBadge: "Limited intake",
  },
  ad_frame: {
    format: "landscape",
    title: "Demand is active. Your conversion infrastructure is the bottleneck.",
    subtitle:
      "Deploy one system for capture, qualification, and follow-up so high-intent demand does not stall between tools.",
    eyebrow: "Campaign frame",
    ctaText: "Book audit",
    serviceLane: "Growth",
    backgroundMode: "Grid",
    showLogo: true,
    accentIntensity: 64,
    proofBadge: "Campaign-ready",
  },
};

export const DEFAULT_TEMPLATE_ID: CreativeTemplateId = "statement_card";

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

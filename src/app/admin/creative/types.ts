export type CreativeMode = "Brand" | "Social" | "Ad";

export type CreativeTemplateId =
  | "silent_statement"
  | "founder_signal"
  | "brand_thesis"
  | "authority_quote"
  | "case_spotlight"
  | "proof_card"
  | "launch_post"
  | "insight_post"
  | "offer_ad"
  | "pain_point_ad"
  | "service_cta_ad"
  | "landing_page_ad"
  | "systems_ad"
  | "growth_ad";

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
    description: "Identity-driven, editorial, high signal statements.",
  },
  Social: {
    id: "Social",
    label: "Social",
    description: "Authority and proof-first social publishing assets.",
  },
  Ad: {
    id: "Ad",
    label: "Ad",
    description: "Campaign-ready ads with sharper commercial intent.",
  },
};

export const CREATIVE_TEMPLATE_SPECS: Record<CreativeTemplateId, CreativeTemplateSpec> = {
  silent_statement: {
    id: "silent_statement",
    mode: "Brand",
    label: "Silent statement",
    description: "Minimal brand assertion with text-first gravity.",
    defaultFormat: "square",
    supportedFormats: ["square", "portrait", "landscape"],
  },
  founder_signal: {
    id: "founder_signal",
    mode: "Brand",
    label: "Founder signal",
    description: "Founder voice signal card with calm authority.",
    defaultFormat: "portrait",
    supportedFormats: ["portrait", "square", "landscape"],
  },
  brand_thesis: {
    id: "brand_thesis",
    mode: "Brand",
    label: "Brand thesis",
    description: "Positioning thesis with structured narrative hierarchy.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "square"],
  },
  authority_quote: {
    id: "authority_quote",
    mode: "Brand",
    label: "Authority quote",
    description: "Editorial quote composition for trust and gravitas.",
    defaultFormat: "square",
    supportedFormats: ["square", "portrait", "landscape"],
  },
  case_spotlight: {
    id: "case_spotlight",
    mode: "Social",
    label: "Case spotlight",
    description: "Narrative case card with concrete operating outcomes.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "square", "portrait"],
  },
  proof_card: {
    id: "proof_card",
    mode: "Social",
    label: "Proof card",
    description: "Metric-led authority post with supporting proof points.",
    defaultFormat: "square",
    supportedFormats: ["square", "portrait", "landscape"],
  },
  launch_post: {
    id: "launch_post",
    mode: "Social",
    label: "Launch post",
    description: "Productized launch communication with rollout structure.",
    defaultFormat: "portrait",
    supportedFormats: ["portrait", "square", "story"],
  },
  insight_post: {
    id: "insight_post",
    mode: "Social",
    label: "Insight post",
    description: "Point-of-view post with concise strategic insight.",
    defaultFormat: "square",
    supportedFormats: ["square", "landscape", "portrait"],
  },
  offer_ad: {
    id: "offer_ad",
    mode: "Ad",
    label: "Offer ad",
    description: "High-intent offer creative with urgency and clear CTA.",
    defaultFormat: "portrait",
    supportedFormats: ["portrait", "landscape", "square", "story"],
  },
  pain_point_ad: {
    id: "pain_point_ad",
    mode: "Ad",
    label: "Pain-point ad",
    description: "Problem-to-outcome framing for direct response ads.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "portrait", "square"],
  },
  service_cta_ad: {
    id: "service_cta_ad",
    mode: "Ad",
    label: "Service CTA ad",
    description: "Service-led conversion ad with offer clarity.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "square", "portrait"],
  },
  landing_page_ad: {
    id: "landing_page_ad",
    mode: "Ad",
    label: "Landing page ad",
    description: "Preview-led ad to drive clicks to dedicated pages.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "square"],
  },
  systems_ad: {
    id: "systems_ad",
    mode: "Ad",
    label: "Systems ad",
    description: "Workflow and automation ad for operations buyers.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "portrait", "square"],
  },
  growth_ad: {
    id: "growth_ad",
    mode: "Ad",
    label: "Growth ad",
    description: "Performance-driven ad with channel and outcome framing.",
    defaultFormat: "landscape",
    supportedFormats: ["landscape", "portrait", "square"],
  },
};

export const TEMPLATES_BY_MODE: Record<CreativeMode, CreativeTemplateId[]> = {
  Brand: ["silent_statement", "founder_signal", "brand_thesis", "authority_quote"],
  Social: ["case_spotlight", "proof_card", "launch_post", "insight_post"],
  Ad: ["offer_ad", "pain_point_ad", "service_cta_ad", "landing_page_ad", "systems_ad", "growth_ad"],
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
  silent_statement: {
    format: "square",
    title: "Execution quality compounds quietly, then all at once.",
    subtitle:
      "Most teams do not need more tactics. They need cleaner systems that remove drag from decision-making.",
    eyebrow: "Inovense",
    ctaText: "Read the thesis",
    serviceLane: "General",
    backgroundMode: "Grid",
    showLogo: true,
    accentIntensity: 34,
    proofBadge: "Brand statement",
  },
  founder_signal: {
    format: "portrait",
    title: "Serious operators optimize for clarity before velocity.",
    subtitle:
      "Velocity without system clarity creates hidden cost. We design for controlled scale and calm execution.",
    eyebrow: "Founder signal",
    ctaText: "From the desk",
    serviceLane: "General",
    backgroundMode: "Spotlight",
    showLogo: true,
    accentIntensity: 42,
    proofBadge: "Operator memo",
  },
  brand_thesis: {
    format: "landscape",
    title: "Brand thesis: infrastructure is the real growth multiplier.",
    subtitle:
      "A premium website without systems is decoration. Systems without growth logic is throughput without leverage.",
    eyebrow: "Brand thesis",
    ctaText: "See our approach",
    serviceLane: "Systems",
    backgroundMode: "Panel",
    showLogo: true,
    accentIntensity: 38,
    proofBadge: "Identity architecture",
  },
  authority_quote: {
    format: "square",
    title: "The market rewards teams that operationalize trust, not just claim it.",
    subtitle:
      "Authority is not a voice style. It is what your systems make consistently true.",
    eyebrow: "Authority quote",
    ctaText: "Share insight",
    serviceLane: "Systems",
    backgroundMode: "Grid",
    showLogo: true,
    accentIntensity: 36,
    proofBadge: "Editorial",
  },
  case_spotlight: {
    format: "landscape",
    title: "Case spotlight: from fragmented execution to one operating engine.",
    subtitle:
      "In 8 weeks, the team rebuilt web flows, aligned ops automation, and shipped an integrated commercial stack.",
    eyebrow: "Case spotlight",
    ctaText: "See the full case",
    serviceLane: "Build",
    backgroundMode: "Panel",
    showLogo: true,
    accentIntensity: 48,
    proofBadge: "+62% qualified pipeline",
  },
  proof_card: {
    format: "square",
    title: "+38% faster lead response after systems consolidation.",
    subtitle:
      "Channel intake, assignment, and follow-up were unified into one execution layer with measurable latency drops.",
    eyebrow: "Proof card",
    ctaText: "View methodology",
    serviceLane: "Systems",
    backgroundMode: "Grid",
    showLogo: true,
    accentIntensity: 46,
    proofBadge: "Measured outcome",
  },
  launch_post: {
    format: "portrait",
    title: "Launch: Inovense Creative Engine v1 is now live internally.",
    subtitle:
      "A reusable visual system for founder content, ad production, and authority storytelling without design drag.",
    eyebrow: "Launch post",
    ctaText: "Preview templates",
    serviceLane: "Build",
    backgroundMode: "Spotlight",
    showLogo: true,
    accentIntensity: 52,
    proofBadge: "Now shipping",
  },
  insight_post: {
    format: "square",
    title: "Insight: paid performance usually mirrors operational discipline.",
    subtitle:
      "When routing, reporting, and message architecture are loose, media spend only amplifies inconsistency.",
    eyebrow: "Insight post",
    ctaText: "Read insight",
    serviceLane: "Growth",
    backgroundMode: "Grid",
    showLogo: true,
    accentIntensity: 44,
    proofBadge: "Strategic note",
  },
  offer_ad: {
    format: "portrait",
    title: "Q2 Infrastructure Sprint",
    subtitle:
      "Two-week advisory and execution blueprint for teams that need commercial clarity and delivery speed.",
    eyebrow: "Offer ad",
    ctaText: "Apply now",
    serviceLane: "Build",
    backgroundMode: "Spotlight",
    showLogo: true,
    accentIntensity: 60,
    proofBadge: "4 seats left",
  },
  pain_point_ad: {
    format: "landscape",
    title: "Leads are not the issue. Conversion friction is.",
    subtitle:
      "Patchwork web and ops systems quietly kill high-intent demand before sales can act.",
    eyebrow: "Pain-point ad",
    ctaText: "Fix the funnel",
    serviceLane: "Growth",
    backgroundMode: "Panel",
    showLogo: true,
    accentIntensity: 58,
    proofBadge: "Commercial urgency",
  },
  service_cta_ad: {
    format: "landscape",
    title: "Build + Systems + Growth. One operator-grade partner.",
    subtitle:
      "Cross-functional execution with one accountable team, one strategy, and one delivery rhythm.",
    eyebrow: "Service CTA ad",
    ctaText: "Book strategic call",
    serviceLane: "General",
    backgroundMode: "Panel",
    showLogo: true,
    accentIntensity: 56,
    proofBadge: "Integrated delivery",
  },
  landing_page_ad: {
    format: "landscape",
    title: "Your landing page is live. Your system still is not.",
    subtitle:
      "Drive clicks to pages built with conversion architecture, proof hierarchy, and sales-ready routes.",
    eyebrow: "Landing page ad",
    ctaText: "Open preview",
    serviceLane: "Build",
    backgroundMode: "Grid",
    showLogo: true,
    accentIntensity: 54,
    proofBadge: "Campaign-ready",
  },
  systems_ad: {
    format: "landscape",
    title: "Manual ops is slowing growth and burning margin.",
    subtitle:
      "Deploy workflow architecture that routes, qualifies, and follows up without operational bottlenecks.",
    eyebrow: "Systems ad",
    ctaText: "Audit systems",
    serviceLane: "Systems",
    backgroundMode: "Panel",
    showLogo: true,
    accentIntensity: 58,
    proofBadge: "Ops upgrade",
  },
  growth_ad: {
    format: "landscape",
    title: "Scale growth with signal, not guesswork.",
    subtitle:
      "Channel strategy, content systems, and paid operations aligned to one measurable commercial model.",
    eyebrow: "Growth ad",
    ctaText: "Plan growth stack",
    serviceLane: "Growth",
    backgroundMode: "Spotlight",
    showLogo: true,
    accentIntensity: 62,
    proofBadge: "Performance focus",
  },
};

export const DEFAULT_TEMPLATE_ID: CreativeTemplateId = "silent_statement";

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

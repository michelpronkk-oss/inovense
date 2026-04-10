import type {
  PlannerPlatform,
  PlannerStatus,
  PlannerTemplateType,
} from "@/lib/supabase-server";

export const PLANNER_STATUS_OPTIONS: Array<{
  value: PlannerStatus;
  label: string;
  color: string;
}> = [
  {
    value: "draft",
    label: "Draft",
    color: "bg-zinc-700/30 text-zinc-400 border-zinc-700/40",
  },
  {
    value: "ready",
    label: "Ready",
    color: "bg-brand/10 text-brand border-brand/25",
  },
  {
    value: "posted",
    label: "Posted",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
];

export const STATUS_LABELS: Record<PlannerStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  posted: "Posted",
};

export const STATUS_COLORS: Record<PlannerStatus, string> = {
  draft: "bg-zinc-700/30 text-zinc-400 border-zinc-700/40",
  ready: "bg-brand/10 text-brand border-brand/25",
  posted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export const PLATFORM_OPTIONS: Array<{ value: PlannerPlatform; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
];

export const PLATFORM_LABELS: Record<PlannerPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

export const TEMPLATE_OPTIONS: Array<{ value: PlannerTemplateType; label: string }> = [
  { value: "authority", label: "Authority" },
  { value: "service", label: "Service" },
  { value: "offer", label: "Offer" },
  { value: "quote", label: "Quote" },
  { value: "carousel", label: "Carousel" },
  { value: "custom", label: "Custom" },
];

export const TEMPLATE_LABELS: Record<PlannerTemplateType, string> = {
  authority: "Authority",
  service: "Service",
  offer: "Offer",
  quote: "Quote",
  carousel: "Carousel",
  custom: "Custom",
};

export const FORMAT_OPTIONS = [
  { value: "4:5 Portrait", label: "4:5 Portrait" },
  { value: "1:1 Square", label: "1:1 Square" },
  { value: "9:16 Story", label: "9:16 Story" },
] as const;

export const FORMAT_VALUES = FORMAT_OPTIONS.map((item) => item.value);

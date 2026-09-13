export const PLAN_SLUGS = ["foundation", "workforce", "scale"] as const;

export type PlanSlug = (typeof PLAN_SLUGS)[number];
export type WorkspacePlanTier = "preview" | PlanSlug | "operator" | "enterprise";

export const PLAN_LABELS: Record<PlanSlug, string> = {
  foundation: "Foundation",
  workforce: "Workforce",
  scale: "Scale",
};

export function isPlanSlug(value: unknown): value is PlanSlug {
  return typeof value === "string" && (PLAN_SLUGS as readonly string[]).includes(value);
}

/** Read boundary for historical rows: the old billing keys resolve to today's canonical slugs. */
export function normalizePlanSlug(value: unknown): PlanSlug | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  if (isPlanSlug(slug)) return slug;
  if (slug === "starter") return "foundation";
  if (slug === "growth") return "workforce";
  return null;
}

export function normalizeWorkspacePlanTier(value: unknown): WorkspacePlanTier | null {
  if (typeof value !== "string") return null;
  const tier = value.trim().toLowerCase();
  if (tier === "preview" || tier === "operator" || tier === "enterprise") return tier;
  return normalizePlanSlug(tier);
}

export function getCanonicalPlanLabel(value: unknown): string | null {
  const tier = normalizeWorkspacePlanTier(value);
  if (!tier) return null;
  if (tier === "preview") return "Preview";
  if (tier === "operator" || tier === "enterprise") return "Scale";
  return PLAN_LABELS[tier];
}

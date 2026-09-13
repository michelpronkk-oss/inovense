import "server-only";

import { isPlanSlug, PLAN_SLUGS, type PlanSlug } from "@/lib/plan-identity";

function readProductId(plan: PlanSlug): string | null {
  switch (plan) {
    case "foundation": return process.env.DODO_PRODUCT_FOUNDATION?.trim() || null;
    case "workforce": return process.env.DODO_PRODUCT_WORKFORCE?.trim() || null;
    case "scale": return process.env.DODO_PRODUCT_SCALE?.trim() || null;
  }
}

function readConfiguredProducts(): Record<PlanSlug, string | null> {
  return Object.fromEntries(PLAN_SLUGS.map((plan) => [plan, readProductId(plan)])) as Record<PlanSlug, string | null>;
}

function assertUniqueConfiguredProducts(products: Record<PlanSlug, string | null>): void {
  const configured = PLAN_SLUGS.flatMap((plan) => products[plan] ? [[plan, products[plan]!] as const] : []);
  const productIds = configured.map(([, productId]) => productId);
  if (new Set(productIds).size !== productIds.length) {
    throw new Error("Dodo product configuration is ambiguous: each canonical plan must use a distinct product ID.");
  }
}

export function getDodoProductId(plan: PlanSlug): string {
  if (!isPlanSlug(plan)) throw new Error("Invalid canonical plan for Dodo checkout.");
  const products = readConfiguredProducts();
  assertUniqueConfiguredProducts(products);
  const productId = products[plan];
  if (!productId) throw new Error(`Dodo product is not configured for ${plan}. Set DODO_PRODUCT_${plan.toUpperCase()}.`);
  return productId;
}

export function getPlanFromDodoProductId(value: unknown): PlanSlug | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const productId = value.trim();
  const products = readConfiguredProducts();
  assertUniqueConfiguredProducts(products);
  return PLAN_SLUGS.find((plan) => products[plan] === productId) ?? null;
}

export function isDodoProductConfigured(plan: PlanSlug): boolean {
  try {
    getDodoProductId(plan);
    return true;
  } catch {
    return false;
  }
}

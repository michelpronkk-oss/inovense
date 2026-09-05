import { NextRequest, NextResponse } from "next/server";
import { createDodoCheckoutSession } from "@/lib/billing/dodo";
import type { CheckoutPlanTier } from "@/lib/pricing";
import { getAppUrl } from "@/lib/urls";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";

function parsePlan(value: string | null): CheckoutPlanTier | null {
  if (value === "starter" || value === "growth" || value === "operator") return value;
  return null;
}

function isPlanConfigured(plan: CheckoutPlanTier): boolean {
  if (plan === "starter") return Boolean(process.env.DODO_PRODUCT_STARTER);
  if (plan === "growth") return Boolean(process.env.DODO_PRODUCT_GROWTH);
  return Boolean(process.env.DODO_PRODUCT_OPERATOR);
}

function resolveSiteUrl(): string {
  return getAppUrl();
}

export async function GET(req: NextRequest) {
  const plan = parsePlan(req.nextUrl.searchParams.get("plan"));
  if (!plan) {
    return NextResponse.redirect(new URL("/pricing?billing=invalid_plan", req.url));
  }
  if (!isPlanConfigured(plan)) {
    return NextResponse.redirect(new URL(`/pricing?billing=setup_required&plan=${plan}`, req.url));
  }

  const user = await getVerifiedSupabaseUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/pricing", getAppUrl()));
  const workspaceId = await resolveActiveWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.redirect(new URL("/onboarding", getAppUrl()));
  try {
    await requireWorkspaceAdmin(user.id, workspaceId);
  } catch {
    return NextResponse.redirect(new URL("/settings?billing=permission_required", getAppUrl()));
  }

  try {
    const { checkoutUrl } = await createDodoCheckoutSession({
      plan,
      siteUrl: resolveSiteUrl(),
      workspaceId,
      userId: user.id,
      customerEmail: user.email ?? undefined,
    });
    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout initialization failed";
    return NextResponse.redirect(new URL(`/pricing?billing=error&reason=${encodeURIComponent(message)}`, req.url));
  }
}

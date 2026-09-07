import { NextRequest, NextResponse } from "next/server";
import { createDodoCheckoutSession } from "@/lib/billing/dodo";
import type { CheckoutPlanTier } from "@/lib/pricing";
import { getAppUrl } from "@/lib/urls";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getTrialEligibility } from "@/lib/billing/trials";

function parsePlan(value: string | null): CheckoutPlanTier | null {
  if (value === "starter" || value === "growth" || value === "scale") return value;
  return null;
}

function isPlanConfigured(plan: CheckoutPlanTier): boolean {
  if (plan === "starter") return Boolean(process.env.DODO_PRODUCT_STARTER);
  if (plan === "growth") return Boolean(process.env.DODO_PRODUCT_GROWTH);
  return Boolean(process.env.DODO_SCALE_PRICE_ID);
}

function resolveSiteUrl(): string {
  return getAppUrl();
}

export async function GET(req: NextRequest) {
  const plan = parsePlan(req.nextUrl.searchParams.get("plan"));
  if (!plan) {
    return NextResponse.redirect(new URL("/plans?billing=invalid_plan", getAppUrl()));
  }
  if (!isPlanConfigured(plan)) {
    return NextResponse.redirect(new URL(`/plans?billing=setup_required&plan=${plan}`, getAppUrl()));
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

  const trial = await getTrialEligibility({ supabase: createSupabaseAdmin(), workspaceId, ownerUserId: user.id });
  if (trial.reason === "history_unavailable") {
    return NextResponse.redirect(new URL(`/plans?billing=trial_state_unavailable&plan=${plan}`, getAppUrl()));
  }
  // Dodo's current checkout integration cannot safely replace a subscription
  // in the middle of a live trial without risking a second billing flow. Keep
  // the original trial clock intact and require conversion or its end first.
  if (trial.entitlement?.trialStatus === "active") {
    return NextResponse.redirect(new URL(`/plans?billing=active_trial&plan=${plan}`, getAppUrl()));
  }

  try {
    const { checkoutUrl } = await createDodoCheckoutSession({
      plan,
      trialDays: trial.eligible ? 3 : 0,
      siteUrl: resolveSiteUrl(),
      workspaceId,
      userId: user.id,
      customerEmail: user.email ?? undefined,
    });
    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    // Avoid leaking billing-provider internals into the browser URL. The
    // detailed provider response remains available in server logs.
    console.error("[dodo.checkout] checkout creation failed", {
      plan,
      workspaceId,
      message: error instanceof Error ? error.message : "Unknown checkout error",
    });
    return NextResponse.redirect(new URL("/plans?billing=error", getAppUrl()));
  }
}

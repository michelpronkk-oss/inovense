import { NextRequest, NextResponse } from "next/server";
import { createDodoCheckoutSession } from "@/lib/billing/dodo";
import type { CheckoutPlanTier } from "@/lib/pricing";

function parsePlan(value: string | null): CheckoutPlanTier | null {
  if (value === "starter" || value === "growth" || value === "operator") return value;
  return null;
}

function isPlanConfigured(plan: CheckoutPlanTier): boolean {
  if (plan === "starter") return Boolean(process.env.DODO_PRODUCT_STARTER);
  if (plan === "growth") return Boolean(process.env.DODO_PRODUCT_GROWTH);
  return Boolean(process.env.DODO_PRODUCT_OPERATOR);
}

function resolveSiteUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const plan = parsePlan(req.nextUrl.searchParams.get("plan"));
  if (!plan) {
    return NextResponse.redirect(new URL("/pricing?billing=invalid_plan", req.url));
  }
  if (!isPlanConfigured(plan)) {
    return NextResponse.redirect(new URL(`/pricing?billing=setup_required&plan=${plan}`, req.url));
  }

  try {
    const { checkoutUrl } = await createDodoCheckoutSession({
      plan,
      siteUrl: resolveSiteUrl(req),
    });
    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout initialization failed";
    return NextResponse.redirect(new URL(`/pricing?billing=error&reason=${encodeURIComponent(message)}`, req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      plan?: string;
      workspaceId?: string;
      userId?: string;
      customerEmail?: string;
    };

    const plan = parsePlan(body.plan ?? null);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan. Use starter, growth, or operator." }, { status: 400 });
    }
    if (!isPlanConfigured(plan)) {
      return NextResponse.json({ error: "Checkout is not configured for this plan yet." }, { status: 503 });
    }

    const { checkoutUrl } = await createDodoCheckoutSession({
      plan,
      siteUrl: resolveSiteUrl(req),
      workspaceId: body.workspaceId,
      userId: body.userId,
      customerEmail: body.customerEmail,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout initialization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

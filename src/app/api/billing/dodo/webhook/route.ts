import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getBillingEntitlementsForPlan, type CheckoutPlanTier } from "@/lib/pricing";
import { verifyDodoWebhookSignature } from "@/lib/billing/dodo";

type BillingStatus = "preview" | "trialing" | "active" | "past_due" | "canceled";

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server configuration missing.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function mapProductToPlan(productId: string | undefined): CheckoutPlanTier | null {
  if (!productId) return null;
  if (productId === process.env.DODO_PRODUCT_STARTER) return "starter";
  if (productId === process.env.DODO_PRODUCT_GROWTH) return "growth";
  if (productId === process.env.DODO_PRODUCT_OPERATOR) return "operator";
  return null;
}

function mapEventToBillingStatus(eventType: string, trialEndsAt?: string): BillingStatus {
  if (eventType === "subscription.cancelled") return "canceled";
  if (eventType === "subscription.failed" || eventType === "payment.failed") return "past_due";
  if (eventType === "subscription.expired") return "canceled";
  if (eventType === "payment.succeeded" && trialEndsAt) return "trialing";
  if (
    eventType === "subscription.active"
    || eventType === "subscription.updated"
    || eventType === "subscription.renewed"
    || eventType === "subscription.plan_changed"
    || eventType === "payment.succeeded"
  ) {
    return "active";
  }
  return "active";
}

function firstString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function fromPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyDodoWebhookSignature(rawBody, {
    id: req.headers.get("webhook-id"),
    timestamp: req.headers.get("webhook-timestamp"),
    signature: req.headers.get("webhook-signature"),
  })) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const eventType = firstString(payload.type, payload.event_type, (payload.event as Record<string, unknown> | undefined)?.type) || "unknown";
  const eventId = firstString(payload.id, payload.event_id, `${eventType}-${crypto.randomUUID()}`) as string;
  const data = (payload.data as Record<string, unknown> | undefined) || {};
  const metadata = (data.metadata as Record<string, unknown> | undefined) || {};
  const subscription = (data.subscription as Record<string, unknown> | undefined) || data;

  const explicitPlan = firstString(metadata.plan_tier, metadata.plan);
  const productId = firstString(
    data.product_id,
    subscription.product_id,
    (data.product as Record<string, unknown> | undefined)?.id,
  );
  const customerId = firstString(
    payload.customer_id,
    (payload.customer as Record<string, unknown> | undefined)?.id,
    data.customer_id,
    (data.customer as Record<string, unknown> | undefined)?.id,
    fromPath(payload, "data.subscription.customer_id"),
    fromPath(payload, "data.subscription.customer.id"),
  );
  const subscriptionId = firstString(
    payload.subscription_id,
    data.subscription_id,
    subscription.id,
    fromPath(payload, "data.subscription.id"),
  );
  const resolvedProductId = firstString(
    productId,
    payload.product_id,
    fromPath(payload, "data.product.id"),
  );
  const plan = (explicitPlan === "starter" || explicitPlan === "growth" || explicitPlan === "operator")
    ? explicitPlan
    : mapProductToPlan(resolvedProductId);

  const workspaceId = firstString(
    metadata.workspace_id,
    data.workspace_id,
    subscription.workspace_id,
  );
  const userId = firstString(
    metadata.user_id,
    data.user_id,
    subscription.user_id,
  );
  const trialEndsAt = firstString(subscription.trial_ends_at, data.trial_ends_at);

  const supabase = createSupabaseAdmin();

  const insertEvent = await supabase.from("os_billing_events").upsert({
    event_id: eventId,
    event_type: eventType,
    workspace_id: workspaceId ?? null,
    user_id: userId ?? null,
    raw_payload: payload,
    processing_status: "received",
  }, { onConflict: "event_id" }).select("event_id, processed_at, processing_status").maybeSingle();

  if (insertEvent.error) {
    return NextResponse.json({ error: `Failed to persist billing event: ${insertEvent.error.message}` }, { status: 500 });
  }

  if (insertEvent.data?.processed_at) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  if (!workspaceId || !plan) {
    await supabase
      .from("os_billing_events")
      .update({
        processing_status: "warning_missing_workspace_or_plan",
        warning_message: "Webhook received but workspace_id or plan could not be resolved.",
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", eventId);
    return NextResponse.json({ ok: true, warning: "Missing workspace_id or plan mapping." });
  }

  const entitlements = getBillingEntitlementsForPlan(plan);
  const billingStatus = mapEventToBillingStatus(eventType, trialEndsAt);
  const updatePayload = {
    plan: plan === "starter" ? "Foundation" : plan === "growth" ? "Workforce" : "Operator",
    plan_tier: entitlements.planTier,
    billing_status: billingStatus,
    trial_ends_at: trialEndsAt ?? null,
    operators_limit: entitlements.operatorsLimit,
    connectors_limit: String(entitlements.connectorsLimit),
    actions_limit: entitlements.actionsLimit,
    log_retention_days: entitlements.logRetentionDays,
    can_use_real_connectors: entitlements.canUseRealConnectors,
    can_run_real_actions: entitlements.canRunRealActions,
    support_level: entitlements.supportLevel,
    dodo_customer_id: customerId ?? null,
    dodo_subscription_id: subscriptionId ?? null,
    dodo_product_id: resolvedProductId ?? null,
    billing_updated_at: new Date().toISOString(),
  };

  const wsUpdate = await supabase
    .from("os_workspaces")
    .update(updatePayload)
    .eq("id", workspaceId);

  if (wsUpdate.error) {
    await supabase
      .from("os_billing_events")
      .update({
        processing_status: "failed_workspace_update",
        warning_message: wsUpdate.error.message,
      })
      .eq("event_id", eventId);
    return NextResponse.json({ error: `Failed to update workspace entitlements: ${wsUpdate.error.message}` }, { status: 500 });
  }

  await supabase.from("os_execution_logs").insert({
    id: `log-billing-${Date.now()}-${workspaceId}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: "billing",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "billing.entitlements_updated",
    message: `Updated workspace to ${plan} (${billingStatus}) from Dodo webhook`,
    duration: "-",
    status: "ok",
  });

  await supabase
    .from("os_billing_events")
    .update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);

  return NextResponse.json({ ok: true });
}

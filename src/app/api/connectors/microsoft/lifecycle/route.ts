import { idempotencyKeys } from "@trigger.dev/sdk/v3";
import { NextRequest, NextResponse } from "next/server";
import { constantTimeClientStateMatches, findMicrosoftSubscription, markMicrosoftSubscriptionNotification, microsoftClientState } from "@/lib/connectors/microsoft-subscriptions";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { microsoftSubscriptionLifecycle } from "@/trigger/microsoft-subscription-lifecycle";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 256 * 1024;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, max = 255): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function isLifecycleEvent(value: string | null): value is "reauthorizationRequired" | "subscriptionRemoved" | "missed" {
  return value === "reauthorizationRequired" || value === "subscriptionRemoved" || value === "missed";
}

export async function POST(request: NextRequest) {
  const validationToken = request.nextUrl.searchParams.get("validationToken");
  if (validationToken) return new Response(validationToken, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "microsoft_lifecycle_storage_unavailable" }, { status: 503 });
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return NextResponse.json({ error: "microsoft_lifecycle_body_too_large" }, { status: 413 });
  const raw = await request.text().catch(() => "");
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: "microsoft_lifecycle_body_invalid" }, { status: 413 });
  const parsed = record(await Promise.resolve().then(() => JSON.parse(raw)).catch(() => ({})));
const notifications = Array.isArray(parsed.value) ? parsed.value.slice(0, 100).map(record) : [];
  if (!Array.isArray(parsed.value)) return NextResponse.json({ error: "microsoft_lifecycle_notifications_invalid" }, { status: 400 });
  const supabase = createSupabaseAdmin();
  let accepted = 0;
  for (const notification of notifications) {
    const subscriptionId = text(notification.subscriptionId, 180);
    const clientState = text(notification.clientState, 255);
    const lifecycleEvent = text(notification.lifecycleEvent, 40);
    if (!subscriptionId || !clientState || !isLifecycleEvent(lifecycleEvent)) continue;
    const subscription = await findMicrosoftSubscription(subscriptionId, supabase);
    if (!subscription) continue;
    const expected = microsoftClientState({ workspaceId: subscription.workspace_id, connectorKey: subscription.connector_key, resource: subscription.resource, changeType: subscription.change_type });
    if (!constantTimeClientStateMatches(expected, clientState) || !constantTimeClientStateMatches(subscription.client_state_ref, clientState)) continue;
    await markMicrosoftSubscriptionNotification({ id: subscription.id, lifecycleEvent, supabase });
    // Graph lifecycle notifications do not expose a stable event id. A short
    // time bucket prevents duplicate deliveries from dispatching twice while
    // still allowing a later reauthorization/missed event to run again.
    const idempotencyKey = await idempotencyKeys.create(`microsoft-lifecycle:${subscription.id}:${lifecycleEvent}:${Math.floor(Date.now() / 300_000)}`, { scope: "global" });
    await microsoftSubscriptionLifecycle.trigger({ subscriptionId: subscription.id, lifecycleEvent }, { idempotencyKey, idempotencyKeyTTL: "30d", concurrencyKey: subscription.workspace_id });
    accepted += 1;
  }
  return NextResponse.json({ received: notifications.length, accepted }, { status: 202 });
}

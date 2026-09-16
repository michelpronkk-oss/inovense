import { idempotencyKeys } from "@trigger.dev/sdk/v3";
import { NextRequest, NextResponse } from "next/server";
import { findMicrosoftSubscription, constantTimeClientStateMatches, markMicrosoftSubscriptionNotification, microsoftClientState } from "@/lib/connectors/microsoft-subscriptions";
import { getMicrosoftCredential } from "@/lib/connectors/microsoft";
import { ingestProviderEvent } from "@/lib/provider-events/store";
import { hashProviderAccountId } from "@/lib/provider-events/types";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { microsoftEventProcess } from "@/trigger/microsoft-event-process";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 512 * 1024;

function json(body: Record<string, unknown>, status = 202) {
  return NextResponse.json(body, { status });
}

function text(value: unknown, max = 255): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function resourceId(notification: Record<string, unknown>): string | null {
  const data = record(notification.resourceData);
  const id = text(data.id, 255);
  return id;
}

export async function POST(request: NextRequest) {
  const validationToken = request.nextUrl.searchParams.get("validationToken");
  if (validationToken) return new Response(validationToken, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  if (!hasSupabaseAdminConfig()) return json({ error: "microsoft_webhook_storage_unavailable" }, 503);
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json({ error: "microsoft_webhook_body_too_large" }, 413);
  const raw = await request.text().catch(() => "");
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "microsoft_webhook_body_invalid" }, 413);

  let parsed: Record<string, unknown>;
  try { parsed = record(JSON.parse(raw)); } catch { return json({ error: "microsoft_webhook_json_invalid" }, 400); }
  const notifications = Array.isArray(parsed.value) ? parsed.value.slice(0, 100).map(record) : [];
  if (!Array.isArray(parsed.value)) return json({ error: "microsoft_webhook_notifications_invalid" }, 400);

  const supabase = createSupabaseAdmin();
  let accepted = 0;
  let ignored = 0;
  let queued = 0;
  for (const notification of notifications) {
    const subscriptionId = text(notification.subscriptionId, 180);
    const clientState = text(notification.clientState, 255);
    const changeType = text(notification.changeType, 40);
    const resource = text(notification.resource, 512);
    const id = resourceId(notification);
    if (!subscriptionId || !clientState || !resource || !id || changeType !== "created") { ignored += 1; continue; }
    const subscription = await findMicrosoftSubscription(subscriptionId, supabase);
    if (!subscription) { ignored += 1; continue; }
    const expectedState = microsoftClientState({ workspaceId: subscription.workspace_id, connectorKey: subscription.connector_key, resource: subscription.resource, changeType: subscription.change_type });
    const resourceMatches = resource.replace(/^\/+/, "") === subscription.resource.replace(/^\/+/, "") || (() => { try { return decodeURIComponent(resource.replace(/^\/+/, "")) === decodeURIComponent(subscription.resource.replace(/^\/+/, "")); } catch { return false; } })();
    if (!resourceMatches || !constantTimeClientStateMatches(subscription.client_state_ref || expectedState, clientState) || !constantTimeClientStateMatches(expectedState, clientState)) { ignored += 1; continue; }
    await markMicrosoftSubscriptionNotification({ id: subscription.id, supabase });
    const credential = await getMicrosoftCredential(subscription.workspace_id, supabase);
    if (!credential?.provider_account_id) { ignored += 1; continue; }

    const notificationId = text(notification.id, 255) ?? `${subscriptionId}:${id}:${changeType}`;
    const teamId = typeof subscription.metadata?.teamId === "string" ? subscription.metadata.teamId : null;
    const channelId = typeof subscription.metadata?.channelId === "string" ? subscription.metadata.channelId : null;
    const { event, created } = await ingestProviderEvent({
      workspaceId: subscription.workspace_id,
      connectorKey: subscription.connector_key,
      provider: "microsoft",
      providerAccountId: hashProviderAccountId("microsoft", credential.provider_account_id),
      externalEventId: `${subscription.id}:created:${id}`,
      eventType: subscription.capability === "outlook_mail" ? "microsoft.outlook.message.created" : "microsoft.teams.message.created",
      entityType: subscription.capability === "outlook_mail" ? "outlook_message" : "teams_channel_message",
      entityId: id,
      occurredAt: new Date().toISOString(),
      sourceMode: "webhook",
      metadata: {
        subscriptionId,
        resource,
        changeType,
        notificationId,
        teamId,
        channelId,
      },
    }, supabase);
    accepted += 1;
    if (!created) continue;
    try {
      const idempotencyKey = await idempotencyKeys.create(`provider-event:${event.id}:attempt:${event.attempt_count}`, { scope: "global" });
      await microsoftEventProcess.trigger({ providerEventId: event.id }, { idempotencyKey, idempotencyKeyTTL: "30d", concurrencyKey: event.connector_id });
      queued += 1;
    } catch {
      console.warn(JSON.stringify({ event: "microsoft_event_trigger_deferred", providerEventId: event.id }));
    }
  }
  return json({ received: notifications.length, accepted, queued, ignored });
}

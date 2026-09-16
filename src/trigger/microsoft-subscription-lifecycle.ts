import { idempotencyKeys, task } from "@trigger.dev/sdk/v3";
import {
  ensureMicrosoftSubscriptions,
  findMicrosoftSubscription,
  reauthorizeMicrosoftSubscription,
  type MicrosoftSubscriptionRow,
} from "@/lib/connectors/microsoft-subscriptions";
import {
  getMicrosoftCredential,
  listRecentMicrosoftMessages,
  resolveMicrosoftAccessToken,
} from "@/lib/connectors/microsoft";
import {
  listRecentChannelMessages,
  resolveMicrosoftTeamsConnection,
} from "@/lib/connectors/microsoft-teams";
import { ingestProviderEvent } from "@/lib/provider-events/store";
import { hashProviderAccountId } from "@/lib/provider-events/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { microsoftEventProcess } from "@/trigger/microsoft-event-process";

type LifecycleEvent = "reauthorizationRequired" | "subscriptionRemoved" | "missed";

function text(value: unknown, max = 255): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

async function dispatchReconciliation(row: MicrosoftSubscriptionRow, supabase: ReturnType<typeof createSupabaseAdmin>): Promise<number> {
  const credential = await getMicrosoftCredential(row.workspace_id, supabase);
  if (!credential?.provider_account_id) return 0;
  const refresh = async () => {
    const latest = await getMicrosoftCredential(row.workspace_id, supabase);
    if (!latest) throw new Error("microsoft_reauth_required");
    return resolveMicrosoftAccessToken({ workspaceId: row.workspace_id, credential: latest, supabase, forceRefresh: true });
  };
  const items: Array<{ id: string; metadata: Record<string, unknown> }> = [];
  if (row.capability === "outlook_mail") {
    const accessToken = await resolveMicrosoftAccessToken({ workspaceId: row.workspace_id, credential, supabase });
    const messages = await listRecentMicrosoftMessages(accessToken, 20, { refresh });
    for (const message of messages) {
      if (message.id) items.push({ id: message.id, metadata: { conversationId: message.conversationId, internetMessageId: message.internetMessageId } });
    }
  } else {
    const teamId = text(row.metadata.teamId, 120);
    const channelId = text(row.metadata.channelId, 120);
    if (!teamId || !channelId) return 0;
    const connection = await resolveMicrosoftTeamsConnection({ workspaceId: row.workspace_id, supabase });
    const messages = await listRecentChannelMessages({ connection, teamId, channelId, limit: 20 });
    for (const message of messages.messages) items.push({ id: message.messageId, metadata: { teamId, channelId } });
  }

  let queued = 0;
  for (const item of items.slice(0, 20)) {
    const { event, created } = await ingestProviderEvent({
      workspaceId: row.workspace_id,
      connectorKey: row.connector_key,
      provider: "microsoft",
      providerAccountId: hashProviderAccountId("microsoft", credential.provider_account_id),
      externalEventId: `${row.id}:created:${item.id}`,
      eventType: row.capability === "outlook_mail" ? "microsoft.outlook.message.created" : "microsoft.teams.message.created",
      entityType: row.capability === "outlook_mail" ? "outlook_message" : "teams_channel_message",
      entityId: item.id,
      sourceMode: "reconciliation",
      metadata: { subscriptionId: row.provider_subscription_id, reconciliation: true, ...item.metadata },
    }, supabase);
    if (!created) continue;
    const idempotencyKey = await idempotencyKeys.create(`provider-event:${event.id}:attempt:${event.attempt_count}`, { scope: "global" });
    await microsoftEventProcess.trigger({ providerEventId: event.id }, { idempotencyKey, idempotencyKeyTTL: "30d", concurrencyKey: event.connector_id });
    queued += 1;
  }
  return queued;
}

export const microsoftSubscriptionLifecycle = task({
  id: "microsoft-subscription-lifecycle",
  retry: { maxAttempts: 4, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 60_000, randomize: true },
  queue: { name: "microsoft-subscriptions", concurrencyLimit: 10 },
  maxDuration: 300,
  run: async (payload: { subscriptionId: string; lifecycleEvent: LifecycleEvent }) => {
    if (!payload || !payload.subscriptionId || !["reauthorizationRequired", "subscriptionRemoved", "missed"].includes(payload.lifecycleEvent)) throw new Error("microsoft_lifecycle_payload_invalid");
    const supabase = createSupabaseAdmin();
    const row = await findMicrosoftSubscription(payload.subscriptionId, supabase);
    if (!row) return { status: "missing" };

    if (payload.lifecycleEvent === "reauthorizationRequired") {
      await reauthorizeMicrosoftSubscription(row, supabase);
      return { status: "reauthorized", subscriptionId: row.id };
    }

    const ensured = await ensureMicrosoftSubscriptions(row.workspace_id, supabase);
    const current = row.capability === "outlook_mail" ? ensured.outlook : ensured.teams;
    const reconciled = payload.lifecycleEvent === "missed" && current ? await dispatchReconciliation(current, supabase) : 0;
    return { status: payload.lifecycleEvent === "missed" ? "reconciled" : "recreated", subscriptionId: current?.id ?? row.id, reconciled };
  },
});

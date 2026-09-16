import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { AUTERIM_APP_URL } from "@/lib/brand";
import {
  getMicrosoftCredential,
  microsoftGraphRequest,
  resolveMicrosoftAccessToken,
  MicrosoftGraphError,
  type MicrosoftGraphRequestOptions,
} from "@/lib/connectors/microsoft";
import { readMicrosoftTeamsSettings } from "@/lib/connectors/microsoft-teams";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { MicrosoftSubscriptionCapability, MicrosoftSubscriptionRow } from "@/lib/connectors/microsoft-subscription-types";

export { subscriptionMetadata } from "@/lib/connectors/microsoft-subscription-types";
export type { MicrosoftSubscriptionCapability, MicrosoftSubscriptionRow } from "@/lib/connectors/microsoft-subscription-types";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export const MICROSOFT_OUTLOOK_RESOURCE = "me/mailFolders('Inbox')/messages";
export const MICROSOFT_TEAMS_RESOURCE_PREFIX = "teams/";
export const MICROSOFT_SUBSCRIPTION_CHANGE_TYPE = "created" as const;
export const MICROSOFT_WEBHOOK_PATH = "/api/connectors/microsoft/webhook";
export const MICROSOFT_LIFECYCLE_PATH = "/api/connectors/microsoft/lifecycle";

const SUBSCRIPTION_COLUMNS = "id,workspace_id,connector_key,capability,provider_subscription_id,resource,change_type,notification_url,lifecycle_notification_url,expiration_at,client_state_ref,status,last_notification_at,last_lifecycle_event,last_error_code,failure_count,lease_token,lease_until,metadata";

function requiredClientStateSecret(): string {
  const value = process.env.MICROSOFT_WEBHOOK_CLIENT_STATE_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("microsoft_webhook_client_state_secret_missing");
  return value;
}

export function microsoftNotificationUrl(): string {
  return process.env.MICROSOFT_WEBHOOK_URL?.trim() || `${AUTERIM_APP_URL}${MICROSOFT_WEBHOOK_PATH}`;
}

export function microsoftLifecycleNotificationUrl(): string {
  return process.env.MICROSOFT_LIFECYCLE_WEBHOOK_URL?.trim() || `${AUTERIM_APP_URL}${MICROSOFT_LIFECYCLE_PATH}`;
}

export function microsoftClientState(input: { workspaceId: string; connectorKey: string; resource: string; changeType?: string }): string {
  return createHmac("sha256", requiredClientStateSecret())
    .update([input.workspaceId, input.connectorKey, input.resource, input.changeType ?? MICROSOFT_SUBSCRIPTION_CHANGE_TYPE].join("\u0000"), "utf8")
    .digest("hex");
}

export function constantTimeClientStateMatches(expected: string, actual: string | null | undefined): boolean {
  if (!actual) return false;
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(actual, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function microsoftSubscriptionConfigStatus(): { configured: boolean; missing: string[] } {
  const missing = [];
  if (!process.env.MICROSOFT_WEBHOOK_CLIENT_STATE_SECRET?.trim() || (process.env.MICROSOFT_WEBHOOK_CLIENT_STATE_SECRET?.trim().length ?? 0) < 32) missing.push("MICROSOFT_WEBHOOK_CLIENT_STATE_SECRET");
  return { configured: missing.length === 0, missing };
}

function teamResource(teamId: string, channelId: string): string {
  return `teams/${encodeURIComponent(teamId.trim())}/channels/${encodeURIComponent(channelId.trim())}/messages`;
}

function resourceForGraph(resource: string): string {
  // Graph subscription resources are relative paths without a leading slash.
  // Keep the stored canonical resource identical to the provider contract.
  return resource.replace(/^\/+/, "");
}

function normalizedResource(value: string): string {
  const withoutSlash = value.replace(/^\/+/, "");
  try { return decodeURIComponent(withoutSlash); } catch { return withoutSlash; }
}

function expirationFor(capability: MicrosoftSubscriptionCapability): string {
  const minutes = capability === "teams_channel_messages" ? 45 : 120;
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function graphOptions(workspaceId: string, supabase: SupabaseAdmin): Promise<{ accessToken: string; options: MicrosoftGraphRequestOptions }> {
  const credential = await getMicrosoftCredential(workspaceId, supabase);
  if (!credential) throw new Error("microsoft_not_connected");
  const accessToken = await resolveMicrosoftAccessToken({ workspaceId, credential, supabase });
  return {
    accessToken,
    options: {
      refresh: async () => {
        const latest = await getMicrosoftCredential(workspaceId, supabase);
        if (!latest) throw new Error("microsoft_reauth_required");
        return resolveMicrosoftAccessToken({ workspaceId, credential: latest, supabase, forceRefresh: true });
      },
    },
  };
}

async function getSubscriptionByCapability(input: { workspaceId: string; capability: MicrosoftSubscriptionCapability; supabase: SupabaseAdmin }): Promise<MicrosoftSubscriptionRow | null> {
  const result = await input.supabase.from("os_microsoft_subscriptions").select(SUBSCRIPTION_COLUMNS)
    .eq("workspace_id", input.workspaceId).eq("capability", input.capability).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error(`microsoft_subscription_lookup_failed:${result.error.code ?? "db"}`);
  return result.data as MicrosoftSubscriptionRow | null;
}

async function saveSubscription(input: {
  workspaceId: string;
  connectorKey: "microsoft" | "microsoft_teams";
  capability: MicrosoftSubscriptionCapability;
  providerSubscriptionId: string;
  resource: string;
  expirationAt: string;
  clientStateRef: string;
  metadata?: Record<string, unknown>;
  supabase: SupabaseAdmin;
  existingId?: string;
}): Promise<MicrosoftSubscriptionRow> {
  const result = await input.supabase.from("os_microsoft_subscriptions").upsert({
    ...(input.existingId ? { id: input.existingId } : {}),
    workspace_id: input.workspaceId,
    connector_key: input.connectorKey,
    capability: input.capability,
    provider_subscription_id: input.providerSubscriptionId,
    resource: input.resource,
    change_type: MICROSOFT_SUBSCRIPTION_CHANGE_TYPE,
    notification_url: microsoftNotificationUrl(),
    lifecycle_notification_url: microsoftLifecycleNotificationUrl(),
    expiration_at: input.expirationAt,
    client_state_ref: input.clientStateRef,
    status: "active",
    last_error_code: null,
    failure_count: 0,
    lease_token: null,
    lease_until: null,
    metadata: input.metadata ?? {},
  }, { onConflict: "workspace_id,capability,resource,change_type" }).select(SUBSCRIPTION_COLUMNS).single();
  if (result.error || !result.data) throw new Error(`microsoft_subscription_save_failed:${result.error?.code ?? "db"}`);
  return result.data as MicrosoftSubscriptionRow;
}

async function createGraphSubscription(input: {
  workspaceId: string;
  connectorKey: "microsoft" | "microsoft_teams";
  capability: MicrosoftSubscriptionCapability;
  resource: string;
  metadata?: Record<string, unknown>;
  supabase: SupabaseAdmin;
}): Promise<MicrosoftSubscriptionRow> {
  const state = microsoftClientState({ workspaceId: input.workspaceId, connectorKey: input.connectorKey, resource: input.resource });
  const expirationDateTime = expirationFor(input.capability);
  const graph = await graphOptions(input.workspaceId, input.supabase);
  try {
    const created = await microsoftGraphRequest<{ id?: string; expirationDateTime?: string }>(graph.accessToken, "POST", "/subscriptions", {
      changeType: MICROSOFT_SUBSCRIPTION_CHANGE_TYPE,
      notificationUrl: microsoftNotificationUrl(),
      lifecycleNotificationUrl: microsoftLifecycleNotificationUrl(),
      resource: resourceForGraph(input.resource),
      includeResourceData: false,
      expirationDateTime,
      clientState: state,
    }, graph.options);
    if (!created.id) throw new Error("microsoft_subscription_id_missing");
    return saveSubscription({
      workspaceId: input.workspaceId,
      connectorKey: input.connectorKey,
      capability: input.capability,
      providerSubscriptionId: created.id,
      resource: input.resource,
      expirationAt: created.expirationDateTime ?? expirationDateTime,
      clientStateRef: state,
      metadata: input.metadata,
      supabase: input.supabase,
    });
  } catch (error) {
    if (!(error instanceof MicrosoftGraphError) || error.details.status !== 409) throw error;
    // Graph can report a duplicate while the previous request actually
    // succeeded. Reconcile the provider list before creating anything else.
    const listed = await microsoftGraphRequest<{ value?: Array<{ id?: string; resource?: string; changeType?: string; expirationDateTime?: string; clientState?: string }> }>(graph.accessToken, "GET", "/subscriptions", undefined, graph.options);
    const match = (listed.value ?? []).find((row) => normalizedResource(row.resource ?? "") === normalizedResource(input.resource) && row.changeType === MICROSOFT_SUBSCRIPTION_CHANGE_TYPE && typeof row.id === "string");
    if (!match?.id) throw error;
    return saveSubscription({
      workspaceId: input.workspaceId,
      connectorKey: input.connectorKey,
      capability: input.capability,
      providerSubscriptionId: match.id,
      resource: input.resource,
      expirationAt: match.expirationDateTime ?? expirationDateTime,
      clientStateRef: state,
      metadata: input.metadata,
      supabase: input.supabase,
    });
  }
}

async function renewGraphSubscription(row: MicrosoftSubscriptionRow, supabase: SupabaseAdmin): Promise<MicrosoftSubscriptionRow> {
  const graph = await graphOptions(row.workspace_id, supabase);
  const expirationDateTime = expirationFor(row.capability);
  try {
    const updated = await microsoftGraphRequest<{ expirationDateTime?: string }>(graph.accessToken, "PATCH", `/subscriptions/${encodeURIComponent(row.provider_subscription_id)}`, { expirationDateTime }, graph.options);
    const saved = await supabase.from("os_microsoft_subscriptions").update({ expiration_at: updated.expirationDateTime ?? expirationDateTime, status: "active", last_error_code: null, failure_count: 0, lease_token: null, lease_until: null }).eq("id", row.id).select(SUBSCRIPTION_COLUMNS).single();
    if (saved.error || !saved.data) throw new Error("microsoft_subscription_renewal_save_failed");
    return saved.data as MicrosoftSubscriptionRow;
  } catch (error) {
    if (error instanceof MicrosoftGraphError && [404, 410].includes(error.details.status)) {
      await supabase.from("os_microsoft_subscriptions").update({ status: "removed", last_error_code: "subscription_missing", lease_token: null, lease_until: null }).eq("id", row.id);
      return createGraphSubscription({ workspaceId: row.workspace_id, connectorKey: row.connector_key, capability: row.capability, resource: row.resource, metadata: row.metadata, supabase });
    }
    await supabase.from("os_microsoft_subscriptions").update({ status: "needs_attention", last_error_code: "subscription_renewal_failed", failure_count: row.failure_count + 1, lease_token: null, lease_until: null }).eq("id", row.id);
    throw error;
  }
}

export async function ensureMicrosoftSubscriptions(workspaceId: string, supabase: SupabaseAdmin = createSupabaseAdmin()): Promise<{ outlook: MicrosoftSubscriptionRow | null; teams: MicrosoftSubscriptionRow | null }> {
  const credential = await getMicrosoftCredential(workspaceId, supabase);
  if (!credential) return { outlook: null, teams: null };
  const outlookExisting = await getSubscriptionByCapability({ workspaceId, capability: "outlook_mail", supabase });
  const outlook = outlookExisting && outlookExisting.status === "active" && Date.parse(outlookExisting.expiration_at) > Date.now() + 15 * 60_000
    ? outlookExisting
    : outlookExisting
      ? await renewGraphSubscription(outlookExisting, supabase)
      : await createGraphSubscription({ workspaceId, connectorKey: "microsoft", capability: "outlook_mail", resource: MICROSOFT_OUTLOOK_RESOURCE, supabase });

  const settings = readMicrosoftTeamsSettings(credential.metadata);
  let teams: MicrosoftSubscriptionRow | null = await getSubscriptionByCapability({ workspaceId, capability: "teams_channel_messages", supabase });
  const configuredResource = settings.enabled && settings.defaultTeamId && settings.defaultChannelId ? teamResource(settings.defaultTeamId, settings.defaultChannelId) : null;
  if (configuredResource) {
    if (teams && teams.resource !== configuredResource) {
      await deleteMicrosoftSubscription(teams, supabase);
      teams = null;
    }
    teams = teams && teams.status === "active" && Date.parse(teams.expiration_at) > Date.now() + 10 * 60_000
      ? teams
      : teams
        ? await renewGraphSubscription(teams, supabase)
        : await createGraphSubscription({ workspaceId, connectorKey: "microsoft_teams", capability: "teams_channel_messages", resource: configuredResource, metadata: { teamId: settings.defaultTeamId, channelId: settings.defaultChannelId }, supabase });
  } else if (teams) {
    await deleteMicrosoftSubscription(teams, supabase);
    teams = null;
  }
  return { outlook, teams };
}

export async function deleteMicrosoftSubscription(row: MicrosoftSubscriptionRow, supabase: SupabaseAdmin): Promise<void> {
  try {
    const graph = await graphOptions(row.workspace_id, supabase);
    await microsoftGraphRequest(graph.accessToken, "DELETE", `/subscriptions/${encodeURIComponent(row.provider_subscription_id)}`, undefined, graph.options);
  } catch (error) {
    if (!(error instanceof MicrosoftGraphError) || ![404, 410].includes(error.details.status)) throw error;
  } finally {
    await supabase.from("os_microsoft_subscriptions").update({ status: "removed", lease_token: null, lease_until: null }).eq("id", row.id);
  }
}

export async function findMicrosoftSubscription(providerSubscriptionId: string, supabase: SupabaseAdmin = createSupabaseAdmin()): Promise<MicrosoftSubscriptionRow | null> {
  const result = await supabase.from("os_microsoft_subscriptions").select(SUBSCRIPTION_COLUMNS).eq("provider_subscription_id", providerSubscriptionId).maybeSingle();
  if (result.error) throw new Error("microsoft_subscription_lookup_failed");
  return result.data as MicrosoftSubscriptionRow | null;
}

export async function reauthorizeMicrosoftSubscription(row: MicrosoftSubscriptionRow, supabase: SupabaseAdmin): Promise<MicrosoftSubscriptionRow> {
  const graph = await graphOptions(row.workspace_id, supabase);
  try {
    const updated = await microsoftGraphRequest<{ expirationDateTime?: string }>(graph.accessToken, "POST", `/subscriptions/${encodeURIComponent(row.provider_subscription_id)}/reauthorize`, undefined, graph.options);
    const saved = await supabase.from("os_microsoft_subscriptions").update({
      expiration_at: updated.expirationDateTime ?? expirationFor(row.capability),
      status: "active",
      last_lifecycle_event: "reauthorized",
      last_error_code: null,
      failure_count: 0,
      lease_token: null,
      lease_until: null,
    }).eq("id", row.id).select(SUBSCRIPTION_COLUMNS).single();
    if (saved.error || !saved.data) throw new Error("microsoft_subscription_reauthorization_save_failed");
    return saved.data as MicrosoftSubscriptionRow;
  } catch (error) {
    await supabase.from("os_microsoft_subscriptions").update({ status: "needs_attention", last_error_code: "subscription_reauthorization_failed", failure_count: row.failure_count + 1, lease_token: null, lease_until: null }).eq("id", row.id);
    throw error;
  }
}

export async function markMicrosoftSubscriptionNotification(input: { id: string; lifecycleEvent?: string | null; supabase: SupabaseAdmin }): Promise<void> {
  await input.supabase.from("os_microsoft_subscriptions").update({ last_notification_at: new Date().toISOString(), ...(input.lifecycleEvent ? { last_lifecycle_event: input.lifecycleEvent, status: input.lifecycleEvent === "reauthorizationRequired" ? "needs_attention" : input.lifecycleEvent === "subscriptionRemoved" ? "removed" : "active" } : {}) }).eq("id", input.id);
}

export async function claimMicrosoftSubscriptionLease(input: { id: string; token: string; supabase: SupabaseAdmin }): Promise<boolean> {
  const result = await input.supabase.rpc("claim_os_microsoft_subscription_lease", { p_subscription_id: input.id, p_lease_token: input.token, p_lease_seconds: 120 });
  if (result.error) throw new Error("microsoft_subscription_lease_claim_failed");
  return result.data === true;
}

export async function releaseMicrosoftSubscriptionLease(input: { id: string; token: string; supabase: SupabaseAdmin }): Promise<void> {
  await input.supabase.rpc("release_os_microsoft_subscription_lease", { p_subscription_id: input.id, p_lease_token: input.token });
}

export async function listMicrosoftSubscriptionsDue(input: { limit?: number; supabase: SupabaseAdmin }): Promise<MicrosoftSubscriptionRow[]> {
  const result = await input.supabase.from("os_microsoft_subscriptions").select(SUBSCRIPTION_COLUMNS)
    .in("status", ["active", "needs_attention", "renewing"]).lte("expiration_at", new Date(Date.now() + 20 * 60_000).toISOString()).order("expiration_at", { ascending: true }).limit(Math.min(input.limit ?? 100, 250));
  if (result.error) throw new Error("microsoft_subscription_due_lookup_failed");
  return (result.data ?? []) as MicrosoftSubscriptionRow[];
}

export async function renewMicrosoftSubscription(row: MicrosoftSubscriptionRow, supabase: SupabaseAdmin): Promise<MicrosoftSubscriptionRow> {
  return renewGraphSubscription(row, supabase);
}

export type MicrosoftSubscriptionCapability = "outlook_mail" | "teams_channel_messages";

export type MicrosoftSubscriptionRow = {
  id: string;
  workspace_id: string;
  connector_key: "microsoft" | "microsoft_teams";
  capability: MicrosoftSubscriptionCapability;
  provider_subscription_id: string;
  resource: string;
  change_type: "created";
  notification_url: string;
  lifecycle_notification_url: string | null;
  expiration_at: string;
  client_state_ref: string;
  status: "active" | "renewing" | "needs_attention" | "removed" | "expired";
  last_notification_at: string | null;
  last_lifecycle_event: string | null;
  last_error_code: string | null;
  failure_count: number;
  lease_token: string | null;
  lease_until: string | null;
  metadata: Record<string, unknown>;
};

export function subscriptionMetadata(row: MicrosoftSubscriptionRow | null): { configured: boolean; active: boolean; expiresAt: string | null; lifecycleEvent: string | null; errorCode: string | null } {
  return {
    configured: Boolean(row),
    active: row?.status === "active" && Boolean(row.expiration_at && Date.parse(row.expiration_at) > Date.now()),
    expiresAt: row?.expiration_at ?? null,
    lifecycleEvent: row?.last_lifecycle_event ?? null,
    errorCode: row?.last_error_code ?? null,
  };
}

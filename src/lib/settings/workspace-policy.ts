import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type CustomerEmailMode = "approval_required" | "draft_only" | "auto_send_low_risk";

export type SlackNotificationSettings = {
  slackNotificationsEnabled: boolean;
  slackApprovalAlertsEnabled: boolean;
  slackDefaultChannelId: string | null;
  slackDefaultChannelName: string | null;
  notifyOnRevenueApprovalCreated: boolean;
  notifyOnApprovalApproved: boolean;
  notifyOnApprovalRejected: boolean;
  notifyOnExecutionFailed: boolean;
};

export type TrelloProjectSettings = {
  defaultBoardId: string | null;
  defaultBoardName: string | null;
  defaultListId: string | null;
  defaultListName: string | null;
};

export const DEFAULT_CUSTOMER_EMAIL_MODE: CustomerEmailMode = "approval_required";

export const DEFAULT_APPROVAL_POLICY = {
  outboundComms: "Always require approval",
  proposals: "Always require approval",
  internalReports: "Auto-approve within policy",
  crmWrites: "Auto-approve",
  customerEmailMode: DEFAULT_CUSTOMER_EMAIL_MODE,
};

export const DEFAULT_SLACK_NOTIFICATION_SETTINGS: SlackNotificationSettings = {
  slackNotificationsEnabled: false,
  slackApprovalAlertsEnabled: false,
  slackDefaultChannelId: null,
  slackDefaultChannelName: null,
  notifyOnRevenueApprovalCreated: true,
  notifyOnApprovalApproved: true,
  notifyOnApprovalRejected: true,
  notifyOnExecutionFailed: true,
};

export const DEFAULT_TRELLO_PROJECT_SETTINGS: TrelloProjectSettings = {
  defaultBoardId: null,
  defaultBoardName: null,
  defaultListId: null,
  defaultListName: null,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function customerEmailMode(value: unknown): CustomerEmailMode {
  if (value === "draft_only" || value === "auto_send_low_risk" || value === "approval_required") return value;
  return DEFAULT_CUSTOMER_EMAIL_MODE;
}

export function parseSlackNotificationSettings(value: unknown): SlackNotificationSettings {
  const rec = asRecord(value);
  return {
    slackNotificationsEnabled: boolValue(rec.slackNotificationsEnabled, DEFAULT_SLACK_NOTIFICATION_SETTINGS.slackNotificationsEnabled),
    slackApprovalAlertsEnabled: boolValue(rec.slackApprovalAlertsEnabled, DEFAULT_SLACK_NOTIFICATION_SETTINGS.slackApprovalAlertsEnabled),
    slackDefaultChannelId: stringOrNull(rec.slackDefaultChannelId),
    slackDefaultChannelName: stringOrNull(rec.slackDefaultChannelName),
    notifyOnRevenueApprovalCreated: boolValue(rec.notifyOnRevenueApprovalCreated, DEFAULT_SLACK_NOTIFICATION_SETTINGS.notifyOnRevenueApprovalCreated),
    notifyOnApprovalApproved: boolValue(rec.notifyOnApprovalApproved, DEFAULT_SLACK_NOTIFICATION_SETTINGS.notifyOnApprovalApproved),
    notifyOnApprovalRejected: boolValue(rec.notifyOnApprovalRejected, DEFAULT_SLACK_NOTIFICATION_SETTINGS.notifyOnApprovalRejected),
    notifyOnExecutionFailed: boolValue(rec.notifyOnExecutionFailed, DEFAULT_SLACK_NOTIFICATION_SETTINGS.notifyOnExecutionFailed),
  };
}

export function parseTrelloProjectSettings(value: unknown): TrelloProjectSettings {
  const root = asRecord(value);
  const pm = asRecord(root.project_management);
  const trello = asRecord(pm.trello);
  return {
    defaultBoardId: stringOrNull(trello.defaultBoardId),
    defaultBoardName: stringOrNull(trello.defaultBoardName),
    defaultListId: stringOrNull(trello.defaultListId),
    defaultListName: stringOrNull(trello.defaultListName),
  };
}

export async function loadWorkspacePolicySettings(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
}): Promise<{
  approvalPolicy: Record<string, unknown>;
  notifications: Record<string, unknown>;
  customerEmailMode: CustomerEmailMode;
  slack: SlackNotificationSettings;
  trello: TrelloProjectSettings;
}> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const settings = await supabase
    .from("os_workspace_settings")
    .select("approval_policy,notifications")
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();

  if (settings.error) throw new Error(settings.error.message);
  const approvalPolicy = { ...DEFAULT_APPROVAL_POLICY, ...asRecord(settings.data?.approval_policy) };
  const notifications = asRecord(settings.data?.notifications);
  return {
    approvalPolicy,
    notifications,
    customerEmailMode: customerEmailMode(approvalPolicy.customerEmailMode),
    slack: parseSlackNotificationSettings(notifications),
    trello: parseTrelloProjectSettings(notifications),
  };
}

export async function saveSlackNotificationSettings(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  patch: Partial<SlackNotificationSettings>;
}): Promise<SlackNotificationSettings> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const current = await loadWorkspacePolicySettings({ supabase, workspaceId: input.workspaceId });
  const next = parseSlackNotificationSettings({ ...current.notifications, ...input.patch });
  const update = await supabase.from("os_workspace_settings").upsert({
    workspace_id: input.workspaceId,
    approval_policy: current.approvalPolicy,
    notifications: { ...current.notifications, ...next },
  }, { onConflict: "workspace_id" });
  if (update.error) throw new Error(update.error.message);
  return next;
}

export async function saveTrelloProjectSettings(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  patch: Partial<TrelloProjectSettings>;
}): Promise<TrelloProjectSettings> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const current = await loadWorkspacePolicySettings({ supabase, workspaceId: input.workspaceId });
  const currentPm = asRecord(current.notifications.project_management);
  const next = { ...current.trello, ...input.patch };
  const update = await supabase.from("os_workspace_settings").upsert({
    workspace_id: input.workspaceId,
    approval_policy: current.approvalPolicy,
    notifications: {
      ...current.notifications,
      project_management: {
        ...currentPm,
        trello: next,
      },
    },
  }, { onConflict: "workspace_id" });
  if (update.error) throw new Error(update.error.message);
  return parseTrelloProjectSettings({ project_management: { trello: next } });
}

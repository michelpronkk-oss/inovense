// Microsoft 365 / Outlook executor.
//
// Direct-OAuth equivalent of the Gmail executor pattern: tokens are read from
// the workspace's own os_connector_credentials row (never a third-party
// broker), refreshed/rotated in src/lib/connectors/microsoft.ts, and used to
// call Microsoft Graph directly. This intentionally replaces the previous
// Nango-proxy-based Outlook executor - Microsoft 365 is no longer connected
// through Nango.

import {
  getMicrosoftCredential,
  getMissingMicrosoftScopes,
  hasMicrosoftSendScope,
  listRecentMicrosoftMessages,
  MicrosoftGraphError,
  MicrosoftReauthRequiredError,
  resolveMicrosoftAccessToken,
  sendMicrosoftMail,
  type StoredMicrosoftCredential,
} from "@/lib/connectors/microsoft";
import { operatorRuntimeId } from "@/lib/operators/logging";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { CustomerEmailMode, SlackNotificationSettings } from "@/lib/settings/workspace-policy";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export class MicrosoftExecutionError extends Error {
  details: {
    step: string;
    status: number | null;
    statusText: string | null;
    responseBody: unknown;
  };

  constructor(message: string, details: MicrosoftExecutionError["details"]) {
    super(message);
    this.name = "MicrosoftExecutionError";
    this.details = details;
  }
}

function toExecutionError(error: unknown, step: string): MicrosoftExecutionError {
  if (error instanceof MicrosoftReauthRequiredError) {
    return new MicrosoftExecutionError(error.message, { step, status: 409, statusText: "Reconnect required", responseBody: { error: "microsoft_reconnect_required" } });
  }
  if (error instanceof MicrosoftGraphError) {
    return new MicrosoftExecutionError(error.message, { step, status: error.details.status, statusText: error.details.statusText, responseBody: error.details.responseBody });
  }
  return new MicrosoftExecutionError(error instanceof Error ? error.message : "Microsoft 365 execution failed.", { step, status: null, statusText: null, responseBody: null });
}

/** Read the workspace's live Microsoft 365 credential, or null if not connected. */
export async function getMicrosoftConnection(workspaceId: string, supabase: SupabaseAdmin = createSupabaseAdmin()): Promise<StoredMicrosoftCredential | null> {
  const credential = await getMicrosoftCredential(workspaceId, supabase);
  if (!credential) return null;
  if (credential.status === "needs_attention") return null;
  return credential;
}

/** Mail.Read - read-only, no approval required. */
export async function listRecentMicrosoftMessagesForWorkspace(workspaceId: string, limit = 20, supabase: SupabaseAdmin = createSupabaseAdmin()) {
  const credential = await getMicrosoftCredential(workspaceId, supabase);
  if (!credential) {
    throw new MicrosoftExecutionError("Microsoft 365 is not connected for this workspace.", { step: "microsoft.connection", status: 409, statusText: "Missing Microsoft connection", responseBody: { error: "microsoft_not_connected" } });
  }
  try {
    const accessToken = await resolveMicrosoftAccessToken({ workspaceId, credential, supabase });
    return await listRecentMicrosoftMessages(accessToken, limit);
  } catch (error) {
    throw toExecutionError(error, "microsoft.messages.list");
  }
}

export type PreparedMicrosoftFollowUp = {
  to: string;
  subject: string;
  body: string;
};

export async function createMicrosoftSendApproval(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  runId: string;
  to: string;
  subject: string;
  body: string;
  policyReason: string;
  dedupeKey?: string;
  dedupeMetadata?: Record<string, unknown>;
  sourceMetadata?: Record<string, unknown>;
  preparedActions?: string[];
  crmPreparation?: Record<string, unknown>;
  crmPreparationStatus?: string;
  preparedHubSpotActions?: Record<string, unknown>;
  customerEmailMode?: CustomerEmailMode;
  slackNotificationSettings?: SlackNotificationSettings;
}) {
  const approvalId = operatorRuntimeId("appr-revenue-microsoft");
  const customerEmailMode = input.customerEmailMode ?? "approval_required";
  const insert = await input.supabase.from("os_approvals").insert({
    id: approvalId,
    workspace_id: input.workspaceId,
    type: "email",
    title: "Approval required before sending",
    body: `Revenue Operator prepared an outbound Microsoft 365 message to ${input.to}.`,
    agent_id: "revenue",
    agent_mark: "RV",
    agent_color: "#4DE8E1",
    run_id: input.runId,
    status: "pending",
    dedupe_key: input.dedupeKey ?? null,
    created_at: new Date().toISOString(),
    continuation_payload: {
      kind: "microsoft.send_after_approval",
      workspaceId: input.workspaceId,
      operatorRunId: input.runId,
      operatorKey: "revenue",
      dedupeKey: input.dedupeKey ?? null,
      dedupeMetadata: input.dedupeMetadata ?? null,
      to: input.to,
      subject: input.subject,
      body: input.body,
      draftSubject: input.subject,
      draftBody: input.body,
      originalDraftSubject: input.subject,
      originalDraftBody: input.body,
      editedDraftSubject: null,
      editedDraftBody: null,
      wasEdited: false,
      editedAt: null,
      editedBy: null,
      sourceMetadata: input.sourceMetadata ?? {},
      preparedActions: input.preparedActions ?? ["send_microsoft_follow_up"],
      crmPreparation: input.crmPreparation ?? null,
      crmPreparationStatus: input.crmPreparationStatus ?? null,
      preparedHubSpotActions: input.preparedHubSpotActions ?? null,
      customerEmailPolicy: {
        mode: customerEmailMode,
        customerEmail: customerEmailMode === "draft_only"
          ? "Draft only mode. This email will not be sent automatically."
          : "Customer emails require approval before sending.",
        humanReview: "Required",
        crmUpdate: "Approval required",
        slackAlert: input.slackNotificationSettings?.slackNotificationsEnabled && input.slackNotificationSettings?.slackApprovalAlertsEnabled
          ? "Enabled"
          : "Disabled",
      },
    },
    policy_reason: input.policyReason,
  });

  if (insert.error) throw new Error(insert.error.message);
  return { approvalId };
}

export type MicrosoftSendResult = {
  status: "sent";
  sendEndpoint: "me/sendMail";
};

/**
 * Send the approved message through Microsoft Graph after policy/approval
 * has already been enforced by the caller. Mail.Send is never invoked
 * outside of this approval-gated path.
 */
export async function sendMicrosoftMessageAfterApproval(input: {
  workspaceId: string;
  to: string;
  subject: string;
  body: string;
  supabase?: SupabaseAdmin;
}): Promise<MicrosoftSendResult> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const credential = await getMicrosoftCredential(input.workspaceId, supabase);
  if (!credential) {
    throw new MicrosoftExecutionError("Microsoft 365 is not connected for this workspace.", { step: "microsoft.connection", status: 409, statusText: "Missing Microsoft connection", responseBody: { error: "microsoft_not_connected" } });
  }
  const missingScopes = getMissingMicrosoftScopes(credential.scopes, ["Mail.Send"]);
  if (missingScopes.length > 0 || !hasMicrosoftSendScope(credential.scopes)) {
    throw new MicrosoftExecutionError("Reconnect Microsoft 365 to grant send permission.", { step: "microsoft.scope_check", status: 409, statusText: "Missing Mail.Send scope", responseBody: { missingScopes } });
  }

  try {
    const accessToken = await resolveMicrosoftAccessToken({ workspaceId: input.workspaceId, credential, supabase });
    await sendMicrosoftMail(accessToken, { to: input.to, subject: input.subject, body: input.body });
    return { status: "sent", sendEndpoint: "me/sendMail" };
  } catch (error) {
    throw toExecutionError(error, "microsoft.message.send");
  }
}

// Outlook / Microsoft 365 executor.
//
// Mirrors the token-retrieval and proxy-request pattern already established
// by the HubSpot, Slack, and Trello executors: read the workspace's stored
// Nango connection for this connector, verify it resolves, then issue Graph
// requests through Nango's managed proxy. No Microsoft credentials are ever
// stored in Auterim.
//
// Unlike Gmail (native OAuth, credential stored in os_connector_credentials,
// tokens refreshed and used directly against the Gmail API), Outlook is a
// generic Nango connector: the connection lives in os_connectors and every
// request goes through nango.proxy() using the Microsoft Graph API.

import { Nango, type HTTP_METHOD } from "@nangohq/node";
import { OUTLOOK_PROVIDER_CONFIG_KEY, verifyNangoConnection } from "@/lib/integrations/nango";
import { operatorRuntimeId } from "@/lib/operators/logging";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { CustomerEmailMode, SlackNotificationSettings } from "@/lib/settings/workspace-policy";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type OutlookConnection = {
  workspaceId: string;
  providerConfigKey: string;
  nangoConnectionId: string;
  accountEmail?: string | null;
};

export class OutlookExecutionError extends Error {
  details: {
    step: string;
    method?: string;
    path?: string;
    status: number | null;
    statusText: string | null;
    responseBody: unknown;
  };

  constructor(message: string, details: OutlookExecutionError["details"]) {
    super(message);
    this.name = "OutlookExecutionError";
    this.details = details;
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function nangoHost(): string {
  return (process.env.NANGO_HOST || "https://api.nango.dev").replace(/\/+$/, "");
}

function asErrorDetails(error: unknown, step: string, method?: string, path?: string): OutlookExecutionError["details"] {
  const maybe = error as { response?: { status?: number; statusText?: string; data?: unknown } };
  return {
    step,
    method,
    path,
    status: typeof maybe.response?.status === "number" ? maybe.response.status : null,
    statusText: maybe.response?.statusText ?? null,
    responseBody: maybe.response?.data ?? null,
  };
}

function createOutlookError(error: unknown, step: string, method?: string, path?: string): OutlookExecutionError {
  const details = asErrorDetails(error, step, method, path);
  const message = error instanceof Error ? error.message : "Outlook execution failed.";
  return new OutlookExecutionError(message, details);
}

/** Read the workspace's live, verified Outlook connection, or null if not connected. */
export async function getOutlookConnection(workspaceId: string, supabase = createSupabaseAdmin()): Promise<OutlookConnection | null> {
  const res = await supabase
    .from("os_connectors")
    .select("workspace_id,connector_key,status,provider_email,provider_config_key,nango_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "outlook")
    .eq("status", "connected")
    .maybeSingle();

  if (res.error) throw new Error(res.error.message);
  if (!res.data?.provider_config_key || !res.data?.nango_connection_id) return null;

  const verification = await verifyNangoConnection({
    connectorKey: "outlook",
    providerConfigKey: String(res.data.provider_config_key),
    connectionId: String(res.data.nango_connection_id),
  });
  if (!verification.ok) return null;

  return {
    workspaceId,
    providerConfigKey: String(res.data.provider_config_key || OUTLOOK_PROVIDER_CONFIG_KEY),
    nangoConnectionId: String(res.data.nango_connection_id),
    accountEmail: typeof res.data.provider_email === "string" ? res.data.provider_email : null,
  };
}

async function outlookRequestWithConnection<T = unknown>(
  connection: OutlookConnection,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const nango = new Nango({
    secretKey: required("NANGO_SECRET_KEY"),
    host: nangoHost(),
    providerConfigKey: connection.providerConfigKey,
    connectionId: connection.nangoConnectionId,
  });

  try {
    const response = await nango.proxy<T>({
      method,
      endpoint: path,
      data: body,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
    return response.data;
  } catch (error) {
    throw createOutlookError(error, `outlook.${method.toLowerCase()}`, method, path);
  }
}

export async function outlookRequest<T = unknown>(
  workspaceId: string,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const connection = await getOutlookConnection(workspaceId);
  if (!connection) {
    throw new OutlookExecutionError("Outlook is not connected for this workspace.", {
      step: "outlook.connection",
      method,
      path,
      status: 409,
      statusText: "Missing Outlook connection",
      responseBody: { error: "outlook_not_connected" },
    });
  }
  return outlookRequestWithConnection<T>(connection, method, path, body);
}

export type OutlookMessageSummary = {
  id: string;
  subject: string | null;
  from: string | null;
  receivedAt: string | null;
  bodyPreview: string | null;
};

type GraphMessageListResult = {
  value?: Array<{
    id?: string;
    subject?: string;
    from?: { emailAddress?: { address?: string; name?: string } };
    receivedDateTime?: string;
    bodyPreview?: string;
  }>;
};

/** Read recent inbox context. Read-only, no approval required. */
export async function listRecentOutlookMessages(workspaceId: string, limit = 20): Promise<OutlookMessageSummary[]> {
  const top = Math.max(1, Math.min(limit, 50));
  const data = await outlookRequest<GraphMessageListResult>(
    workspaceId,
    "GET" as HTTP_METHOD,
    `/v1.0/me/messages?$top=${top}&$select=id,subject,from,receivedDateTime,bodyPreview&$orderby=receivedDateTime desc`,
  );
  return (data.value ?? []).map((message) => ({
    id: message.id ?? "",
    subject: message.subject ?? null,
    from: message.from?.emailAddress?.address ?? null,
    receivedAt: message.receivedDateTime ?? null,
    bodyPreview: message.bodyPreview ?? null,
  })).filter((message) => message.id);
}

export type PreparedOutlookFollowUp = {
  to: string;
  subject: string;
  body: string;
};

export async function createOutlookSendApproval(input: {
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
  const approvalId = operatorRuntimeId("appr-revenue-outlook");
  const customerEmailMode = input.customerEmailMode ?? "approval_required";
  const insert = await input.supabase.from("os_approvals").insert({
    id: approvalId,
    workspace_id: input.workspaceId,
    type: "email",
    title: "Approval required before sending",
    body: `Revenue Operator prepared an outbound Outlook message to ${input.to}.`,
    agent_id: "revenue",
    agent_mark: "RV",
    agent_color: "#4DE8E1",
    run_id: input.runId,
    status: "pending",
    dedupe_key: input.dedupeKey ?? null,
    created_at: new Date().toISOString(),
    continuation_payload: {
      kind: "outlook.send_after_approval",
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
      preparedActions: input.preparedActions ?? ["send_outlook_follow_up"],
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

export type OutlookSendResult = {
  status: "sent";
  sendEndpoint: "me/sendMail";
};

/**
 * Send the approved message through Microsoft Graph. Graph's sendMail
 * endpoint returns 202 Accepted with no message id, so success is the
 * absence of a thrown error.
 */
export async function sendOutlookMessageAfterApproval(input: {
  workspaceId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<OutlookSendResult> {
  const connection = await getOutlookConnection(input.workspaceId);
  if (!connection) {
    throw new OutlookExecutionError("Outlook is not connected for this workspace.", {
      step: "outlook.connection",
      status: 409,
      statusText: "Missing Outlook connection",
      responseBody: { error: "outlook_not_connected" },
    });
  }

  await outlookRequestWithConnection(connection, "POST" as HTTP_METHOD, "/v1.0/me/sendMail", {
    message: {
      subject: input.subject,
      body: { contentType: "Text", content: input.body },
      toRecipients: [{ emailAddress: { address: input.to } }],
    },
    saveToSentItems: true,
  });

  return { status: "sent", sendEndpoint: "me/sendMail" };
}

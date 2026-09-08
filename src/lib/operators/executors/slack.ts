// Slack execution transport.
//
// This module keeps exactly the same public surface it had while Slack ran on
// Nango (slackRequest / listSlackChannels / sendSlackMessageAfterApproval /
// joinSlackChannelIfPublic / sendSlackInternalNotification), so every caller -
// approvals, notifications, workflow materialization, the connector setup
// routes and the health-check job - is untouched. Only the transport changed:
// requests now go straight to the Slack Web API with the workspace's own
// encrypted bot token instead of through a Nango proxy.

import {
  SLACK_API_BASE,
  SLACK_CONNECTOR_KEY,
  SlackReconnectionRequiredError,
  getStoredSlackCredential,
  resolveSlackAccessToken,
} from "@/lib/connectors/slack";
import { getLegacyNangoConnection } from "@/lib/connectors/legacy-nango";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/** The HTTP verbs the Slack Web API surface used here needs. */
export type HTTP_METHOD = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type SlackConnection = {
  workspaceId: string;
  accessToken: string;
  teamId: string | null;
  accountEmail?: string | null;
  scopes: string[];
};

export type SlackChannel = {
  id: string;
  name: string;
  isPrivate: boolean;
  isArchived: boolean;
  isMember: boolean;
};

export type PreparedSlackMessageAction = {
  kind: "slack.send_after_approval";
  workspaceId: string;
  channelId: string;
  text: string;
  operatorRunId?: string;
  operatorKey?: string;
  context?: Record<string, unknown> | null;
};

export type SlackSendResult = {
  status: "sent";
  channelId: string;
  messageTs?: string | null;
  raw?: unknown;
};

export class SlackExecutionError extends Error {
  details: {
    step: string;
    method?: HTTP_METHOD;
    path?: string;
    status?: number | null;
    statusText?: string | null;
    responseBody?: unknown;
    code?: string;
  };

  constructor(message: string, details: SlackExecutionError["details"]) {
    super(message);
    this.name = "SlackExecutionError";
    this.details = details;
  }
}

function readErrorResponse(error: unknown): {
  status?: number | null;
  statusText?: string | null;
  responseBody?: unknown;
} {
  if (!error || typeof error !== "object") return {};
  const rec = error as Record<string, unknown>;
  const response = rec.response && typeof rec.response === "object" ? rec.response as Record<string, unknown> : null;
  return {
    status: typeof response?.status === "number" ? response.status : typeof rec.status === "number" ? rec.status : null,
    statusText: typeof response?.statusText === "string" ? response.statusText : typeof rec.statusText === "string" ? rec.statusText : null,
    responseBody: response?.data ?? rec.data ?? rec.body ?? null,
  };
}

function slackApiError(step: string, method: HTTP_METHOD, path: string, error: unknown): SlackExecutionError {
  const response = readErrorResponse(error);
  const message = error instanceof Error ? error.message : "Slack request failed.";
  const rateLimited = response.status === 429;
  return new SlackExecutionError(rateLimited ? "Slack rate limit reached. Try again later." : message, {
    step,
    method,
    path,
    status: response.status ?? null,
    statusText: response.statusText ?? null,
    responseBody: response.responseBody ?? null,
    code: rateLimited ? "slack_rate_limited" : "slack_request_failed",
  });
}

function assertSlackOk(response: unknown, step: string, method: HTTP_METHOD, path: string): void {
  if (!response || typeof response !== "object") return;
  const body = response as Record<string, unknown>;
  if (body.ok === false) {
    const code = typeof body.error === "string" ? body.error : "slack_api_error";
    const message = code === "missing_scope"
      ? "Slack is missing the required scopes for this action."
      : code === "channel_not_found"
        ? "Slack channel was not found or is not accessible."
        : `Slack API returned ok:false (${code}).`;
    throw new SlackExecutionError(message, {
      step,
      method,
      path,
      status: 400,
      statusText: "Slack API ok:false",
      responseBody: body,
      code,
    });
  }
}

/**
 * The workspace's direct Slack credential, or null when Slack has never been
 * connected directly. A workspace still on the legacy Nango connection has no
 * direct credential, so it resolves to null here and callers surface an honest
 * reconnect instruction instead of silently falling back to Nango.
 */
export async function getSlackConnection(
  workspaceId: string,
  supabase: SupabaseAdmin = createSupabaseAdmin(),
): Promise<SlackConnection | null> {
  const credential = await getStoredSlackCredential(workspaceId, supabase);
  if (!credential) return null;
  const accessToken = await resolveSlackAccessToken({ workspaceId, credential, supabase });
  const metadata = (credential.metadata ?? {}) as Record<string, unknown>;
  return {
    workspaceId,
    accessToken,
    teamId: typeof metadata.teamId === "string" ? metadata.teamId : credential.provider_account_id ?? null,
    accountEmail: credential.provider_email ?? null,
    scopes: Array.isArray(credential.scopes) ? credential.scopes.filter((scope): scope is string => typeof scope === "string") : [],
  };
}

async function slackRequestWithConnection<T = unknown>(
  connection: SlackConnection,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const step = `slack.${method.toLowerCase()}`;
  let response: Response;
  try {
    response = await fetch(`${SLACK_API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (error) {
    throw slackApiError(step, method, path, error);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new SlackExecutionError("Slack returned an invalid response.", {
      step,
      method,
      path,
      status: response.status,
      statusText: response.statusText,
      responseBody: null,
      code: "slack_invalid_response",
    });
  }

  if (!response.ok) {
    throw new SlackExecutionError(
      response.status === 429 ? "Slack rate limit reached. Try again later." : `Slack request failed (${response.status}).`,
      {
        step,
        method,
        path,
        status: response.status,
        statusText: response.statusText,
        responseBody: data,
        code: response.status === 429 ? "slack_rate_limited" : response.status === 401 ? "slack_reconnect_required" : "slack_request_failed",
      },
    );
  }

  // Slack answers 200 with { ok: false, error } for authorization and scope
  // problems, so the body check is what actually catches a dead token.
  assertSlackOk(data, step, method, path);
  return data as T;
}

export async function slackRequest<T = unknown>(
  workspaceId: string,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  let connection: SlackConnection | null;
  try {
    connection = await getSlackConnection(workspaceId);
  } catch (error) {
    if (error instanceof SlackReconnectionRequiredError) {
      throw new SlackExecutionError("Reconnect Slack to restore access.", {
        step: "slack.connection",
        method,
        path,
        status: 401,
        statusText: "Slack reconnect required",
        responseBody: { error: "slack_reconnect_required" },
        code: "slack_reconnect_required",
      });
    }
    throw error;
  }

  if (!connection) {
    // Distinguish "never connected" from "connected before the direct Slack
    // OAuth migration", so the workspace is told what to actually do.
    const legacy = await getLegacyNangoConnection({ workspaceId, connectorKey: SLACK_CONNECTOR_KEY });
    throw new SlackExecutionError(
      legacy.present
        ? "Slack must be reconnected with Auterim's direct Slack app before it can run actions."
        : "Slack is not connected for this workspace.",
      {
        step: "slack.connection",
        method,
        path,
        status: 409,
        statusText: legacy.present ? "Legacy Slack connection" : "Missing Slack connection",
        responseBody: { error: legacy.present ? "slack_legacy_reconnect_required" : "slack_not_connected" },
        code: legacy.present ? "slack_legacy_reconnect_required" : "slack_not_connected",
      },
    );
  }
  return slackRequestWithConnection<T>(connection, method, path, body);
}

export async function listSlackChannels(workspaceId: string): Promise<SlackChannel[]> {
  const data = await slackRequest<{
    ok?: boolean;
    channels?: Array<Record<string, unknown>>;
  }>(workspaceId, "GET", "/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200");

  return (data.channels ?? [])
    .map((channel) => ({
      id: typeof channel.id === "string" ? channel.id : "",
      name: typeof channel.name === "string" ? channel.name : "",
      isPrivate: channel.is_private === true,
      isArchived: channel.is_archived === true,
      isMember: channel.is_member === true,
    }))
    .filter((channel) => channel.id && channel.name);
}

export async function sendSlackMessageAfterApproval(input: {
  workspaceId: string;
  channelId: string;
  text: string;
  approvalId?: string;
  context?: Record<string, unknown> | null;
}): Promise<SlackSendResult> {
  const channelId = input.channelId.trim();
  const text = input.text.trim();
  if (!channelId) {
    throw new SlackExecutionError("Slack channelId is required.", {
      step: "slack.validate",
      code: "missing_channel_id",
    });
  }
  if (!text) {
    throw new SlackExecutionError("Slack message text is required.", {
      step: "slack.validate",
      code: "missing_text",
    });
  }

  const data = await slackRequest<{
    ok?: boolean;
    channel?: string;
    ts?: string;
  }>(input.workspaceId, "POST", "/chat.postMessage", {
    channel: channelId,
    text,
    metadata: input.approvalId ? {
      event_type: "inovense_approval_send",
      event_payload: {
        approval_id: input.approvalId,
        source: "inovense",
        ...(input.context ? { context: input.context } : {}),
      },
    } : undefined,
  });

  return {
    status: "sent",
    channelId: data.channel || channelId,
    messageTs: data.ts ?? null,
    raw: data,
  };
}

export type SlackJoinResult = {
  joined: boolean;
  skipped?: boolean;
  alreadyMember?: boolean;
  reason?: string;
  errorCode?: string;
};

/**
 * Attempt to join a public channel so Inovense can post internal alerts there.
 * Never joins private channels (Slack requires an explicit invite) and never
 * sends a message. Tokens are never logged.
 *
 * Throws SlackExecutionError with code "missing_channels_join_scope" when the
 * Slack app lacks the channels:join scope, so callers can surface a reconnect
 * instruction. All other ok:false outcomes are returned as non-joined results
 * so a setup flow can stay responsive instead of throwing.
 */
export async function joinSlackChannelIfPublic(input: {
  workspaceId: string;
  channelId: string;
  isPrivate: boolean;
}): Promise<SlackJoinResult> {
  if (input.isPrivate) {
    return { joined: false, skipped: true, reason: "private_channel_requires_invite" };
  }

  const channelId = input.channelId.trim();
  if (!channelId) {
    throw new SlackExecutionError("Slack channelId is required.", { step: "slack.validate", code: "missing_channel_id" });
  }

  try {
    await slackRequest(input.workspaceId, "POST", "/conversations.join", { channel: channelId });
    return { joined: true };
  } catch (error) {
    if (error instanceof SlackExecutionError) {
      const code = error.details.code;
      if (code === "already_in_channel") return { joined: true, alreadyMember: true };
      if (code === "missing_scope") {
        throw new SlackExecutionError(
          "Slack is connected, but the channels:join scope is missing. Reconnect Slack with updated permissions.",
          { ...error.details, code: "missing_channels_join_scope" },
        );
      }
      // method_not_supported_for_channel_type, not_in_channel, channel_not_found,
      // rate limits, or any other ok:false. Surface as a non-joined result.
      return { joined: false, reason: code || "slack_join_failed", errorCode: code };
    }
    throw error;
  }
}

export type SlackChannelValidation = {
  ready: boolean;
  joined: boolean;
  channelType: "public" | "private";
  reason: string;
};

/**
 * Decide whether a channel is usable as the default internal alert channel.
 * Public channels are auto-joined; private channels are only ready when the app
 * is already a member (Slack requires a manual invite for private channels).
 */
export async function validateSlackAlertChannel(input: {
  workspaceId: string;
  channelId: string;
  isPrivate: boolean;
  isMember?: boolean;
}): Promise<SlackChannelValidation> {
  if (input.isPrivate) {
    if (input.isMember) return { ready: true, joined: false, channelType: "private", reason: "already_member" };
    return { ready: false, joined: false, channelType: "private", reason: "private_channel_requires_invite" };
  }

  const join = await joinSlackChannelIfPublic({ workspaceId: input.workspaceId, channelId: input.channelId, isPrivate: false });
  if (join.joined) {
    return { ready: true, joined: !join.alreadyMember, channelType: "public", reason: join.alreadyMember ? "already_member" : "joined" };
  }
  return { ready: false, joined: false, channelType: "public", reason: join.reason || "slack_join_failed" };
}

export async function sendSlackInternalNotification(input: {
  workspaceId: string;
  channelId: string;
  text: string;
  eventType: string;
  approvalId?: string;
  context?: Record<string, unknown> | null;
}): Promise<SlackSendResult> {
  const channelId = input.channelId.trim();
  const text = input.text.trim();
  if (!channelId) {
    throw new SlackExecutionError("Slack channelId is required.", {
      step: "slack.validate",
      code: "missing_channel_id",
    });
  }
  if (!text) {
    throw new SlackExecutionError("Slack message text is required.", {
      step: "slack.validate",
      code: "missing_text",
    });
  }

  const data = await slackRequest<{
    ok?: boolean;
    channel?: string;
    ts?: string;
  }>(input.workspaceId, "POST", "/chat.postMessage", {
    channel: channelId,
    text,
    unfurl_links: false,
    unfurl_media: false,
    metadata: {
      event_type: "inovense_internal_notification",
      event_payload: {
        event_type: input.eventType,
        approval_id: input.approvalId ?? null,
        source: "inovense",
        ...(input.context ? { context: input.context } : {}),
      },
    },
  });

  return {
    status: "sent",
    channelId: data.channel || channelId,
    messageTs: data.ts ?? null,
    raw: data,
  };
}

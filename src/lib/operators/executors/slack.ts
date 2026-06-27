import { Nango, type HTTP_METHOD } from "@nangohq/node";
import { SLACK_PROVIDER_CONFIG_KEY } from "@/lib/integrations/nango";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type SlackConnection = {
  workspaceId: string;
  providerConfigKey: string;
  nangoConnectionId: string;
  accountEmail?: string | null;
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

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function nangoHost(): string {
  return (process.env.NANGO_HOST || "https://api.nango.dev").replace(/\/+$/, "");
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

export async function getSlackConnection(
  workspaceId: string,
  supabase: SupabaseAdmin = createSupabaseAdmin(),
): Promise<SlackConnection | null> {
  const res = await supabase
    .from("os_connectors")
    .select("workspace_id,connector_key,status,provider_email,provider_config_key,nango_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "slack")
    .eq("status", "connected")
    .maybeSingle();

  if (res.error) throw new Error(res.error.message);
  if (!res.data?.provider_config_key || !res.data?.nango_connection_id) return null;

  return {
    workspaceId,
    providerConfigKey: String(res.data.provider_config_key || SLACK_PROVIDER_CONFIG_KEY),
    nangoConnectionId: String(res.data.nango_connection_id),
    accountEmail: typeof res.data.provider_email === "string" ? res.data.provider_email : null,
  };
}

async function slackRequestWithConnection<T = unknown>(
  connection: SlackConnection,
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
    assertSlackOk(response.data, `slack.${method.toLowerCase()}`, method, path);
    return response.data;
  } catch (error) {
    if (error instanceof SlackExecutionError) throw error;
    throw slackApiError(`slack.${method.toLowerCase()}`, method, path, error);
  }
}

export async function slackRequest<T = unknown>(
  workspaceId: string,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const connection = await getSlackConnection(workspaceId);
  if (!connection) {
    throw new SlackExecutionError("Slack is not connected for this workspace.", {
      step: "slack.connection",
      method,
      path,
      status: 409,
      statusText: "Missing Slack connection",
      responseBody: { error: "slack_not_connected" },
      code: "slack_not_connected",
    });
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

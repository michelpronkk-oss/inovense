import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SLACK_EVENTS_MAX_BODY_BYTES = 512 * 1024;
export const SLACK_EVENTS_MAX_CLOCK_SKEW_SECONDS = 5 * 60;
export const SLACK_EVENTS_URL = "https://app.auterim.com/api/connectors/slack/events";

export type SlackEventPayload = {
  type: "event_callback";
  event_id: string;
  team_id: string;
  enterprise_id?: string | null;
  api_app_id?: string | null;
  event: Record<string, unknown>;
  authorizations?: Array<{ user_id?: string | null; is_bot?: boolean }>;
  event_time?: number;
};

export type SlackUrlVerificationPayload = {
  type: "url_verification";
  challenge: string;
};

export type ParsedSlackEvent = {
  kind: "event";
  payload: SlackEventPayload;
  eventType: "slack.app_mentioned" | "slack.message.received";
  channelId: string;
  messageTs: string;
  threadTs: string | null;
  userId: string | null;
  text: string;
  subtype: string | null;
  botId: string | null;
};

export type ParsedSlackPayload =
  | { kind: "url_verification"; payload: SlackUrlVerificationPayload }
  | ParsedSlackEvent;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, max = 255): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return normalized ? normalized.slice(0, max) : null;
}

export function hashSlackIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function safeSlackText(value: unknown, max = 500): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

export function isSlackRequestTimestampFresh(timestamp: string | null | undefined, nowMs = Date.now()): boolean {
  if (!timestamp || !/^\d{1,12}$/.test(timestamp)) return false;
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds)) return false;
  return Math.abs(Math.floor(nowMs / 1000) - seconds) <= SLACK_EVENTS_MAX_CLOCK_SKEW_SECONDS;
}

export function verifySlackRequestSignature(input: {
  rawBody: string;
  timestamp: string | null | undefined;
  signature: string | null | undefined;
  signingSecret?: string | null;
}): boolean {
  const secret = input.signingSecret?.trim() || process.env.SLACK_SIGNING_SECRET?.trim();
  const timestamp = input.timestamp?.trim();
  const signature = input.signature?.trim();
  if (!secret || !timestamp || !signature || !/^v0=[a-f0-9]{64}$/i.test(signature)) return false;
  if (!isSlackRequestTimestampFresh(timestamp)) return false;
  const expected = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${input.rawBody}`, "utf8").digest("hex")}`;
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function eventCallbackPayload(value: Record<string, unknown>): SlackEventPayload | null {
  const event = isRecord(value.event) ? value.event : null;
  const type = value.type;
  const eventId = stringValue(value.event_id, 255);
  const teamId = stringValue(value.team_id, 80);
  if (type !== "event_callback" || !event || !eventId || !teamId) return null;
  return {
    type: "event_callback",
    event_id: eventId,
    team_id: teamId,
    enterprise_id: stringValue(value.enterprise_id, 120),
    api_app_id: stringValue(value.api_app_id, 120),
    event,
    authorizations: Array.isArray(value.authorizations)
      ? value.authorizations.slice(0, 5).flatMap((item) => {
        if (!isRecord(item)) return [];
        return [{ user_id: stringValue(item.user_id, 80), is_bot: item.is_bot === true }];
      })
      : [],
    event_time: typeof value.event_time === "number" && Number.isSafeInteger(value.event_time) ? value.event_time : undefined,
  };
}

export function parseSlackEventPayload(rawBody: string): ParsedSlackPayload {
  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    throw new Error("slack_event_payload_invalid_json");
  }
  if (!isRecord(value)) throw new Error("slack_event_payload_invalid");
  if (value.type === "url_verification") {
    const challenge = stringValue(value.challenge, 512);
    if (!challenge) throw new Error("slack_event_challenge_invalid");
    return { kind: "url_verification", payload: { type: "url_verification", challenge } };
  }

  const payload = eventCallbackPayload(value);
  if (!payload) throw new Error("slack_event_callback_invalid");
  const event = payload.event;
  const type = stringValue(event.type, 80);
  const subtype = stringValue(event.subtype, 80);
  const channelId = stringValue(event.channel, 120);
  const messageTs = stringValue(event.ts, 80);
  const threadTs = stringValue(event.thread_ts, 80);
  const userId = stringValue(event.user, 80);
  const text = safeSlackText(event.text, 500);
  const botId = stringValue(event.bot_id, 80);

  if (type === "app_mention") {
    if (subtype) throw new Error("slack_event_type_unsupported");
    if (!channelId || !messageTs || !text) throw new Error("slack_app_mention_invalid");
    return { kind: "event", payload, eventType: "slack.app_mentioned", channelId, messageTs, threadTs, userId, text, subtype, botId };
  }

  // Slack delivers the message.channels subscription as type=message. Only
  // plain public-channel messages are in the beta scope. Edits, deletions,
  // bot messages, hidden events, DMs, and private-channel messages are not
  // accepted here.
  if (type === "message" && !subtype && event.channel_type === "channel") {
    if (!channelId || !messageTs || !text) throw new Error("slack_channel_message_invalid");
    return { kind: "event", payload, eventType: "slack.message.received", channelId, messageTs, threadTs, userId, text, subtype: null, botId };
  }
  throw new Error("slack_event_type_unsupported");
}

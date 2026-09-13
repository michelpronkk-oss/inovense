import { isValidGmailHistoryId } from "@/lib/connectors/gmail-history";
import { createHash } from "node:crypto";

export type GmailPubSubEnvelope = {
  subscription: string;
  message: { messageId: string; data: string };
};

export type GmailPushNotification = {
  emailAddress: string;
  historyId: string;
};

export type GmailPushConfig = {
  projectId: string;
  topic: string;
  subscription: string;
  audience: string;
  serviceAccountEmail: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESOURCE = /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9])\/(topics|subscriptions)\/([A-Za-z0-9._~+%-]+)$/;

export function readGmailPushConfig(env: NodeJS.ProcessEnv = process.env): GmailPushConfig {
  const projectId = env.GOOGLE_CLOUD_PROJECT_ID?.trim() ?? "";
  const topic = env.GMAIL_PUBSUB_TOPIC?.trim() ?? "";
  const subscription = env.GMAIL_PUBSUB_SUBSCRIPTION?.trim() ?? "";
  const audience = env.GMAIL_PUBSUB_PUSH_AUDIENCE?.trim() ?? "";
  const serviceAccountEmail = env.GMAIL_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL?.trim().toLowerCase() ?? "";
  if (!projectId || !topic || !subscription || !audience || !serviceAccountEmail) {
    throw new Error("gmail_push_configuration_missing");
  }
  const topicMatch = topic.match(RESOURCE);
  const subscriptionMatch = subscription.match(RESOURCE);
  if (!topicMatch || topicMatch[1] !== projectId || topicMatch[2] !== "topics"
    || !subscriptionMatch || subscriptionMatch[1] !== projectId || subscriptionMatch[2] !== "subscriptions") {
    throw new Error("gmail_push_project_mismatch");
  }
  const audienceUrl = new URL(audience);
  if (audienceUrl.protocol !== "https:" || audienceUrl.username || audienceUrl.password || audienceUrl.hash) {
    throw new Error("gmail_push_audience_invalid");
  }
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.iam\.gserviceaccount\.com$/.test(serviceAccountEmail)
    || !serviceAccountEmail.endsWith(`@${projectId}.iam.gserviceaccount.com`)) {
    throw new Error("gmail_push_service_account_invalid");
  }
  return { projectId, topic, subscription, audience, serviceAccountEmail };
}

function decodeBase64Url(value: string): string {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(value) || value.length > 16_384
    || value.length % 4 === 1 || (value.includes("=") && value.length % 4 !== 0)) throw new Error("gmail_push_data_invalid");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = Buffer.from(normalized, "base64").toString("utf8");
  if (!decoded || decoded.includes("\u0000")) throw new Error("gmail_push_data_invalid");
  return decoded;
}

export function parseGmailPubSubEnvelope(value: unknown, expectedSubscription: string): {
  messageId: string;
  notification: GmailPushNotification;
} {
  if (!value || typeof value !== "object") throw new Error("gmail_push_envelope_invalid");
  const envelope = value as Partial<GmailPubSubEnvelope>;
  const message = envelope.message;
  if (envelope.subscription !== expectedSubscription || !message || typeof message !== "object"
    || typeof message.messageId !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(message.messageId)
    || typeof message.data !== "string") throw new Error("gmail_push_envelope_invalid");
  let notification: unknown;
  try { notification = JSON.parse(decodeBase64Url(message.data)); } catch { throw new Error("gmail_push_payload_invalid"); }
  if (!notification || typeof notification !== "object") throw new Error("gmail_push_payload_invalid");
  const payload = notification as Partial<GmailPushNotification>;
  const emailAddress = typeof payload.emailAddress === "string" ? payload.emailAddress.trim().toLowerCase() : "";
  if (!EMAIL.test(emailAddress) || !isValidGmailHistoryId(payload.historyId)) throw new Error("gmail_push_payload_invalid");
  return { messageId: message.messageId, notification: { emailAddress, historyId: payload.historyId } };
}

export function findUniqueWorkspaceForGmailAccount(
  accountEmail: string,
  rows: Array<{ workspace_id?: unknown; provider_email?: unknown }>,
): string | null {
  const target = accountEmail.trim().toLowerCase();
  const matches = new Set(rows
    .filter((row) => typeof row.workspace_id === "string" && typeof row.provider_email === "string"
      && row.provider_email.trim().toLowerCase() === target)
    .map((row) => row.workspace_id as string));
  return matches.size === 1 ? [...matches][0] : null;
}

export function safeAccountHash(accountEmail: string): string {
  return createHash("sha256").update(accountEmail.trim().toLowerCase()).digest("hex").slice(0, 16);
}

export function validatePubSubIdentityClaims(
  claims: Record<string, unknown>,
  config: Pick<GmailPushConfig, "audience" | "serviceAccountEmail">,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const issuer = claims.iss;
  const audience = claims.aud;
  const email = claims.email;
  return (issuer === "https://accounts.google.com" || issuer === "accounts.google.com")
    && (typeof audience === "string" ? audience === config.audience : Array.isArray(audience) && audience.includes(config.audience))
    && typeof email === "string" && email.toLowerCase() === config.serviceAccountEmail.toLowerCase()
    && claims.email_verified === true
    && typeof claims.exp === "number" && claims.exp > nowSeconds
    && typeof claims.iat === "number" && claims.iat <= nowSeconds + 60;
}

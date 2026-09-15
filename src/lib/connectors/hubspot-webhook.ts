import crypto from "node:crypto";
import type { SignalEvent } from "@/lib/signals/types";

export const HUBSPOT_WEBHOOK_URL = "https://app.auterim.com/api/connectors/hubspot/webhook";
export const HUBSPOT_WEBHOOK_MAX_BODY_BYTES = 256 * 1024;
export const HUBSPOT_WEBHOOK_MAX_BATCH = 100;
const HUBSPOT_WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;

type JsonObject = Record<string, unknown>;

export type HubSpotWebhookNotification = {
  eventId: string;
  portalId: string;
  subscriptionType: string;
  objectId: string;
  occurredAt: string | null;
  propertyName: string | null;
  propertyValue: string | null;
  changeSource: string | null;
  changeFlag: string | null;
  appId: string | null;
};

export type HubSpotWebhookDescriptor = HubSpotWebhookNotification & {
  eventType: "hubspot.contact.created" | "hubspot.contact.updated" | "hubspot.deal.created" | "hubspot.deal.stage_changed" | "hubspot.deal.updated";
  entityType: "contact" | "deal";
};

export type HubSpotWebhookBatch = {
  supported: HubSpotWebhookDescriptor[];
  unsupported: Array<{ eventId: string | null; subscriptionType: string | null }>;
};

function object(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}

function bounded(value: string, max: number): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function identifier(value: unknown): string | null {
  if (typeof value === "string" && /^[0-9]{1,80}$/.test(value.trim())) return value.trim();
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

function optionalString(value: unknown, max = 180): string | null {
  return typeof value === "string" && value.trim() ? bounded(value, max) : null;
}

function eventId(value: unknown): string | null {
  if (typeof value === "string" && value.trim() && value.length <= 180 && !/[\u0000-\u001f\u007f]/.test(value)) return bounded(value, 180);
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

function occurredAt(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function propertyKey(value: string | null): string {
  return (value ?? "").toLowerCase().replace(/[\s_-]+/g, "");
}

function descriptorFor(input: JsonObject): HubSpotWebhookDescriptor | null {
  const portalId = identifier(input.portalId);
  const objectId = identifier(input.objectId);
  const subscriptionType = optionalString(input.subscriptionType, 100)?.toLowerCase() ?? null;
  const event = eventId(input.eventId);
  if (!portalId || !objectId || !subscriptionType || !event) return null;
  const propertyName = optionalString(input.propertyName, 100);
  const base = {
    eventId: event,
    portalId,
    subscriptionType,
    objectId,
    occurredAt: occurredAt(input.occurredAt),
    propertyName,
    propertyValue: optionalString(input.propertyValue, 240),
    changeSource: optionalString(input.changeSource, 80),
    changeFlag: optionalString(input.changeFlag, 80),
    appId: identifier(input.appId),
  } as const;
  if (subscriptionType === "contact.creation") return { ...base, eventType: "hubspot.contact.created", entityType: "contact" };
  if (subscriptionType === "contact.propertychange") {
    const key = propertyKey(propertyName);
    if (key === "lifecyclestage" || key === "hsleadstatus" || key === "leadstatus") return { ...base, eventType: "hubspot.contact.updated", entityType: "contact" };
    return null;
  }
  if (subscriptionType === "deal.creation") return { ...base, eventType: "hubspot.deal.created", entityType: "deal" };
  if (subscriptionType === "deal.propertychange") {
    const key = propertyKey(propertyName);
    if (key === "dealstage") return { ...base, eventType: "hubspot.deal.stage_changed", entityType: "deal" };
    if (key === "amount" || key === "hubspotownerid" || key === "closedate") return { ...base, eventType: "hubspot.deal.updated", entityType: "deal" };
  }
  return null;
}

export function parseHubSpotWebhookBatch(rawBody: string): HubSpotWebhookBatch {
  let parsed: unknown;
  try { parsed = JSON.parse(rawBody); } catch { throw new Error("hubspot_webhook_json_invalid"); }
  if (!Array.isArray(parsed) || parsed.length > HUBSPOT_WEBHOOK_MAX_BATCH) throw new Error("hubspot_webhook_batch_invalid");
  const supported: HubSpotWebhookDescriptor[] = [];
  const unsupported: HubSpotWebhookBatch["unsupported"] = [];
  for (const item of parsed) {
    const input = object(item);
    const descriptor = input ? descriptorFor(input) : null;
    if (descriptor) supported.push(descriptor);
    else unsupported.push({ eventId: input ? eventId(input.eventId) : null, subscriptionType: input ? optionalString(input.subscriptionType, 100) : null });
  }
  return { supported, unsupported };
}

export function isHubSpotWebhookTimestampFresh(timestamp: string | null, nowMs = Date.now()): boolean {
  if (!timestamp || !/^[0-9]{1,16}$/.test(timestamp)) return false;
  const value = Number(timestamp);
  return Number.isSafeInteger(value) && Math.abs(nowMs - value) <= HUBSPOT_WEBHOOK_MAX_AGE_MS;
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyHubSpotWebhookSignature(input: {
  rawBody: string;
  method: string;
  uri?: string;
  timestamp: string | null;
  signature: string | null;
  clientSecret?: string | null;
  nowMs?: number;
}): boolean {
  const timestamp = input.timestamp;
  const secret = input.clientSecret?.trim() || process.env.HUBSPOT_CLIENT_SECRET?.trim();
  if (!secret || input.method.toUpperCase() !== "POST" || !timestamp || !input.signature || !isHubSpotWebhookTimestampFresh(timestamp, input.nowMs)) return false;
  const uri = input.uri || HUBSPOT_WEBHOOK_URL;
  const source = `${input.method.toUpperCase()}${uri}${input.rawBody}${timestamp}`;
  const expected = crypto.createHmac("sha256", secret).update(source, "utf8").digest("base64");
  return secureEqual(input.signature.trim(), expected);
}

export function hashHubSpotIdentifier(value: string): string {
  return crypto.createHash("sha256").update(value.trim()).digest("hex").slice(0, 24);
}

export function selectUniqueHubSpotWorkspace(rows: Array<{ workspace_id?: unknown; provider_account_id?: unknown; status?: unknown }>, portalId: string): string | null {
  const workspaces = new Set(rows
    .filter((row) => row.provider_account_id === portalId && row.status !== "needs_attention" && typeof row.workspace_id === "string")
    .map((row) => row.workspace_id as string));
  return workspaces.size === 1 ? [...workspaces][0] : null;
}

export function stableHubSpotExternalEventId(event: HubSpotWebhookDescriptor): string {
  return `hubspot:${event.portalId}:${event.eventId}`;
}

export function isHubSpotSelfWriteEcho(event: { changeSource?: string | null; appId?: string | null }): boolean {
  return event.changeSource?.toUpperCase() === "INTEGRATION" && Boolean(event.appId);
}

export function isHubSpotClosedWon(properties: Record<string, unknown>): boolean {
  const value = String(properties.dealstage ?? properties.hs_deal_stage ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  return value === "closedwon" || value === "closedwonstage" || value.includes("closedwon") || properties.hs_is_closed_won === true || String(properties.hs_is_closed_won ?? "").toLowerCase() === "true";
}

export function normalizeHubSpotSnapshot(input: {
  workspaceId: string;
  providerEventId: string;
  event: HubSpotWebhookDescriptor;
  snapshot: JsonObject;
}): SignalEvent {
  const properties = object(input.snapshot.properties) ?? {};
  const objectName = typeof properties.dealname === "string" ? properties.dealname : typeof properties.firstname === "string" || typeof properties.lastname === "string" ? [properties.firstname, properties.lastname].filter((value): value is string => typeof value === "string").join(" ") : `${input.event.entityType} ${input.event.objectId}`;
  const closedWon = input.event.eventType === "hubspot.deal.stage_changed" && (isHubSpotClosedWon(properties) || /closed[\s_-]*won/i.test(input.event.propertyValue ?? ""));
  return {
    workspaceId: input.workspaceId,
    connectorKey: "hubspot",
    provider: "hubspot",
    source: "hubspot",
    sourceType: "crm",
    eventType: input.event.eventType,
    sourceId: input.event.objectId,
    sourceParentId: input.providerEventId,
    occurredAt: input.event.occurredAt,
    receivedAt: new Date().toISOString(),
    actor: null,
    entityType: input.event.entityType,
    entityId: input.event.objectId,
    subject: `HubSpot ${input.event.entityType} ${input.event.eventType.replace("hubspot.", "").replaceAll("_", " ")}`,
    snippet: `${objectName}${input.event.propertyName ? ` ${input.event.propertyName} changed` : " created"}`.slice(0, 320),
    metadata: {
      providerEventId: input.providerEventId,
      hubspotObjectType: input.event.entityType,
      hubspotObjectIdHash: hashHubSpotIdentifier(input.event.objectId),
      hubspotProperty: input.event.propertyName,
      hubspotChangeSource: input.event.changeSource,
      hubspotChangeFlag: input.event.changeFlag,
      hubspotClosedWon: closedWon,
      hubspotCommercial: input.event.entityType === "deal" || input.event.eventType === "hubspot.contact.created" || input.event.eventType === "hubspot.contact.updated",
    },
    trustLevel: "system_derived",
  };
}

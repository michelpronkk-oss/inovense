import { createHash } from "node:crypto";

export const PROVIDER_EVENT_SOURCE_MODES = ["push", "webhook", "manual", "scheduled", "reconciliation", "recovery"] as const;
export type ProviderEventSourceMode = typeof PROVIDER_EVENT_SOURCE_MODES[number];

export type CanonicalProviderEventInput = {
  workspaceId: string;
  connectorKey: string;
  provider: string;
  /** Pseudonymous, stable account reference. Do not pass an email or token. */
  providerAccountId: string;
  externalEventId: string;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  occurredAt?: string | null;
  sourceMode: ProviderEventSourceMode;
  payloadReference?: string | null;
  metadata?: Record<string, unknown>;
};

export type CanonicalProviderEvent = CanonicalProviderEventInput & {
  id: string;
  connectorId: string;
  receivedAt: string;
};

export type ProviderEventStatus = "received" | "queued" | "processing" | "retryable" | "processed" | "failed" | "ignored";

const BLOCKED_METADATA_KEY = /(token|secret|authorization|body|payload|content|email|subject|snippet|raw|header|message)/i;
const SYMBOL = /^[a-z][a-z0-9_.-]{0,79}$/;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeProviderEvent(input: CanonicalProviderEventInput, receivedAt = new Date().toISOString()): CanonicalProviderEvent {
  const workspaceId = input.workspaceId.trim();
  const connectorKey = input.connectorKey.trim().toLowerCase();
  const provider = input.provider.trim().toLowerCase();
  const providerAccountId = input.providerAccountId.trim();
  const externalEventId = input.externalEventId.trim();
  const eventType = input.eventType.trim().toLowerCase();

  if (!workspaceId || workspaceId.length > 180) throw new Error("provider_event_workspace_invalid");
  if (!connectorKey || connectorKey.length > 80 || !SYMBOL.test(connectorKey)) throw new Error("provider_event_connector_invalid");
  if (!provider || provider.length > 80 || !SYMBOL.test(provider)) throw new Error("provider_event_provider_invalid");
  if (!providerAccountId || providerAccountId.length > 180 || providerAccountId.includes("@")) throw new Error("provider_event_account_reference_invalid");
  if (!externalEventId || externalEventId.length > 255 || /[\u0000-\u001f\u007f]/.test(externalEventId)) throw new Error("provider_event_external_id_invalid");
  if (!SYMBOL.test(eventType)) throw new Error("provider_event_type_invalid");
  if (!PROVIDER_EVENT_SOURCE_MODES.includes(input.sourceMode)) throw new Error("provider_event_source_mode_invalid");

  const occurredAt = input.occurredAt && Number.isFinite(Date.parse(input.occurredAt))
    ? new Date(input.occurredAt).toISOString()
    : null;
  const payloadReference = input.payloadReference?.trim() || null;
  if (payloadReference && (payloadReference.length > 512 || /(token|secret|authorization|bearer)/i.test(payloadReference))) {
    throw new Error("provider_event_reference_invalid");
  }

  const metadata: Record<string, string | number | boolean | null | Array<string | number | boolean>> = {};
  for (const [key, value] of Object.entries(input.metadata ?? {}).slice(0, 30)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/.test(key) || BLOCKED_METADATA_KEY.test(key)) continue;
    if (typeof value === "string") metadata[key] = value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 240);
    else if (typeof value === "number" && Number.isFinite(value)) metadata[key] = value;
    else if (typeof value === "boolean" || value === null) metadata[key] = value;
    else if (Array.isArray(value)) {
      metadata[key] = value.slice(0, 20).filter((item): item is string | number | boolean =>
        typeof item === "string" || typeof item === "number" && Number.isFinite(item) || typeof item === "boolean")
        .map((item) => typeof item === "string" ? item.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 120) : item);
    }
  }
  while (JSON.stringify(metadata).length > 3_500) delete metadata[Object.keys(metadata).at(-1) ?? ""];

  const connectorId = `conn_${hash([workspaceId, provider, connectorKey, providerAccountId].join("\u0000")).slice(0, 40)}`;
  const id = `pev_${hash([provider, connectorId, externalEventId].join("\u0000")).slice(0, 48)}`;
  return {
    id,
    workspaceId,
    connectorId,
    connectorKey,
    provider,
    providerAccountId,
    externalEventId,
    eventType,
    entityType: input.entityType?.trim().slice(0, 80) || null,
    entityId: input.entityId?.trim().slice(0, 255) || null,
    occurredAt,
    receivedAt: Number.isFinite(Date.parse(receivedAt)) ? new Date(receivedAt).toISOString() : new Date().toISOString(),
    sourceMode: input.sourceMode,
    payloadReference,
    metadata,
  };
}

export function hashProviderAccountId(provider: string, accountId: string): string {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedAccount = accountId.trim().toLowerCase();
  if (!normalizedProvider || !normalizedAccount) throw new Error("provider_account_reference_invalid");
  return hash(`${normalizedProvider}\u0000${normalizedAccount}`);
}


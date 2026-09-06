import crypto from "crypto";
import { Nango, type HTTP_METHOD } from "@nangohq/node";
import { getProviderConfigKey, isSupportedNangoConnector } from "@/lib/connectors/registry";

type NangoConnectSessionBody = {
  tags: Record<string, string>;
  allowed_integrations: string[];
};

type NangoConnectSessionResponse = {
  token?: string;
  connectLink?: string;
  connect_link?: string;
  expiresAt?: string;
  expires_at?: string;
  data?: NangoConnectSessionResponse;
};

export type SupportedNangoConnectorKey = string;

export type NangoConnectorConfig = {
  connectorKey: SupportedNangoConnectorKey;
  providerConfigKey: string;
  provider: SupportedNangoConnectorKey;
};

export type NangoConnectionMetadata = {
  workspaceId: string;
  connectorKey: SupportedNangoConnectorKey;
  providerConfigKey: string;
  nangoConnectionId: string;
  providerAccountId?: string | null;
  providerEmail?: string | null;
  status: "connected" | "error" | "pending";
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  metadata?: Record<string, unknown>;
};

// Provider config keys now live in the connector catalog (registry.ts).
// Kept as a named export for existing imports (finalize/webhook/hubspot executor).
export const HUBSPOT_PROVIDER_CONFIG_KEY = getProviderConfigKey("hubspot") || "hubspot";
export const SLACK_PROVIDER_CONFIG_KEY = getProviderConfigKey("slack") || "slack";
export const TRELLO_PROVIDER_CONFIG_KEY = getProviderConfigKey("trello") || "trello";
export const OUTLOOK_PROVIDER_CONFIG_KEY = getProviderConfigKey("outlook") || "outlook";

export class NangoConnectSessionError extends Error {
  details: {
    endpoint: string;
    providerConfigKey: string;
    status: number | null;
    statusText: string | null;
    responseBody: unknown;
    validationErrors?: unknown;
  };

  constructor(message: string, details: NangoConnectSessionError["details"]) {
    super(message);
    this.name = "NangoConnectSessionError";
    this.details = details;
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getNangoProviderConfigKey(connectorKey: string): string | null {
  if (!isSupportedNangoConnector(connectorKey)) return null;
  return getProviderConfigKey(connectorKey);
}

function getNangoHost(): string {
  return (process.env.NANGO_HOST || "https://api.nango.dev").replace(/\/+$/, "");
}

export type NangoVerificationResult = {
  ok: boolean;
  reason?: string;
};

/**
 * A Nango connection id is only metadata until Nango can resolve its
 * credentials. HubSpot additionally gets a read-only CRM request so an OAuth
 * success event cannot make the UI green when the provider token is unusable.
 */
export async function verifyNangoConnection(input: {
  connectorKey: string;
  providerConfigKey: string;
  connectionId: string;
}): Promise<NangoVerificationResult> {
  try {
    const nango = new Nango({
      secretKey: required("NANGO_SECRET_KEY"),
      host: getNangoHost(),
    });
    await nango.getConnection(input.providerConfigKey, input.connectionId, false, true);

    if (input.connectorKey === "hubspot") {
      await nango.proxy({
        method: "GET" as HTTP_METHOD,
        endpoint: "/crm/v3/objects/contacts?limit=1&properties=email",
        providerConfigKey: input.providerConfigKey,
        connectionId: input.connectionId,
      });
    }

    if (input.connectorKey === "outlook") {
      await nango.proxy({
        method: "GET" as HTTP_METHOD,
        endpoint: "/v1.0/me",
        providerConfigKey: input.providerConfigKey,
        connectionId: input.connectionId,
      });
    }

    return { ok: true };
  } catch (error) {
    console.warn("[connector] connector_verification_failed", {
      connectorKey: input.connectorKey,
      providerConfigKey: input.providerConfigKey,
      reason: error instanceof Error ? error.message : "Provider verification failed",
    });
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Provider verification failed",
    };
  }
}

function readValidationErrors(responseBody: unknown): unknown {
  if (!responseBody || typeof responseBody !== "object") return undefined;
  const body = responseBody as Record<string, unknown>;
  const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : null;
  return error?.errors;
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function responseShapeDebug(responseBody: unknown) {
  const body = readObject(responseBody);
  const data = readObject(body?.data);
  const sessionData = data || body;
  return {
    responseKeys: body ? Object.keys(body) : [],
    dataExists: Boolean(data),
    dataKeys: data ? Object.keys(data) : [],
    tokenExists: typeof sessionData?.token === "string" && sessionData.token.length > 0,
    connectLinkExists: Boolean(sessionData?.connect_link || sessionData?.connectLink),
  };
}

export async function createNangoConnectSession(input: {
  connectorKey: string;
  endUserId: string;
  endUserEmail?: string;
  tags: Record<string, string>;
}) {
  if (!isSupportedNangoConnector(input.connectorKey)) {
    throw new Error(`Unsupported connector key: ${input.connectorKey}`);
  }
  const providerConfigKey = getNangoProviderConfigKey(input.connectorKey);
  if (!providerConfigKey) throw new Error(`Unsupported connector key: ${input.connectorKey}`);

  const body: NangoConnectSessionBody = {
    tags: {
      ...input.tags,
      end_user_id: input.endUserId,
      ...(input.endUserEmail ? { end_user_email: input.endUserEmail } : {}),
      ...(input.tags.end_user_display_name ? {} : { end_user_display_name: input.endUserEmail || input.endUserId }),
    },
    allowed_integrations: [providerConfigKey],
  };

  const endpoint = "POST /connect/sessions";
  const response = await fetch(`${getNangoHost()}/connect/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("NANGO_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.json().catch(() => null) as NangoConnectSessionResponse | Record<string, unknown> | null;
  const shapeDebug = responseShapeDebug(responseBody);
  console.info("[nango] createConnectSession response shape", {
    endpoint,
    providerConfigKey,
    status: response.status,
    ...shapeDebug,
  });

  if (response.ok) {
    const json = responseBody as NangoConnectSessionResponse | null;
    const sessionData = json?.data ?? json;
    const token = sessionData?.token;
    const connectLink = sessionData?.connect_link ?? sessionData?.connectLink ?? null;
    const expiresAt = sessionData?.expires_at ?? sessionData?.expiresAt ?? null;

    if (!token) {
      throw new NangoConnectSessionError("Nango connect session response did not include a token.", {
        endpoint,
        providerConfigKey,
        status: response.status,
        statusText: response.statusText,
        responseBody,
        validationErrors: readValidationErrors(responseBody),
      });
    }
    return {
      token,
      sessionToken: token,
      connectLink,
      expiresAt,
      providerConfigKey,
    };
  }

  const validationErrors = readValidationErrors(responseBody);
  console.error("[nango] createConnectSession failed", {
    endpoint,
    providerConfigKey,
    status: response.status,
    statusText: response.statusText,
    responseShape: shapeDebug,
    responseBody,
    validationErrors,
  });
  throw new NangoConnectSessionError("Nango connect session failed.", {
    endpoint,
    providerConfigKey,
    status: response.status,
    statusText: response.statusText,
    responseBody,
    validationErrors,
  });
}

export function verifyNangoWebhook(rawBody: string, headers: Record<string, unknown>): boolean {
  const secret = process.env.NANGO_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing required env var: NANGO_WEBHOOK_SECRET");

  const header = headers["x-nango-hmac-sha256"];
  const signature = Array.isArray(header) ? String(header[0]) : String(header || "");
  if (!signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const sigBuffer = Buffer.from(signature, "hex");
  const expBuffer = Buffer.from(expected, "hex");
  if (sigBuffer.length !== expBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}

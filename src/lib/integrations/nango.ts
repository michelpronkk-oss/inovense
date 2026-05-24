import { Nango } from "@nangohq/node";
import crypto from "crypto";

type NangoConnectSessionBody = {
  allowed_integrations?: string[];
  end_user: {
    id: string;
    email?: string;
    tags?: Record<string, string>;
  };
  tags: Record<string, string>;
};

export type SupportedNangoConnectorKey = "hubspot";

export type NangoConnectorConfig = {
  connectorKey: SupportedNangoConnectorKey;
  providerConfigKey: string;
  provider: "hubspot";
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

const NANGO_CONNECTORS: Record<SupportedNangoConnectorKey, NangoConnectorConfig> = {
  hubspot: {
    connectorKey: "hubspot",
    providerConfigKey: "hubspot-inovense",
    provider: "hubspot",
  },
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getNangoProviderConfigKey(connectorKey: string): string | null {
  if (connectorKey !== "hubspot") return null;
  return NANGO_CONNECTORS.hubspot.providerConfigKey;
}

function getNangoClient(): Nango {
  return new Nango({ secretKey: required("NANGO_SECRET_KEY") });
}

export async function createNangoConnectSession(input: {
  connectorKey: SupportedNangoConnectorKey;
  endUserId: string;
  endUserEmail?: string;
  tags: Record<string, string>;
}) {
  const providerConfigKey = getNangoProviderConfigKey(input.connectorKey);
  if (!providerConfigKey) throw new Error(`Unsupported connector key: ${input.connectorKey}`);

  const body: NangoConnectSessionBody = {
    allowed_integrations: [providerConfigKey],
    end_user: {
      id: input.endUserId,
      email: input.endUserEmail,
      tags: input.tags,
    },
    tags: input.tags,
  };

  const nango = getNangoClient();
  const session = await nango.createConnectSession(body);
  return {
    sessionToken: session.data.token,
    expiresAt: session.data.expires_at,
    providerConfigKey,
  };
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

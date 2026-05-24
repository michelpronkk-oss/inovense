import crypto from "node:crypto";
import { dodoProductEnvKeys, type CheckoutPlanTier } from "@/lib/pricing";

export type DodoCheckoutSessionInput = {
  plan: CheckoutPlanTier;
  siteUrl: string;
  workspaceId?: string;
  userId?: string;
  customerEmail?: string;
};

type JsonObject = Record<string, unknown>;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getDodoProductId(plan: CheckoutPlanTier): string {
  const envName = dodoProductEnvKeys[plan];
  return requiredEnv(envName);
}

function resolveCheckoutUrl(): string {
  const envUrl = process.env.DODO_CHECKOUT_SESSIONS_URL;
  return envUrl || "https://api.dodopayments.com/checkouts";
}

export async function createDodoCheckoutSession(input: DodoCheckoutSessionInput): Promise<{ checkoutUrl: string; raw: JsonObject }> {
  const apiKey = requiredEnv("DODO_API_KEY");
  const productId = getDodoProductId(input.plan);

  const payload: JsonObject = {
    product_cart: [{ product_id: productId, quantity: 1 }],
    success_url: `${input.siteUrl}/app?billing=success&plan=${input.plan}`,
    cancel_url: `${input.siteUrl}/pricing?billing=cancelled&plan=${input.plan}`,
    metadata: {
      plan: input.plan,
      plan_tier: input.plan,
      workspace_id: input.workspaceId || null,
      user_id: input.userId || null,
    },
  };

  if (input.customerEmail) {
    payload.customer = { email: input.customerEmail };
  }

  const response = await fetch(resolveCheckoutUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const raw = (await response.json().catch(() => ({}))) as JsonObject;
  if (!response.ok) {
    throw new Error(`Dodo checkout request failed (${response.status}): ${JSON.stringify(raw)}`);
  }

  const checkoutUrl =
    (raw.checkout_url as string | undefined)
    || (raw.url as string | undefined)
    || ((raw.data as JsonObject | undefined)?.checkout_url as string | undefined)
    || ((raw.data as JsonObject | undefined)?.url as string | undefined);

  if (!checkoutUrl) {
    throw new Error("Dodo checkout response did not include checkout URL.");
  }

  return { checkoutUrl, raw };
}

function resolvePortalUrl(customerId: string): string {
  const envUrl = process.env.DODO_CUSTOMER_PORTAL_URL;
  if (envUrl) return envUrl;
  return `https://api.dodopayments.com/customers/${encodeURIComponent(customerId)}/customer-portal/session`;
}

export async function createDodoCustomerPortalSession(customerId: string, returnUrl: string): Promise<{ portalUrl: string; raw: JsonObject }> {
  const apiKey = requiredEnv("DODO_API_KEY");
  const response = await fetch(resolvePortalUrl(customerId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ return_url: returnUrl }),
    cache: "no-store",
  });

  const raw = (await response.json().catch(() => ({}))) as JsonObject;
  if (!response.ok) {
    throw new Error(`Dodo portal request failed (${response.status}): ${JSON.stringify(raw)}`);
  }

  const portalUrl =
    (raw.link as string | undefined)
    || (raw.portal_url as string | undefined)
    || ((raw.data as JsonObject | undefined)?.link as string | undefined)
    || ((raw.data as JsonObject | undefined)?.portal_url as string | undefined)
    || ((raw.session as JsonObject | undefined)?.link as string | undefined);

  if (!portalUrl) {
    throw new Error("Dodo portal response did not include a portal URL.");
  }

  return { portalUrl, raw };
}

function secureEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function possibleSignatureParts(headerValue: string): string[] {
  return headerValue
    .split(",")
    .map((part) => part.trim())
    .flatMap((part) => {
      if (part.includes("=")) {
        const [, value] = part.split("=");
        return [value.trim()];
      }
      if (part.startsWith("sha256=")) return [part.replace("sha256=", "").trim()];
      return [part];
    })
    .filter(Boolean);
}

export function verifyDodoWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const digestHex = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const digestBase64 = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const candidates = possibleSignatureParts(signatureHeader);

  return candidates.some((candidate) =>
    secureEqual(candidate, digestHex)
    || secureEqual(candidate, `sha256=${digestHex}`)
    || secureEqual(candidate, digestBase64)
    || secureEqual(candidate, `sha256=${digestBase64}`)
  );
}

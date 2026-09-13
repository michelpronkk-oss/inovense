import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";
import { validatePubSubIdentityClaims, type GmailPushConfig } from "@/lib/connectors/gmail-push-protocol";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function verifyPubSubPushAuthorization(
  authorizationHeader: string | null,
  config: GmailPushConfig,
): Promise<boolean> {
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const token = authorizationHeader.slice(7).trim();
  if (!token || token.length > 12_000) return false;
  try {
    const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: config.audience,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "iss", "aud", "email", "email_verified"],
      clockTolerance: 5,
      maxTokenAge: "2h",
    });
    return validatePubSubIdentityClaims(payload, config);
  } catch {
    return false;
  }
}

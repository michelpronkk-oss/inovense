import { headers } from "next/headers";

export type OgVariant = "premium" | "facebook-safe";

const FACEBOOK_BOT_PATTERN = /(facebookexternalhit|facebot|facebookcatalog)/i;

export async function resolveOgVariantForRequest(options?: {
  facebookSafeEnabled?: boolean;
  forceVariant?: OgVariant;
}): Promise<OgVariant> {
  if (options?.forceVariant) {
    return options.forceVariant;
  }

  if (!options?.facebookSafeEnabled) {
    return "premium";
  }

  const headerList = await headers();
  const userAgent = headerList.get("user-agent") ?? "";

  if (FACEBOOK_BOT_PATTERN.test(userAgent)) {
    return "facebook-safe";
  }

  return "premium";
}

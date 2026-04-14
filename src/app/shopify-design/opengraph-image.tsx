import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "Shopify Design | Inovense — Stores Worth the Brand Behind Them";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [logoBuffer, variant] = await Promise.all([
    readFile(join(process.cwd(), "public/logo.png")),
    resolveOgVariantForRequest({ facebookSafeEnabled: true }),
  ]);
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Shopify Design",
      headline: "A Shopify store worth the brand behind it.",
      panelLabel: "What we build",
      items: [
        "Custom Shopify storefronts, no theme reskins",
        "Product and collection page systems",
        "Checkout and conversion architecture",
        "Store builds for premium-price-point brands",
      ],
      logo,
      variant,
    }),
    { ...size }
  );
}

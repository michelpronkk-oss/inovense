import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "Web Design | Inovense — Websites Built to Perform";
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
      laneLabel: "Web Design",
      headline: "Websites that hold up under scrutiny.",
      panelLabel: "What we deliver",
      items: [
        "Brand websites and marketing sites",
        "Landing pages built for conversion",
        "Shopify and ecommerce builds",
        "Redesigns for brands that have outgrown their site",
      ],
      logo,
      variant,
    }),
    { ...size }
  );
}

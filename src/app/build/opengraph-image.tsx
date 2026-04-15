import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "Inovense Build — Custom Websites and Digital Products";
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
      laneLabel: "Build",
      headline: "Websites and digital products built to perform.",
      panelLabel: "What we build",
      items: [
        "Landing pages and marketing sites",
        "SaaS and product websites",
        "Shopify and ecommerce builds",
        "Internal tools and dashboards",
      ],
      logo,
      variant,
    }),
    { ...size }
  );
}

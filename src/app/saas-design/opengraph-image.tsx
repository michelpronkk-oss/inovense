import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "SaaS Design | Inovense — Marketing Sites and Product Interfaces for Software Companies";
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
      laneLabel: "SaaS Design",
      headline: "Your product is credible. Your website should be too.",
      panelLabel: "What we build",
      items: [
        "SaaS marketing sites and landing pages",
        "Pricing page and packaging design",
        "Product interface and dashboard design",
        "Trial entry and onboarding flows",
      ],
      logo,
      variant,
    }),
    { ...size }
  );
}

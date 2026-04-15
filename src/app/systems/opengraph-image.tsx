import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "Inovense Systems — Automation and Business Operations";
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
      laneLabel: "Systems",
      headline: "Automation and business systems built to run better.",
      panelLabel: "What we build",
      items: [
        "AI automation and lead logic",
        "CRM setup and workflow systems",
        "Business process automation",
        "Custom internal tooling",
      ],
      logo,
      variant,
    }),
    { ...size }
  );
}

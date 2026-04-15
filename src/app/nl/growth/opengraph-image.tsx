import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "Inovense Growth — Leadgeneratie, SEO en Online Marketing";
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
      laneLabel: "Growth",
      headline: "Leadgeneratie, SEO en marketing die blijven opbouwen.",
      panelLabel: "Wat we bouwen",
      items: [
        "Lead capture en kwalificatie",
        "SEO en contentstructuur",
        "Paid media en performance",
        "Organische groei en distributie",
      ],
      logo,
      variant,
    }),
    { ...size }
  );
}

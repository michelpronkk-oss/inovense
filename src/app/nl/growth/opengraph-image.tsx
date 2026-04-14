import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "Growth lane | Inovense NL";
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
      laneLabel: "Growth lane",
      headline: "Groeisystemen en distributie die blijven doorwerken.",
      panelLabel: "Wat we bouwen",
      items: [
        "Lead capture en kwalificatie",
        "Routing en CRM doorstroom",
        "SEO-structuur en content",
        "Paid en organische distributie",
      ],
      logo,
      variant,
    }),
    { ...size }
  );
}

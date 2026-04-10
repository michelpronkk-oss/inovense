import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "Web Design | Inovense — Websites die standhouden onder kritisch oog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Web Design",
      headline: "Websites die standhouden onder kritisch oog.",
      panelLabel: "Wat we bouwen",
      items: [
        "Merkwebsites op maat",
        "Landingspagina's met conversiedoel",
        "Shopify builds en redesigns",
        "Mobile-first productie",
      ],
      logo,
    }),
    { ...size }
  );
}

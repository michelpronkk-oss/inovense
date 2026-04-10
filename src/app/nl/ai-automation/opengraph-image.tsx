import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "AI-automatisering | Inovense — Praktische systemen voor operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "AI-automatisering",
      headline: "Automatisering gebouwd rond hoe jouw bedrijf echt werkt.",
      panelLabel: "Wat we bouwen",
      items: [
        "Lead routing en CRM-sync",
        "Workflow automatisering",
        "AI-ondersteunde systemen",
        "Integratiepipelines op maat",
      ],
      logo,
    }),
    { ...size }
  );
}

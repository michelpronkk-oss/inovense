import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "Systems lane | Inovense NL";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Systems lane",
      headline: "Automatisering en infrastructuur voor serieuze operators.",
      panelLabel: "Wat we bouwen",
      items: [
        "AI-automatisering en leadlogica",
        "CRM-opzet en workflowsystemen",
        "Operationele infrastructuur",
        "Interne tools op maat",
      ],
      logo,
    }),
    { ...size }
  );
}

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "Systems Lane | Inovense — Automation and Infrastructure for Operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Systems Lane",
      headline: "Automation and infrastructure for serious operators.",
      panelLabel: "What we build",
      items: [
        "AI automation and lead logic",
        "CRM setup and workflow systems",
        "Operational infrastructure",
        "Custom internal tooling",
      ],
      logo,
    }),
    { ...size }
  );
}

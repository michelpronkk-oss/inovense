import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "AI Automation | Inovense — Practical Systems for Operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "AI Automation",
      headline: "Automation built around how your business actually runs.",
      panelLabel: "What we build",
      items: [
        "Lead routing and qualification logic",
        "Workflow automation and handoffs",
        "AI-powered operational systems",
        "CRM and data pipeline integration",
      ],
      logo,
    }),
    { ...size }
  );
}

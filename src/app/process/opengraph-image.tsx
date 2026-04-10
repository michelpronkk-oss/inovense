import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "The Inovense Process | How Every Engagement Is Run";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "The Process",
      headline: "How every Inovense engagement is structured and delivered.",
      panelLabel: "Every project includes",
      items: [
        "Discovery and scope alignment",
        "Structured reviews, not endless revisions",
        "Production-safe delivery with staged rollout",
        "Full handoff and documentation",
      ],
      logo,
    }),
    { ...size }
  );
}

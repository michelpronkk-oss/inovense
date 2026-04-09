import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "Growth Lane | Inovense — Content Systems and Market Presence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Growth Lane",
      headline: "Content systems and market presence built to compound.",
      panelLabel: "What we build",
      items: [
        "SEO infrastructure and content",
        "Paid media and performance",
        "Organic content systems",
        "Growth execution and compounding",
      ],
      logo,
    }),
    { ...size }
  );
}

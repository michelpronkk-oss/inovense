import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "Internal Tools | Inovense — Purpose-Built Software for Operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Internal Tools",
      headline: "Tools built around how your team actually works.",
      panelLabel: "What we build",
      items: [
        "Operator dashboards and admin panels",
        "Custom CRM and pipeline tooling",
        "Review and approval interfaces",
        "Workflow and handoff systems",
      ],
      logo,
    }),
    { ...size }
  );
}

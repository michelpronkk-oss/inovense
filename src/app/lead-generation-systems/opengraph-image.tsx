import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "Lead Generation Systems | Inovense — Capture, Route, Convert";
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
      laneLabel: "Lead Generation Systems",
      headline: "Demand is not the problem. Capture and conversion are.",
      panelLabel: "What the system handles",
      items: [
        "Lead capture and intake form design",
        "Automated routing and qualification",
        "Follow-up sequences and nurture logic",
        "Pipeline visibility and attribution",
      ],
      logo,
      variant,
    }),
    { ...size }
  );
}

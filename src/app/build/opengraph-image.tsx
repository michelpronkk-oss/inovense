import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "Build Lane | Inovense — Custom Websites and Digital Products";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Build Lane",
      headline: "Websites and digital products built to perform.",
      panelLabel: "What we build",
      items: [
        "Landing pages and marketing sites",
        "SaaS and product websites",
        "Shopify and ecommerce builds",
        "Internal tools and dashboards",
      ],
      logo,
    }),
    { ...size }
  );
}

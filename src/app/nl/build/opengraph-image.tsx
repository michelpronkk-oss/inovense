import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "Build lane | Inovense NL";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Build lane",
      headline: "Websites en digitale producten gebouwd om te presteren.",
      panelLabel: "Wat we bouwen",
      items: [
        "Landingspagina's en merkwebsites",
        "SaaS- en productwebsites",
        "Shopify en e-commerce builds",
        "Interne tools en dashboards",
      ],
      logo,
    }),
    { ...size }
  );
}

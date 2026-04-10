import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "Shopify Design | Inovense — Een winkel waardig aan het merk erachter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Shopify Design",
      headline: "Een Shopify winkel waardig aan het merk erachter.",
      panelLabel: "Wat we bouwen",
      items: [
        "Maatwerk Shopify themes",
        "Productpagina-systemen",
        "Checkout-optimalisatie",
        "Mobile-first builds",
      ],
      logo,
    }),
    { ...size }
  );
}

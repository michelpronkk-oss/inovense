import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "Proces | Inovense NL";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Proces",
      headline: "Hoe elke Inovense samenwerking wordt gestructureerd en opgeleverd.",
      panelLabel: "Elk project bevat",
      items: [
        "Discovery en scopeafstemming",
        "Gestructureerde reviews per fase",
        "Productieve oplevering en lancering",
        "Volledige overdracht en documentatie",
      ],
      logo,
    }),
    { ...size }
  );
}

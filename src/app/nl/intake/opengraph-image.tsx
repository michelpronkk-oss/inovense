import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeLaneOg } from "@/lib/make-lane-og";

export const runtime = "nodejs";
export const alt = "Project intake | Inovense NL";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeLaneOg({
      laneLabel: "Project intake",
      headline: "Stuur je projectaanvraag. Binnen 24 uur een duidelijke richting.",
      panelLabel: "Wat je kunt verwachten",
      items: [
        "Persoonlijke review van je brief",
        "Reactie binnen 24 uur",
        "Duidelijke volgende stap",
        "Geen pitch decks of templates",
      ],
      logo,
    }),
    { ...size }
  );
}

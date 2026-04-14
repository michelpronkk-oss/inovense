import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeHubOg } from "@/lib/make-hub-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "Inovense NL | Websitebouw, AI-automatisering en groeisystemen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LANES = [
  { name: "Build", desc: "Websites en digitale producten" },
  { name: "Systems", desc: "Automatisering en operaties" },
  { name: "Growth", desc: "SEO en groeisystemen" },
] as const;

export default async function Image() {
  const [logoBuffer, variant] = await Promise.all([
    readFile(join(process.cwd(), "public/logo.png")),
    resolveOgVariantForRequest({ facebookSafeEnabled: true }),
  ]);
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeHubOg({
      eyebrow: "Digitale infrastructuur",
      headline: "Websitebouw, AI-automatisering en groeisystemen.",
      subheadline:
        "Voor bedrijven die strakker willen bouwen, automatiseren en groeien.",
      panelLabel: "Lanes",
      lanes: [LANES[0], LANES[1], LANES[2]],
      domainLabel: "inovense.com/nl",
      logo,
      variant,
    }),
    { ...size }
  );
}

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeHubOg } from "@/lib/make-hub-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "Inovense | Web, Systems, and Growth Built to Perform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LANES = [
  { name: "Build", desc: "Websites and digital products" },
  { name: "Systems", desc: "Automation and operations" },
  { name: "Growth", desc: "SEO and demand systems" },
] as const;

export default async function Image() {
  const [logoBuffer, variant] = await Promise.all([
    readFile(join(process.cwd(), "public/logo.png")),
    resolveOgVariantForRequest({ facebookSafeEnabled: true }),
  ]);
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeHubOg({
      eyebrow: "Inovense",
      headline: "Web, systems, and growth built to perform.",
      subheadline:
        "Websites, automation, and growth systems for companies that compete on execution.",
      panelLabel: "Services",
      lanes: [LANES[0], LANES[1], LANES[2]],
      domainLabel: "inovense.com",
      logo,
      variant,
    }),
    { ...size }
  );
}

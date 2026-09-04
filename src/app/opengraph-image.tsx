import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeHubOg } from "@/lib/make-hub-og";
import { resolveOgVariantForRequest } from "@/lib/og-variant";

export const runtime = "nodejs";
export const alt = "Auterim | The AI workforce built around your business.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [logoBuffer, variant] = await Promise.all([
    readFile(join(process.cwd(), "public/logo.png")),
    resolveOgVariantForRequest({ facebookSafeEnabled: true }),
  ]);
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    makeHubOg({
      eyebrow: "Auterim",
      headline: "The AI workforce built around your business.",
      subheadline:
        "Company context, clear policies, and controlled execution across the systems you already use.",
      panelLabel: "Operating layer",
      lanes: [
        { name: "Operators", desc: "Defined roles for real business work" },
        { name: "Approvals", desc: "Human control where judgment matters" },
        { name: "Company memory", desc: "Context that improves every run" },
      ],
      domainLabel: "auterim.com",
      logo,
      variant,
    }),
    { ...size }
  );
}

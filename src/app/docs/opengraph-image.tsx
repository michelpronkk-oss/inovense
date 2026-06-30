import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim Docs â€” Complete documentation for the operating layer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Documentation",
      headline: "Everything you need to operate.",
      description: "Guides, API reference, and architecture documentation.",
      items: ["Getting started", "Agent configuration", "API reference"],
    }),
    { ...size }
  );
}

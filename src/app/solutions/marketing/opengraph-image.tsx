import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim for Marketing â€” AI operators for content and campaign execution";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Solutions",
      headline: "Marketing that executes at business pace.",
      description: "Content workflows, campaign tracking, and SEO automation.",
      items: ["Content production", "Campaign tracking", "Social scheduling"],
    }),
    { ...size }
  );
}

import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Inovense for Revenue Teams — AI operators for pipeline and deal execution";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Solutions",
      headline: "The operating layer for revenue teams.",
      description: "Pipeline management, follow-up sequencing, and deal intelligence.",
      items: ["Pipeline management", "Lead follow-up sequencing", "Deal intelligence"],
    }),
    { ...size }
  );
}

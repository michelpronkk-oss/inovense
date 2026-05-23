import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Inovense Changelog — Continuous platform releases";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Resources",
      headline: "What shipped.",
      description: "Continuous releases for the Inovense operating layer.",
    }),
    { ...size }
  );
}

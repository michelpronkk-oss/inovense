import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Inovense Press — Media resources and press inquiries";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Company",
      headline: "Press",
      description: "For interview requests, editorial coverage, or brand assets.",
    }),
    { ...size }
  );
}

import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim Changelog - Product updates";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Resources",
      headline: "What's new in Auterim",
      description: "Product updates, improvements and new ways Auterim can work across your business.",
    }),
    { ...size }
  );
}

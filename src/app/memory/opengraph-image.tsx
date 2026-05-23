import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Inovense Memory — Persistent company context for every AI operator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Platform",
      headline: "Your business, remembered",
      description: "Persistent memory that gives every operator full context.",
      items: ["Company context", "Cross-agent access", "Owner-controlled"],
    }),
    { ...size }
  );
}

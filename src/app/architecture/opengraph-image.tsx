import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Inovense Architecture — Technical overview of the operating layer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Resources",
      headline: "Built to run your business, not just assist it.",
      description: "Technical overview of the Inovense operating layer.",
      items: ["Agent runtime", "Policy engine", "Memory layer"],
    }),
    { ...size }
  );
}

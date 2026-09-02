import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "About Auterim — Building AI workforces for modern businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Company",
      headline: "We are building the OS for serious operators.",
      description: "The AI operating layer for the next decade of business.",
    }),
    { ...size }
  );
}

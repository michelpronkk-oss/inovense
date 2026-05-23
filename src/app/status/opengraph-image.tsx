import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Inovense Status — Live platform status";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Resources",
      headline: "All systems operational.",
      description: "Live status for the Inovense platform.",
      items: ["Agent runtime", "Workflow execution", "Connector APIs"],
    }),
    { ...size }
  );
}

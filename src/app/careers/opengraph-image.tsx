import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Inovense Careers — Join the team building the AI operating layer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Company",
      headline: "Build the OS for the next decade of business.",
      description: "Work on hard problems at the intersection of AI and execution.",
      items: ["Senior Product Engineer", "AI Systems Researcher", "GTM Lead"],
    }),
    { ...size }
  );
}

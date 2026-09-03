import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim Trust Center â€” Security and data handling for AI operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Resources",
      headline: "You run the system. We run the infrastructure.",
      description: "Security posture and data handling for serious operators.",
      items: ["Data boundaries", "Purpose-limited access", "Role-based access"],
    }),
    { ...size }
  );
}

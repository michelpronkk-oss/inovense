import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Contact Inovense — Talk to the team about getting started";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Company",
      headline: "Let us design your first operator execution layer.",
      description: "Talk to the team about deployment, policies, and connectors.",
    }),
    { ...size }
  );
}

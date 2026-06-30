import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim for Founders â€” AI operators for lean founder operations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Solutions",
      headline: "Move faster than a team twice your size.",
      description: "For founders running lean. Deploy operators that handle the work.",
      items: ["Business intelligence", "Email and comms management", "Finance monitoring"],
    }),
    { ...size }
  );
}

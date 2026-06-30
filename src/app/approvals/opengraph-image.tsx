import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim Approvals â€” Human-in-the-loop approval gates for AI operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Platform",
      headline: "Act at speed. Stay in control.",
      description: "Approval gates between agent proposals and execution.",
      items: ["Operator proposes", "You review in inbox", "Approved action executes"],
    }),
    { ...size }
  );
}

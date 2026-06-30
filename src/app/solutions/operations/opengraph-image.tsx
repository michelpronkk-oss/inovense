import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim for Operations â€” AI operators for business process execution";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Solutions",
      headline: "The operational layer beneath your business.",
      description: "Recurring execution, cross-team coordination, and process automation.",
      items: ["Recurring task execution", "Cross-team coordination", "Process documentation"],
    }),
    { ...size }
  );
}

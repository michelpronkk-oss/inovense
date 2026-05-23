import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Inovense for Client Services — AI operators for client-facing teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Solutions",
      headline: "Client services that scale without headcount.",
      description: "Onboarding automation, status reporting, and account health.",
      items: ["Client onboarding", "Status reporting", "Account health monitoring"],
    }),
    { ...size }
  );
}

import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Contact Auterim. Talk to the team about getting started.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Company",
      headline: "Tell us what's taking up your team's time.",
      description: "Ask about deployment, approvals, or connectors.",
    }),
    { ...size }
  );
}

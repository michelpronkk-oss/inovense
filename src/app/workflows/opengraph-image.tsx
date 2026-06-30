import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim Workflows â€” Execution chains with no manual handoff";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Platform",
      headline: "Execution chains with no manual handoff",
      description: "Build workflows across agents, connectors, and approval gates.",
      items: ["Trigger-based execution", "Multi-agent coordination", "Full execution log"],
    }),
    { ...size }
  );
}

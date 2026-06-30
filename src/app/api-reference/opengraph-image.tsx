import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim API Reference â€” Programmatic control over every platform layer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Resources",
      headline: "Programmatic control over every layer.",
      description: "Full REST API for agents, workflows, connectors, and approvals.",
      items: ["Agents API /v1/agents", "Workflows API /v1/workflows", "Approvals API /v1/approvals"],
    }),
    { ...size }
  );
}

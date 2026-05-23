import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Inovense Agents — Specialized AI operators for every business function";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    makePageOg({
      category: "Platform",
      headline: "Specialized operators for every function",
      description: "Deploy AI operators inside your policy boundaries.",
      items: ["Revenue Operator", "Content Operator", "Ops Coordinator"],
    }),
    { ...size }
  );
}

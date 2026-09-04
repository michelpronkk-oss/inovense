import { ImageResponse } from "next/og";
import { makePageOg } from "@/lib/make-page-og";

export const runtime = "nodejs";
export const alt = "Auterim operator registry — defined AI roles for business work";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    makePageOg({
      category: "The workforce",
      headline: "Operators built around the work.",
      description: "Defined roles, real company context, connected tools, and clear execution boundaries.",
      items: ["Revenue Operator", "Client Flow Operator", "Operations Operator"],
    }),
    { ...size },
  );
}
